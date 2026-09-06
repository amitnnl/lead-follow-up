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
    // 1. Total Payouts Received (Gross) & Taxes from payouts & Channel payouts
    $payouts_res = $conn->query("SELECT SUM(IF(gross_payout_amount > 0, gross_payout_amount, payout_received_amt)) as gross, SUM(tds_amt) as tds, SUM(igst + sgst + gst_paid) as gst, SUM(agent_commission) as channel_paid FROM payouts");
    $payouts_data = $payouts_res->fetch_assoc();
    $total_payouts = floatval($payouts_data['gross'] ?? 0);
    $payout_tds = floatval($payouts_data['tds'] ?? 0);
    $payout_gst = floatval($payouts_data['gst'] ?? 0);
    $payout_taxes = $payout_tds + $payout_gst;
    $total_channel_paid = floatval($payouts_data['channel_paid'] ?? 0);

    // 2. Client Commission (Retained) - from customer_settlements
    $comm_res = $conn->query("SELECT SUM(client_comm_amount) as t FROM customer_settlements");
    $total_comm = floatval($comm_res->fetch_assoc()['t'] ?? 0);

    // 3. Manual Taxes (Office Expenses)
    $exp_res = $conn->query("SELECT SUM(amount) as t FROM office_expenses");
    $manual_taxes = floatval($exp_res->fetch_assoc()['t'] ?? 0);

    $total_taxes = $payout_taxes + $manual_taxes;
    $gross_income = $total_payouts + $total_comm;

    // Net Profit = Gross Income - Total Tax Paid - Channel Paid
    $net_profit = $gross_income - $total_taxes - $total_channel_paid;

    echo json_encode([
        'total_payouts_received' => $total_payouts,
        'client_comm_retained' => $total_comm,
        'gross_income' => $gross_income,
        'total_channel_paid' => $total_channel_paid,
        'total_office_expenses' => $total_taxes,
        'tds_total' => $payout_tds,
        'gst_total' => $payout_gst,
        'expenses_total' => $manual_taxes,
        'net_profit' => $net_profit
    ]);
    exit;
}

http_response_code(404);
echo json_encode(['error' => 'Invalid action']);
