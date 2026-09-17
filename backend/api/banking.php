<?php
// backend/api/banking.php — Multi-Bank Accounts & Ledger Management
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

// Ensure multi-bank tables, columns and initial default account exist
function ensure_multi_bank_schema($conn) {
    static $checked = false;
    if ($checked) return;
    $checked = true;
    
    try {
        $conn->query("
            CREATE TABLE IF NOT EXISTS `company_bank_accounts` (
                `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                `account_name` VARCHAR(200) NOT NULL,
                `entity_name` VARCHAR(200) NULL,
                `bank_name` VARCHAR(100) NOT NULL,
                `account_number` VARCHAR(50) NOT NULL,
                `ifsc_code` VARCHAR(20) NULL,
                `branch_name` VARCHAR(150) NULL,
                `account_type` ENUM('current', 'savings', 'od_cc') NOT NULL DEFAULT 'current',
                `opening_balance` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
                `opening_date` DATE NOT NULL,
                `current_balance` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
                `is_default` TINYINT(1) NOT NULL DEFAULT 0,
                `is_active` TINYINT(1) NOT NULL DEFAULT 1,
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");
        
        $chkCol = $conn->query("SHOW COLUMNS FROM bank_ledger LIKE 'bank_account_id'");
        if ($chkCol && $chkCol->num_rows === 0) {
            $conn->query("ALTER TABLE bank_ledger ADD COLUMN bank_account_id INT UNSIGNED NULL AFTER id");
            try { $conn->query("CREATE INDEX idx_bank_ledger_acc ON bank_ledger (bank_account_id, post_date)"); } catch(Throwable $e) {}
            try { $conn->query("CREATE INDEX idx_bank_ledger_acc_utr ON bank_ledger (bank_account_id, utr_number)"); } catch(Throwable $e) {}
        }
        
        try { $conn->query("ALTER TABLE bank_ledger ADD COLUMN utr_number VARCHAR(150) NULL"); } catch(Throwable $e) {}
        try { $conn->query("ALTER TABLE bank_ledger ADD COLUMN bank_name VARCHAR(150) NULL"); } catch(Throwable $e) {}

        // Create default account if none exists
        $accCountRes = $conn->query("SELECT COUNT(*) as c FROM company_bank_accounts");
        $accCount = $accCountRes ? intval($accCountRes->fetch_assoc()['c']) : 0;
        if ($accCount === 0) {
            $conn->query("
                INSERT INTO `company_bank_accounts` 
                (`account_name`, `entity_name`, `bank_name`, `account_number`, `ifsc_code`, `opening_balance`, `opening_date`, `is_default`, `is_active`)
                VALUES ('Primary Operating Account', 'Company Operations', 'Primary Bank', 'MAIN-001', 'PRIMARY01', 0.00, '2024-01-01', 1, 1)
            ");
            $defaultAccId = $conn->insert_id;
            $conn->query("UPDATE bank_ledger SET bank_account_id = $defaultAccId WHERE bank_account_id IS NULL");
        }
    } catch (Throwable $e) {
        error_log("Multi-bank schema bootstrap notice: " . $e->getMessage());
    }
}

// Helper to recalculate running balances isolated per bank account
function recalculate_balances($conn, $target_account_id = null) {
    ensure_multi_bank_schema($conn);
    
    $accountsToRecalc = [];
    if ($target_account_id !== null && intval($target_account_id) > 0) {
        $accountsToRecalc[] = intval($target_account_id);
    } else {
        $accRes = $conn->query("SELECT id FROM company_bank_accounts");
        if ($accRes) {
            while ($aRow = $accRes->fetch_assoc()) {
                $accountsToRecalc[] = intval($aRow['id']);
            }
        }
        $accountsToRecalc[] = 0; // Unassigned pool if any
    }
    
    foreach ($accountsToRecalc as $accId) {
        $opening = 0.0;
        if ($accId > 0) {
            $accInfo = $conn->query("SELECT opening_balance FROM company_bank_accounts WHERE id = $accId");
            if ($accInfo && ($r = $accInfo->fetch_assoc())) {
                $opening = floatval($r['opening_balance']);
            }
            $where = "bank_account_id = $accId";
        } else {
            $where = "bank_account_id IS NULL OR bank_account_id = 0";
        }
        
        $res = $conn->query("SELECT id, debit_amount, credit_amount FROM bank_ledger WHERE $where ORDER BY post_date ASC, id ASC");
        $balance = $opening;
        if ($res) {
            while ($row = $res->fetch_assoc()) {
                $balance = $balance + floatval($row['credit_amount']) - floatval($row['debit_amount']);
                $stmt = $conn->prepare("UPDATE bank_ledger SET running_balance = ? WHERE id = ?");
                $stmt->bind_param("di", $balance, $row['id']);
                $stmt->execute();
            }
        }
        
        if ($accId > 0) {
            $stmtAcc = $conn->prepare("UPDATE company_bank_accounts SET current_balance = ? WHERE id = ?");
            $stmtAcc->bind_param("di", $balance, $accId);
            $stmtAcc->execute();
        }
    }
}

function parse_date($d) {
    if (empty($d)) return date('Y-m-d');
    $d = str_replace('/', '-', trim($d));
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

// Bootstrap schema once per request
ensure_multi_bank_schema($conn);

// =========================================================================
// ACTION: ACCOUNTS (List all company bank accounts with balances & stats)
// =========================================================================
if ($method === 'GET' && $action === 'accounts') {
    $sql = "
        SELECT 
            c.*,
            COALESCE((SELECT SUM(credit_amount) FROM bank_ledger WHERE bank_account_id = c.id), 0) as total_credits,
            COALESCE((SELECT SUM(debit_amount) FROM bank_ledger WHERE bank_account_id = c.id), 0) as total_debits,
            COALESCE((SELECT COUNT(id) FROM bank_ledger WHERE bank_account_id = c.id), 0) as transaction_count
        FROM company_bank_accounts c
        WHERE c.is_active = 1
        ORDER BY c.is_default DESC, c.account_name ASC
    ";
    $res = $conn->query($sql);
    $accounts = [];
    $total_liquidity = 0;
    $total_credits_all = 0;
    $total_debits_all = 0;

    if ($res) {
        while ($row = $res->fetch_assoc()) {
            $row['opening_balance'] = floatval($row['opening_balance']);
            $row['current_balance'] = floatval($row['current_balance']);
            $row['total_credits'] = floatval($row['total_credits']);
            $row['total_debits'] = floatval($row['total_debits']);
            $row['transaction_count'] = intval($row['transaction_count']);
            $row['is_default'] = (bool)$row['is_default'];

            $total_liquidity += $row['current_balance'];
            $total_credits_all += $row['total_credits'];
            $total_debits_all += $row['total_debits'];

            $accounts[] = $row;
        }
    }

    echo json_encode([
        'accounts' => $accounts,
        'summary' => [
            'total_liquidity' => $total_liquidity,
            'total_credits' => $total_credits_all,
            'total_debits' => $total_debits_all,
            'total_accounts' => count($accounts)
        ]
    ]);
    exit;
}

// =========================================================================
// ACTION: ADD_ACCOUNT (Register a new company bank account)
// =========================================================================
if ($method === 'POST' && $action === 'add_account') {
    $input = json_decode(file_get_contents('php://input'), true);
    $account_name = trim($input['account_name'] ?? '');
    $entity_name = trim($input['entity_name'] ?? '');
    $bank_name = trim($input['bank_name'] ?? '');
    $account_number = trim($input['account_number'] ?? '');
    $ifsc_code = trim($input['ifsc_code'] ?? '');
    $branch_name = trim($input['branch_name'] ?? '');
    $account_type = in_array($input['account_type'] ?? '', ['current', 'savings', 'od_cc']) ? $input['account_type'] : 'current';
    $opening_balance = parse_currency($input['opening_balance'] ?? 0);
    $opening_date = parse_date($input['opening_date'] ?? date('Y-m-d'));
    $is_default = !empty($input['is_default']) ? 1 : 0;

    if (empty($account_name) || empty($bank_name) || empty($account_number)) {
        http_response_code(400);
        echo json_encode(['error' => 'Account name, bank name, and account number are required.']);
        exit;
    }

    if ($is_default) {
        $conn->query("UPDATE company_bank_accounts SET is_default = 0");
    }

    $stmt = $conn->prepare("
        INSERT INTO company_bank_accounts 
        (account_name, entity_name, bank_name, account_number, ifsc_code, branch_name, account_type, opening_balance, opening_date, current_balance, is_default, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    ");
    $stmt->bind_param("sssssssdsdi", $account_name, $entity_name, $bank_name, $account_number, $ifsc_code, $branch_name, $account_type, $opening_balance, $opening_date, $opening_balance, $is_default);

    if ($stmt->execute()) {
        $newId = $conn->insert_id;
        recalculate_balances($conn, $newId);
        echo json_encode(['success' => true, 'id' => $newId, 'message' => 'Bank account created successfully.']);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to create bank account: ' . $stmt->error]);
    }
    exit;
}

// =========================================================================
// ACTION: EDIT_ACCOUNT (Update company bank account details)
// =========================================================================
if ($method === 'POST' && $action === 'edit_account') {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = intval($input['id'] ?? 0);
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'Valid Account ID required']);
        exit;
    }

    $account_name = trim($input['account_name'] ?? '');
    $entity_name = trim($input['entity_name'] ?? '');
    $bank_name = trim($input['bank_name'] ?? '');
    $account_number = trim($input['account_number'] ?? '');
    $ifsc_code = trim($input['ifsc_code'] ?? '');
    $branch_name = trim($input['branch_name'] ?? '');
    $account_type = in_array($input['account_type'] ?? '', ['current', 'savings', 'od_cc']) ? $input['account_type'] : 'current';
    $opening_balance = parse_currency($input['opening_balance'] ?? 0);
    $opening_date = parse_date($input['opening_date'] ?? date('Y-m-d'));
    $is_default = !empty($input['is_default']) ? 1 : 0;

    if (empty($account_name) || empty($bank_name) || empty($account_number)) {
        http_response_code(400);
        echo json_encode(['error' => 'Account name, bank name, and account number are required.']);
        exit;
    }

    if ($is_default) {
        $conn->query("UPDATE company_bank_accounts SET is_default = 0 WHERE id != $id");
    }

    $stmt = $conn->prepare("
        UPDATE company_bank_accounts 
        SET account_name=?, entity_name=?, bank_name=?, account_number=?, ifsc_code=?, branch_name=?, account_type=?, opening_balance=?, opening_date=?, is_default=?
        WHERE id=?
    ");
    $stmt->bind_param("sssssssdsii", $account_name, $entity_name, $bank_name, $account_number, $ifsc_code, $branch_name, $account_type, $opening_balance, $opening_date, $is_default, $id);

    if ($stmt->execute()) {
        recalculate_balances($conn, $id);
        echo json_encode(['success' => true, 'message' => 'Bank account updated successfully.']);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to update bank account: ' . $stmt->error]);
    }
    exit;
}

// =========================================================================
// ACTION: DELETE_ACCOUNT (Deactivate or remove account)
// =========================================================================
if ($method === 'POST' && $action === 'delete_account') {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = intval($input['id'] ?? 0);
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'Valid Account ID required']);
        exit;
    }

    // Check if account has transactions
    $chkTx = $conn->prepare("SELECT COUNT(*) as c FROM bank_ledger WHERE bank_account_id = ?");
    $chkTx->bind_param("i", $id);
    $chkTx->execute();
    $txCount = $chkTx->get_result()->fetch_assoc()['c'] ?? 0;

    if ($txCount > 0) {
        // Soft delete / deactivate to preserve historical ledger integrity
        $conn->query("UPDATE company_bank_accounts SET is_active = 0, is_default = 0 WHERE id = $id");
        echo json_encode(['success' => true, 'message' => 'Account has transactions; deactivated safely.']);
    } else {
        $conn->query("DELETE FROM company_bank_accounts WHERE id = $id");
        echo json_encode(['success' => true, 'message' => 'Account deleted successfully.']);
    }
    exit;
}

// =========================================================================
// ACTION: LIST (Transactions list with multi-account support)
// =========================================================================
if ($method === 'GET' && $action === 'list') {
    $lead_id = isset($_GET['lead_id']) ? intval($_GET['lead_id']) : 0;
    $bank_account_id = isset($_GET['bank_account_id']) && $_GET['bank_account_id'] !== 'all' ? intval($_GET['bank_account_id']) : 0;
    $start_date = !empty($_GET['start_date']) ? $_GET['start_date'] : null;
    $end_date = !empty($_GET['end_date']) ? $_GET['end_date'] : null;
    
    $whereParts = [];
    $params = [];
    $types = '';

    if ($lead_id > 0) {
        $whereParts[] = "b.lead_id = ?";
        $params[] = $lead_id;
        $types .= 'i';
    }

    if ($bank_account_id > 0) {
        $whereParts[] = "b.bank_account_id = ?";
        $params[] = $bank_account_id;
        $types .= 'i';
    }

    if ($start_date) {
        $whereParts[] = "b.post_date >= ?";
        $params[] = $start_date;
        $types .= 's';
    }

    if ($end_date) {
        $whereParts[] = "b.post_date <= ?";
        $params[] = $end_date;
        $types .= 's';
    }

    $whereSql = !empty($whereParts) ? "WHERE " . implode(" AND ", $whereParts) : "";
    $orderSql = $lead_id > 0 ? "ORDER BY b.post_date ASC, b.id ASC" : "ORDER BY b.post_date DESC, b.id DESC LIMIT 1000";

    $sql = "
        SELECT 
            b.*, 
            l.customer_name as lead_customer_name, 
            l.lead_id as lead_code,
            c.account_name as company_account_name,
            c.bank_name as company_bank_name,
            c.account_number as company_account_number,
            c.entity_name as company_entity_name
        FROM bank_ledger b
        LEFT JOIN leads l ON b.lead_id = l.id
        LEFT JOIN company_bank_accounts c ON b.bank_account_id = c.id
        $whereSql
        $orderSql
    ";

    if (!empty($params)) {
        $stmt = $conn->prepare($sql);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        $res = $stmt->get_result();
    } else {
        $res = $conn->query($sql);
    }

    $entries = [];
    $balance = 0;
    while ($row = $res->fetch_assoc()) {
        if ($lead_id > 0) {
            $balance = $balance + floatval($row['credit_amount']) - floatval($row['debit_amount']);
            $row['running_balance'] = $balance;
        }
        $entries[] = $row;
    }

    // Determine current closing balance to return
    if ($bank_account_id > 0) {
        $accBal = $conn->query("SELECT current_balance FROM company_bank_accounts WHERE id = $bank_account_id");
        $final_balance = $accBal && ($bRow = $accBal->fetch_assoc()) ? floatval($bRow['current_balance']) : 0;
    } else {
        $totBal = $conn->query("SELECT SUM(current_balance) as tot FROM company_bank_accounts WHERE is_active = 1");
        $final_balance = $totBal && ($tRow = $totBal->fetch_assoc()) ? floatval($tRow['tot']) : 0;
    }

    echo json_encode([
        'entries' => $entries,
        'final_balance' => $final_balance
    ]);
    exit;
}

// =========================================================================
// ACTION: ADD (Manual Transaction)
// =========================================================================
if ($method === 'POST' && $action === 'add') {
    $input = json_decode(file_get_contents('php://input'), true);
    $bank_account_id = !empty($input['bank_account_id']) ? intval($input['bank_account_id']) : null;
    $lead_id = !empty($input['lead_id']) ? intval($input['lead_id']) : null;
    $post_date = parse_date($input['post_date'] ?? date('Y-m-d'));
    $customer_name = trim($input['customer_name'] ?? '');
    $reg_no = trim($input['reg_no'] ?? '');
    $account_description = trim($input['account_description'] ?? '');
    $transaction_type = $input['transaction_type'] ?? 'OTHER';
    $debit_amount = parse_currency($input['debit_amount'] ?? 0);
    $credit_amount = parse_currency($input['credit_amount'] ?? 0);
    $remarks = trim($input['remarks'] ?? '');
    $pending_amount = parse_currency($input['pending_amount'] ?? 0);
    $status = $input['status'] ?? 'Clear';
    $utr_number = trim($input['utr_number'] ?? '');
    $bank_name = trim($input['bank_name'] ?? '');
    $loan_amount = parse_currency($input['loan_amount'] ?? 0);

    // Default to default bank account if not selected
    if (!$bank_account_id) {
        $def = $conn->query("SELECT id, bank_name FROM company_bank_accounts WHERE is_default = 1 AND is_active = 1 LIMIT 1");
        if ($def && ($defRow = $def->fetch_assoc())) {
            $bank_account_id = intval($defRow['id']);
            if (empty($bank_name)) $bank_name = $defRow['bank_name'];
        }
    }

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

    $stmt = $conn->prepare("
        INSERT INTO bank_ledger 
        (bank_account_id, lead_id, post_date, customer_name, reg_no, account_description, transaction_type, debit_amount, credit_amount, remarks, pending_amount, status, utr_number, bank_name, loan_amount) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->bind_param("iisssssddsssssd", $bank_account_id, $lead_id, $post_date, $customer_name, $reg_no, $account_description, $transaction_type, $debit_amount, $credit_amount, $remarks, $pending_amount, $status, $utr_number, $bank_name, $loan_amount);
    
    if ($stmt->execute()) {
        recalculate_balances($conn, $bank_account_id);
        echo json_encode(['success' => true]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Database error: ' . $stmt->error]);
    }
    exit;
}

// =========================================================================
// ACTION: UPLOAD (CSV / Statement Import tied to specific Bank Account)
// =========================================================================
if ($method === 'POST' && $action === 'upload') {
    $input = json_decode(file_get_contents('php://input'), true);
    $bank_account_id = !empty($input['bank_account_id']) ? intval($input['bank_account_id']) : null;
    $rows = $input['rows'] ?? [];
    
    // If no bank_account_id specified, pick the default active company account
    if (!$bank_account_id) {
        $def = $conn->query("SELECT id, bank_name FROM company_bank_accounts WHERE is_default = 1 AND is_active = 1 LIMIT 1");
        if ($def && ($defRow = $def->fetch_assoc())) {
            $bank_account_id = intval($defRow['id']);
        } else {
            $first = $conn->query("SELECT id, bank_name FROM company_bank_accounts WHERE is_active = 1 ORDER BY id ASC LIMIT 1");
            if ($first && ($firstRow = $first->fetch_assoc())) {
                $bank_account_id = intval($firstRow['id']);
            }
        }
    }

    if (!$bank_account_id) {
        http_response_code(400);
        echo json_encode(['error' => 'Please select or create a Bank Account before importing statements.']);
        exit;
    }

    // Get account info for fallback
    $accInfo = $conn->query("SELECT bank_name, account_name FROM company_bank_accounts WHERE id = $bank_account_id");
    $accRow = $accInfo ? $accInfo->fetch_assoc() : null;
    $accBankName = $accRow['bank_name'] ?? 'Bank Statement';

    $inserted = 0;
    $skipped_duplicates = 0;
    
    foreach ($rows as $r) {
        $date = parse_date($r['date'] ?? '');
        $customer_name = trim($r['customer_name'] ?? '');
        $reg_no = trim($r['reg_no'] ?? '');
        $loan_amount = parse_currency($r['loan_amount'] ?? 0);
        $status = $r['status'] ?? 'Clear';
        $account_description = trim($r['account_description'] ?? '');
        $utr_number = trim($r['utr_number'] ?? '');
        $debit_amount = parse_currency($r['debit_amount'] ?? 0);
        $credit_amount = parse_currency($r['credit_amount'] ?? 0);
        $pending_amount = parse_currency($r['pending_amount'] ?? 0);
        $remarks = trim($r['remarks'] ?? '');
        $bank_name = trim($r['bank_name'] ?? '') ?: $accBankName;
        
        $transaction_type = 'OTHER';
        if ($credit_amount > 0 && stripos($account_description, 'loan') !== false) {
            $transaction_type = 'LOAN_AMOUNT';
        }
        
        // Skip empty noise rows
        if (empty($customer_name) && empty($utr_number) && empty($reg_no) && empty($account_description) && $debit_amount == 0 && $credit_amount == 0) {
            continue;
        }
        
        // Prevent duplicate UTR within this specific bank account
        if (!empty($utr_number)) {
            $chk = $conn->prepare("SELECT id FROM bank_ledger WHERE utr_number = ? AND bank_account_id = ?");
            $chk->bind_param("si", $utr_number, $bank_account_id);
            $chk->execute();
            if ($chk->get_result()->fetch_assoc()) {
                $skipped_duplicates++;
                continue;
            }
        }
        
        // Auto-match logic with leads
        $lead_id = null;
        if (!empty($reg_no)) {
            $cleanReg = str_replace(' ', '', $reg_no);
            $lm = $conn->prepare("SELECT id FROM leads WHERE REPLACE(registration_number, ' ', '') LIKE ? LIMIT 1");
            $like = "%$cleanReg%";
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
        
        $stmt = $conn->prepare("
            INSERT INTO bank_ledger 
            (bank_account_id, lead_id, post_date, customer_name, reg_no, account_description, transaction_type, debit_amount, credit_amount, remarks, pending_amount, status, utr_number, bank_name, loan_amount) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->bind_param("iisssssddsssssd", $bank_account_id, $lead_id, $date, $customer_name, $reg_no, $account_description, $transaction_type, $debit_amount, $credit_amount, $remarks, $pending_amount, $status, $utr_number, $bank_name, $loan_amount);
        if ($stmt->execute()) {
            $inserted++;
        }
    }
    
    recalculate_balances($conn, $bank_account_id);
    echo json_encode([
        'success' => true, 
        'inserted' => $inserted,
        'skipped' => $skipped_duplicates,
        'bank_account_id' => $bank_account_id
    ]);
    exit;
}

// =========================================================================
// ACTION: EDIT (Update existing transaction)
// =========================================================================
if ($method === 'POST' && $action === 'edit') {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = intval($input['id'] ?? 0);
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'ID required']);
        exit;
    }

    // Check old bank_account_id
    $oldRowRes = $conn->query("SELECT bank_account_id FROM bank_ledger WHERE id = $id");
    $oldAccId = $oldRowRes ? intval($oldRowRes->fetch_assoc()['bank_account_id']) : null;
    
    $bank_account_id = !empty($input['bank_account_id']) ? intval($input['bank_account_id']) : $oldAccId;
    $post_date = parse_date($input['post_date'] ?? date('Y-m-d'));
    $customer_name = trim($input['customer_name'] ?? '');
    $reg_no = trim($input['reg_no'] ?? '');
    $account_description = trim($input['account_description'] ?? '');
    $debit_amount = parse_currency($input['debit_amount'] ?? 0);
    $credit_amount = parse_currency($input['credit_amount'] ?? 0);
    $remarks = trim($input['remarks'] ?? '');
    $pending_amount = parse_currency($input['pending_amount'] ?? 0);
    $status = $input['status'] ?? 'Clear';
    $utr_number = trim($input['utr_number'] ?? '');
    $bank_name = trim($input['bank_name'] ?? '');
    $loan_amount = parse_currency($input['loan_amount'] ?? 0);

    $stmt = $conn->prepare("
        UPDATE bank_ledger 
        SET bank_account_id=?, post_date=?, customer_name=?, reg_no=?, account_description=?, debit_amount=?, credit_amount=?, remarks=?, pending_amount=?, status=?, utr_number=?, bank_name=?, loan_amount=? 
        WHERE id=?
    ");
    $stmt->bind_param("issssddsssssdi", $bank_account_id, $post_date, $customer_name, $reg_no, $account_description, $debit_amount, $credit_amount, $remarks, $pending_amount, $status, $utr_number, $bank_name, $loan_amount, $id);
    
    if ($stmt->execute()) {
        recalculate_balances($conn, $bank_account_id);
        if ($oldAccId && $oldAccId !== $bank_account_id) {
            recalculate_balances($conn, $oldAccId);
        }
        echo json_encode(['success' => true]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Database error: ' . $stmt->error]);
    }
    exit;
}

// =========================================================================
// ACTION: DELETE (Delete transaction)
// =========================================================================
if ($method === 'POST' && $action === 'delete') {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = intval($input['id'] ?? 0);
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'ID required']);
        exit;
    }

    $rowRes = $conn->query("SELECT bank_account_id FROM bank_ledger WHERE id = $id");
    $accId = $rowRes ? intval($rowRes->fetch_assoc()['bank_account_id']) : null;
    
    $stmt = $conn->prepare("DELETE FROM bank_ledger WHERE id=?");
    $stmt->bind_param("i", $id);
    
    if ($stmt->execute()) {
        recalculate_balances($conn, $accId);
        echo json_encode(['success' => true]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Database error']);
    }
    exit;
}

http_response_code(404);
echo json_encode(['error' => 'Invalid action']);
