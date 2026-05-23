<?php
// logout.php
require_once __DIR__ . '/includes/db.php';
require_once __DIR__ . '/includes/auth.php';
logout_user();
header('Location: ' . BASE_URL . '/index.php');
exit;
