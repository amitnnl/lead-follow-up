<?php
// backend/api/expenses.php
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

if ($method === 'GET' && $action === 'list') {
    $res = $conn->query("
        SELECT id, expense_date, category, amount, remarks 
        FROM office_expenses 
        ORDER BY expense_date DESC, id DESC 
        LIMIT 200
    ");
    $expenses = [];
    while ($row = $res->fetch_assoc()) {
        $expenses[] = [
            'id' => intval($row['id']),
            'expense_date' => $row['expense_date'],
            'category' => $row['category'],
            'amount' => floatval($row['amount']),
            'remarks' => $row['remarks']
        ];
    }
    
    // Calculate total
    $total_res = $conn->query("SELECT SUM(amount) as t FROM office_expenses");
    $total = floatval($total_res->fetch_assoc()['t'] ?? 0);
    
    echo json_encode(['expenses' => $expenses, 'total' => $total]);
    exit;
}

if ($method === 'POST' && $action === 'save') {
    $input = json_decode(file_get_contents('php://input'), true);
    $expense_date = $input['expense_date'] ?? date('Y-m-d');
    $category = $input['category'] ?? 'General';
    $amount = floatval($input['amount'] ?? 0);
    $remarks = $input['remarks'] ?? '';
    $user_id = current_user_id();
    
    if ($amount <= 0) {
        http_response_code(400); echo json_encode(['error' => 'Amount must be greater than zero']); exit;
    }

    $stmt = $conn->prepare("INSERT INTO office_expenses (expense_date, category, amount, remarks, created_by) VALUES (?, ?, ?, ?, ?)");
    $stmt->bind_param("ssdsi", $expense_date, $category, $amount, $remarks, $user_id);
    
    if ($stmt->execute()) {
        $expense_id = $conn->insert_id;
        
        // Log to bank_ledger to keep everything unified (optional but good for complete history)
        // Actually, maybe not bank_ledger since bank_ledger is specific to leads (lead_id is required usually).
        // Let's check bank_ledger schema: `lead_id` INT NULL?
        // Wait, bank_ledger has `lead_id`. Is it nullable?
        // I won't insert into bank_ledger if lead_id is required. The dashboard net profit calculation can just SUM from payouts and office_expenses separately.
        
        echo json_encode(['success' => true, 'id' => $expense_id]);
    } else {
        http_response_code(500); echo json_encode(['error' => 'Database error']);
    }
    exit;
}

http_response_code(404);
echo json_encode(['error' => 'Invalid action']);
