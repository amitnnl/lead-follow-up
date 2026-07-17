<?php
// index.php — Login Page
require_once __DIR__ . '/includes/db.php';
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/rate_limiter.php';

if (is_logged_in()) {
    header('Location: ' . BASE_URL . '/dashboard.php');
    exit;
}

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Enforce general rate limit on login endpoint
    rate_limit_request('auth/login');

    $ip = get_client_ip();
    $email    = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';

    // Check exponential backoff (IP + Account combined)
    $wait_time = check_auth_backoff($ip, $email);
    if ($wait_time > 0) {
        $error = "Too many failed attempts. Please wait {$wait_time} seconds before trying again.";
    } else {
        if ($email && $password) {
            $user = db_fetch_one($conn,
                "SELECT * FROM users WHERE email = ? AND is_active = 1 LIMIT 1",
                's', [$email]
            );
            if ($user && password_verify($password, $user['password'])) {
                clear_auth_failures($ip, $email);
                db_query($conn, "DELETE FROM failed_logins WHERE ip_address = ?", 's', [$ip]);
                login_user($user);
                header('Location: ' . BASE_URL . '/dashboard.php');
                exit;
            } else {
                record_auth_failure($ip, $email);
                db_query($conn, "INSERT INTO failed_logins (ip_address) VALUES (?)", 's', [$ip]);
                
                $next_wait = check_auth_backoff($ip, $email);
                if ($next_wait > 0) {
                    $error = "Invalid email or password. Too many failed attempts, please wait {$next_wait} seconds.";
                } else {
                    $error = 'Invalid email or password.';
                }
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
    <meta name="theme-color" content="#7c3aed">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="LeadFlow">
    <meta name="application-name" content="LeadFlow Pro">

    <!-- Favicon & App Icons -->
    <link rel="icon" type="image/png" href="<?php echo BASE_URL; ?>/uploads/AppLogo.png">
    <link rel="shortcut icon" type="image/png" href="<?php echo BASE_URL; ?>/uploads/AppLogo.png">
    <link rel="apple-touch-icon" href="<?php echo BASE_URL; ?>/uploads/AppLogo.png">
    <link rel="apple-touch-icon" sizes="152x152" href="<?php echo BASE_URL; ?>/uploads/AppLogo.png">
    <link rel="apple-touch-icon" sizes="180x180" href="<?php echo BASE_URL; ?>/uploads/AppLogo.png">
    <link rel="apple-touch-icon" sizes="167x167" href="<?php echo BASE_URL; ?>/uploads/AppLogo.png">

    <!-- PWA Web App Manifest (dynamic — path auto-detected for localhost vs live) -->
    <link rel="manifest" href="<?php echo BASE_URL; ?>/manifest.php">

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
        .login-card-container { animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fadeIn {
            from { opacity: 0; }
            to   { opacity: 1; }
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
<body class="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300 relative overflow-x-hidden">

    <!-- Outer Card wrapper for the full screen split view -->
    <div class="w-full min-h-screen flex flex-col md:flex-row login-card-container">
        
        <!-- Left Column: Login Form & Credentials -->
        <div class="w-full md:w-1/2 p-6 sm:p-12 md:p-16 lg:p-24 flex flex-col justify-between bg-white dark:bg-slate-900 min-h-screen relative">
            <!-- Floating Background Elements inside left column -->
            <div class="absolute inset-0 overflow-hidden pointer-events-none">
                <div class="float-1 absolute -top-20 -right-20 w-[450px] h-[450px] bg-brand-500/5 rounded-full blur-3xl"></div>
                <div class="float-2 absolute -bottom-32 -left-32 w-[550px] h-[550px] bg-sec-500/5 rounded-full blur-3xl"></div>
                <div class="absolute inset-0 opacity-[0.01] dark:opacity-[0.02]"
                     style="background-image: radial-gradient(circle, currentColor 1px, transparent 1px); background-size: 32px 32px;"></div>
            </div>

            <!-- Header logo/branding -->
            <div class="z-10 flex items-center justify-between">
                <div class="flex items-center gap-3.5">
                    <div class="inline-flex items-center justify-center w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-700 shadow-sm">
                        <img src="<?= BASE_URL ?>/uploads/AppLogo.png" alt="App Logo" class="w-full h-full object-contain p-1.5">
                    </div>
                    <div>
                        <h1 class="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none">LeadFlow Pro</h1>
                        <p class="text-brand-600 dark:text-brand-400 text-[10px] font-bold uppercase tracking-wider mt-1">Vehicle Loan CRM</p>
                    </div>
                </div>
            </div>

            <!-- Centered login box -->
            <div class="z-10 max-w-md w-full mx-auto my-auto py-12">
                <h2 class="text-2xl font-black text-slate-900 dark:text-white mb-2">Sign in to your account</h2>
                <p class="text-slate-500 dark:text-slate-400 text-sm mb-8 font-medium">Enter your credentials below to access LeadFlow Pro.</p>

                <?php if ($error): ?>
                <div class="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-700 dark:text-rose-300 rounded-2xl px-4 py-3.5 mb-6 text-sm flex items-center gap-2.5">
                    <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                    </svg>
                    <span class="font-medium text-xs"><?= htmlspecialchars($error) ?></span>
                </div>
                <?php endif; ?>

                <form method="POST" action="" class="space-y-5">
                    <div>
                        <label class="form-label text-xs" for="email">Email Address</label>
                        <input id="email" name="email" type="email" required autocomplete="email"
                               value="<?= htmlspecialchars($_POST['email'] ?? '') ?>"
                               class="form-input py-3 px-4 text-sm mt-1.5"
                               placeholder="you@example.com">
                    </div>
                    <div>
                        <div class="flex items-center justify-between">
                            <label class="form-label text-xs" for="password">Password</label>
                            <a href="#" class="text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 transition-colors">Forgot password?</a>
                        </div>
                        <input id="password" name="password" type="password" required autocomplete="current-password"
                               class="form-input py-3 px-4 text-sm mt-1.5"
                               placeholder="••••••••">
                    </div>
                    
                    <div class="flex items-center justify-between pt-1">
                        <div class="flex items-center gap-2">
                            <input id="remember" name="remember" type="checkbox" class="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:bg-slate-900/60 dark:border-slate-700 cursor-pointer transition-colors">
                            <label for="remember" class="text-xs font-semibold text-slate-500 dark:text-slate-400 cursor-pointer">Remember me</label>
                        </div>
                    </div>

                    <button type="submit" class="mt-6 w-full btn btn-primary py-3 text-sm font-semibold tracking-wide">
                        Sign In
                    </button>
                </form>
            </div>

            <!-- Footer for left column / mobile -->
            <div class="z-10 text-slate-400 dark:text-slate-600 text-[11px] font-semibold tracking-wide md:text-left text-center">
                &copy; <?= date('Y') ?> LeadFlow Pro. All rights reserved.
            </div>
        </div>

        <!-- Right Column: KASPR GROUP Introduction -->
        <div class="hidden md:flex md:w-1/2 bg-gradient-to-br from-brand-600 via-brand-700 to-sec-700 dark:from-brand-950 dark:via-slate-900 dark:to-sec-950 text-white p-12 lg:p-24 flex-col justify-between items-center text-center relative overflow-hidden min-h-screen">
            <!-- Floating Decorative Background Effects -->
            <div class="absolute inset-0 overflow-hidden pointer-events-none">
                <div class="absolute -top-10 -right-10 w-[300px] h-[300px] bg-white/5 rounded-full blur-2xl"></div>
                <div class="absolute -bottom-12 -left-12 w-[350px] h-[350px] bg-sec-500/10 rounded-full blur-3xl"></div>
                <div class="absolute inset-0 opacity-[0.03]"
                     style="background-image: radial-gradient(circle, white 1px, transparent 1px); background-size: 24px 24px;"></div>
            </div>

            <!-- Spacer to push content down -->
            <div></div>

            <div class="z-10 flex flex-col items-center max-w-sm my-auto">
                <!-- Group Logo Container -->
                <div class="w-20 h-20 bg-white rounded-3xl flex items-center justify-center p-3 mb-8 shadow-2xl border border-white/20">
                    <img src="<?= BASE_URL ?>/uploads/grouplogo.png" alt="KASPR GROUP Logo" class="w-full h-full object-contain">
                </div>
                
                <h2 class="text-3xl font-black tracking-tight mb-4">KASPR GROUP</h2>
                <p class="text-sm text-brand-100/80 leading-relaxed font-medium">
                    Empowering Vehicle Finance & DSA Operations. Connecting dealerships, financial institutions, and channels under a single unified ecosystem to drive operational excellence and business growth.
                </p>

                <!-- Feature pills -->
                <div class="flex flex-col gap-3 mt-10 w-full text-left">
                    <div class="flex items-center gap-3 bg-white/10 dark:bg-white/5 border border-white/10 p-3 rounded-2xl">
                        <span class="text-base">🚀</span>
                        <span class="text-xs font-bold tracking-wide uppercase">Unified Lead Allocation</span>
                    </div>
                    <div class="flex items-center gap-3 bg-white/10 dark:bg-white/5 border border-white/10 p-3 rounded-2xl">
                        <span class="text-base">📊</span>
                        <span class="text-xs font-bold tracking-wide uppercase">Real-time Commissions & Payouts</span>
                    </div>
                    <div class="flex items-center gap-3 bg-white/10 dark:bg-white/5 border border-white/10 p-3 rounded-2xl">
                        <span class="text-base">🔒</span>
                        <span class="text-xs font-bold tracking-wide uppercase">Secure Verification Workflow</span>
                    </div>
                </div>
            </div>

            <!-- Footer Text in right panel -->
            <div class="z-10 text-[10px] text-brand-200/50 font-bold uppercase tracking-widest">
                &copy; <?= date('Y') ?> KASPR GROUP
            </div>
        </div>

    </div>
</body>
</html>
