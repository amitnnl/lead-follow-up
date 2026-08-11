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

if ($method === 'GET' && $action === 'list') {
    // List company payouts from Financer
    $res = $conn->query("
        SELECT p.*, l.lead_id as lead_code, l.customer_name, l.loan_amount, f.name as financer_name_rel
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
    
    $inserted = 0;
    
    foreach ($rows as $r) {
        $date = $r['date_received'] ?? date('Y-m-d');
        if (strpos($date, '-') !== false) {
            $parts = explode('-', $date);
            if (count($parts) === 3 && strlen($parts[2]) === 4) { // DD-MM-YYYY
                $date = $parts[2] . '-' . $parts[1] . '-' . $parts[0];
            }
        }
        
        $customer_name = $r['customer_name'] ?? '';
        $lead_code = $r['lead_code'] ?? '';
        $financer_name = $r['financer_name'] ?? '';
        $payout_amount = floatval($r['payout_amount'] ?? 0);
        $remarks = $r['remarks'] ?? '';
        $status = 'PAID';
        
        if ($payout_amount <= 0) continue;
        
        // Auto-match lead
        $lead_id = null;
        if ($lead_code) {
            $lm = $conn->prepare("SELECT id FROM leads WHERE lead_id = ? LIMIT 1");
            $lm->bind_param("s", $lead_code);
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
            // we could store it without lead_id, but the task says "Lead-wise financial history"
            // skip if no lead matched? Or insert with lead_id = 0?
            $lead_id = 0; 
        }

        // Prevent duplicate (same lead, same amount, same date)
        $chk = $conn->prepare("SELECT id FROM payouts WHERE lead_id = ? AND payout_received_amt = ? AND payout_received_date = ?");
        $chk->bind_param("ids", $lead_id, $payout_amount, $date);
        $chk->execute();
        if ($chk->get_result()->fetch_assoc()) {
            continue; // Skip duplicate
        }
        
        $stmt = $conn->prepare("INSERT INTO payouts (lead_id, financer_name, payout_received_amt, net_payout, payout_received_date, status, remarks) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("isddsss", $lead_id, $financer_name, $payout_amount, $payout_amount, $date, $status, $remarks);
        
        if ($stmt->execute()) {
            $inserted++;
            
            // Add to bank ledger
            $desc = "Financer Payout Received (" . ($financer_name ?: 'Unknown') . ")";
            $l_stmt = $conn->prepare("INSERT INTO bank_ledger (lead_id, post_date, customer_name, account_description, transaction_type, credit_amount, remarks, status) VALUES (?, ?, ?, ?, 'FINANCER_PAYOUT', ?, ?, 'Clear')");
            $l_stmt->bind_param("isssds", $lead_id, $date, $customer_name, $desc, $payout_amount, $remarks);
            $l_stmt->execute();
        }
    }
    
    recalculate_balances($conn);
    echo json_encode(['success' => true, 'inserted' => $inserted]);
    exit;
}

http_response_code(404);
echo json_encode(['error' => 'Invalid action']);
