<?php
// includes/db.php — Database Connection

/**
 * Helper to safely load environment variables from a .env file.
 */
function load_env(string $dir): void {
    $path = rtrim($dir, '/\\') . DIRECTORY_SEPARATOR . '.env';
    if (file_exists($path) && is_readable($path)) {
        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line) || strpos($line, '#') === 0) {
                continue;
            }
            if (strpos($line, '=') !== false) {
                list($name, $value) = explode('=', $line, 2);
                $name = trim($name);
                $value = trim($value);
                // Strip surrounding single/double quotes
                if (preg_match('/^([\'"])(.*)\1$/', $value, $matches)) {
                    $value = $matches[2];
                }
                if (!array_key_exists($name, $_SERVER) && !array_key_exists($name, $_ENV)) {
                    putenv("{$name}={$value}");
                    $_ENV[$name] = $value;
                    $_SERVER[$name] = $value;
                }
            }
        }
    }
}

// Load env variables
load_env(__DIR__ . '/../..'); // Root
load_env(__DIR__ . '/..');    // Backend

// Default Local Credentials (with Env overrides)
$db_host = getenv('DB_HOST') ?: 'localhost';
$db_user = getenv('DB_USER') ?: 'root';
$db_pass = getenv('DB_PASS') !== false ? getenv('DB_PASS') : '';
$db_name = getenv('DB_NAME') ?: 'dsa_leads';

// Override with local config if exists (for live server)
if (file_exists(__DIR__ . '/config.local.php')) {
    require_once __DIR__ . '/config.local.php';
}

define('DB_HOST', $db_host);
define('DB_USER', $db_user);
define('DB_PASS', $db_pass);
define('DB_NAME', $db_name);

