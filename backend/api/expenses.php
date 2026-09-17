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
    $start_date = $_GET['start_date'] ?? '';
    $end_date = $_GET['end_date'] ?? '';

    $where = [];
    $params = [];
    $types = '';

    if (!empty($start_date)) {
        $where[] = "expense_date >= ?";
        $params[] = $start_date;
        $types .= 's';
    }
    if (!empty($end_date)) {
        $where[] = "expense_date <= ?";
        $params[] = $end_date;
        $types .= 's';
    }

    $sql = "SELECT id, expense_date, category, amount, remarks FROM office_expenses";
    if (!empty($where)) {
        $sql .= " WHERE " . implode(" AND ", $where);
    }
    $sql .= " ORDER BY expense_date DESC, id DESC LIMIT 500";

    if (!empty($params)) {
        $stmt = $conn->prepare($sql);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        $res = $stmt->get_result();
    } else {
        $res = $conn->query($sql);
    }

    $expenses = [];
    $total = 0;
    while ($row = $res->fetch_assoc()) {
        $amt = floatval($row['amount']);
        $total += $amt;
        $expenses[] = [
            'id' => intval($row['id']),
            'expense_date' => $row['expense_date'],
            'category' => $row['category'],
            'amount' => $amt,
            'remarks' => $row['remarks']
        ];
    }
    
    echo json_encode(['expenses' => $expenses, 'total' => $total]);
    exit;
}

if ($method === 'POST' && $action === 'save') {
    $input = json_decode(file_get_contents('php://input'), true);
    $expense_date = $input['expense_date'] ?? date('Y-m-d');
    $category = trim($input['category'] ?? 'General');
    $amount = floatval($input['amount'] ?? 0);
    $remarks = trim($input['remarks'] ?? '');
    $user_id = current_user_id();
    $id = isset($input['id']) ? intval($input['id']) : 0;
    
    if ($amount <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Amount must be greater than zero']);
        exit;
    }

    if ($id > 0) {
        $stmt = $conn->prepare("UPDATE office_expenses SET expense_date = ?, category = ?, amount = ?, remarks = ? WHERE id = ?");
        $stmt->bind_param("ssdsi", $expense_date, $category, $amount, $remarks, $id);
        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'id' => $id]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to update expense']);
        }
    } else {
        $stmt = $conn->prepare("INSERT INTO office_expenses (expense_date, category, amount, remarks, created_by) VALUES (?, ?, ?, ?, ?)");
        $stmt->bind_param("ssdsi", $expense_date, $category, $amount, $remarks, $user_id);
        
        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'id' => $conn->insert_id]);
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

    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid ID']);
        exit;
    }

    $stmt = $conn->prepare("DELETE FROM office_expenses WHERE id = ?");
    $stmt->bind_param("i", $id);
    if ($stmt->execute()) {
        echo json_encode(['success' => true]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to delete expense']);
    }
    exit;
}

http_response_code(404);
echo json_encode(['error' => 'Invalid action']);
