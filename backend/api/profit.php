<?php
// backend/api/profit.php
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

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// Handle Other Income actions
if ($method === 'POST' && $action === 'save_other_income') {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = intval($input['id'] ?? 0);
    $income_date = $input['income_date'] ?? date('Y-m-d');
    $category = trim($input['category'] ?? 'Interest From Bank');
    $amount = floatval($input['amount'] ?? 0);
    $reference_no = trim($input['reference_no'] ?? '');
    $remarks = trim($input['remarks'] ?? '');
    $user_id = current_user_id();

    if ($amount <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Amount must be greater than zero']);
        exit;
    }

    if ($id > 0) {
        $stmt = $conn->prepare("UPDATE finance_other_income SET income_date = ?, category = ?, amount = ?, reference_no = ?, remarks = ? WHERE id = ?");
        $stmt->bind_param("ssdssi", $income_date, $category, $amount, $reference_no, $remarks, $id);
        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'id' => $id]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to update income']);
        }
    } else {
        $stmt = $conn->prepare("INSERT INTO finance_other_income (income_date, category, amount, reference_no, remarks, created_by) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("ssdssi", $income_date, $category, $amount, $reference_no, $remarks, $user_id);
        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'id' => $conn->insert_id]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to save income']);
        }
    }
    exit;
}

if ($method === 'POST' && $action === 'delete_other_income') {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = intval($input['id'] ?? 0);
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid ID']);
        exit;
    }
    $stmt = $conn->prepare("DELETE FROM finance_other_income WHERE id = ?");
    $stmt->bind_param("i", $id);
    if ($stmt->execute()) {
        echo json_encode(['success' => true]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to delete income']);
    }
    exit;
}

if ($method === 'GET' && $action === 'other_income_list') {
    $start_date = $_GET['start_date'] ?? '';
    $end_date = $_GET['end_date'] ?? '';

    $where = [];
    $params = [];
    $types = '';

    if (!empty($start_date)) {
        $where[] = "income_date >= ?";
        $params[] = $start_date;
        $types .= 's';
    }
    if (!empty($end_date)) {
        $where[] = "income_date <= ?";
        $params[] = $end_date;
        $types .= 's';
    }

    $sql = "SELECT id, income_date, category, amount, reference_no, remarks, created_at FROM finance_other_income";
    if (!empty($where)) {
        $sql .= " WHERE " . implode(" AND ", $where);
    }
    $sql .= " ORDER BY income_date DESC, id DESC LIMIT 500";

    if (!empty($params)) {
        $stmt = $conn->prepare($sql);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        $res = $stmt->get_result();
    } else {
        $res = $conn->query($sql);
    }

    $incomes = [];
    $total = 0;
    while ($row = $res->fetch_assoc()) {
        $amt = floatval($row['amount']);
        $total += $amt;
        $incomes[] = [
            'id' => intval($row['id']),
            'income_date' => $row['income_date'],
            'category' => $row['category'],
            'amount' => $amt,
            'reference_no' => $row['reference_no'] ?? '',
            'remarks' => $row['remarks'] ?? '',
            'created_at' => $row['created_at']
        ];
    }
    echo json_encode(['incomes' => $incomes, 'total' => $total]);
    exit;
}

