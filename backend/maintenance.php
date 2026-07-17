<?php
// maintenance.php
require_once __DIR__ . '/includes/db.php';

// If maintenance mode is off or user is admin, redirect to dashboard
if (get_setting('maintenance_mode', '0') === '0' || (isset($_SESSION['role']) && $_SESSION['role'] === 'admin')) {
    header('Location: ' . BASE_URL . '/dashboard.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Under Maintenance</title>
    <link href="<?= BASE_URL ?>/assets/css/tailwind.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap" rel="stylesheet">
</head>
<body class="bg-slate-50 dark:bg-slate-950 flex items-center justify-center min-h-screen p-4 text-center font-sans">
    <div class="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200/60 dark:border-slate-800 p-8 md:p-12 animate-fade-up">
        <div class="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <svg class="w-10 h-10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
        </div>
        <h1 class="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white mb-3">Under Maintenance</h1>
        <p class="text-slate-500 dark:text-slate-400 leading-relaxed mb-8">
            We are currently performing scheduled maintenance to improve the system. We'll be back online shortly. Thank you for your patience!
        </p>
        <a href="<?= BASE_URL ?>/index.php" class="inline-flex items-center justify-center bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 px-6 rounded-xl transition-all w-full md:w-auto shadow-lg shadow-brand-500/20">
            Check Status Again
        </a>
    </div>
</body>
</html>
