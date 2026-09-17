<?php
// backend/api/settlement.php
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/validator.php';

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

if ($method === 'GET' && $action === 'list') {
    // List all disbursed leads for settlement
    $res = $conn->query("
        SELECT 
            l.id as lead_id, l.lead_id as lead_code, l.customer_name, l.loan_amount as approved_loan_amount,
            cs.id as settlement_id,
            cs.insurance_charge, cs.insurance_gst, 
            cs.rc_charge, 
            cs.rto_charge, cs.rto_gst,
            cs.other_charges,
            cs.client_comm_type, cs.client_comm_value, cs.client_comm_amount,
            cs.total_deduction, cs.net_payable, cs.status, cs.payment_date, cs.payment_mode, cs.remarks,
            IFNULL((SELECT SUM(credit_amount) FROM bank_ledger WHERE lead_id = l.id AND transaction_type != 'SETTLEMENT_DEDUCTION'), 0) as loan_amount_received
        FROM leads l
        LEFT JOIN customer_settlements cs ON l.id = cs.lead_id
        WHERE l.status IN ('disbursed', 'approved')
        ORDER BY l.id DESC
        LIMIT 200
    ");
    $settlements = [];
    while ($row = $res->fetch_assoc()) {
        $settlements[] = [
            'lead_id' => $row['lead_id'],
            'lead_code' => $row['lead_code'],
            'customer_name' => $row['customer_name'],
            'approved_loan_amount' => floatval($row['approved_loan_amount']),
            'loan_amount_received' => floatval($row['loan_amount_received']),
            
            'insurance_charge' => floatval($row['insurance_charge'] ?? 0),
            'insurance_gst' => floatval($row['insurance_gst'] ?? 0),
            
            'rc_charge' => floatval($row['rc_charge'] ?? 0),
            
            'rto_charge' => floatval($row['rto_charge'] ?? 0),
            'rto_gst' => floatval($row['rto_gst'] ?? 0),
            
            'other_charges' => floatval($row['other_charges'] ?? 0),
            
            'client_comm_type' => $row['client_comm_type'] ?? 'Percentage',
            'client_comm_value' => floatval($row['client_comm_value'] ?? 0),
            'client_comm_amount' => floatval($row['client_comm_amount'] ?? 0),
            
            'total_deduction' => floatval($row['total_deduction'] ?? 0),
            'net_payable' => floatval($row['net_payable'] ?? $row['loan_amount_received']),
            'status' => $row['status'] ?? 'Pending',
            'payment_date' => $row['payment_date'],
            'payment_mode' => $row['payment_mode'],
            'remarks' => $row['remarks']
        ];
    }
    echo json_encode(['settlements' => $settlements]);
    exit;
}

if ($method === 'POST' && $action === 'save') {
    $input = json_decode(file_get_contents('php://input'), true);

    $val_errs = validate_input($input, [
        'lead_id' => ['type' => 'int', 'required' => true, 'min' => 1, 'description' => 'Lead ID'],
        'insurance_charge' => ['type' => 'float', 'min' => 0, 'description' => 'Insurance Charge'],
        'insurance_gst' => ['type' => 'float', 'min' => 0, 'max' => 100, 'description' => 'Insurance GST %'],
        'rc_charge' => ['type' => 'float', 'min' => 0, 'description' => 'RC Charge'],
        'rto_charge' => ['type' => 'float', 'min' => 0, 'description' => 'RTO Charge'],
        'rto_gst' => ['type' => 'float', 'min' => 0, 'max' => 100, 'description' => 'RTO GST %'],
        'other_charges' => ['type' => 'float', 'min' => 0, 'description' => 'Other Charges'],
        'client_comm_type' => ['type' => 'enum', 'options' => ['Fixed', 'Percentage'], 'description' => 'Commission Type'],
        'client_comm_value' => ['type' => 'float', 'min' => 0, 'description' => 'Commission Value'],
        'status' => ['type' => 'enum', 'options' => ['Pending', 'Paid'], 'description' => 'Status'],
        'payment_date' => ['type' => 'date', 'description' => 'Payment Date'],
        'payment_mode' => ['type' => 'string', 'max_len' => 50, 'description' => 'Payment Mode'],
        'remarks' => ['type' => 'string', 'max_len' => 500, 'description' => 'Remarks']
    ]);
    if (!empty($val_errs)) {
        http_response_code(400); echo json_encode(['errors' => $val_errs]); exit;
    }

    $lead_id = intval($input['lead_id']);
    
    $insurance_charge = floatval($input['insurance_charge'] ?? 0);
    $insurance_gst = floatval($input['insurance_gst'] ?? 0);
    
    $rc_charge = floatval($input['rc_charge'] ?? 0);
    
    $rto_charge = floatval($input['rto_charge'] ?? 0);
    $rto_gst = floatval($input['rto_gst'] ?? 0);
    
    $other_charges = floatval($input['other_charges'] ?? 0);
    
    $client_comm_type = $input['client_comm_type'] ?? 'Fixed';
    $client_comm_value = floatval($input['client_comm_value'] ?? 0);
    
    $status = $input['status'] ?? 'Pending';
    $payment_date = !empty($input['payment_date']) ? $input['payment_date'] : null;
    $payment_mode = trim($input['payment_mode'] ?? '');
    $remarks = trim($input['remarks'] ?? '');
    
    if (!$lead_id) {
        http_response_code(400); echo json_encode(['error' => 'Lead ID required']); exit;
    }

    // Get loan amount received from bank ledger
    $bl = $conn->prepare("SELECT SUM(credit_amount) as received FROM bank_ledger WHERE lead_id = ? AND transaction_type != 'SETTLEMENT_DEDUCTION'");
    $bl->bind_param("i", $lead_id);
    $bl->execute();
    $bl_res = $bl->get_result()->fetch_assoc();
    $loan_amount_received = floatval($bl_res['received'] ?? 0);

    // Get approved loan amount for percentage comm
    $l_row = db_fetch_one($conn, "SELECT loan_amount FROM leads WHERE id = ?", 'i', [$lead_id]);
    $approved_loan = floatval($l_row['loan_amount'] ?? $loan_amount_received);

    // Calculate Client Commission
    $client_comm_amount = 0;
    if ($client_comm_type === 'Percentage') {
        $client_comm_amount = $loan_amount_received * ($client_comm_value / 100);
    } else {
        $client_comm_amount = $client_comm_value;
    }

    // Calculate total GST and base sums
    $total_insurance = $insurance_charge + ($insurance_charge * ($insurance_gst / 100));
    $total_rto = $rto_charge + ($rto_charge * ($rto_gst / 100));

    // Calculate overall deductions
    $total_deduction = $total_insurance + $rc_charge + $total_rto + $other_charges + $client_comm_amount;
    $net_payable = $loan_amount_received - $total_deduction;

    // Check if exists
    $chk = $conn->prepare("SELECT id, status FROM customer_settlements WHERE lead_id = ?");
    $chk->bind_param("i", $lead_id);
    $chk->execute();
    $existing = $chk->get_result()->fetch_assoc();

    if ($existing) {
        $stmt = $conn->prepare("UPDATE customer_settlements SET loan_amount_received=?, insurance_charge=?, insurance_gst=?, rc_charge=?, rto_charge=?, rto_gst=?, other_charges=?, client_comm_type=?, client_comm_value=?, client_comm_amount=?, total_deduction=?, net_payable=?, status=?, payment_date=?, payment_mode=?, remarks=? WHERE lead_id=?");
        $stmt->bind_param("dddddddsddddssssi", $loan_amount_received, $insurance_charge, $insurance_gst, $rc_charge, $rto_charge, $rto_gst, $other_charges, $client_comm_type, $client_comm_value, $client_comm_amount, $total_deduction, $net_payable, $status, $payment_date, $payment_mode, $remarks, $lead_id);
    } else {
        $stmt = $conn->prepare("INSERT INTO customer_settlements (lead_id, loan_amount_received, insurance_charge, insurance_gst, rc_charge, rto_charge, rto_gst, other_charges, client_comm_type, client_comm_value, client_comm_amount, total_deduction, net_payable, status, payment_date, payment_mode, remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("iddddddddsddddsss", $lead_id, $loan_amount_received, $insurance_charge, $insurance_gst, $rc_charge, $rto_charge, $rto_gst, $other_charges, $client_comm_type, $client_comm_value, $client_comm_amount, $total_deduction, $net_payable, $status, $payment_date, $payment_mode, $remarks);
    }

    if ($stmt->execute()) {
        // If marking as Paid, log to bank_ledger
        if ($status === 'Paid' && (!$existing || $existing['status'] !== 'Paid')) {
            $date = $payment_date ?? date('Y-m-d');
            
            // Determine active bank account
            $bank_acc_id = !empty($input['bank_account_id']) ? intval($input['bank_account_id']) : 0;
            if (!$bank_acc_id) {
                $defAcc = $conn->query("SELECT id FROM company_bank_accounts WHERE is_default = 1 AND is_active = 1 LIMIT 1");
                if ($defAcc && ($dRow = $defAcc->fetch_assoc())) {
                    $bank_acc_id = intval($dRow['id']);
                }
            }
            $accVal = $bank_acc_id > 0 ? $bank_acc_id : "NULL";

            // Insert Deductions
            if ($total_insurance > 0) $conn->query("INSERT INTO bank_ledger (bank_account_id, lead_id, post_date, account_description, debit_amount, transaction_type) VALUES ($accVal, $lead_id, '$date', 'Insurance Deduction (Base + {$insurance_gst}% GST)', $total_insurance, 'SETTLEMENT_DEDUCTION')");
            if ($rc_charge > 0) $conn->query("INSERT INTO bank_ledger (bank_account_id, lead_id, post_date, account_description, debit_amount, transaction_type) VALUES ($accVal, $lead_id, '$date', 'Vehicle RC Deduction', $rc_charge, 'SETTLEMENT_DEDUCTION')");
            if ($rto_charge > 0) $conn->query("INSERT INTO bank_ledger (bank_account_id, lead_id, post_date, account_description, debit_amount, transaction_type) VALUES ($accVal, $lead_id, '$date', 'RTO Deduction (Base + {$rto_gst}% GST)', $total_rto, 'SETTLEMENT_DEDUCTION')");
            if ($other_charges > 0) $conn->query("INSERT INTO bank_ledger (bank_account_id, lead_id, post_date, account_description, debit_amount, transaction_type) VALUES ($accVal, $lead_id, '$date', 'Other Charges Deduction', $other_charges, 'SETTLEMENT_DEDUCTION')");
            
            if ($client_comm_amount > 0) {
                 $conn->query("INSERT INTO bank_ledger (bank_account_id, lead_id, post_date, account_description, debit_amount, transaction_type) VALUES ($accVal, $lead_id, '$date', 'Client Commission Deduction ($client_comm_type)', $client_comm_amount, 'SETTLEMENT_DEDUCTION')");
            }
            
            // Insert Customer Payment
            if ($net_payable > 0) {
                $rem = $conn->real_escape_string($remarks);
                $conn->query("INSERT INTO bank_ledger (bank_account_id, lead_id, post_date, account_description, debit_amount, transaction_type, remarks) VALUES ($accVal, $lead_id, '$date', 'Customer Settlement Payment', $net_payable, 'CUSTOMER_PAYMENT', '$rem')");
            }
            
            // Recalculate isolated ledger balances for that account
            $opening = 0.0;
            if ($bank_acc_id > 0) {
                $accInfo = $conn->query("SELECT opening_balance FROM company_bank_accounts WHERE id = $bank_acc_id");
                if ($accInfo && ($r = $accInfo->fetch_assoc())) {
                    $opening = floatval($r['opening_balance']);
                }
                $where = "bank_account_id = $bank_acc_id";
            } else {
                $where = "bank_account_id IS NULL OR bank_account_id = 0";
            }

            $res = $conn->query("SELECT id, debit_amount, credit_amount FROM bank_ledger WHERE $where ORDER BY post_date ASC, id ASC");
            $balance = $opening;
            while ($row = $res->fetch_assoc()) {
                $balance = $balance + floatval($row['credit_amount']) - floatval($row['debit_amount']);
                $conn->query("UPDATE bank_ledger SET running_balance = $balance WHERE id = " . $row['id']);
            }
            if ($bank_acc_id > 0) {
                $conn->query("UPDATE company_bank_accounts SET current_balance = $balance WHERE id = $bank_acc_id");
            }
        }
        echo json_encode(['success' => true]);
    } else {
        http_response_code(500); echo json_encode(['error' => 'Database error']);
    }
    exit;
}

http_response_code(404);
echo json_encode(['error' => 'Invalid action']);
