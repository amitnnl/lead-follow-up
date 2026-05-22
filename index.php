<?php
// index.php — Login Page
if (session_status() === PHP_SESSION_NONE) session_start();
require_once __DIR__ . '/includes/db.php';
require_once __DIR__ . '/includes/auth.php';

if (is_logged_in()) {
    header('Location: ' . BASE_URL . '/dashboard.php');
    exit;
}

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    $attempts = db_fetch_one($conn, "SELECT COUNT(*) as c FROM failed_logins WHERE ip_address = ? AND attempt_time > (NOW() - INTERVAL 15 MINUTE)", 's', [$ip])['c'] ?? 0;

    if ($attempts >= 5) {
        $error = 'Too many failed login attempts. Please try again in 15 minutes.';
    } else {
        $email    = trim($_POST['email'] ?? '');
        $password = $_POST['password'] ?? '';

        if ($email && $password) {
            $user = db_fetch_one($conn,
                "SELECT * FROM users WHERE email = ? AND is_active = 1 LIMIT 1",
                's', [$email]
            );
            if ($user && password_verify($password, $user['password'])) {
                db_query($conn, "DELETE FROM failed_logins WHERE ip_address = ?", 's', [$ip]);
                login_user($user);
                header('Location: ' . BASE_URL . '/dashboard.php');
                exit;
            } else {
                db_query($conn, "INSERT INTO failed_logins (ip_address) VALUES (?)", 's', [$ip]);
                $error = 'Invalid email or password.';
            }
        } else {
            $error = 'Please fill in all fields.';
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en" id="htmlRoot">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login — LeadFlow Pro</title>
    <meta name="description" content="Login to DSA Vehicle Finance Lead Management System.">
    <meta name="theme-color" content="#090d16">
    <link href="<?php echo BASE_URL; ?>/assets/css/tailwind.css?v=<?= filemtime(__DIR__ . '/assets/css/tailwind.css') ?>" rel="stylesheet">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <script>
    (function(){
        const t = localStorage.getItem('theme');
        if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
        }
    })();
    </script>
    <style>
        .login-card { animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fadeUp {
            from { opacity: 0; transform: translateY(24px) scale(0.98); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .float-1 { animation: float1 7s ease-in-out infinite; }
        .float-2 { animation: float2 9s ease-in-out infinite; }
        .float-3 { animation: float3 8s ease-in-out infinite; }
        @keyframes float1 {
            0%, 100% { transform: translate(0, 0) rotate(0deg); }
            50% { transform: translate(12px, -15px) rotate(3deg); }
        }
        @keyframes float2 {
            0%, 100% { transform: translate(0, 0) rotate(0deg); }
            50% { transform: translate(-15px, 12px) rotate(-3deg); }
        }
        @keyframes float3 {
            0%, 100% { transform: translate(0, 0); }
            50% { transform: translate(8px, 8px); }
        }
    </style>
</head>
<body class="min-h-screen flex items-center justify-center p-4 relative overflow-hidden
             bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-slate-100">

    <!-- Floating Background Elements -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <div class="float-1 absolute -top-20 -right-20 w-[450px] h-[450px] bg-brand-500/10 rounded-full blur-3xl"></div>
        <div class="float-2 absolute -bottom-32 -left-32 w-[550px] h-[550px] bg-sec-500/10 rounded-full blur-3xl"></div>
        <div class="float-3 absolute top-1/3 left-1/2 w-[350px] h-[350px] bg-indigo-500/8 rounded-full blur-3xl -translate-x-1/2"></div>

        <!-- Grid pattern overlay -->
        <div class="absolute inset-0 opacity-[0.02]"
             style="background-image: radial-gradient(circle, white 1px, transparent 1px); background-size: 32px 32px;"></div>
    </div>

    <div class="login-card w-full max-w-[420px] z-10">
        <!-- Logo / Header -->
        <div class="text-center mb-8">
            <div class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-tr from-brand-500 to-sec-500 rounded-2xl mb-5 shadow-xl shadow-brand-500/20">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
            </div>
            <h1 class="text-2xl font-extrabold text-white tracking-tight">LeadFlow Pro</h1>
            <p class="text-brand-200/60 text-xs mt-1.5 font-bold uppercase tracking-wider">Vehicle Loan Lead Management</p>
        </div>

        <!-- Card Container -->
        <div class="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/50 dark:border-slate-800/80 rounded-3xl p-8 shadow-2xl shadow-black/10 dark:shadow-black/45">
            <h2 class="text-lg font-bold text-slate-800 dark:text-white mb-6">Sign in to your account</h2>

            <?php if ($error): ?>
            <div class="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-700 dark:text-rose-300 rounded-2xl px-4 py-3 mb-5 text-sm flex items-center gap-2.5">
                <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                </svg>
                <span class="font-medium"><?= htmlspecialchars($error) ?></span>
            </div>
            <?php endif; ?>

            <form method="POST" action="">
                <div class="space-y-4.5">
                    <div>
                        <label class="form-label" for="email">Email Address</label>
                        <input id="email" name="email" type="email" required autocomplete="email"
                               value="<?= htmlspecialchars($_POST['email'] ?? '') ?>"
                               class="form-input"
                               placeholder="you@example.com">
                    </div>
                    <div>
                        <label class="form-label" for="password">Password</label>
                        <input id="password" name="password" type="password" required autocomplete="current-password"
                               class="form-input"
                               placeholder="••••••••">
                    </div>
                </div>

                <button type="submit" class="mt-6 w-full btn btn-primary">
                    Sign In
                </button>
            </form>

            <div class="mt-6 p-4 bg-slate-50/50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                <p class="font-bold text-slate-500 dark:text-slate-400 text-[10px] mb-2.5 uppercase tracking-wider">Demo Credentials:</p>
                <div class="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                    <p>Admin: <strong class="text-slate-800 dark:text-slate-200">admin@dsaleads.com</strong> / admin123</p>
                    <p>Staff: <strong class="text-slate-800 dark:text-slate-200">vikram@dsaleads.com</strong> / admin123</p>
                    <p>Agent: <strong class="text-slate-800 dark:text-slate-200">seka@dsaleads.com</strong> / admin123</p>
                </div>
            </div>
        </div>

        <p class="text-center text-slate-500 dark:text-slate-500 text-xs mt-6 font-semibold tracking-wide">
            &copy; <?= date('Y') ?> LeadFlow Pro. All rights reserved.
        </p>
    </div>
</body>
</html>
</body>
</html>
