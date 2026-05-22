<?php
if (session_status() === PHP_SESSION_NONE) session_start();
$_SESSION['user_id'] = 1;
$_SESSION['user_role'] = 'admin';

require 'c:\xampp\htdocs\lead-follow-up\followups\index.php';
