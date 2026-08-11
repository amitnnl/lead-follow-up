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

if ($method === 'GET') {
    // 1. Total Payouts Received (from payouts)
    $payouts_res = $conn->query("SELECT SUM(payout_received_amt) as t FROM payouts");
    $total_payouts = floatval($payouts_res->fetch_assoc()['t'] ?? 0);

    // 2. Client Commission (Retained) - from customer_settlements
    $comm_res = $conn->query("SELECT SUM(client_comm_amount) as t FROM customer_settlements");
    $total_comm = floatval($comm_res->fetch_assoc()['t'] ?? 0);

    // 3. Office Expenses
    $exp_res = $conn->query("SELECT SUM(amount) as t FROM office_expenses");
    $total_expenses = floatval($exp_res->fetch_assoc()['t'] ?? 0);

    // Net Profit = (Total Payouts + Client Commission) - Office Expenses
    $net_profit = ($total_payouts + $total_comm) - $total_expenses;

    echo json_encode([
        'total_payouts_received' => $total_payouts,
        'client_comm_retained' => $total_comm,
        'gross_income' => $total_payouts + $total_comm,
        'total_office_expenses' => $total_expenses,
        'net_profit' => $net_profit
    ]);
    exit;
}

http_response_code(404);
echo json_encode(['error' => 'Invalid action']);
