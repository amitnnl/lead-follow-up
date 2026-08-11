<?php
// backend/api/finance.php
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/validator.php';

header('Content-Type: application/json');

// Ensure user is authenticated
if (!is_logged_in()) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

// Role Check: Only Admin and Finance Managers (and Managers)
$role = current_role();
if (!in_array($role, ['admin', 'manager', 'finance_manager'])) {
    http_response_code(403);
    echo json_encode(['error' => 'Forbidden. Finance Module access only.']);
    exit;
}

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];
$user_id = current_user_id();

function log_finance_audit($lead_id, $action_desc, $details = '') {
    global $conn, $user_id;
    if (!$lead_id) return;
    $stmt = $conn->prepare("INSERT INTO `lead_logs` (`lead_id`, `action`, `details`, `performed_by`) VALUES (?, ?, ?, ?)");
    if ($stmt) {
        $stmt->bind_param("issi", $lead_id, $action_desc, $details, $user_id);
        $stmt->execute();
    }
}

// ==========================================
// CHARGE MASTER
// ==========================================
if ($action === 'get_charges' && $method === 'GET') {
    $res = $conn->query("SELECT * FROM `finance_module_charges` ORDER BY is_active DESC, id ASC");
    $charges = [];
    while ($row = $res->fetch_assoc()) {
        $charges[] = $row;
    }
    echo json_encode(['charges' => $charges]);
    exit;
}

if ($action === 'save_charge' && $method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);

    $val_errs = validate_input($input, [
        'charge_name' => ['type' => 'string', 'required' => true, 'min_len' => 2, 'max_len' => 100, 'description' => 'Charge Name'],
        'id' => ['type' => 'int', 'min' => 1, 'description' => 'Charge ID']
    ]);
    if (!empty($val_errs)) {
        http_response_code(400); echo json_encode(['errors' => $val_errs]); exit;
    }

    $id = $input['id'] ?? null;
    $charge_name = trim($input['charge_name']);
    
    if ($id) {
        $stmt = $conn->prepare("UPDATE `finance_module_charges` SET `charge_name` = ? WHERE `id` = ?");
        $stmt->bind_param("si", $charge_name, $id);
    } else {
        $stmt = $conn->prepare("INSERT INTO `finance_module_charges` (`charge_name`, `is_default`, `is_active`) VALUES (?, 0, 1)");
        $stmt->bind_param("s", $charge_name);
    }
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true]);
    } else {
        http_response_code(500); echo json_encode(['error' => 'Database error']);
    }
    exit;
}

if ($action === 'toggle_charge' && $method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = $input['id'] ?? null;
    $is_active = $input['is_active'] ? 1 : 0;
    
    $stmt = $conn->prepare("UPDATE `finance_module_charges` SET `is_active` = ? WHERE `id` = ?");
    $stmt->bind_param("ii", $is_active, $id);
    $stmt->execute();
    echo json_encode(['success' => true]);
    exit;
}

