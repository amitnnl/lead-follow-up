<?php
// includes/auth.php — Session & Auth helpers

if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => 86400,
        'path' => '/',
        'domain' => $_SERVER['HTTP_HOST'] ?? '',
        'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on',
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    session_start();
}

function is_logged_in(): bool {
    return isset($_SESSION['user_id']) && !empty($_SESSION['user_id']);
}

function require_login(): void {
    if (!is_logged_in()) {
        header('Location: ' . base_url('index.php'));
        exit;
    }
}

function current_user(): array {
    return $_SESSION['user'] ?? [];
}

function current_user_id(): int {
    return (int)($_SESSION['user_id'] ?? 0);
}

function current_role(): string {
    return $_SESSION['role'] ?? '';
}

function is_admin(): bool {
    return current_role() === 'admin';
}

function is_agent(): bool {
    return current_role() === 'agent';
}

function is_staff(): bool {
    return current_role() === 'staff';
}

function is_executive(): bool {
    return current_role() === 'executive';
}

function require_role(string ...$roles): void {
    require_login();
    if (!in_array(current_role(), $roles)) {
        http_response_code(403);
        die('<h2 style="font-family:sans-serif;padding:2rem;">403 — Access Denied</h2>');
    }
}

function login_user(array $user): void {
    session_regenerate_id(true);
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['role']    = $user['role'];
    $_SESSION['user']    = $user;
}

function logout_user(): void {
    $_SESSION = [];
    session_destroy();
}

function base_url(string $path = ''): string {
    $base = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/\\');
    // Go up directories if we're inside a subfolder
    $depth = substr_count(str_replace('\\','/',$_SERVER['SCRIPT_NAME']), '/') - 1;
    $base = '/lead-follow-up';
    return $base . ($path ? '/' . ltrim($path, '/') : '');
}

function csrf_token(): string {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function csrf_field(): string {
    return '<input type="hidden" name="csrf_token" value="' . htmlspecialchars(csrf_token()) . '">';
}

function verify_csrf(): bool {
    $token = $_POST['csrf_token'] ?? '';
    return hash_equals(csrf_token(), $token);
}

function e(mixed $val): string {
    return htmlspecialchars((string)$val, ENT_QUOTES, 'UTF-8');
}

function flash(string $key, string $message): void {
    $_SESSION['flash'][$key] = $message;
}

function get_flash(string $key): ?string {
    if (isset($_SESSION['flash'][$key])) {
        $msg = $_SESSION['flash'][$key];
        unset($_SESSION['flash'][$key]);
        return $msg;
    }
    return null;
}

function status_badge(string $status): string {
    $map = [
        'new'       => ['badge badge-blue',     'New'],
        'pending'   => ['badge badge-yellow',   'Pending'],
        'approved'  => ['badge badge-green',    'Approved'],
        'disbursed' => ['badge badge-emerald',  'Disbursed'],
        'rejected'  => ['badge badge-red',      'Rejected'],
        'on_hold'   => ['badge badge-gray',     'On Hold'],
    ];
    [$cls, $label] = $map[$status] ?? ['badge badge-gray', ucfirst($status)];
    return '<span class="' . $cls . '">' . $label . '</span>';
}

function format_currency(float $amount): string {
    return '₹' . number_format($amount, 0, '.', ',');
}

function loan_type_badge(string $type): string {
    if ($type === 'refinance') {
        return '<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-purple-50 text-purple-700 border border-purple-100/80 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/30">Refinance</span>';
    }
    return '<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-indigo-50 text-indigo-700 border border-indigo-100/80 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900/30">New Loan</span>';
}

function whatsapp_url(string $mobile, string $name, string $leadId, string $status): string {
    $cleanMobile = preg_replace('/\D/', '', $mobile);
    // Standardize to 91 prefix for Indian phone numbers if it's 10 digits
    if (strlen($cleanMobile) === 10) {
        $cleanMobile = '91' . $cleanMobile;
    } elseif (strlen($cleanMobile) === 11 && str_starts_with($cleanMobile, '0')) {
        $cleanMobile = '91' . substr($cleanMobile, 1);
    }
    
    $statusText = ucfirst(str_replace('_', ' ', $status));
    $msg = "Hello {$name}, this is regarding your vehicle loan application (ID: {$leadId}). The current status of your application is: {$statusText}. Please feel free to reach out if you have any questions. Thanks! - LeadFlow Pro";
    
    return "https://wa.me/{$cleanMobile}?text=" . urlencode($msg);
}
