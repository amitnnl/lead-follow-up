<?php
// backend/api/banking.php
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';

header('Content-Type: application/json');

if (!is_logged_in()) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$role = current_role();
if (!in_array($role, ['admin', 'manager', 'finance_manager'])) {
    http_response_code(403);
    echo json_encode(['error' => 'Forbidden']);
    exit;
}

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

// Helper to recalculate running balances
function recalculate_balances($conn) {
    $res = $conn->query("SELECT id, debit_amount, credit_amount FROM bank_ledger ORDER BY post_date ASC, id ASC");
    $balance = 0;
    while ($row = $res->fetch_assoc()) {
        $balance = $balance + $row['credit_amount'] - $row['debit_amount'];
        $stmt = $conn->prepare("UPDATE bank_ledger SET running_balance = ? WHERE id = ?");
        $stmt->bind_param("di", $balance, $row['id']);
        $stmt->execute();
    }
}



function parse_date($d) {
    if (empty($d)) return date('Y-m-d');
    $d = str_replace('/', '-', $d);
    $time = strtotime($d);
    if ($time) return date('Y-m-d', $time);
    $dateObj = DateTime::createFromFormat('d-m-Y', $d);
    if ($dateObj) return $dateObj->format('Y-m-d');
    return date('Y-m-d');
}

function parse_currency($str) {
    if (is_numeric($str)) return floatval($str);
    return floatval(preg_replace('/[^0-9\.-]/', '', (string)$str));
}

