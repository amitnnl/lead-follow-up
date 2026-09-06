<?php
// backend/api/payouts.php
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
    // List company payouts from Financer
    $res = $conn->query("
        SELECT p.*, l.lead_id as lead_code, 
               COALESCE(p.customer_name, l.customer_name) as customer_name, 
               COALESCE(p.loan_amount, l.loan_amount) as loan_amount, 
               f.name as financer_name_rel
        FROM payouts p
        LEFT JOIN leads l ON p.lead_id = l.id
        LEFT JOIN financers f ON l.financer_id = f.id
        ORDER BY p.id DESC
        LIMIT 200
    ");
    $payouts = [];
    while ($row = $res->fetch_assoc()) {
        $row['display_financer'] = $row['financer_name'] ?: $row['financer_name_rel'];
        $payouts[] = $row;
    }
    echo json_encode(['payouts' => $payouts]);
    exit;
}

if ($method === 'POST' && $action === 'upload') {
    $input = json_decode(file_get_contents('php://input'), true);
    $rows = $input['rows'] ?? [];
    
    // Ensure all new columns exist before inserting
    try { $conn->query("ALTER TABLE payouts ADD COLUMN loan_account_no VARCHAR(100) NULL"); } catch(Throwable $e) {}
    try { $conn->query("ALTER TABLE payouts ADD COLUMN irr VARCHAR(50) NULL"); } catch(Throwable $e) {}
    try { $conn->query("ALTER TABLE payouts ADD COLUMN code_name_no VARCHAR(150) NULL"); } catch(Throwable $e) {}
    try { $conn->query("ALTER TABLE payouts ADD COLUMN financer_branch VARCHAR(150) NULL"); } catch(Throwable $e) {}
    try { $conn->query("ALTER TABLE payouts ADD COLUMN payout_percent VARCHAR(50) NULL"); } catch(Throwable $e) {}
    try { $conn->query("ALTER TABLE payouts ADD COLUMN gross_payout_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00"); } catch(Throwable $e) {}
    try { $conn->query("ALTER TABLE payouts ADD COLUMN igst DECIMAL(12,2) NOT NULL DEFAULT 0.00"); } catch(Throwable $e) {}
    try { $conn->query("ALTER TABLE payouts ADD COLUMN sgst DECIMAL(12,2) NOT NULL DEFAULT 0.00"); } catch(Throwable $e) {}
    try { $conn->query("ALTER TABLE payouts ADD COLUMN gst_paid DECIMAL(12,2) NOT NULL DEFAULT 0.00"); } catch(Throwable $e) {}
    try { $conn->query("ALTER TABLE payouts ADD COLUMN channel_name VARCHAR(150) NULL"); } catch(Throwable $e) {}
    try { $conn->query("ALTER TABLE payouts ADD COLUMN balance_payout DECIMAL(12,2) NOT NULL DEFAULT 0.00"); } catch(Throwable $e) {}
    try { $conn->query("ALTER TABLE payouts ADD COLUMN disb_date VARCHAR(50) NULL"); } catch(Throwable $e) {}
    try { $conn->query("ALTER TABLE payouts ADD COLUMN loan_amount DECIMAL(12,2) NULL"); } catch(Throwable $e) {}
    try { $conn->query("ALTER TABLE payouts ADD COLUMN vehicle VARCHAR(150) NULL"); } catch(Throwable $e) {}
    try { $conn->query("ALTER TABLE payouts ADD COLUMN reg_no VARCHAR(150) NULL"); } catch(Throwable $e) {}
    try { $conn->query("ALTER TABLE payouts ADD COLUMN customer_name VARCHAR(150) NULL"); } catch(Throwable $e) {}

    $inserted = 0;
    
    foreach ($rows as $r) {
$date = parse_date($r['payout_received_date'] ?? '');
        
        $customer_name = $r['customer_name'] ?? '';
        $reg_no = $r['reg_no'] ?? '';
        $disb_date = $r['disb_date'] ?? '';
        $loan_amount = parse_currency($r['loan_amount'] ?? 0);
        $vehicle = $r['vehicle'] ?? '';
        $financer_name = $r['financer_name'] ?? '';
        $loan_account_no = $r['loan_account_no'] ?? '';
        $irr = $r['irr'] ?? '';
        $code_name_no = $r['code_name_no'] ?? '';
        $financer_branch = $r['financer_branch'] ?? '';
        $payout_percent = $r['payout_percent'] ?? '';
        
        $gross_payout_amount = parse_currency($r['gross_payout_amount'] ?? 0);
        $tds_amt = parse_currency($r['tds_amt'] ?? 0);
        $igst = parse_currency($r['igst'] ?? 0);
        $sgst = parse_currency($r['sgst'] ?? 0);
        $gst_paid = parse_currency($r['gst_paid'] ?? 0);
        $net_payout = parse_currency($r['net_payout'] ?? 0);
        
        $channel_name = $r['channel_name'] ?? '';
        $channel_paid_amt = parse_currency($r['channel_paid_amt'] ?? 0);
        $balance_payout = parse_currency($r['balance_payout'] ?? 0);
        
        $remarks = $r['remarks'] ?? '';
        $status = $r['status'] ?? '';
        
        if ($gross_payout_amount <= 0 && $net_payout <= 0) continue;
        
        // Auto-match lead
        $lead_id = null;
        if ($reg_no) {
            $lm = $conn->prepare("SELECT id FROM leads WHERE registration_number = ? LIMIT 1");
            $lm->bind_param("s", $reg_no);
            $lm->execute();
            if ($row = $lm->get_result()->fetch_assoc()) $lead_id = $row['id'];
        }
        if (!$lead_id && $loan_account_no) {
            $lm = $conn->prepare("SELECT id FROM leads WHERE financer_lead_number = ? LIMIT 1");
            $lm->bind_param("s", $loan_account_no);
            $lm->execute();
            if ($row = $lm->get_result()->fetch_assoc()) $lead_id = $row['id'];
        }
        if (!$lead_id && $customer_name) {
            $lm = $conn->prepare("SELECT id FROM leads WHERE customer_name LIKE ? LIMIT 1");
            $like = "%$customer_name%";
            $lm->bind_param("s", $like);
            $lm->execute();
            if ($row = $lm->get_result()->fetch_assoc()) $lead_id = $row['id'];
        }
        
        if (!$lead_id) {
            $lead_id = 0; 
        }

        // Prevent duplicate (same lead, same gross amount, same date)
        $chk = $conn->prepare("SELECT id FROM payouts WHERE lead_id = ? AND gross_payout_amount = ? AND payout_received_date = ?");
        $chk->bind_param("ids", $lead_id, $gross_payout_amount, $date);
        $chk->execute();
        if ($chk->get_result()->fetch_assoc()) {
            error_log("Duplicate skipped for lead_id: " . $lead_id);
            continue; // Skip duplicate
        }
        
        $stmt = $conn->prepare("INSERT INTO payouts (
            lead_id, financer_name, financer_branch, payout_received_amt, gross_payout_amount, 
            tds_amt, igst, sgst, gst_paid, net_payout, 
            agent_commission, channel_name, balance_payout, 
            loan_account_no, irr, code_name_no, payout_percent, 
            payout_received_date, status, remarks,
            disb_date, loan_amount, vehicle, reg_no, customer_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        
        // Use net_payout as the fallback for payout_received_amt to preserve backward compatibility
        $payout_received_amt_legacy = $net_payout > 0 ? $net_payout : $gross_payout_amount;
        
        $stmt->bind_param(
            "issddddddddsdssssssssdsss", 
            $lead_id, $financer_name, $financer_branch, $payout_received_amt_legacy, $gross_payout_amount,
            $tds_amt, $igst, $sgst, $gst_paid, $net_payout,
            $channel_paid_amt, $channel_name, $balance_payout,
            $loan_account_no, $irr, $code_name_no, $payout_percent,
            $date, $status, $remarks,
            $disb_date, $loan_amount, $vehicle, $reg_no, $customer_name
        );
        
        if ($stmt->execute()) {
            $inserted++;
            

        } else {
            error_log("Execute failed in payouts upload: " . $stmt->error);
        }
    }
    

    echo json_encode(['success' => true, 'inserted' => $inserted]);
    exit;
}

if ($method === 'POST' && in_array($action, ['add', 'edit'])) {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = intval($input['id'] ?? 0);
    
    $customer_name = $input['customer_name'] ?? '';
    $reg_no = $input['reg_no'] ?? '';
    $disb_date = $input['disb_date'] ?? '';
    $loan_amount = floatval($input['loan_amount'] ?? 0);
    $vehicle = $input['vehicle'] ?? '';
    $financer_name = $input['financer_name'] ?? '';
    $loan_account_no = $input['loan_account_no'] ?? '';
    $irr = $input['irr'] ?? '';
    $code_name_no = $input['code_name_no'] ?? '';
    $financer_branch = $input['financer_branch'] ?? '';
    $payout_percent = $input['payout_percent'] ?? '';
    
    $gross_payout_amount = floatval($input['gross_payout_amount'] ?? 0);
    $tds_amt = floatval($input['tds_amt'] ?? 0);
    $igst = floatval($input['igst'] ?? 0);
    $sgst = floatval($input['sgst'] ?? 0);
    $gst_paid = floatval($input['gst_paid'] ?? 0);
    $net_payout = floatval($input['net_payout'] ?? 0);
    
    $channel_name = $input['channel_name'] ?? '';
    $channel_paid_amt = floatval($input['channel_paid_amt'] ?? 0);
    $balance_payout = floatval($input['balance_payout'] ?? 0);
    
    $date = $input['payout_received_date'] ?? date('Y-m-d');
    $remarks = $input['remarks'] ?? '';
    $status = $input['status'] ?? '';

    $payout_received_amt_legacy = $net_payout > 0 ? $net_payout : $gross_payout_amount;

    if ($action === 'add') {
        $lead_id = 0;
        if ($reg_no) {
            $lm = $conn->prepare("SELECT id FROM leads WHERE registration_number = ? LIMIT 1");
            $lm->bind_param("s", $reg_no);
            $lm->execute();
            if ($row = $lm->get_result()->fetch_assoc()) $lead_id = $row['id'];
        }
        if (!$lead_id && $loan_account_no) {
            $lm = $conn->prepare("SELECT id FROM leads WHERE financer_lead_number = ? LIMIT 1");
            $lm->bind_param("s", $loan_account_no);
            $lm->execute();
            if ($row = $lm->get_result()->fetch_assoc()) $lead_id = $row['id'];
        }
        if (!$lead_id && $customer_name) {
            $lm = $conn->prepare("SELECT id FROM leads WHERE customer_name LIKE ? LIMIT 1");
            $like = "%$customer_name%";
            $lm->bind_param("s", $like);
            $lm->execute();
            if ($row = $lm->get_result()->fetch_assoc()) $lead_id = $row['id'];
        }

        $stmt = $conn->prepare("INSERT INTO payouts (
            lead_id, financer_name, financer_branch, payout_received_amt, gross_payout_amount, 
            tds_amt, igst, sgst, gst_paid, net_payout, 
            agent_commission, channel_name, balance_payout, 
            loan_account_no, irr, code_name_no, payout_percent, 
            payout_received_date, status, remarks,
            disb_date, loan_amount, vehicle, reg_no, customer_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        
        $stmt->bind_param(
            "issddddddddsdssssssssdsss", 
            $lead_id, $financer_name, $financer_branch, $payout_received_amt_legacy, $gross_payout_amount,
            $tds_amt, $igst, $sgst, $gst_paid, $net_payout,
            $channel_paid_amt, $channel_name, $balance_payout,
            $loan_account_no, $irr, $code_name_no, $payout_percent,
            $date, $status, $remarks,
            $disb_date, $loan_amount, $vehicle, $reg_no, $customer_name
        );

        if ($stmt->execute()) {

            echo json_encode(['success' => true]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Database error']);
        }
    } else if ($action === 'edit') {
        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'ID required']);
            exit;
        }
        $stmt = $conn->prepare("UPDATE payouts SET
            financer_name=?, financer_branch=?, payout_received_amt=?, gross_payout_amount=?, 
            tds_amt=?, igst=?, sgst=?, gst_paid=?, net_payout=?, 
            agent_commission=?, channel_name=?, balance_payout=?, 
            loan_account_no=?, irr=?, code_name_no=?, payout_percent=?, 
            payout_received_date=?, status=?, remarks=?,
            disb_date=?, loan_amount=?, vehicle=?, reg_no=?, customer_name=?
            WHERE id=?");
        
        $stmt->bind_param(
            "ssddddddddsdssssssssdsssi",
            $financer_name, $financer_branch, $payout_received_amt_legacy, $gross_payout_amount,
            $tds_amt, $igst, $sgst, $gst_paid, $net_payout,
            $channel_paid_amt, $channel_name, $balance_payout,
            $loan_account_no, $irr, $code_name_no, $payout_percent,
            $date, $status, $remarks,
            $disb_date, $loan_amount, $vehicle, $reg_no, $customer_name,
            $id
        );

        if ($stmt->execute()) {
            echo json_encode(['success' => true]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Database error']);
        }
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
    
    $stmt = $conn->prepare("DELETE FROM payouts WHERE id=?");
    $stmt->bind_param("i", $id);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Database error']);
    }
    exit;
}

http_response_code(404);
echo json_encode(['error' => 'Invalid action']);
