<?php
// includes/auth.php — Session & Auth helpers

if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => 86400,
        'path' => '/',
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
        header('Location: ' . BASE_URL . '/index.php');
        exit;
    }

    // Session Timeout Logic
    $timeout_minutes = (int)get_setting('session_timeout', '120');
    $timeout_seconds = $timeout_minutes * 60;
    
    if (isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity'] > $timeout_seconds)) {
        logout_user();
        session_start();
        $_SESSION['error'] = 'Your session has expired due to inactivity. Please log in again.';
        header('Location: ' . BASE_URL . '/index.php');
        exit;
    }
    $_SESSION['last_activity'] = time();

    // Maintenance Mode Logic
    if (get_setting('maintenance_mode', '0') === '1' && !is_admin()) {
        header('Location: ' . BASE_URL . '/maintenance.php');
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

function is_finance_manager(): bool {
    return current_role() === 'finance_manager';
}

function is_manager(): bool {
    return current_role() === 'manager' || current_role() === 'finance_manager';
}

function is_rto_desk(): bool {
    return current_role() === 'rto_desk';
}

function is_insurance_desk(): bool {
    return current_role() === 'insurance_desk';
}

function is_channel_agent(): bool {
    return current_role() === 'channel_agent';
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
    return BASE_URL . ($path ? '/' . ltrim($path, '/') : '');
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

function e($val): string {
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
        'initiated' => ['badge badge-indigo',   'Initiated'],
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
    } elseif (strlen($cleanMobile) === 11 && strpos($cleanMobile, '0') === 0) {
        $cleanMobile = '91' . substr($cleanMobile, 1);
    }
    
    $statusText = ucfirst(str_replace('_', ' ', $status));
    
    // Dynamic WhatsApp Templates based on Lead Status
    switch ($status) {
        case 'new':
        case 'pending':
            $msg = "Hi {$name},\n\nWe have received your vehicle loan application (ID: {$leadId}). Our team is currently reviewing your details. We will contact you shortly if we need any further information.\n\nThanks,\nLeadFlow Pro";
            break;
        case 'approved':
            $msg = "Great news {$name}! 🎉\n\nYour vehicle loan application (ID: {$leadId}) has been APPROVED. Please ensure your bank details and all mandatory documents are provided so we can proceed with the final disbursement.\n\nThanks,\nLeadFlow Pro";
            break;
        case 'disbursed':
            $msg = "Congratulations {$name}! 🎊\n\nYour loan (ID: {$leadId}) has been successfully disbursed. Please feel free to reach out if you have any questions.\n\nThank you for choosing us!\nLeadFlow Pro";
            break;
        case 'rejected':
            $msg = "Dear {$name},\n\nWe regret to inform you that your recent loan application (ID: {$leadId}) could not be approved at this time. Please contact our team if you need more details.\n\nThanks,\nLeadFlow Pro";
            break;
        default:
            $msg = "Hello {$name},\n\nThis is regarding your vehicle loan application (ID: {$leadId}). The current status is: {$statusText}.\n\nPlease reach out if you have any questions.\n\nThanks,\nLeadFlow Pro";
            break;
    }
    
    return "https://wa.me/{$cleanMobile}?text=" . urlencode($msg);
}
