<?php
// includes/db.php — Database Connection
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'dsa_leads');

$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

if ($conn->connect_error) {
    die(json_encode(['error' => 'Database connection failed: ' . $conn->connect_error]));
}

$conn->set_charset('utf8mb4');

// Define dynamic BASE_URL so routing works both locally (/lead-follow-up) and live (/)
$is_localhost = ($_SERVER['HTTP_HOST'] === 'localhost' || $_SERVER['HTTP_HOST'] === '127.0.0.1');
define('BASE_URL', $is_localhost ? '/lead-follow-up' : '');


/**
 * Safe query helper — returns result or throws
 */
function db_query(mysqli $conn, string $sql, string $types = '', array $params = []): mysqli_result|bool {
    if ($types && $params) {
        $stmt = $conn->prepare($sql);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        return $stmt->get_result() ?: $stmt->affected_rows;
    }
    return $conn->query($sql);
}

/**
 * Fetch all rows
 */
function db_fetch_all(mysqli $conn, string $sql, string $types = '', array $params = []): array {
    $result = db_query($conn, $sql, $types, $params);
    if ($result instanceof mysqli_result) {
        return $result->fetch_all(MYSQLI_ASSOC);
    }
    return [];
}

/**
 * Fetch single row
 */
function db_fetch_one(mysqli $conn, string $sql, string $types = '', array $params = []): ?array {
    $result = db_query($conn, $sql, $types, $params);
    if ($result instanceof mysqli_result) {
        return $result->fetch_assoc() ?: null;
    }
    return null;
}

/**
 * Generate next lead ID
 */
function generate_lead_id(mysqli $conn): string {
    $year = date('Y');
    $row = db_fetch_one($conn, "SELECT COUNT(*) as cnt FROM leads WHERE YEAR(lead_date) = ?", 'i', [$year]);
    $next = ($row['cnt'] ?? 0) + 1;
    return 'DSA-' . $year . '-' . str_pad($next, 4, '0', STR_PAD_LEFT);
}

/**
 * Log a lead action
 */
function log_lead_action(mysqli $conn, int $lead_id, string $action, string $details = '', ?int $user_id = null): void {
    db_query($conn,
        "INSERT INTO lead_logs (lead_id, action, details, performed_by) VALUES (?, ?, ?, ?)",
        'issi', [$lead_id, $action, $details, $user_id]
    );
}
