<?php
// backend/api/charge_master.php
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
    $res = $conn->query("SELECT * FROM charge_masters ORDER BY id DESC");
    $charges = [];
    while ($row = $res->fetch_assoc()) {
        $charges[] = $row;
    }
    echo json_encode(['charges' => $charges]);
    exit;
}

if ($method === 'POST' && $action === 'save') {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = intval($input['id'] ?? 0);
    $charge_name = $input['charge_name'] ?? '';
    $charge_type = $input['charge_type'] ?? 'FIXED';
    $value = floatval($input['value'] ?? 0);
    $is_active = isset($input['is_active']) ? (int)$input['is_active'] : 1;

    if (empty($charge_name)) {
        http_response_code(400);
        echo json_encode(['error' => 'Charge name is required']);
        exit;
    }

    if ($id > 0) {
        $stmt = $conn->prepare("UPDATE charge_masters SET charge_name=?, charge_type=?, value=?, is_active=? WHERE id=?");
        $stmt->bind_param("ssdii", $charge_name, $charge_type, $value, $is_active, $id);
    } else {
        $stmt = $conn->prepare("INSERT INTO charge_masters (charge_name, charge_type, value, is_active) VALUES (?, ?, ?, ?)");
        $stmt->bind_param("ssdi", $charge_name, $charge_type, $value, $is_active);
    }

    if ($stmt->execute()) {
        echo json_encode(['success' => true]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Database error']);
    }
    exit;
}

if ($method === 'POST' && $action === 'delete') {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = intval($input['id'] ?? 0);
    $stmt = $conn->prepare("DELETE FROM charge_masters WHERE id=?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    echo json_encode(['success' => true]);
    exit;
}

http_response_code(404);
echo json_encode(['error' => 'Invalid action']);