try {
    // PHP 8.1+ throws exceptions on connection errors by default
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    if ($conn->connect_error) {
        throw new Exception($conn->connect_error);
    }
    $conn->set_charset('utf8mb4');

    // Auto-migrate schema safely WITHOUT blocking regular requests (runs only once via lock file or explicit ?force_migrate_schema=1)
    static $schema_checked_in_process = false;
    $lock_file = sys_get_temp_dir() . '/dsa_schema_migrated_v5.lock';
    $local_lock = __DIR__ . '/.dsa_schema_migrated_v5.lock';

    if ((!$schema_checked_in_process && !file_exists($lock_file) && !file_exists($local_lock)) || (isset($_GET['force_migrate_schema']) && $_GET['force_migrate_schema'] === '1')) {
        $schema_checked_in_process = true;
        try {
            $conn->query("CREATE TABLE IF NOT EXISTS financers (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, name VARCHAR(200) NOT NULL, contact_person VARCHAR(150) NULL, mobile VARCHAR(15) NULL, notes TEXT NULL, is_active TINYINT(1) NOT NULL DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            $conn->query("CREATE TABLE IF NOT EXISTS agents (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, user_id INT UNSIGNED NULL, financer_id INT UNSIGNED NULL, name VARCHAR(150) NOT NULL, mobile VARCHAR(15) NOT NULL, email VARCHAR(150) NULL, address TEXT NULL, pan_number VARCHAR(20) NULL, bank_account VARCHAR(30) NULL, ifsc_code VARCHAR(15) NULL, is_active TINYINT(1) NOT NULL DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            $conn->query("CREATE TABLE IF NOT EXISTS executives (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, user_id INT UNSIGNED NULL, financer_id INT UNSIGNED NULL, name VARCHAR(150) NOT NULL, mobile VARCHAR(15) NOT NULL, email VARCHAR(150) NULL, bank_account VARCHAR(50) NULL, ifsc VARCHAR(20) NULL, pan_number VARCHAR(20) NULL, is_active TINYINT(1) NOT NULL DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            $conn->query("CREATE TABLE IF NOT EXISTS dealers (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, name VARCHAR(200) NOT NULL, contact_person VARCHAR(150) NULL, mobile VARCHAR(15) NULL, address TEXT NULL, is_active TINYINT(1) NOT NULL DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            $conn->query("CREATE TABLE IF NOT EXISTS channels (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, name VARCHAR(200) NOT NULL, contact_person VARCHAR(150) NULL, mobile VARCHAR(15) NULL, email VARCHAR(150) NULL, notes TEXT NULL, is_active TINYINT(1) NOT NULL DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            $conn->query("CREATE TABLE IF NOT EXISTS channel_executives (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, channel_id INT UNSIGNED NULL, name VARCHAR(150) NOT NULL, mobile VARCHAR(15) NOT NULL, email VARCHAR(150) NULL, is_active TINYINT(1) NOT NULL DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            
            $schema_network_tables = [
                'financers' => [
                    'name' => 'VARCHAR(200) NOT NULL',
                    'contact_person' => 'VARCHAR(150) NULL DEFAULT NULL',
                    'mobile' => 'VARCHAR(15) NULL DEFAULT NULL',
                    'notes' => 'TEXT NULL DEFAULT NULL',
                    'is_active' => 'TINYINT(1) NOT NULL DEFAULT 1'
                ],
                'dealers' => [
                    'name' => 'VARCHAR(200) NOT NULL',
                    'contact_person' => 'VARCHAR(150) NULL DEFAULT NULL',
                    'mobile' => 'VARCHAR(15) NULL DEFAULT NULL',
                    'address' => 'TEXT NULL DEFAULT NULL',
                    'is_active' => 'TINYINT(1) NOT NULL DEFAULT 1'
                ],
                'channels' => [
                    'name' => 'VARCHAR(200) NOT NULL',
                    'contact_person' => 'VARCHAR(150) NULL DEFAULT NULL',
                    'mobile' => 'VARCHAR(15) NULL DEFAULT NULL',
                    'email' => 'VARCHAR(150) NULL DEFAULT NULL',
                    'notes' => 'TEXT NULL DEFAULT NULL',
                    'is_active' => 'TINYINT(1) NOT NULL DEFAULT 1'
                ],
                'channel_executives' => [
                    'channel_id' => 'INT UNSIGNED NULL DEFAULT NULL',
                    'user_id' => 'INT UNSIGNED NULL DEFAULT NULL',
                    'name' => 'VARCHAR(150) NOT NULL',
                    'mobile' => 'VARCHAR(15) NULL DEFAULT NULL',
                    'email' => 'VARCHAR(150) NULL DEFAULT NULL',
                    'bank_name' => 'VARCHAR(150) NULL DEFAULT NULL',
                    'bank_account' => 'VARCHAR(50) NULL DEFAULT NULL',
                    'ifsc_code' => 'VARCHAR(20) NULL DEFAULT NULL',
                    'pan_number' => 'VARCHAR(20) NULL DEFAULT NULL',
                    'is_active' => 'TINYINT(1) NOT NULL DEFAULT 1'
                ],
                'agents' => [
                    'user_id' => 'INT UNSIGNED NULL DEFAULT NULL',
                    'financer_id' => 'INT UNSIGNED NULL DEFAULT NULL',
                    'name' => 'VARCHAR(150) NOT NULL',
                    'mobile' => 'VARCHAR(15) NULL DEFAULT NULL',
                    'email' => 'VARCHAR(150) NULL DEFAULT NULL',
                    'address' => 'TEXT NULL DEFAULT NULL',
                    'pan_number' => 'VARCHAR(20) NULL DEFAULT NULL',
                    'bank_account' => 'VARCHAR(50) NULL DEFAULT NULL',
                    'ifsc_code' => 'VARCHAR(20) NULL DEFAULT NULL',
                    'is_active' => 'TINYINT(1) NOT NULL DEFAULT 1'
                ],
                'executives' => [
                    'user_id' => 'INT UNSIGNED NULL DEFAULT NULL',
                    'financer_id' => 'INT UNSIGNED NULL DEFAULT NULL',
                    'name' => 'VARCHAR(150) NOT NULL',
                    'mobile' => 'VARCHAR(15) NULL DEFAULT NULL',
                    'email' => 'VARCHAR(150) NULL DEFAULT NULL',
                    'bank_account' => 'VARCHAR(50) NULL DEFAULT NULL',
                    'ifsc' => 'VARCHAR(20) NULL DEFAULT NULL',
                    'ifsc_code' => 'VARCHAR(20) NULL DEFAULT NULL',
                    'pan_number' => 'VARCHAR(20) NULL DEFAULT NULL',
                    'is_active' => 'TINYINT(1) NOT NULL DEFAULT 1'
                ]
            ];

            foreach ($schema_network_tables as $tbl => $cols) {
                foreach ($cols as $colName => $colDef) {
                    try {
                        $resCheckCol = $conn->query("SHOW COLUMNS FROM `$tbl` LIKE '$colName'");
                        if ($resCheckCol && $resCheckCol->num_rows === 0) {
                            $conn->query("ALTER TABLE `$tbl` ADD COLUMN `$colName` $colDef");
                        }
                    } catch (Throwable $colErr) {}
                }
            }
            
            $resRoleEnum = $conn->query("SHOW COLUMNS FROM users LIKE 'role'");
            if ($resRoleEnum && ($rowRole = $resRoleEnum->fetch_assoc())) {
                if (strpos($rowRole['Type'] ?? '', 'channel_agent') === false) {
                    $conn->query("ALTER TABLE users MODIFY COLUMN role ENUM('admin','agent','staff','manager','executive','finance_manager','rto_desk','insurance_desk','channel_agent') NOT NULL DEFAULT 'staff'");
                }
            }
            $conn->query("ALTER TABLE lead_documents MODIFY COLUMN document_type VARCHAR(50) NOT NULL");
            
            $resCat = $conn->query("SHOW COLUMNS FROM lead_documents LIKE 'category'");
            if ($resCat && $resCat->num_rows === 0) {
                $conn->query("ALTER TABLE lead_documents ADD COLUMN category VARCHAR(50) NOT NULL DEFAULT 'kyc' AFTER lead_id");
                $conn->query("ALTER TABLE lead_documents ADD COLUMN expiry_date DATE NULL AFTER file_path");
                $conn->query("ALTER TABLE lead_documents ADD COLUMN file_size INT UNSIGNED NOT NULL DEFAULT 0 AFTER expiry_date");
            }

            $resIns = $conn->query("SHOW COLUMNS FROM leads LIKE 'insurance_company'");
            if ($resIns && $resIns->num_rows === 0) {
                $conn->query("ALTER TABLE leads ADD COLUMN insurance_company VARCHAR(150) NULL");
                $conn->query("ALTER TABLE leads ADD COLUMN policy_number VARCHAR(100) NULL");
                $conn->query("ALTER TABLE leads ADD COLUMN insurance_expiry_date DATE NULL");
            }

            // Auto-migration for Banking & Payouts expansion
            $schema_tx_cols = [
                'lead_transactions' => [
                    'payout_type' => "ENUM('customer','dealer','org_retained','commission') NOT NULL DEFAULT 'customer'",
                    'beneficiary_name' => "VARCHAR(200) NULL",
                    'status' => "VARCHAR(50) DEFAULT 'completed'",
                    'approval_status' => "ENUM('approved','pending_approval','rejected') NOT NULL DEFAULT 'approved'",
                    'approved_by' => "INT UNSIGNED NULL",
                    'approval_date' => "DATETIME NULL",
                    'rejection_reason' => "TEXT NULL"
                ],
                'commissions' => [
                    'tds_rate' => "DECIMAL(5,2) NOT NULL DEFAULT 5.00",
                    'tds_amount' => "DECIMAL(10,2) NOT NULL DEFAULT 0.00",
                    'net_payable' => "DECIMAL(10,2) NOT NULL DEFAULT 0.00",
                    'approval_status' => "ENUM('approved','pending_approval','rejected') NOT NULL DEFAULT 'approved'",
                    'approved_by' => "INT UNSIGNED NULL",
                    'approval_date' => "DATETIME NULL",
                    'batch_id' => "VARCHAR(50) NULL"
                ]
            ];
            foreach ($schema_tx_cols as $tName => $tCols) {
                foreach ($tCols as $cName => $cDef) {
                    try {
                        $resCheckC = $conn->query("SHOW COLUMNS FROM `$tName` LIKE '$cName'");
                        if ($resCheckC && $resCheckC->num_rows === 0) {
                            $conn->query("ALTER TABLE `$tName` ADD COLUMN `$cName` $cDef");
                        }
                    } catch (Throwable $eTx) {}
                }
            }
            $conn->query("
                CREATE TABLE IF NOT EXISTS `bank_ledger` (
                    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    `post_date` DATE NOT NULL,
                    `customer_name` VARCHAR(255) NULL,
                    `reg_no` VARCHAR(100) NULL,
                    `loan_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
                    `deduction_info` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
                    `status` VARCHAR(50) DEFAULT 'Clear',
                    `account_description` TEXT NULL,
                    `debit_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
                    `credit_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
                    `running_balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
                    `pending_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
                    `remarks` TEXT NULL,
                    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB;
            ");

            $conn->query("
                CREATE TABLE IF NOT EXISTS `system_logs` (
                    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    `user_id` INT UNSIGNED NULL,
                    `action` VARCHAR(255) NOT NULL,
                    `details` TEXT NULL,
                    `ip_address` VARCHAR(45) NULL,
                    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB;
            ");

            // Add performance indexes safely (catch if they already exist)
            try { $conn->query("CREATE INDEX idx_leads_status ON leads (status)"); } catch(Throwable $e) {}
            try { $conn->query("CREATE INDEX idx_leads_date ON leads (lead_date)"); } catch(Throwable $e) {}
            try { $conn->query("CREATE INDEX idx_leads_created ON leads (created_at)"); } catch(Throwable $e) {}
            try { $conn->query("CREATE INDEX idx_leads_exec ON leads (executive_id)"); } catch(Throwable $e) {}
            try { $conn->query("CREATE INDEX idx_failed_logins ON failed_logins (ip_address, attempt_time)"); } catch(Throwable $e) {}
            try { $conn->query("CREATE INDEX idx_lf_next_date ON lead_followups (next_followup_date)"); } catch(Throwable $e) {}
            try { $conn->query("CREATE INDEX idx_leads_compound_filter ON leads (status, executive_id, created_at)"); } catch(Throwable $e) {}
            try { $conn->query("CREATE INDEX idx_leads_sfe_status ON leads (sfe_id, status)"); } catch(Throwable $e) {}
            try { $conn->query("CREATE INDEX idx_leads_channel_status ON leads (channel_id, status)"); } catch(Throwable $e) {}
            try { $conn->query("CREATE INDEX idx_leads_financer_status ON leads (financer_id, status)"); } catch(Throwable $e) {}
            try { $conn->query("CREATE INDEX idx_lead_history_composite ON lead_history (lead_id, action_date)"); } catch(Throwable $e) {}
            try { $conn->query("CREATE INDEX idx_commissions_status ON commissions (lead_id, approval_status)"); } catch(Throwable $e) {}

            @touch($lock_file);
            @touch($local_lock);
        } catch (Throwable $migErr) {
            error_log("Auto-migration notice: " . $migErr->getMessage());
        }
    }
} catch (Exception $e) {
    error_log("Database Connection Error: " . $e->getMessage());
    http_response_code(503);
    $errorHtml = "<html><head><title>Database Error</title></head><body style='font-family: sans-serif; padding: 2rem; max-width: 600px; margin: 0 auto; color: #333;'>";
    $errorHtml .= "<h2 style='color: #e11d48;'>System Error</h2>";
    $errorHtml .= "<p>A database error occurred. Please contact the administrator.</p>";
    $errorHtml .= "<!-- Padding to ensure Chrome displays this error instead of its generic 500 page. ";
    $errorHtml .= str_repeat("This is extra padding to bypass the 512 byte limit. ", 20);
    $errorHtml .= " --></body></html>";
    die($errorHtml);
}

// Dynamically detect BASE_URL regardless of localhost or live server
if (!defined('BASE_URL')) {
    $doc_root  = str_replace('\\', '/', $_SERVER['DOCUMENT_ROOT']);
    $app_dir   = str_replace('\\', '/', dirname(__DIR__));
    $base_path = str_replace($doc_root, '', $app_dir);
    // Fallback: If doc_root mismatch makes base_path look like a full path, reset it
    if (strpos($base_path, '/') !== 0 && strpos($base_path, ':') !== false) {
        $base_path = ''; 
    }
    // Strict fallback for live domains
    if (isset($_SERVER['HTTP_HOST']) && $_SERVER['HTTP_HOST'] !== 'localhost' && strpos($_SERVER['HTTP_HOST'], '127.0.0.1') === false) {
        $base_path = ''; // Assume root on live domains
    }
    define('BASE_URL', rtrim($base_path, '/'));
}


/**
 * Safe query helper — returns result or throws
 */
function db_query(mysqli $conn, string $sql, ?string $types = '', ?array $params = []) {
    $types = $types ?? '';
    $params = $params ?? [];
    try {
        if ($types && $params) {
            $stmt = $conn->prepare($sql);
            if (!$stmt) {
                throw new Exception($conn->error);
            }
            
            // Sanitize params: Convert empty strings to null ONLY for integer ('i') and decimal ('d') fields to prevent foreign key / type errors on optional IDs.
            // Do NOT convert empty strings to null for string ('s') fields, as NOT NULL string columns (like mobile, address, notes) will fail with "Column cannot be null".
            foreach ($params as $k => $v) {
                $type_char = isset($types[$k]) ? $types[$k] : 's';
                if ($v === '' && ($type_char === 'i' || $type_char === 'd')) {
                    $params[$k] = null;
                }
            }

            if (strnatcmp(phpversion(), '8.1') >= 0) {
                // PHP 8.1+ safely inserts null without strict 'i' conversion issues
                if (!$stmt->execute($params)) {
                    throw new Exception($stmt->error);
                }
            } else {
                $bind_args = [$types];
                foreach ($params as $key => $value) {
                    $bind_args[] = &$params[$key];
                }
                call_user_func_array([$stmt, 'bind_param'], $bind_args);
                if (!$stmt->execute()) {
                    throw new Exception($stmt->error);
                }
            }
            
            if (method_exists($stmt, 'get_result')) {
                return $stmt->get_result() ?: $stmt->affected_rows;
            } else {
                $stmt->store_result();
                if ($stmt->field_count > 0) {
                    throw new Exception("CRITICAL: 'mysqlnd' PHP extension is missing on this server!");
                }
                return $stmt->affected_rows;
            }
        }
        $result = $conn->query($sql);
        if ($result === false) {
            throw new Exception($conn->error);
        }
        return $result;
    } catch (Throwable $e) {
        $err = $e->getMessage();
        error_log("SQL Error: " . $err . " | Query: " . $sql);
        if (defined('API_CONTEXT') || strpos($_SERVER['REQUEST_URI'] ?? '', '/api') !== false) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'A database error occurred. Please try again or contact support.']);
            exit;
        }
        die("<html><body style='padding:2rem;font-family:sans-serif;'><h2>Database Error</h2><p>A system error occurred. Please contact the administrator.</p></body></html>");
    }
}

/**
 * Fetch all rows
 */
function db_fetch_all(mysqli $conn, string $sql, ?string $types = '', ?array $params = []): array {
    $types = $types ?? '';
    $params = $params ?? [];
    $result = db_query($conn, $sql, $types, $params);
    if ($result instanceof mysqli_result) {
        return $result->fetch_all(MYSQLI_ASSOC);
    }
    return [];
}

/**
 * Fetch single row
 */
function db_fetch_one(mysqli $conn, string $sql, ?string $types = '', ?array $params = []): ?array {
    $types = $types ?? '';
    $params = $params ?? [];
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
    $month = strtoupper(date('M'));
    $prefix = $month . '-' . $year . '-';
    
    // Get highest existing number for this prefix
    $row = db_fetch_one($conn, "SELECT lead_id FROM leads WHERE lead_id LIKE ? ORDER BY id DESC LIMIT 1", 's', [$prefix . '%']);
    $next = 1;
    if ($row && !empty($row['lead_id'])) {
        $parts = explode('-', $row['lead_id']);
        $lastNum = (int)end($parts);
        if ($lastNum >= $next) {
            $next = $lastNum + 1;
        }
    }
    
    // Loop to guarantee absolute uniqueness against deleted/gapped IDs
    while (true) {
        $candidate = $prefix . str_pad($next, 4, '0', STR_PAD_LEFT);
        $check = db_fetch_one($conn, "SELECT id FROM leads WHERE lead_id = ?", 's', [$candidate]);
        if (!$check) {
            return $candidate;
        }
        $next++;
    }
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

/**
 * Add a global notification for a user
 */
function add_notification(mysqli $conn, int $user_id, string $message, string $link = ''): void {
    db_query($conn,
        "INSERT INTO notifications (user_id, message, link) VALUES (?, ?, ?)",
        'iss', [$user_id, $message, $link]
    );
}

/**
 * Check if a lead meets all criteria for disbursement.
 * Criteria: Bank Details exist AND Core Documents (Aadhaar, PAN, Bank Statement, Vehicle Image) are VERIFIED.
 * Returns true if eligible, or a string error message if blocked.
 */
function can_disburse_lead(mysqli $conn, array $lead, array $newly_uploaded_docs = []) {
    // 1. Mandatory KYC Documents for ALL Disbursals (Removed 'other' as mandatory)
    $required_docs = ['aadhaar', 'pan', 'bank_statement'];
    
    // Check if RC/Insurance are marked as received
    if (($lead['rc_status'] ?? 'pending') === 'received') {
        $required_docs[] = 'rc';
    }
    if (($lead['insurance_status'] ?? 'pending') === 'received') {
        $required_docs[] = 'insurance';
    }
    
    // 2. Fetch Existing Document Statuses (ordered ascending by ID so latest active upload overrides earlier ones)
    $docsQuery = db_fetch_all($conn, "SELECT document_type, verification_status FROM lead_documents WHERE lead_id = ? AND IFNULL(verification_notes, '') != 'Archived / Removed by user' ORDER BY id ASC", 'i', [$lead['id']]);
    
    $docsMap = [];
    foreach ($docsQuery as $d) {
        $docsMap[$d['document_type']] = $d['verification_status'];
    }

    // 3. Verify Mandatory Document Uploads & Statuses
    foreach ($required_docs as $req) {
        $docName = strtoupper(str_replace('_', ' ', $req));
        
        // If uploaded inline during this exact disbursal request, count as provided and verified
        if (in_array($req, $newly_uploaded_docs) || in_array($req . 's', $newly_uploaded_docs)) {
            continue;
        }
        
        // Check if document was uploaded
        if (!isset($docsMap[$req]) && !isset($docsMap[$req . 's'])) {
            return "Cannot disburse: Missing mandatory KYC document ($docName). Please upload it before disbursement.";
        }
        
        // Check document verification status
        $status = $docsMap[$req] ?? ($docsMap[$req . 's'] ?? 'pending');
        if ($status === 'rejected') {
            return "Cannot disburse: $docName was REJECTED during verification. Please upload a valid document and verify it.";
        }
        if ($status === 'pending') {
            // If an Admin or Manager is disbursing the lead, allow disbursal and auto-verify active pending documents
            if (function_exists('is_admin') && (is_admin() || is_manager())) {
                continue;
            }
            return "Cannot disburse: $docName is currently PENDING verification. An Admin or Manager must verify and confirm all mandatory documents before loan disbursement.";
        }
    }

    // 4. Check Vehicle & Bank Details
    if (($lead['vehicle_condition'] ?? '') === 'new') {
        if (empty($lead['insurance_company']) || empty($lead['policy_number']) || empty($lead['insurance_expiry_date'])) {
            return "New Vehicle Insurance Details (Insurance Company Name, Policy Number, and Expiry Date) must be filled in before disbursing a new vehicle.";
        }
    } else {
        if (empty($lead['customer_bank_name']) || empty($lead['customer_account_number']) || empty($lead['customer_ifsc_code'])) {
            return "Bank Details (Bank Name, Account Number, IFSC) must be filled in before disbursement for Used/Old vehicles.";
        }
    }

    return true; 
}

/**
 * Get agent ID by name or create if not exists
 */
function get_or_create_agent_by_name(mysqli $conn, string $name): ?int {
    $name = trim($name);
    if ($name === '') {
        return null;
    }
    // Check if agent exists (case-insensitively)
    $agent = db_fetch_one($conn, "SELECT id FROM agents WHERE LOWER(name) = LOWER(?)", 's', [$name]);
    if ($agent) {
        return (int)$agent['id'];
    }
    // Create new agent
    db_query($conn, "INSERT INTO agents (name, mobile, email, pan_number) VALUES (?, '', '', '')", 's', [$name]);
    return (int)$conn->insert_id;
}

// Load System Settings utility globally
require_once __DIR__ . '/settings_helper.php';

// Apply Dynamic System Settings
date_default_timezone_set(get_setting('system_timezone', 'Asia/Kolkata'));

/**
 * Generate a clean WhatsApp deep-link.
 * @param string $phone The phone number to sanitize.
 * @param string $text The pre-filled message text.
 * @return string The wa.me URL or empty string if no valid phone.
 */
function whatsapp_link($phone, $text = '') {
    if (empty($phone)) return '';
    // Strip non-numeric characters
    $clean_phone = preg_replace('/[^0-9]/', '', $phone);
    if (strlen($clean_phone) < 10) return '';
    // Ensure country code (assuming India 91 as default if length is exactly 10)
    if (strlen($clean_phone) == 10) {
        $clean_phone = '91' . $clean_phone;
    }
    
    $url = "https://wa.me/" . $clean_phone;
    if (!empty($text)) {
        $url .= "?text=" . rawurlencode($text);
    }
    return $url;
}

// Global Exception Handler for legacy HTML pages (not API context)
if (!defined('API_CONTEXT') && (strpos($_SERVER['REQUEST_URI'] ?? '', '/api') === false)) {
    ini_set('display_errors', '0');
    error_reporting(E_ALL);

    set_exception_handler(function ($exception) {
        error_log("Unhandled Exception: " . $exception->getMessage() . " in " . $exception->getFile() . " on line " . $exception->getLine() . "\n" . $exception->getTraceAsString());
        http_response_code(500);
        die("
            <div style='font-family: sans-serif; max-width: 600px; margin: 6% auto; padding: 2.5rem; border-radius: 12px; border: 1px solid #e2e8f0; background-color: #ffffff; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05); color: #1e293b;'>
                <h2 style='color: #e11d48; margin-top: 0; font-size: 1.4rem; font-weight: 700;'>System Error</h2>
                <p style='font-size: 0.95rem; line-height: 1.6;'>An internal server error occurred while processing your request. Please try again later or contact support if the issue persists.</p>
            </div>
        ");
    });
}
