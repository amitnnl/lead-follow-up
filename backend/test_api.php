<?php
require_once __DIR__ . '/includes/db.php';
require_once __DIR__ . '/includes/auth.php';

// Mock login as admin
$user = db_fetch_one($conn, "SELECT * FROM users WHERE role='admin' LIMIT 1");
if ($user) {
    login_user($user);
} else {
    echo "No admin user found.";
    exit;
}

// Emulate request to GET api/leads
$_SERVER['REQUEST_METHOD'] = 'GET';
$_SERVER['REQUEST_URI'] = '/api/leads';

ob_start();
require __DIR__ . '/api/index.php';
$output = ob_get_clean();

echo "<h1>API Test Output</h1>";
echo "<pre>" . htmlspecialchars(substr($output, 0, 1000)) . "...</pre>";
?>