// ==========================================
// BANKING
// ==========================================
if ($action === 'get_banking' && $method === 'GET') {
    $res = $conn->query("
        SELECT b.*, l.lead_id as lead_code 
        FROM `finance_module_banking` b 
        LEFT JOIN `leads` l ON b.lead_id = l.id 
        ORDER BY b.date DESC, b.id DESC
    ");
    $entries = [];
    while ($row = $res->fetch_assoc()) {
        $entries[] = $row;
    }
    echo json_encode(['entries' => $entries]);
    exit;
}

if ($action === 'upload_banking' && $method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $rows = $input['rows'] ?? [];
    
    $inserted = 0;
    $matched = 0;
    
    foreach ($rows as $r) {
        $date = $r['date'] ?? date('Y-m-d');
        // Convert Excel date if needed (e.g., DD/MM/YYYY to YYYY-MM-DD)
        if (strpos($date, '/') !== false) {
            $parts = explode('/', $date);
            if (count($parts) === 3) {
                if (strlen($parts[2]) === 4) { // DD/MM/YYYY
                    $date = $parts[2] . '-' . $parts[1] . '-' . $parts[0];
                }
            }
        }
        
        $customer_name = $r['customer_name'] ?? '';
        $reg_no = $r['reg_no'] ?? '';
        $loan_no = $r['loan_number'] ?? '';
        $utr = $r['utr_number'] ?? '';
        $account_desc = $r['account_description'] ?? '';
        $credit = floatval($r['credit'] ?? 0);
        $debit = floatval($r['debit'] ?? 0);
        $bank = $r['bank_name'] ?? '';
        
        // Auto-match Logic
        $lead_id = null;
        if ($reg_no) {
            $lm = $conn->prepare("SELECT id FROM `leads` WHERE `registration_number` = ? LIMIT 1");
            $lm->bind_param("s", $reg_no);
            $lm->execute();
            $res = $lm->get_result();
            if ($row = $res->fetch_assoc()) $lead_id = $row['id'];
        }
        if (!$lead_id && $loan_no) {
            $lm = $conn->prepare("SELECT id FROM `leads` WHERE `financer_lead_number` = ? LIMIT 1");
            $lm->bind_param("s", $loan_no);
            $lm->execute();
            $res = $lm->get_result();
            if ($row = $res->fetch_assoc()) $lead_id = $row['id'];
        }
        if (!$lead_id && $customer_name) {
            $lm = $conn->prepare("SELECT id FROM `leads` WHERE `customer_name` LIKE ? LIMIT 1");
            $like_name = "%" . $customer_name . "%";
            $lm->bind_param("s", $like_name);
            $lm->execute();
            $res = $lm->get_result();
            if ($row = $res->fetch_assoc()) $lead_id = $row['id'];
        }
        
        $status = $lead_id ? 'matched' : 'unmatched';
        
        $stmt = $conn->prepare("INSERT INTO `finance_module_banking` (`date`, `customer_name`, `reg_no`, `lead_id`, `loan_number`, `utr_number`, `account_description`, `credit`, `debit`, `bank_name`, `status`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("sssisssddss", $date, $customer_name, $reg_no, $lead_id, $loan_no, $utr, $account_desc, $credit, $debit, $bank, $status);
        $stmt->execute();
        $inserted++;
        
        if ($lead_id) {
            $matched++;
            // Auto Ledger Entry for Bank Import
            if ($credit > 0) {
                $lst = $conn->prepare("INSERT INTO `finance_module_ledger` (`lead_id`, `date`, `description`, `credit`, `debit`, `balance`) VALUES (?, ?, ?, ?, 0, 0)");
                $desc = "Bank Received - " . ($account_desc ?: ($bank . " " . $utr));
                $lst->bind_param("issd", $lead_id, $date, $desc, $credit);
                $lst->execute();
                
                log_finance_audit($lead_id, "Bank Statement Imported", "Matched import for amount $credit");
            }
        }
    }
    
    echo json_encode(['success' => true, 'inserted' => $inserted, 'matched' => $matched]);
    exit;
}

// ==========================================
// PAYOUT
// ==========================================
if ($action === 'get_leads_for_payout' && $method === 'GET') {
    $q = $_GET['q'] ?? '';
    $like = "%$q%";
    $stmt = $conn->prepare("SELECT id, lead_id as lead_code, customer_name, loan_amount FROM `leads` WHERE lead_id LIKE ? OR customer_name LIKE ? LIMIT 20");
    $stmt->bind_param("ss", $like, $like);
    $stmt->execute();
    $res = $stmt->get_result();
    $leads = [];
    while ($row = $res->fetch_assoc()) {
        $leads[] = $row;
    }
    echo json_encode(['leads' => $leads]);
    exit;
}

if ($action === 'get_payout' && $method === 'GET') {
    $lead_id = intval($_GET['lead_id'] ?? 0);
    if (!$lead_id) {
        http_response_code(400); echo json_encode(['error' => 'Lead ID required']); exit;
    }
    
    $stmt = $conn->prepare("SELECT * FROM `finance_module_payouts` WHERE `lead_id` = ?");
    $stmt->bind_param("i", $lead_id);
    $stmt->execute();
    $res = $stmt->get_result();
    $payout = $res->fetch_assoc();
    
    if (!$payout) {
        $b_stmt = $conn->prepare("SELECT SUM(credit) as total_received FROM `finance_module_banking` WHERE `lead_id` = ? AND status='matched'");
        $b_stmt->bind_param("i", $lead_id);
        $b_stmt->execute();
        $b_row = $b_stmt->get_result()->fetch_assoc();
        $received = floatval($b_row['total_received'] ?? 0);
        
        $payout = [
            'lead_id' => $lead_id,
            'bank_received_amount' => $received,
            'charges_json' => '[]',
            'total_deduction' => 0,
            'net_payable' => $received,
            'payment_status' => 'pending',
            'payment_date' => null,
            'remarks' => ''
        ];
    }
    
    echo json_encode(['payout' => $payout]);
    exit;
}

if ($action === 'save_payout' && $method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);

    $val_errs = validate_input($input, [
        'lead_id' => ['type' => 'int', 'required' => true, 'min' => 1, 'description' => 'Lead ID'],
        'bank_received_amount' => ['type' => 'float', 'min' => 0, 'description' => 'Bank Received Amount'],
        'payment_status' => ['type' => 'enum', 'options' => ['pending', 'paid'], 'description' => 'Payment Status'],
        'payment_date' => ['type' => 'date', 'description' => 'Payment Date'],
        'remarks' => ['type' => 'string', 'max_len' => 500, 'description' => 'Remarks']
    ]);
    if (!empty($val_errs)) {
        http_response_code(400); echo json_encode(['errors' => $val_errs]); exit;
    }

    $lead_id = intval($input['lead_id']);
    $received = floatval($input['bank_received_amount'] ?? 0);
    $charges = $input['charges'] ?? []; 
    $status = $input['payment_status'] ?? 'pending';
    $date = $input['payment_date'] ?: null;
    $remarks = trim($input['remarks'] ?? '');
    
    $total_deduction = 0;
    foreach ($charges as $c) {
        $total_deduction += floatval($c['amount']);
    }
    
    $net_payable = $received - $total_deduction;
    $charges_json = json_encode($charges);
    
    $check = $conn->prepare("SELECT id, payment_status FROM `finance_module_payouts` WHERE `lead_id` = ?");
    $check->bind_param("i", $lead_id);
    $check->execute();
    $existing = $check->get_result()->fetch_assoc();
    
    if ($existing) {
        $stmt = $conn->prepare("UPDATE `finance_module_payouts` SET `bank_received_amount`=?, `charges_json`=?, `total_deduction`=?, `net_payable`=?, `payment_status`=?, `payment_date`=?, `remarks`=? WHERE `lead_id`=?");
        $stmt->bind_param("dsddsssi", $received, $charges_json, $total_deduction, $net_payable, $status, $date, $remarks, $lead_id);
    } else {
        $stmt = $conn->prepare("INSERT INTO `finance_module_payouts` (`lead_id`, `bank_received_amount`, `charges_json`, `total_deduction`, `net_payable`, `payment_status`, `payment_date`, `remarks`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("idsddsss", $lead_id, $received, $charges_json, $total_deduction, $net_payable, $status, $date, $remarks);
    }
    
    $stmt->execute();
    
    $today = date('Y-m-d');
    
    if ($total_deduction > 0) {
        $l_stmt = $conn->prepare("INSERT INTO `finance_module_ledger` (`lead_id`, `date`, `description`, `credit`, `debit`, `balance`) VALUES (?, ?, ?, 0, ?, 0)");
        $desc = "Deductions applied (Total: $total_deduction)";
        $l_stmt->bind_param("issd", $lead_id, $today, $desc, $total_deduction);
        $l_stmt->execute();
    }
    
    if ($status === 'paid' && (!$existing || $existing['payment_status'] !== 'paid')) {
        $l_stmt = $conn->prepare("INSERT INTO `finance_module_ledger` (`lead_id`, `date`, `description`, `credit`, `debit`, `balance`) VALUES (?, ?, ?, 0, ?, 0)");
        $desc = "Customer Paid - Net Payable";
        $l_stmt->bind_param("issd", $lead_id, $date, $desc, $net_payable);
        $l_stmt->execute();
        
        log_finance_audit($lead_id, "Payout Paid", "Amount $net_payable paid to customer on $date");
    } else {
        log_finance_audit($lead_id, "Payout Saved", "Net payable updated to $net_payable");
    }
    
    echo json_encode(['success' => true]);
    exit;
}

// ==========================================
// LEDGER
// ==========================================
if ($action === 'get_ledger' && $method === 'GET') {
    $lead_id = intval($_GET['lead_id'] ?? 0);
    
    if ($lead_id) {
        $stmt = $conn->prepare("SELECT * FROM `finance_module_ledger` WHERE `lead_id` = ? ORDER BY `date` ASC, `id` ASC");
        $stmt->bind_param("i", $lead_id);
    } else {
        $stmt = $conn->prepare("
            SELECT f.*, l.lead_id as lead_code, l.customer_name 
            FROM `finance_module_ledger` f
            LEFT JOIN `leads` l ON f.lead_id = l.id
            ORDER BY f.date DESC, f.id DESC
            LIMIT 100
        ");
    }
    
    $stmt->execute();
    $res = $stmt->get_result();
    $entries = [];
    $balance = 0;
    while ($row = $res->fetch_assoc()) {
        if ($lead_id) {
            $balance = $balance + $row['credit'] - $row['debit'];
            $row['balance'] = $balance;
        }
        $entries[] = $row;
    }
    
    echo json_encode(['entries' => $entries, 'final_balance' => $balance]);
    exit;
}

// ==========================================
// FINANCER PAYOUT IMPORT/EXPORT
// ==========================================
if ($action === 'export_financer_payouts' && $method === 'GET') {
    $sql = "SELECT l.financer_lead_number, l.customer_name, l.disbursement_date, l.loan_amount, 
            u.name as dsa_name, u.employee_code as dsa_code, 
            f.financer_name, l.vehicle_make_model, l.vehicle_condition, 
            p.financer_payout_amount, p.financer_payout_date, p.financer_tds_amount, p.financer_net_payout, 
            p.channel_payout_amount, p.channel_payout_date, p.channel_name_text, p.organization_balance 
            FROM leads l 
            LEFT JOIN finance_module_payouts p ON l.id = p.lead_id 
            LEFT JOIN users u ON l.agent_id = u.id 
            LEFT JOIN financers f ON l.financer_id = f.id 
            WHERE l.status = 'disbursed' OR l.status = 'approved' ORDER BY l.id DESC";
    $res = $conn->query($sql);
    
    header('Content-Type: text/csv');
    header('Content-Disposition: attachment; filename="Financer_Payouts_' . date('Y-m-d') . '.csv"');
    $output = fopen('php://output', 'w');
    fputcsv($output, ['APP NO / Agmt No', 'CUSTOMER NAME', 'Disbursement Date', 'Loan Amt', 'DSA Name & Code', 'Financer', 'Model', 'Vehicle', 'Payout Amt', 'Payout Recd Date', 'Tds Amt', 'Net Payout', 'Paid to Channel', 'Paid Date', 'Channel Name', 'Net Balance']);
    
    while ($row = $res->fetch_assoc()) {
        fputcsv($output, [
            $row['financer_lead_number'],
            $row['customer_name'],
            $row['disbursement_date'],
            $row['loan_amount'],
            $row['dsa_name'] ? ($row['dsa_name'] . ' - ' . $row['dsa_code']) : '',
            $row['financer_name'],
            $row['vehicle_make_model'],
            $row['vehicle_condition'],
            $row['financer_payout_amount'],
            $row['financer_payout_date'],
            $row['financer_tds_amount'],
            $row['financer_net_payout'],
            $row['channel_payout_amount'],
            $row['channel_payout_date'],
            $row['channel_name_text'],
            $row['organization_balance']
        ]);
    }
    fclose($output);
    exit;
}

if ($action === 'upload_financer_payouts' && $method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $rows = $input['rows'] ?? [];
    
    $inserted = 0;
    foreach ($rows as $r) {
        $app_no = $r['APP NO / Agmt No'] ?? '';
        if (!$app_no) continue;
        
        $lm = $conn->prepare("SELECT id FROM leads WHERE financer_lead_number = ? LIMIT 1");
        $lm->bind_param("s", $app_no);
        $lm->execute();
        $res = $lm->get_result();
        if ($row = $res->fetch_assoc()) {
            $lead_id = $row['id'];
            
            $chk = $conn->prepare("SELECT id FROM finance_module_payouts WHERE lead_id = ?");
            $chk->bind_param("i", $lead_id);
            $chk->execute();
            $pres = $chk->get_result();
            
            $fp_amt = floatval($r['Payout Amt'] ?? 0);
            $fp_date = $r['Payout Recd Date'] ?? null;
            $fp_tds = floatval($r['Tds Amt'] ?? 0);
            $fp_net = floatval($r['Net Payout'] ?? 0);
            $cp_amt = floatval($r['Paid to Channel'] ?? 0);
            $cp_date = $r['Paid Date'] ?? null;
            $c_name = $r['Channel Name'] ?? '';
            $org_bal = floatval($r['Net Balance'] ?? 0);
            
            // Format dates
            $dates = [&$fp_date, &$cp_date];
            foreach ($dates as &$d) {
                if ($d && strpos($d, '/') !== false) {
                    $p = explode('/', $d);
                    if (count($p)===3 && strlen($p[2])===4) $d = $p[2].'-'.$p[1].'-'.$p[0];
                } elseif ($d && strpos($d, '-') !== false) {
                    $p = explode('-', $d);
                    if (count($p)===3 && strlen($p[2])===4) $d = $p[2].'-'.$p[1].'-'.$p[0];
                } else {
                    $d = null;
                }
            }
            
            if ($prow = $pres->fetch_assoc()) {
                $upd = $conn->prepare("UPDATE finance_module_payouts SET financer_payout_amount=?, financer_payout_date=?, financer_tds_amount=?, financer_net_payout=?, channel_payout_amount=?, channel_payout_date=?, channel_name_text=?, organization_balance=? WHERE lead_id=?");
                $upd->bind_param("dsdddssdi", $fp_amt, $fp_date, $fp_tds, $fp_net, $cp_amt, $cp_date, $c_name, $org_bal, $lead_id);
                $upd->execute();
            } else {
                $ins = $conn->prepare("INSERT INTO finance_module_payouts (lead_id, financer_payout_amount, financer_payout_date, financer_tds_amount, financer_net_payout, channel_payout_amount, channel_payout_date, channel_name_text, organization_balance) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $ins->bind_param("idsdddssd", $lead_id, $fp_amt, $fp_date, $fp_tds, $fp_net, $cp_amt, $cp_date, $c_name, $org_bal);
                $ins->execute();
            }
            $inserted++;
        }
    }
    echo json_encode(['success' => true, 'updated' => $inserted]);
    exit;
}

http_response_code(404);
echo json_encode(['error' => 'Invalid action']);
