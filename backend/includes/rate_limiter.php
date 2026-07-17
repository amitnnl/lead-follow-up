<?php
// includes/rate_limiter.php — Endpoint Rate Limiting and Auth Backoff

// Ensure DB is loaded
require_once __DIR__ . '/db.php';

if (!function_exists('json_response')) {
    function json_response($data, int $status = 200) {
        http_response_code($status);
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
        exit;
    }
}

/**
 * Get the client's real IP address, handling proxies/load balancers.
 */
function get_client_ip(): string {
    if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
        return $_SERVER['HTTP_CLIENT_IP'];
    } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        // Can be a comma-separated list
        $ips = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
        return trim($ips[0]);
    }
    return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}

/**
 * Clean up expired sliding-window hit records.
 */
function prune_rate_limit_hits(int $window_seconds) {
    global $conn;
    $now = time();
    $oldest_allowed = $now - $window_seconds;

    // Prune globally with 2% probability to avoid database table bloat
    if (rand(1, 50) === 1) {
        $conn->query("DELETE FROM rate_limit_hits WHERE hit_time < " . ($now - 86400));
    } else {
        $stmt = $conn->prepare("DELETE FROM rate_limit_hits WHERE hit_time < ?");
        if ($stmt) {
            $stmt->bind_param('i', $oldest_allowed);
            $stmt->execute();
            $stmt->close();
        }
    }
}

/**
 * Apply sliding window rate limit check.
 * Returns true if allowed, false if limit exceeded.
 */
function apply_sliding_window_limit(string $key, int $max_requests, int $window_seconds): bool {
    global $conn;
    $now = time();
    $oldest_allowed = $now - $window_seconds;

    // 1. Clean up old records
    prune_rate_limit_hits($window_seconds);

    // 2. Count hits in current window
    $hits = 0;
    $stmt = $conn->prepare("SELECT COUNT(*) FROM rate_limit_hits WHERE hit_key = ? AND hit_time >= ?");
    if ($stmt) {
        $stmt->bind_param('si', $key, $oldest_allowed);
        $stmt->execute();
        $stmt->bind_result($hits);
        $stmt->fetch();
        $stmt->close();
    }

    if ($hits >= $max_requests) {
        return false;
    }

    // 3. Record new hit
    $stmt = $conn->prepare("INSERT INTO rate_limit_hits (hit_key, hit_time) VALUES (?, ?)");
    if ($stmt) {
        $stmt->bind_param('si', $key, $now);
        $stmt->execute();
        $stmt->close();
    }

    return true;
}

/**
 * Check if the given IP or Account is currently in exponential backoff.
 * Returns remaining wait time in seconds, or 0 if not blocked.
 */