if ($method === 'GET' && $action === 'list') {
    $lead_id = isset($_GET['lead_id']) ? intval($_GET['lead_id']) : 0;
    
    if ($lead_id > 0) {
        $stmt = $conn->prepare("
            SELECT b.*, l.customer_name as lead_customer_name, l.lead_id as lead_code
            FROM bank_ledger b
            LEFT JOIN leads l ON b.lead_id = l.id
            WHERE b.lead_id = ?
            ORDER BY b.post_date ASC, b.id ASC
        ");
        $stmt->bind_param("i", $lead_id);
    } else {
        $stmt = $conn->prepare("
            SELECT b.*, l.customer_name as lead_customer_name, l.lead_id as lead_code
            FROM bank_ledger b
            LEFT JOIN leads l ON b.lead_id = l.id
            ORDER BY b.post_date DESC, b.id DESC
            LIMIT 500
        ");
    }
    
    $stmt->execute();
    $res = $stmt->get_result();
    $entries = [];
    $balance = 0;
    while ($row = $res->fetch_assoc()) {
        if ($lead_id > 0) {
            $balance = $balance + $row['credit_amount'] - $row['debit_amount'];
            $row['running_balance'] = $balance;
        }
        $entries[] = $row;
    }
    
    if ($lead_id > 0) {
        echo json_encode(['entries' => $entries, 'final_balance' => $balance]);
    } else {
        echo json_encode(['entries' => $entries]);
    }
    exit;
}

if ($method === 'POST' && $action === 'add') {
    $input = json_decode(file_get_contents('php://input'), true);
    $lead_id = !empty($input['lead_id']) ? intval($input['lead_id']) : null;
    $post_date = $input['post_date'] ?? date('Y-m-d');
    $customer_name = $input['customer_name'] ?? '';
    $reg_no = $input['reg_no'] ?? '';
    $account_description = $input['account_description'] ?? '';
    $transaction_type = $input['transaction_type'] ?? 'OTHER';
    $debit_amount = floatval($input['debit_amount'] ?? 0);
    $credit_amount = floatval($input['credit_amount'] ?? 0);
    $remarks = $input['remarks'] ?? '';
    $pending_amount = floatval($input['pending_amount'] ?? 0);
    $status = $input['status'] ?? 'Clear';
    $utr_number = $input['utr_number'] ?? '';
    $bank_name = $input['bank_name'] ?? '';
    $loan_amount = floatval($input['loan_amount'] ?? 0);

    // Auto-match lead_id if not provided
    if (!$lead_id && !empty($reg_no)) {
        $lm = $conn->prepare("SELECT id FROM leads WHERE registration_number LIKE ? LIMIT 1");
        $like = "%$reg_no%";
        $lm->bind_param("s", $like);
        $lm->execute();
        $res = $lm->get_result();
        if ($row = $res->fetch_assoc()) $lead_id = $row['id'];
    }
    if (!$lead_id && !empty($customer_name)) {
        $lm = $conn->prepare("SELECT id FROM leads WHERE customer_name LIKE ? LIMIT 1");
        $like = "%$customer_name%";
        $lm->bind_param("s", $like);
        $lm->execute();
        $res = $lm->get_result();
        if ($row = $res->fetch_assoc()) $lead_id = $row['id'];
    }

    $stmt = $conn->prepare("INSERT INTO bank_ledger (lead_id, post_date, customer_name, reg_no, account_description, transaction_type, debit_amount, credit_amount, remarks, pending_amount, status, utr_number, bank_name, loan_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("isssssddsssssd", $lead_id, $post_date, $customer_name, $reg_no, $account_description, $transaction_type, $debit_amount, $credit_amount, $remarks, $pending_amount, $status, $utr_number, $bank_name, $loan_amount);
    
    if ($stmt->execute()) {
        recalculate_balances($conn);
        echo json_encode(['success' => true]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Database error']);
    }
    exit;
}

if ($method === 'POST' && $action === 'upload') {
    $input = json_decode(file_get_contents('php://input'), true);
    $rows = $input['rows'] ?? [];
    
    $inserted = 0;
    
    // Ensure the new columns exist before inserting
    try { $conn->query("ALTER TABLE bank_ledger ADD COLUMN utr_number VARCHAR(150) NULL"); } catch(Throwable $e) {}
    try { $conn->query("ALTER TABLE bank_ledger ADD COLUMN bank_name VARCHAR(150) NULL"); } catch(Throwable $e) {}
    
    foreach ($rows as $r) {
$date = parse_date($r['date'] ?? '');
        
        $customer_name = $r['customer_name'] ?? '';
        $reg_no = $r['reg_no'] ?? '';
        $loan_amount = parse_currency($r['loan_amount'] ?? 0);
        $status = $r['status'] ?? 'Clear';
        $account_description = $r['account_description'] ?? '';
        $utr_number = $r['utr_number'] ?? '';
        $debit_amount = parse_currency($r['debit_amount'] ?? 0);
        $credit_amount = parse_currency($r['credit_amount'] ?? 0);
        $pending_amount = parse_currency($r['pending_amount'] ?? 0);
        $remarks = $r['remarks'] ?? '';
        $bank_name = $r['bank_name'] ?? '';
        
        $transaction_type = 'OTHER';
        if ($credit_amount > 0 && stripos($account_description, 'loan') !== false) {
            $transaction_type = 'LOAN_AMOUNT';
        }
        
        if (empty($customer_name) && empty($utr_number) && empty($reg_no) && $debit_amount == 0 && $credit_amount == 0) continue; // skip empty rows
        
        // Prevent duplicate UTR if UTR is provided
        if (!empty($utr_number)) {
            $chk = $conn->prepare("SELECT id FROM bank_ledger WHERE utr_number = ?");
            $chk->bind_param("s", $utr_number);
            $chk->execute();
            if ($chk->get_result()->fetch_assoc()) {
                continue; // Skip duplicate
            }
        }
        
        // Auto-match logic
        $lead_id = null;
        if (!empty($reg_no)) {
            $lm = $conn->prepare("SELECT id FROM leads WHERE registration_number LIKE ? LIMIT 1");
            $like = "%$reg_no%";
            $lm->bind_param("s", $like);
            $lm->execute();
            $res = $lm->get_result();
            if ($row = $res->fetch_assoc()) $lead_id = $row['id'];
        }
        if (!$lead_id && !empty($customer_name)) {
            $lm = $conn->prepare("SELECT id FROM leads WHERE customer_name LIKE ? LIMIT 1");
            $like = "%$customer_name%";
            $lm->bind_param("s", $like);
            $lm->execute();
            $res = $lm->get_result();
            if ($row = $res->fetch_assoc()) $lead_id = $row['id'];
        }
        
        $stmt = $conn->prepare("INSERT INTO bank_ledger (lead_id, post_date, customer_name, reg_no, account_description, transaction_type, debit_amount, credit_amount, remarks, pending_amount, status, utr_number, bank_name, loan_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("isssssddsssssd", $lead_id, $date, $customer_name, $reg_no, $account_description, $transaction_type, $debit_amount, $credit_amount, $remarks, $pending_amount, $status, $utr_number, $bank_name, $loan_amount);
        if ($stmt->execute()) {
            $inserted++;
        } else {
            error_log("Execute failed in banking upload: " . $stmt->error);
        }
    }
    
    recalculate_balances($conn);
    echo json_encode(['success' => true, 'inserted' => $inserted]);
    exit;
}

if ($method === 'POST' && $action === 'edit') {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = intval($input['id'] ?? 0);
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'ID required']);
        exit;
    }
    
    $post_date = $input['post_date'] ?? date('Y-m-d');
    $customer_name = $input['customer_name'] ?? '';
    $reg_no = $input['reg_no'] ?? '';
    $account_description = $input['account_description'] ?? '';
    $debit_amount = floatval($input['debit_amount'] ?? 0);
    $credit_amount = floatval($input['credit_amount'] ?? 0);
    $remarks = $input['remarks'] ?? '';
    $pending_amount = floatval($input['pending_amount'] ?? 0);
    $status = $input['status'] ?? 'Clear';
    $utr_number = $input['utr_number'] ?? '';
    $bank_name = $input['bank_name'] ?? '';
    $loan_amount = floatval($input['loan_amount'] ?? 0);

    $stmt = $conn->prepare("UPDATE bank_ledger SET post_date=?, customer_name=?, reg_no=?, account_description=?, debit_amount=?, credit_amount=?, remarks=?, pending_amount=?, status=?, utr_number=?, bank_name=?, loan_amount=? WHERE id=?");
    $stmt->bind_param("ssssddsssssdi", $post_date, $customer_name, $reg_no, $account_description, $debit_amount, $credit_amount, $remarks, $pending_amount, $status, $utr_number, $bank_name, $loan_amount, $id);
    
    if ($stmt->execute()) {
        recalculate_balances($conn);
        echo json_encode(['success' => true]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Database error']);
    }
    exit;
}

if ($method === 'POST' && $action === 'delete') {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = intval($input['id'] ?? 0);
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'ID required']);
        exit;
    }
    
    $stmt = $conn->prepare("DELETE FROM bank_ledger WHERE id=?");
    $stmt->bind_param("i", $id);
    
    if ($stmt->execute()) {
        recalculate_balances($conn);
        echo json_encode(['success' => true]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Database error']);
    }
    exit;
}

http_response_code(404);
echo json_encode(['error' => 'Invalid action']);
