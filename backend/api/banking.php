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
    $status = 'Clear';

    $stmt = $conn->prepare("INSERT INTO bank_ledger (lead_id, post_date, customer_name, reg_no, account_description, transaction_type, debit_amount, credit_amount, remarks, pending_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("isssssddsss", $lead_id, $post_date, $customer_name, $reg_no, $account_description, $transaction_type, $debit_amount, $credit_amount, $remarks, $pending_amount, $status);
    
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
    
    foreach ($rows as $r) {
        $date = $r['date'] ?? date('Y-m-d');
        if (strpos($date, '-') !== false) {
            $parts = explode('-', $date);
            if (count($parts) === 3 && strlen($parts[2]) === 4) { // DD-MM-YYYY
                $date = $parts[2] . '-' . $parts[1] . '-' . $parts[0];
            }
        }
        
        $customer_name = $r['customer_name'] ?? '';
        $lead_code = $r['lead_code'] ?? '';
        $loan_amount_received = floatval($r['loan_amount_received'] ?? 0);
        $bank_name = $r['bank_name'] ?? '';
        $utr_number = $r['utr_number'] ?? '';
        $status = $r['status'] ?? 'Clear';
        $transaction_type = 'LOAN_AMOUNT';
        
        if (empty($utr_number) || $loan_amount_received <= 0) continue;
        
        // Prevent duplicate UTR
        $chk = $conn->prepare("SELECT id FROM bank_ledger WHERE utr_number = ?");
        $chk->bind_param("s", $utr_number);
        $chk->execute();
        if ($chk->get_result()->fetch_assoc()) {
            continue; // Skip duplicate
        }
        
        // Auto-match logic
        $lead_id = null;
        if ($lead_code) {
            $lm = $conn->prepare("SELECT id FROM leads WHERE lead_id = ? LIMIT 1");
            $lm->bind_param("s", $lead_code);
            $lm->execute();
            $res = $lm->get_result();
            if ($row = $res->fetch_assoc()) $lead_id = $row['id'];
        }
        if (!$lead_id && $customer_name) {
            $lm = $conn->prepare("SELECT id FROM leads WHERE customer_name LIKE ? LIMIT 1");
            $like = "%$customer_name%";
            $lm->bind_param("s", $like);
            $lm->execute();
            $res = $lm->get_result();
            if ($row = $res->fetch_assoc()) $lead_id = $row['id'];
        }
        
        $desc = "Loan Amount Received from Financer";
        
        $stmt = $conn->prepare("INSERT INTO bank_ledger (lead_id, post_date, customer_name, account_description, transaction_type, credit_amount, utr_number, bank_name, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("issssdsss", $lead_id, $date, $customer_name, $desc, $transaction_type, $loan_amount_received, $utr_number, $bank_name, $status);
        if ($stmt->execute()) {
            $inserted++;
        }
    }
    
    recalculate_balances($conn);
    echo json_encode(['success' => true, 'inserted' => $inserted]);
    exit;
}

http_response_code(404);
echo json_encode(['error' => 'Invalid action']);