// Default GET: P&L Statement
if ($method === 'GET') {
    $start_date = $_GET['start_date'] ?? '';
    $end_date = $_GET['end_date'] ?? '';
    $has_date_filter = (!empty($start_date) && !empty($end_date));

    // 1. Payouts (Bank/NBFC Commission received and Channel Commission paid)
    $payout_date_expr = "COALESCE(payout_received_date, CASE WHEN disb_date REGEXP '^[0-9]{2}-[0-9]{2}-[0-9]{4}$' THEN STR_TO_DATE(disb_date, '%d-%m-%Y') WHEN disb_date REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN STR_TO_DATE(disb_date, '%Y-%m-%d') ELSE NULL END, DATE(created_at))";

    $payout_sql = "SELECT 
        SUM(IF(gross_payout_amount > 0, gross_payout_amount, payout_received_amt)) as gross,
        SUM(tds_amt) as tds,
        SUM(igst) as igst,
        SUM(sgst) as sgst,
        SUM(agent_commission) as channel_paid,
        COUNT(*) as total_count
    FROM payouts";

    if ($has_date_filter) {
        $payout_sql .= " WHERE {$payout_date_expr} >= '{$conn->real_escape_string($start_date)}' AND {$payout_date_expr} <= '{$conn->real_escape_string($end_date)}'";
    }

    $payouts_res = $conn->query($payout_sql);
    $payouts_data = $payouts_res ? $payouts_res->fetch_assoc() : [];

    $bank_nbfc_commission = floatval($payouts_data['gross'] ?? 0);
    $total_channel_paid = floatval($payouts_data['channel_paid'] ?? 0);
    $payout_tds = floatval($payouts_data['tds'] ?? 0);
    $payout_igst = floatval($payouts_data['igst'] ?? 0);
    $payout_sgst = floatval($payouts_data['sgst'] ?? 0);
    $payout_gst = $payout_igst + $payout_sgst;
    $payout_taxes = $payout_tds + $payout_gst;

    // 2. Client Commission (Retained from customer_settlements)
    $settle_sql = "SELECT SUM(client_comm_amount) as t FROM customer_settlements";
    if ($has_date_filter) {
        $settle_sql .= " WHERE payment_date >= '{$conn->real_escape_string($start_date)}' AND payment_date <= '{$conn->real_escape_string($end_date)}'";
    }
    $comm_res = $conn->query($settle_sql);
    $client_comm_retained = floatval($comm_res ? ($comm_res->fetch_assoc()['t'] ?? 0) : 0);

    // 3. Other Incomes (Interest From Bank, Commission received from Channel, Commission received from Dealer, etc.)
    $other_income_sql = "SELECT category, SUM(amount) as total_amount FROM finance_other_income";
    if ($has_date_filter) {
        $other_income_sql .= " WHERE income_date >= '{$conn->real_escape_string($start_date)}' AND income_date <= '{$conn->real_escape_string($end_date)}'";
    }
    $other_income_sql .= " GROUP BY category";

    $other_income_res = $conn->query($other_income_sql);
    $other_incomes_by_category = [];
    $total_other_income = 0;

    if ($other_income_res) {
        while ($row = $other_income_res->fetch_assoc()) {
            $cat = $row['category'];
            $amt = floatval($row['total_amount']);
            $other_incomes_by_category[$cat] = $amt;
            $total_other_income += $amt;
        }
    }

    // Specific known categories for easy mapping
    $interest_from_bank = floatval($other_incomes_by_category['Interest From Bank'] ?? 0);
    $commission_from_channel = floatval($other_incomes_by_category['Commission received from Channel'] ?? 0);
    $commission_from_dealer = floatval($other_incomes_by_category['Commission received from Dealer'] ?? 0);

    // If there is retained client commission, include under channel/client commission
    $effective_channel_commission = $commission_from_channel + $client_comm_retained;

    // Total Income
    $total_income = $bank_nbfc_commission + $total_other_income + $client_comm_retained;

    // 4. Office Expenses itemized by Category
    $exp_sql = "SELECT category, SUM(amount) as total_amount, COUNT(*) as entry_count FROM office_expenses";
    if ($has_date_filter) {
        $exp_sql .= " WHERE expense_date >= '{$conn->real_escape_string($start_date)}' AND expense_date <= '{$conn->real_escape_string($end_date)}'";
    }
    $exp_sql .= " GROUP BY category ORDER BY total_amount DESC";

    $exp_res = $conn->query($exp_sql);
    $expenses_by_category = [];
    $total_office_expenses = 0;

    if ($exp_res) {
        while ($row = $exp_res->fetch_assoc()) {
            $cat = $row['category'];
            $amt = floatval($row['total_amount']);
            $expenses_by_category[$cat] = $amt;
            $total_office_expenses += $amt;
        }
    }

    // Standard categories list matching Excel sheet for structured rendering
    $standard_expense_heads = [
        'Office Rent' => floatval($expenses_by_category['Office Rent'] ?? $expenses_by_category['Rent'] ?? 0),
        'Salary' => floatval($expenses_by_category['Salary'] ?? $expenses_by_category['Salaries'] ?? 0),
        'Tea Expense' => floatval($expenses_by_category['Tea Expense'] ?? $expenses_by_category['Tea & Refreshments'] ?? 0),
        'Water expense' => floatval($expenses_by_category['Water expense'] ?? $expenses_by_category['Water Expenses'] ?? 0),
        'Advertising Expenses' => floatval($expenses_by_category['Advertising Expenses'] ?? $expenses_by_category['Marketing'] ?? 0),
        'Bank Charges' => floatval($expenses_by_category['Bank Charges'] ?? 0),
        'Courier Charges' => floatval($expenses_by_category['Courier Charges'] ?? 0),
        'Office Expenses' => floatval($expenses_by_category['Office Expenses'] ?? $expenses_by_category['General'] ?? 0),
        'Repairs and Maintenance Charges' => floatval($expenses_by_category['Repairs and Maintenance Charges'] ?? $expenses_by_category['Maintenance'] ?? 0),
        'Stationery Exp' => floatval($expenses_by_category['Stationery Exp'] ?? $expenses_by_category['Stationery'] ?? 0),
        'Depreciation Exp' => floatval($expenses_by_category['Depreciation Exp'] ?? $expenses_by_category['Depreciation'] ?? 0),
        'Misc Exp. / Food exp' => floatval($expenses_by_category['Misc Exp. / Food exp'] ?? $expenses_by_category['Food & Misc'] ?? 0),
        'Remuneration' => floatval($expenses_by_category['Remuneration'] ?? 0)
    ];

    // Identify any custom categories not in standard list
    $custom_expense_heads = [];
    $known_keys = [
        'Office Rent', 'Rent', 'Salary', 'Salaries', 'Tea Expense', 'Tea & Refreshments',
        'Water expense', 'Water Expenses', 'Advertising Expenses', 'Marketing',
        'Bank Charges', 'Courier Charges', 'Office Expenses', 'General',
        'Repairs and Maintenance Charges', 'Maintenance', 'Stationery Exp', 'Stationery',
        'Depreciation Exp', 'Depreciation', 'Misc Exp. / Food exp', 'Food & Misc', 'Remuneration'
    ];
    foreach ($expenses_by_category as $cat => $amt) {
        if (!in_array($cat, $known_keys) && $amt > 0) {
            $custom_expense_heads[$cat] = $amt;
        }
    }

    // Total Expenses = Direct (Commission Paid to Channel) + Indirect (Total Office Expenses)
    $total_expenses = $total_channel_paid + $total_office_expenses;

    // Net Profit = Total Income - Total Expenses
    $net_profit = $total_income - $total_expenses;
    $net_margin = $total_income > 0 ? round(($net_profit / $total_income) * 100, 2) : 0;

    // Balancing totals
    $balancing_total = max($total_income, $total_expenses);

    // Build structured output
    $response = [
        'period' => [
            'start_date' => $start_date,
            'end_date' => $end_date,
            'is_filtered' => $has_date_filter
        ],
        // Income Side (Credit)
        'income' => [
            'bank_nbfc_commission' => $bank_nbfc_commission,
            'commission_from_channel' => $effective_channel_commission,
            'commission_from_dealer' => $commission_from_dealer,
            'interest_from_bank' => $interest_from_bank,
            'other_incomes_by_category' => $other_incomes_by_category,
            'client_comm_retained' => $client_comm_retained,
            'total_income' => $total_income
        ],
        // Expenses Side (Debit)
        'expenses' => [
            'commission_paid_channel' => $total_channel_paid,
            'standard_heads' => $standard_expense_heads,
            'custom_heads' => $custom_expense_heads,
            'by_category' => $expenses_by_category,
            'subtotal_office_expenses' => $total_office_expenses,
            'total_expenses' => $total_expenses
        ],
        // Balancing & Bottom Line
        'net_profit' => $net_profit,
        'net_margin_percent' => $net_margin,
        'balancing_total' => $balancing_total,
        'taxes' => [
            'tds_total' => $payout_tds,
            'igst_total' => $payout_igst,
            'sgst_total' => $payout_sgst,
            'gst_total' => $payout_gst,
            'total_tax' => $payout_taxes
        ],
        // PayoutTab.tsx summary fields
        'total_payouts_received' => $bank_nbfc_commission,
        'client_comm_retained' => $client_comm_retained,
        'gross_income' => $total_income,
        'total_channel_paid' => $total_channel_paid,
        'tds_total' => $payout_tds,
        'igst_total' => $payout_igst,
        'sgst_total' => $payout_sgst,
        'gst_total' => $payout_gst,
        'payout_taxes' => $payout_taxes,
        'total_tax' => $payout_taxes,
        'total_office_expenses' => $total_office_expenses,
        'expenses_total' => $total_office_expenses
    ];

    echo json_encode($response);
    exit;
}

http_response_code(404);
echo json_encode(['error' => 'Invalid action']);
