<?php
// api/notifications.php
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';

require_login();
header('Content-Type: application/json');

$uid = current_user_id();
$action = $_POST['action'] ?? $_GET['action'] ?? '';

if ($action === 'fetch') {
    $notifications = db_fetch_all($conn, "
        SELECT * FROM notifications 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT 10
    ", 'i', [$uid]);
    
    $unread_count = db_fetch_one($conn, "
        SELECT COUNT(*) as cnt FROM notifications 
        WHERE user_id = ? AND is_read = 0
    ", 'i', [$uid])['cnt'] ?? 0;
    
    echo json_encode([
        'success' => true,
        'notifications' => $notifications,
        'unread_count' => $unread_count
    ]);
    exit;
} elseif ($action === 'mark_read') {
    $id = (int)($_POST['id'] ?? 0);
    if ($id) {
        db_query($conn, "UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?", 'ii', [$id, $uid]);
    } else {
        // Mark all as read
        db_query($conn, "UPDATE notifications SET is_read = 1 WHERE user_id = ?", 'i', [$uid]);
    }
    echo json_encode(['success' => true]);
    exit;
}

echo json_encode(['success' => false, 'error' => 'Invalid action']);
exit;
