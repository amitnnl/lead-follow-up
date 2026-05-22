<?php
// logout.php
require_once __DIR__ . '/includes/auth.php';
logout_user();
header('Location: /lead-follow-up/index.php');
exit;