function check_auth_backoff(string $ip, ?string $account = null): int {
    global $conn;
    $now = time();
    $max_wait = 0;

    // Load configurable parameters
    $threshold_ip = (int)get_setting('auth_backoff_threshold_ip', '3');
    $threshold_acc = (int)get_setting('auth_backoff_threshold_acc', '3');
    $base_seconds = (int)get_setting('auth_backoff_base_seconds', '2');
    $factor = (float)get_setting('auth_backoff_factor', '2');
    $decay_minutes = (int)get_setting('auth_backoff_decay_minutes', '15');

    // 1. Periodically prune expired failure logs (older than decay window)
    if (rand(1, 50) === 1) {
        $conn->query("DELETE FROM auth_failed_attempts WHERE last_attempt_time < (NOW() - INTERVAL $decay_minutes MINUTE)");
    }

    // 2. Check IP and Account failures
    $checks = [
        ['type' => 'ip', 'value' => $ip, 'threshold' => $threshold_ip]
    ];
    if (!empty($account)) {
        $checks[] = ['type' => 'account', 'value' => trim(strtolower($account)), 'threshold' => $threshold_acc];
    }

    foreach ($checks as $chk) {
        $stmt = $conn->prepare("
            SELECT failed_count, UNIX_TIMESTAMP(last_attempt_time) 
            FROM auth_failed_attempts 
            WHERE key_type = ? AND key_value = ?
        ");
        if ($stmt) {
            $stmt->bind_param('ss', $chk['type'], $chk['value']);
            $stmt->execute();
            $stmt->bind_result($failed_count, $last_attempt_time);
            if ($stmt->fetch()) {
                if ($failed_count >= $chk['threshold']) {
                    $exponent = $failed_count - $chk['threshold'];
                    $delay = $base_seconds * pow($factor, $exponent);
                    $elapsed = $now - $last_attempt_time;
                    
                    // If elapsed time is less than delay, they must wait
                    if ($elapsed < $delay) {
                        $wait = (int)ceil($delay - $elapsed);
                        if ($wait > $max_wait) {
                            $max_wait = $wait;
                        }
                    }
                }
            }
            $stmt->close();
        }
    }

    return $max_wait;
}

/**
 * Record a failed authentication attempt.
 */
function record_auth_failure(string $ip, ?string $account = null): void {
    global $conn;

    $checks = [
        ['type' => 'ip', 'value' => $ip]
    ];
    if (!empty($account)) {
        $checks[] = ['type' => 'account', 'value' => trim(strtolower($account))];
    }

    foreach ($checks as $chk) {
        $stmt = $conn->prepare("
            INSERT INTO auth_failed_attempts (key_type, key_value, failed_count, last_attempt_time)
            VALUES (?, ?, 1, CURRENT_TIMESTAMP)
            ON DUPLICATE KEY UPDATE failed_count = failed_count + 1, last_attempt_time = CURRENT_TIMESTAMP
        ");
        if ($stmt) {
            $stmt->bind_param('ss', $chk['type'], $chk['value']);
            $stmt->execute();
            $stmt->close();
        }
    }
}

/**
 * Reset authentication failure counts for a successful login.
 */
function clear_auth_failures(string $ip, ?string $account = null): void {
    global $conn;
    $checks = [$ip];
    $types = 's';
    $sql = "DELETE FROM auth_failed_attempts WHERE (key_type = 'ip' AND key_value = ?)";

    if (!empty($account)) {
        $sql .= " OR (key_type = 'account' AND key_value = ?)";
        $checks[] = trim(strtolower($account));
        $types .= 's';
    }

    $stmt = $conn->prepare($sql);
    if ($stmt) {
        $stmt->bind_param($types, ...$checks);
        $stmt->execute();
        $stmt->close();
    }
}

/**
 * Apply rate limiting to the current request based on the endpoint path.
 */
function rate_limit_request(string $path): void {
    $ip = get_client_ip();
    
    // Classify path
    $type = 'public';
    if (strpos($path, 'auth/') === 0) {
        $type = 'auth';
    } elseif (is_logged_in()) {
        $type = 'authenticated';
    } elseif ($path === 'settings/public') {
        $type = 'public';
    }

    // Load configurable thresholds
    $max_requests = 60;
    $window_seconds = 60;

    if ($type === 'auth') {
        $max_requests = (int)get_setting('rate_limit_auth_max', '20');
        $window_seconds = (int)get_setting('rate_limit_auth_window', '60');
        $hit_key = md5('auth:' . $ip);
    } elseif ($type === 'authenticated') {
        $max_requests = (int)get_setting('rate_limit_authenticated_max', '300');
        $window_seconds = (int)get_setting('rate_limit_authenticated_window', '60');
        $hit_key = md5('authenticated:' . current_user_id());
    } else {
        $max_requests = (int)get_setting('rate_limit_public_max', '60');
        $window_seconds = (int)get_setting('rate_limit_public_window', '60');
        $hit_key = md5('public:' . $ip);
    }

    $allowed = apply_sliding_window_limit($hit_key, $max_requests, $window_seconds);

    if (!$allowed) {
        $is_json = defined('API_CONTEXT') && API_CONTEXT;
        $msg = "Rate limit exceeded. Please wait before making more requests.";
        
        // Add headers for standard rate limiting compliance
        header("Retry-After: $window_seconds");
        
        if ($is_json) {
            json_response(['error' => $msg], 429);
        } else {
            http_response_code(429);
            die("
                <div style='font-family: sans-serif; max-width: 500px; margin: 4% auto; padding: 2rem; border-radius: 8px; border: 1px solid #fda4af; background-color: #fff1f2; color: #9f1239;'>
                    <h2 style='margin-top: 0;'>429 Too Many Requests</h2>
                    <p>$msg</p>
                </div>
            ");
        }
    }
}
