<?php
// api/index.php — Unified REST API Gateway for LeadFlow Pro React + Vite Frontend

// Prevent showing stack traces/internal errors to the public
ini_set('display_errors', '0');
error_reporting(E_ALL);

// Register global exception handler for API context
set_exception_handler(function ($exception) {
    error_log("Unhandled API Exception: " . $exception->getMessage() . " in " . $exception->getFile() . " on line " . $exception->getLine() . "\n" . $exception->getTraceAsString());
    http_response_code(500);
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode(['error' => 'An internal server error occurred. Please try again later.']);
    exit;
});

// Register global error handler to capture notices/warnings and prevent path leaks in API responses
set_error_handler(function ($severity, $message, $file, $line) {
    if (!(error_reporting() & $severity)) {
        return;
    }
    error_log("PHP API Error: $message in $file on line $line");
    // Return true to bypass PHP's standard error display handler
    return true;
});


// Enable CORS for localhost Vite development server
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (empty($origin) || strpos($origin, 'http://localhost') === 0 || strpos($origin, 'http://127.0.0.1') === 0) {
    header("Access-Control-Allow-Origin: " . ($origin ?: 'http://localhost:5173'));
}
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

// Disable session redirects in CLI / API context
define('API_CONTEXT', true);

require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/rate_limiter.php';
require_once __DIR__ . '/../includes/validator.php';

// Helper: JSON Response
function json_response($data, int $status = 200) {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    exit;
}

// Helper: JSON Error
function json_error(string $message, int $status = 400) {
    json_response(['error' => $message], $status);
}

// Helper: Require Login & Role
function api_require_login() {
    if (!is_logged_in()) {
        json_error("Unauthorized. Please log in.", 401);
    }
    global $conn;
    if ($conn) {
        $uid = current_user_id();
        $db_user = db_fetch_one($conn, "SELECT id, role, is_active FROM users WHERE id = ?", 'i', [$uid]);
        if (!$db_user || (int)$db_user['is_active'] === 0) {
            logout_user();
            json_error("Your account has been locked or removed. Please contact Admin.", 401);
        }
        $db_role = $db_user['role'];
        if ($db_role === 'finance_manager' || $db_role === '') $db_role = 'manager';
        if ($_SESSION['role'] !== $db_role) {
            $_SESSION['role'] = $db_role;
            if (isset($_SESSION['user'])) $_SESSION['user']['role'] = $db_role;
        }
    }
}

function api_require_role(string ...$roles) {
    api_require_login();
    if (!in_array(current_role(), $roles)) {
        json_error("Forbidden. You do not have permission.", 403);
    }
}

function sync_all_user_role_entities($conn) {
    if (!$conn) return;
    // 1. Sync Channel Agents
    $conn->query("
        INSERT INTO channel_executives (user_id, name, mobile, email, is_active)
        SELECT id, name, '', email, is_active FROM users 
        WHERE role = 'channel_agent' 
          AND id NOT IN (SELECT IFNULL(user_id, 0) FROM channel_executives)
          AND email NOT IN (SELECT IFNULL(email, '') FROM channel_executives WHERE email != '')
    ");
    $conn->query("
        UPDATE channel_executives ce
        JOIN users u ON ce.email = u.email AND u.role = 'channel_agent'
        SET ce.user_id = u.id
        WHERE ce.user_id IS NULL AND ce.email != ''
    ");

    // 2. Sync DSA Agents
    $conn->query("
        INSERT INTO agents (user_id, name, mobile, email, is_active)
        SELECT id, name, '', email, is_active FROM users 
        WHERE role = 'agent' 
          AND id NOT IN (SELECT IFNULL(user_id, 0) FROM agents)
          AND email NOT IN (SELECT IFNULL(email, '') FROM agents WHERE email != '')
    ");
    $conn->query("
        UPDATE agents a
        JOIN users u ON a.email = u.email AND u.role = 'agent'
        SET a.user_id = u.id
        WHERE a.user_id IS NULL AND a.email != ''
    ");

    // 3. Sync Field Executives
    $conn->query("
        INSERT INTO executives (user_id, name, mobile, email, is_active)
        SELECT id, name, '', email, is_active FROM users 
        WHERE role = 'executive' 
          AND id NOT IN (SELECT IFNULL(user_id, 0) FROM executives)
          AND email NOT IN (SELECT IFNULL(email, '') FROM executives WHERE email != '')
    ");
    $conn->query("
        UPDATE executives e
        JOIN users u ON e.email = u.email AND u.role = 'executive'
        SET e.user_id = u.id
        WHERE e.user_id IS NULL AND e.email != ''
    ");
}

// Parse request URI to determine endpoint
$request_uri = $_SERVER['REQUEST_URI'];
if (($pos = strpos($request_uri, '?')) !== false) {
    $request_uri = substr($request_uri, 0, $pos);
}

// Remove base path to get the relative api path
$path = $request_uri;
$base_paths = ['/lead-follow-up/backend/api', '/backend/api', '/api'];
foreach ($base_paths as $base) {
    if (strpos($path, $base) === 0) {
        $path = substr($path, strlen($base));
        break;
    }
}

$path = trim(str_replace('index.php', '', $path), '/');
$method = $_SERVER['REQUEST_METHOD'];

// Enforce Rate Limiting on API requests
rate_limit_request($path);

// Parse JSON Body input
$input = json_decode(file_get_contents('php://input'), true) ?? [];
if (empty($input) && !empty($_POST)) {
    $input = $_POST;
}

// ----------------------------------------------------
// ROUTER
// ----------------------------------------------------

if ($path === 'dms' || strpos($path, 'dms/') === 0) {
    if (strpos($path, 'dms/') === 0) {
        $dmsAction = substr($path, 4);
        if (!isset($_GET['action']) && !isset($_POST['action'])) {
            $_GET['action'] = $dmsAction;
        }
    }
    require_once __DIR__ . '/dms.php';
    exit;
}

switch ($path) {
    // ----------------------------------------------------
    // AUTHENTICATION
    // ----------------------------------------------------
    case 'auth/login':
        if ($method !== 'POST') json_error("Method not allowed", 405);
        $email = trim($input['email'] ?? '');
        $password = $input['password'] ?? '';
        
        if (empty($email) || empty($password)) {
            json_error("Email and password are required.");
        }

        $ip = get_client_ip();
        
        // Check exponential backoff (IP + Account combined)
        $wait_time = check_auth_backoff($ip, $email);
        if ($wait_time > 0) {
            json_error("Too many failed attempts. Please wait {$wait_time} seconds before trying again.", 429);
        }

        $user = db_fetch_one($conn, "SELECT * FROM users WHERE email = ? AND is_active = 1 LIMIT 1", 's', [$email]);
        if ($user && password_verify($password, $user['password'])) {
            clear_auth_failures($ip, $email);
            db_query($conn, "DELETE FROM failed_logins WHERE ip_address = ?", 's', [$ip]);
            db_query($conn, "UPDATE users SET role = 'manager' WHERE role = '' OR role = 'finance_manager'");
            if ($user['role'] === 'finance_manager' || $user['role'] === '') $user['role'] = 'manager';
            login_user($user);
            unset($user['password']); // Strip password hash
            json_response(['message' => 'Logged in successfully', 'user' => $user]);
        } else {
            record_auth_failure($ip, $email);
            db_query($conn, "INSERT INTO failed_logins (ip_address) VALUES (?)", 's', [$ip]);
            
            $next_wait = check_auth_backoff($ip, $email);
            if ($next_wait > 0) {
                json_error("Invalid email or password. Too many failed attempts, please wait {$next_wait} seconds.", 429);
            } else {
                json_error("Invalid email or password.");
            }
        }
        break;

    case 'auth/logout':
        if ($method !== 'POST') json_error("Method not allowed", 405);
        logout_user();
        json_response(['message' => 'Logged out successfully']);
        break;

    case 'auth/me':
        if ($method !== 'GET') json_error("Method not allowed", 405);
        if (!is_logged_in()) {
            json_response(['user' => null], 200);
        }
        $user = current_user();
        unset($user['password']);
        json_response(['user' => $user]);
        break;

    // ----------------------------------------------------
    // DASHBOARD STATS
    // ----------------------------------------------------
    case 'dashboard/stats':
        api_require_login();
        if ($method !== 'GET') json_error("Method not allowed", 405);

        $isExecutive = is_executive();
        $isChannelAgent = is_channel_agent();
        $isAgent = is_agent();
        
        $execId = null;
        $cheId = null;
        $agId = null;
        $whereScope = "1=1";
        $paramsScope = [];
        $typesScope = '';

        if ($isExecutive) {
            $execRow = db_fetch_one($conn, "SELECT id FROM executives WHERE user_id = ?", 'i', [current_user_id()]);
            $execId = $execRow['id'] ?? 0;
            $whereScope = "l.executive_id = ?";
            $paramsScope = [$execId];
            $typesScope = 'i';
        } elseif ($isChannelAgent) {
            $cheRow = db_fetch_one($conn, "SELECT id FROM channel_executives WHERE user_id = ?", 'i', [current_user_id()]);
            $cheId = $cheRow['id'] ?? 0;
            $whereScope = "(l.created_by = ? OR l.channel_executive_id = ?)";
            $paramsScope = [current_user_id(), $cheId];
            $typesScope = 'ii';
        } elseif ($isAgent) {
            $agRow = db_fetch_one($conn, "SELECT id FROM agents WHERE user_id = ?", 'i', [current_user_id()]);
            $agId = $agRow['id'] ?? 0;
            $whereScope = "(l.created_by = ? OR l.agent_id = ?)";
            $paramsScope = [current_user_id(), $agId];
            $typesScope = 'ii';
        }

        $totalLeads = db_fetch_one($conn, "SELECT COUNT(*) as cnt FROM leads l WHERE $whereScope", $typesScope, $paramsScope)['cnt'] ?? 0;
        $approved = db_fetch_one($conn, "SELECT COUNT(*) as cnt FROM leads l WHERE l.status='approved' AND $whereScope", $typesScope, $paramsScope)['cnt'] ?? 0;
        $disbursed = db_fetch_one($conn, "SELECT COUNT(*) as cnt FROM leads l WHERE l.status='disbursed' AND $whereScope", $typesScope, $paramsScope)['cnt'] ?? 0;
        $pending = db_fetch_one($conn, "SELECT COUNT(*) as cnt FROM leads l WHERE l.status NOT IN ('approved', 'disbursed', 'rejected') AND $whereScope", $typesScope, $paramsScope)['cnt'] ?? 0;
        $rejected = db_fetch_one($conn, "SELECT COUNT(*) as cnt FROM leads l WHERE l.status='rejected' AND $whereScope", $typesScope, $paramsScope)['cnt'] ?? 0;

        $conversionRate = $totalLeads > 0 ? round(($disbursed / $totalLeads) * 100, 1) : 0;

        $eligibleRetentions = 0;
        if (!$isExecutive && !$isChannelAgent && !$isAgent) {
            $eligibleRetentions = db_fetch_one($conn, "
                SELECT COUNT(*) as cnt 
                FROM commissions c
                JOIN leads l ON c.lead_id = l.id
                WHERE c.payout_10_status = 'pending'
                  AND l.rc_status IN ('received', 'not_applicable')
                  AND l.insurance_status IN ('received', 'not_applicable')
                  AND l.rto_status IN ('done', 'not_applicable')
            ")['cnt'] ?? 0;
        }

        if ($isExecutive) {
            $totalCommPaid = db_fetch_one($conn, "SELECT SUM(c.paid_amount) as s FROM commissions c JOIN leads l ON c.lead_id = l.id WHERE l.executive_id = ?", 'i', [$execId])['s'] ?? 0;
        } elseif ($isChannelAgent) {
            $totalCommPaid = db_fetch_one($conn, "SELECT SUM(c.paid_amount) as s FROM commissions c JOIN leads l ON c.lead_id = l.id WHERE (l.created_by = ? OR l.channel_executive_id = ?)", 'ii', [current_user_id(), $cheId])['s'] ?? 0;
        } elseif ($isAgent) {
            $totalCommPaid = db_fetch_one($conn, "SELECT SUM(c.paid_amount) as s FROM commissions c JOIN leads l ON c.lead_id = l.id WHERE (l.created_by = ? OR l.agent_id = ?)", 'ii', [current_user_id(), $agId])['s'] ?? 0;
        } else {
            $totalCommPaid = db_fetch_one($conn, "SELECT SUM(paid_amount) as s FROM commissions")['s'] ?? 0;
        }

        $execRows = db_fetch_all($conn, "
            SELECT ex.name, COUNT(l.id) as total,
                   SUM(CASE WHEN l.status='disbursed' THEN 1 ELSE 0 END) as disbursed
            FROM executives ex
            LEFT JOIN leads l ON l.executive_id = ex.id
            GROUP BY ex.id ORDER BY total DESC, ex.name ASC LIMIT 5
        ");

        $financerRows = db_fetch_all($conn, "
            SELECT f.name, COUNT(l.id) as total,
                   SUM(CASE WHEN l.status='disbursed' THEN 1 ELSE 0 END) as disbursed
            FROM financers f
            LEFT JOIN leads l ON l.financer_id = f.id AND l.status != 'rejected'
            GROUP BY f.id ORDER BY total DESC, f.name ASC LIMIT 6
        ");

        $agentRows = db_fetch_all($conn, "
            SELECT a.name, COUNT(l.id) as total,
                   SUM(CASE WHEN l.status='disbursed' THEN 1 ELSE 0 END) as disbursed,
                   SUM(CASE WHEN l.status='disbursed' THEN l.loan_amount ELSE 0 END) as disbursed_volume
            FROM agents a
            LEFT JOIN leads l ON l.agent_id = a.id
            GROUP BY a.id ORDER BY disbursed_volume DESC, total DESC, a.name ASC LIMIT 5
        ");

        // DSA Partner Tiering & Gamification metrics
        $partnerTier = 'Bronze';
        $tierMultiplier = 1.0;
        $nextTierVolume = 2500000;
        $userDisbursedVol = 0;
        if ($isAgent) {
            $userDisbursedVol = db_fetch_one($conn, "SELECT SUM(loan_amount) as vol FROM leads WHERE agent_id = ? AND status = 'disbursed'", 'i', [$agId])['vol'] ?? 0;
        } elseif ($isChannelAgent) {
            $userDisbursedVol = db_fetch_one($conn, "SELECT SUM(loan_amount) as vol FROM leads WHERE (created_by = ? OR channel_executive_id = ?) AND status = 'disbursed'", 'ii', [current_user_id(), $cheId])['vol'] ?? 0;
        } else {
            $userDisbursedVol = db_fetch_one($conn, "SELECT SUM(loan_amount) as vol FROM leads WHERE status = 'disbursed'")['vol'] ?? 0;
        }

        if ($userDisbursedVol >= 10000000) {
            $partnerTier = 'Platinum';
            $tierMultiplier = 1.20;
            $nextTierVolume = 0;
        } elseif ($userDisbursedVol >= 5000000) {
            $partnerTier = 'Gold';
            $tierMultiplier = 1.15;
            $nextTierVolume = 10000000;
        } elseif ($userDisbursedVol >= 2500000) {
            $partnerTier = 'Silver';
            $tierMultiplier = 1.10;
            $nextTierVolume = 5000000;
        }

        $recentLeads = db_fetch_all($conn, "
            SELECT l.id, l.lead_id, l.customer_name, l.customer_mobile, l.vehicle_make_model, l.loan_amount, l.status, l.lead_date,
                   ex.name as executive_name, f.name as financer_name
            FROM leads l
            LEFT JOIN executives ex ON l.executive_id = ex.id
            LEFT JOIN financers f ON l.financer_id = f.id
            WHERE $whereScope AND l.status != 'disbursed'
            ORDER BY l.created_at DESC LIMIT 8
        ", $typesScope, $paramsScope);

        // Followups due
        $dueFollowups = db_fetch_all($conn, "
            SELECT lf.next_followup_date, lf.remarks, l.lead_id, l.id as lead_real_id, l.customer_name, l.customer_mobile, l.status
            FROM lead_followups lf
            JOIN leads l ON lf.lead_id = l.id
            WHERE lf.next_followup_date <= CURDATE()
              AND l.status NOT IN ('disbursed','rejected')
              AND $whereScope
            ORDER BY lf.next_followup_date ASC LIMIT 5
        ", $typesScope, $paramsScope);

        json_response([
            'kpis' => [
                'total' => $totalLeads,
                'pending' => $pending,
                'approved' => $approved,
                'disbursed' => $disbursed,
                'rejected' => $rejected,
                'conversionRate' => $conversionRate,
                'eligibleRetentions' => $eligibleRetentions,
                'totalCommPaid' => $totalCommPaid
            ],
            'topExecutives' => $execRows,
            'topFinancers' => $financerRows,
            'topAgents' => $agentRows,
            'dsaTiering' => [
                'tier' => $partnerTier,
                'currentVolume' => floatval($userDisbursedVol),
                'nextTierVolume' => floatval($nextTierVolume),
                'multiplier' => floatval($tierMultiplier)
            ],
            'recentLeads' => $recentLeads,
            'dueFollowups' => $dueFollowups
        ]);
        break;

    // ----------------------------------------------------
    // LEADS ENDPOINTS
    // ----------------------------------------------------
    case 'leads/public-create':
        if ($method !== 'POST') json_error("Method not allowed", 405);
        $customer_name = trim($input['customer_name'] ?? '');
        $customer_mobile = trim($input['customer_mobile'] ?? '');
        $loan_amount = (float)($input['loan_amount'] ?? 0);
        $vehicle_make_model = trim($input['vehicle_make_model'] ?? '');
        $loan_type = trim($input['loan_type'] ?? 'new_loan');
        
        if ($loan_amount < 0) {
            json_error("Loan amount cannot be negative.");
        }
        if (empty($customer_name) || empty($customer_mobile)) {
            json_error("Customer Name and Mobile are required.");
        }
        if (!preg_match('/^\d{10}$/', $customer_mobile)) {
            json_error("Primary mobile number must be exactly 10 numeric digits.");
        }

        $lead_id = generate_lead_id($conn);
        $lead_date = date('Y-m-d');
        
        db_query($conn, "
            INSERT INTO leads (
                lead_id, lead_date, customer_name, customer_mobile,
                vehicle_condition, vehicle_make_model, loan_amount, loan_type,
                status, query_notes, created_by
            ) VALUES (?, ?, ?, ?, 'new', ?, ?, ?, 'new', 'Submitted via public website.', 1)
        ", 'sssssds', [
            $lead_id, $lead_date, $customer_name, $customer_mobile,
            $vehicle_make_model, $loan_amount, $loan_type
        ]);

        $newId = $conn->insert_id;
        log_lead_action($conn, $newId, 'Lead Created', 'Lead submitted publicly via landing page.', 1);

        json_response(['message' => 'Application submitted successfully', 'id' => $newId, 'lead_id' => $lead_id]);
        break;


    case 'leads':
        api_require_login();
        if ($method === 'GET') {
            // Scoping
            $isExecutive = is_executive();
            $whereParts = ["1=1"];
            $params = [];
            $types = '';

            if ($isExecutive) {
                $execRow = db_fetch_one($conn, "SELECT id FROM executives WHERE user_id = ?", 'i', [current_user_id()]);
                $execId = $execRow['id'] ?? 0;
                $whereParts[] = "l.executive_id = ?";
                $params[] = $execId;
                $types .= 'i';
            }
            if (is_channel_agent()) {
                $cheRow = db_fetch_one($conn, "SELECT id FROM channel_executives WHERE user_id = ?", 'i', [current_user_id()]);
                $cheId = $cheRow['id'] ?? 0;
                $whereParts[] = "(l.created_by = ? OR l.channel_executive_id = ?)";
                $params[] = current_user_id();
                $params[] = $cheId;
                $types .= 'ii';
            } elseif (is_agent()) {
                $agRow = db_fetch_one($conn, "SELECT id FROM agents WHERE user_id = ?", 'i', [current_user_id()]);
                $agId = $agRow['id'] ?? 0;
                $whereParts[] = "(l.created_by = ? OR l.agent_id = ?)";
                $params[] = current_user_id();
                $params[] = $agId;
                $types .= 'ii';
            }

            $filterAssigned = $_GET['assigned'] ?? '';
            if ($filterAssigned === '1') {
                $whereParts[] = "(l.executive_id IS NOT NULL OR l.financer_id IS NOT NULL OR l.channel_id IS NOT NULL)";
                $whereParts[] = "l.id NOT IN (SELECT lead_id FROM lead_followups WHERE followup_date >= COALESCE(l.assigned_date, '1970-01-01'))";
                $whereParts[] = "l.status NOT IN ('approved', 'disbursed', 'rejected')";
            } elseif ($filterAssigned === 'followup') {
                $whereParts[] = "(l.executive_id IS NOT NULL OR l.financer_id IS NOT NULL OR l.channel_id IS NOT NULL)";
                $whereParts[] = "l.id IN (SELECT lead_id FROM lead_followups WHERE followup_date >= COALESCE(l.assigned_date, '1970-01-01'))";
                $whereParts[] = "l.status NOT IN ('approved', 'disbursed', 'rejected')";
            } elseif ($filterAssigned === '0') {
                $whereParts[] = "(l.executive_id IS NULL AND l.financer_id IS NULL AND l.channel_id IS NULL)";
                $whereParts[] = "l.status NOT IN ('approved', 'disbursed', 'rejected')";
            }
            if (!empty($_GET['status'])) {
                if ($_GET['status'] === 'pending') {
                    $whereParts[] = "l.status NOT IN ('approved', 'disbursed', 'rejected')";
                } else {
                    $whereParts[] = "l.status = ?";
                    $params[] = $_GET['status'];
                    $types .= 's';
                }
            } elseif ($filterAssigned !== 'all') {
                $whereParts[] = "l.status != 'disbursed'";
            }
            if (!empty($_GET['agent_id'])) {
                $whereParts[] = "l.agent_id = ?";
                $params[] = (int)$_GET['agent_id'];
                $types .= 'i';
            }
            if (!empty($_GET['financer_id'])) {
                $whereParts[] = "l.financer_id = ?";
                $params[] = (int)$_GET['financer_id'];
                $types .= 'i';
            }
            if (!empty($_GET['executive_id'])) {
                $whereParts[] = "l.executive_id = ?";
                $params[] = (int)$_GET['executive_id'];
                $types .= 'i';
            }
            if (!empty($_GET['channel_id'])) {
                $whereParts[] = "l.channel_id = ?";
                $params[] = (int)$_GET['channel_id'];
                $types .= 'i';
            }
            if (!empty($_GET['channel_executive_id'])) {
                $whereParts[] = "l.channel_executive_id = ?";
                $params[] = (int)$_GET['channel_executive_id'];
                $types .= 'i';
            }
            if (!empty($_GET['q'])) {
                $qStr = '%' . $_GET['q'] . '%';
                $whereParts[] = "(l.lead_id LIKE ? OR l.customer_name LIKE ? OR l.customer_mobile LIKE ? OR l.registration_number LIKE ?)";
                $params[] = $qStr;
                $params[] = $qStr;
                $params[] = $qStr;
                $params[] = $qStr;
                $types .= 'ssss';
            }

            $whereSql = implode(' AND ', $whereParts);

            $leads = db_fetch_all($conn, "
                SELECT l.*, a.name as agent_name, f.name as financer_name, d.name as dealer_name, ex.name as executive_name, ch.name as channel_name, che.name as channel_executive_name
                FROM leads l
                LEFT JOIN agents a ON l.agent_id = a.id
                LEFT JOIN financers f ON l.financer_id = f.id
                LEFT JOIN dealers d ON l.dealer_id = d.id
                LEFT JOIN executives ex ON l.executive_id = ex.id
                LEFT JOIN channels ch ON l.channel_id = ch.id
                LEFT JOIN channel_executives che ON l.channel_executive_id = che.id
                WHERE $whereSql
                ORDER BY l.created_at DESC
            ", $types, $params);

            json_response(['leads' => $leads]);

        } elseif ($method === 'POST') {
            // Create lead (Step 1)
            $customer_name = trim($input['customer_name'] ?? '');
            $customer_mobile = trim($input['customer_mobile'] ?? '');
            $loan_amount = (float)($input['loan_amount'] ?? 0);
            if ($loan_amount < 0) {
                json_error("Loan amount cannot be negative.");
            }
            
            if (empty($customer_name) || empty($customer_mobile)) {
                json_error("Customer Name and Mobile are required.");
            }
            if (!preg_match('/^\d{10}$/', $customer_mobile)) {
                json_error("Primary mobile number must be exactly 10 numeric digits.");
            }

            $lead_id = generate_lead_id($conn);
            $lead_date = !empty($input['lead_date']) ? trim($input['lead_date']) : date('Y-m-d');
            $customer_mobile2 = trim($input['customer_mobile2'] ?? '');
            if (!empty($customer_mobile2) && !preg_match('/^\d{10}$/', $customer_mobile2)) {
                json_error("Alternate mobile number must be exactly 10 numeric digits.");
            }
            $customer_address = trim($input['customer_address'] ?? '');
            $vehicle_condition = in_array($input['vehicle_condition'] ?? '', ['new', 'old']) ? $input['vehicle_condition'] : 'new';
            $vehicle_make_model = trim($input['vehicle_make_model'] ?? '');
            $year_of_manufacture = !empty($input['year_of_manufacture']) ? (int)$input['year_of_manufacture'] : null;
            $registration_number = trim($input['registration_number'] ?? '');
            $insurance_company = trim($input['insurance_company'] ?? '');
            $policy_number = trim($input['policy_number'] ?? '');
            $insurance_expiry_date = !empty($input['insurance_expiry_date']) ? $input['insurance_expiry_date'] : null;
            
            $valid_loan_types = ['new_loan', 'refinance', 'repurchase', 'bt'];
            $loan_type = in_array($input['loan_type'] ?? '', $valid_loan_types) ? $input['loan_type'] : 'new_loan';
            
            $referred_by = trim($input['referred_by'] ?? '');
            $agent_id = !empty($input['agent_id']) ? (int)$input['agent_id'] : null;
            $channel_id = !empty($input['channel_id']) ? (int)$input['channel_id'] : null;
            $channel_executive_id = !empty($input['channel_executive_id']) ? (int)$input['channel_executive_id'] : null;
            $query_notes = trim($input['query_notes'] ?? '');
            $created_by = current_user_id();

            if (is_channel_agent()) {
                $cheRow = db_fetch_one($conn, "SELECT id, channel_id FROM channel_executives WHERE user_id = ?", 'i', [$created_by]);
                if ($cheRow) {
                    $channel_executive_id = (int)$cheRow['id'];
                    $channel_id = !empty($cheRow['channel_id']) ? (int)$cheRow['channel_id'] : null;
                }
            } elseif (is_agent()) {
                $agRow = db_fetch_one($conn, "SELECT id FROM agents WHERE user_id = ?", 'i', [$created_by]);
                if ($agRow) {
                    $agent_id = (int)$agRow['id'];
                }
            }

            db_query($conn, "
                INSERT INTO leads (
                    lead_id, lead_date, customer_name, customer_mobile, customer_mobile2, customer_address,
                    vehicle_condition, vehicle_make_model, year_of_manufacture, registration_number, insurance_company, policy_number, insurance_expiry_date, loan_amount, loan_type,
                    referred_by, agent_id, channel_id, channel_executive_id, query_notes, status, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?)
            ", 'ssssssssissssdssiiisi', [
                $lead_id, $lead_date, $customer_name, $customer_mobile, $customer_mobile2, $customer_address,
                $vehicle_condition, $vehicle_make_model, $year_of_manufacture, $registration_number, $insurance_company, $policy_number, $insurance_expiry_date, $loan_amount, $loan_type,
                $referred_by, $agent_id, $channel_id, $channel_executive_id, $query_notes, $created_by
            ]);

            $newId = $conn->insert_id;
            log_lead_action($conn, $newId, 'Lead Created', 'Lead initiated automatically.', $created_by);

            json_response(['message' => 'Lead created successfully', 'id' => $newId, 'lead_id' => $lead_id]);
        } elseif ($method === 'PUT') {
            // Check if this is an assignment update
            if (isset($_GET['action']) && $_GET['action'] === 'assign') {
                $id = (int)($input['id'] ?? 0);
                if (!$id) json_error("Lead ID required");

                $financer_id = !empty($input['financer_id']) ? (int)$input['financer_id'] : null;
                $executive_id = !empty($input['executive_id']) ? (int)$input['executive_id'] : null;
                $channel_id = !empty($input['channel_id']) ? (int)$input['channel_id'] : null;
                $channel_executive_id = !empty($input['channel_executive_id']) ? (int)$input['channel_executive_id'] : null;
                $assigned_date = !empty($input['assigned_date']) ? trim($input['assigned_date']) : null;

                // Get current lead state
                $lead = db_fetch_one($conn, "SELECT status, executive_id FROM leads WHERE id = ?", 'i', [$id]);
                if ($lead && $lead['status'] === 'disbursed') {
                    json_error("This lead has been disbursed. Lead assignments are locked.", 403);
                }
                
                $newStatus = $lead['status'];
                $statusSql = "";
                
                // Automatically set status to 'initiated' when assigning for the first time OR re-assigning a rejected lead
                if (($executive_id || $financer_id || $channel_id) && (empty($lead['executive_id']) || in_array($lead['status'], ['new', 'pending', 'rejected']))) {
                    $newStatus = 'initiated';
                    $statusSql = ", status = 'initiated', status_date = CURDATE()";
                }

                db_query($conn, "
                    UPDATE leads SET
                        financer_id = ?, executive_id = ?, channel_id = ?, channel_executive_id = ?, assigned_date = ? $statusSql
                    WHERE id = ?
                ", 'iiiisi', [
                    $financer_id, $executive_id, $channel_id, $channel_executive_id, $assigned_date, $id
                ]);

                log_lead_action($conn, $id, 'Lead Assigned', 'Assignment updated by ' . current_user()['name'], current_user_id());
                
                if ($newStatus !== $lead['status']) {
                    log_lead_action($conn, $id, 'Status Changed', "From {$lead['status']} to {$newStatus} (Auto-assigned)", current_user_id());
                }

                json_response(['message' => 'Lead assignments updated successfully']);
            }

            // Otherwise, Update core lead data
            if (!is_admin() && !is_manager()) json_error("Only Admins and Managers can edit lead records", 403);
            $id = (int)($input['id'] ?? 0);
            $customer_name = trim($input['customer_name'] ?? '');
            $customer_mobile = trim($input['customer_mobile'] ?? '');
            $loan_amount = (float)($input['loan_amount'] ?? 0);
            if ($loan_amount < 0) {
                json_error("Loan amount cannot be negative.");
            }
            
            if (!$id || empty($customer_name) || empty($customer_mobile)) {
                json_error("ID, Customer Name and Mobile are required.");
            }

            $existLead = db_fetch_one($conn, "SELECT status, created_by, executive_id, agent_id, channel_executive_id FROM leads WHERE id = ?", 'i', [$id]);
            if (!$existLead) json_error("Lead not found", 404);
            if (is_executive()) {
                $execRow = db_fetch_one($conn, "SELECT id FROM executives WHERE user_id = ?", 'i', [current_user_id()]);
                if ((int)$existLead['executive_id'] !== (int)($execRow['id'] ?? 0)) json_error("Access denied to edit this lead.", 403);
            } elseif (is_channel_agent()) {
                $cheRow = db_fetch_one($conn, "SELECT id FROM channel_executives WHERE user_id = ?", 'i', [current_user_id()]);
                if ((int)$existLead['created_by'] !== current_user_id() && (int)$existLead['channel_executive_id'] !== (int)($cheRow['id'] ?? 0)) json_error("Access denied to edit this lead.", 403);
            } elseif (is_agent()) {
                $agRow = db_fetch_one($conn, "SELECT id FROM agents WHERE user_id = ?", 'i', [current_user_id()]);
                if ((int)$existLead['created_by'] !== current_user_id() && (int)$existLead['agent_id'] !== (int)($agRow['id'] ?? 0)) json_error("Access denied to edit this lead.", 403);
            }
            if (!preg_match('/^\d{10}$/', $customer_mobile)) {
                json_error("Primary mobile number must be exactly 10 numeric digits.");
            }

            $lead_date = !empty($input['lead_date']) ? trim($input['lead_date']) : date('Y-m-d');
            $customer_mobile2 = trim($input['customer_mobile2'] ?? '');
            if (!empty($customer_mobile2) && !preg_match('/^\d{10}$/', $customer_mobile2)) {
                json_error("Alternate mobile number must be exactly 10 numeric digits.");
            }
            $customer_address = trim($input['customer_address'] ?? '');
            $vehicle_condition = trim($input['vehicle_condition'] ?? '');
            $vehicle_make_model = trim($input['vehicle_make_model'] ?? '');
            $year_of_manufacture = !empty($input['year_of_manufacture']) ? (int)$input['year_of_manufacture'] : null;
            $registration_number = trim($input['registration_number'] ?? '');
            $insurance_company = trim($input['insurance_company'] ?? '');
            $policy_number = trim($input['policy_number'] ?? '');
            $insurance_expiry_date = !empty($input['insurance_expiry_date']) ? $input['insurance_expiry_date'] : null;
            
            $valid_loan_types = ['new_loan', 'refinance', 'repurchase', 'bt'];
            $loan_type = in_array($input['loan_type'] ?? '', $valid_loan_types) ? $input['loan_type'] : 'new_loan';
            
            $referred_by = trim($input['referred_by'] ?? '');
            $agent_id = !empty($input['agent_id']) ? (int)$input['agent_id'] : null;
            $channel_id = !empty($input['channel_id']) ? (int)$input['channel_id'] : null;
            $channel_executive_id = !empty($input['channel_executive_id']) ? (int)$input['channel_executive_id'] : null;
            $query_notes = trim($input['query_notes'] ?? '');

            if (is_channel_agent()) {
                $cheRow = db_fetch_one($conn, "SELECT id, channel_id FROM channel_executives WHERE user_id = ?", 'i', [current_user_id()]);
                if ($cheRow) {
                    $channel_executive_id = (int)$cheRow['id'];
                    $channel_id = !empty($cheRow['channel_id']) ? (int)$cheRow['channel_id'] : null;
                }
            } elseif (is_agent()) {
                $agRow = db_fetch_one($conn, "SELECT id FROM agents WHERE user_id = ?", 'i', [current_user_id()]);
                if ($agRow) {
                    $agent_id = (int)$agRow['id'];
                }
            }

            db_query($conn, "
                UPDATE leads SET
                    lead_date = ?, customer_name = ?, customer_mobile = ?, customer_mobile2 = ?, customer_address = ?,
                    vehicle_condition = ?, vehicle_make_model = ?, year_of_manufacture = ?, registration_number = ?, insurance_company = ?, policy_number = ?, insurance_expiry_date = ?, loan_amount = ?, loan_type = ?,
                    referred_by = ?, agent_id = ?, channel_id = ?, channel_executive_id = ?, query_notes = ?
                WHERE id = ?
            ", 'sssssssissssdssiiisi', [
                $lead_date, $customer_name, $customer_mobile, $customer_mobile2, $customer_address,
                $vehicle_condition, $vehicle_make_model, $year_of_manufacture, $registration_number, $insurance_company, $policy_number, $insurance_expiry_date, $loan_amount, $loan_type,
                $referred_by, $agent_id, $channel_id, $channel_executive_id, $query_notes, $id
            ]);

            log_lead_action($conn, $id, 'Lead Updated', 'Core lead details updated.', current_user_id());

            // 1. Commission Auto-Sync Automation
            if ($existLead['status'] === 'disbursed') {
                $existComm = db_fetch_one($conn, "SELECT id, commission_amount, paid_amount FROM commissions WHERE lead_id = ?", 'i', [$id]);
                if ($existComm) {
                    $percent = (float)get_setting('default_commission_rate', '1.0');
                    $newCommAmount = round(($loan_amount * $percent) / 100, 2);
                    db_query($conn, "UPDATE commissions SET agent_id = ?, commission_amount = ? WHERE id = ?", 'idi', [$agent_id, $newCommAmount, $existComm['id']]);
                }
            }

            json_response(['message' => 'Lead updated successfully']);

        } elseif ($method === 'DELETE') {
            $id = (int)($_GET['id'] ?? 0);
            if (!$id) json_error("Lead ID required");
            if (!is_admin() && !is_manager()) json_error("Only Admins and Managers can delete leads", 403);
            
            // 4. Clean up dependent child tables to prevent orphaned records
            db_query($conn, "DELETE FROM lead_followups WHERE lead_id = ?", 'i', [$id]);
            db_query($conn, "DELETE FROM lead_documents WHERE lead_id = ?", 'i', [$id]);
            // removed non-existent lead_actions_history table deletion
            db_query($conn, "DELETE FROM commissions WHERE lead_id = ?", 'i', [$id]);
            db_query($conn, "DELETE FROM lead_transactions WHERE lead_id = ?", 'i', [$id]);
            db_query($conn, "DELETE FROM lead_deductions WHERE lead_id = ?", 'i', [$id]);
            
            db_query($conn, "DELETE FROM leads WHERE id = ?", 'i', [$id]);
            json_response(['message' => 'Lead and all associated history deleted successfully']);
        }
        break;

    case 'leads/detail':
        api_require_login();
        if ($method !== 'GET') json_error("Method not allowed", 405);
        $id = (int)($_GET['id'] ?? 0);
        
        $lead = db_fetch_one($conn, "
            SELECT l.*, a.name as agent_name, f.name as financer_name, d.name as dealer_name, ex.name as executive_name, ch.name as channel_name, che.name as channel_executive_name
            FROM leads l
            LEFT JOIN agents a ON l.agent_id = a.id
            LEFT JOIN financers f ON l.financer_id = f.id
            LEFT JOIN dealers d ON l.dealer_id = d.id
            LEFT JOIN executives ex ON l.executive_id = ex.id
            LEFT JOIN channels ch ON l.channel_id = ch.id
            LEFT JOIN channel_executives che ON l.channel_executive_id = che.id
            WHERE l.id = ?
        ", 'i', [$id]);

        if (!$lead) {
            // Try by lead_id string
            $lead = db_fetch_one($conn, "
                SELECT l.*, a.name as agent_name, f.name as financer_name, d.name as dealer_name, ex.name as executive_name, ch.name as channel_name, che.name as channel_executive_name
                FROM leads l
                LEFT JOIN agents a ON l.agent_id = a.id
                LEFT JOIN financers f ON l.financer_id = f.id
                LEFT JOIN dealers d ON l.dealer_id = d.id
                LEFT JOIN executives ex ON l.executive_id = ex.id
                LEFT JOIN channels ch ON l.channel_id = ch.id
                LEFT JOIN channel_executives che ON l.channel_executive_id = che.id
                WHERE l.lead_id = ?
            ", 's', [$_GET['id'] ?? '']);
        }

        if (!$lead) {
            json_error("Lead not found.", 404);
        }

        // Role scoping check
        if (is_executive()) {
            $execRow = db_fetch_one($conn, "SELECT id FROM executives WHERE user_id = ?", 'i', [current_user_id()]);
            $execId = $execRow['id'] ?? 0;
            if ((int)$lead['executive_id'] !== (int)$execId) {
                json_error("Access denied to this lead.", 403);
            }
        } elseif (is_channel_agent()) {
            $cheRow = db_fetch_one($conn, "SELECT id FROM channel_executives WHERE user_id = ?", 'i', [current_user_id()]);
            $cheId = $cheRow['id'] ?? 0;
            if ((int)$lead['created_by'] !== current_user_id() && (int)$lead['channel_executive_id'] !== (int)$cheId) {
                json_error("Access denied to this lead.", 403);
            }
        } elseif (is_agent()) {
            $agRow = db_fetch_one($conn, "SELECT id FROM agents WHERE user_id = ?", 'i', [current_user_id()]);
            $agId = $agRow['id'] ?? 0;
            if ((int)$lead['created_by'] !== current_user_id() && (int)$lead['agent_id'] !== (int)$agId) {
                json_error("Access denied to this lead.", 403);
            }
        }

        // Follow-ups
        $followups = db_fetch_all($conn, "
            SELECT lf.*, u.name as creator_name
            FROM lead_followups lf
            LEFT JOIN users u ON lf.created_by = u.id
            WHERE lf.lead_id = ?
            ORDER BY lf.created_at ASC, lf.id ASC
        ", 'i', [$lead['id']]);

        // Audit Logs
        $logs = db_fetch_all($conn, "
            SELECT ll.*, u.name as performed_by_name
            FROM lead_logs ll
            LEFT JOIN users u ON ll.performed_by = u.id
            WHERE ll.lead_id = ?
            ORDER BY ll.created_at ASC, ll.id ASC
        ", 'i', [$lead['id']]);

        // Documents (Restrict staff access)
        $documents = current_role() === 'staff' ? [] : db_fetch_all($conn, "
            SELECT * FROM lead_documents WHERE lead_id = ? ORDER BY IF(IFNULL(verification_notes, '') = 'Archived / Removed by user', 1, 0) ASC, id DESC
        ", 'i', [$lead['id']]);

        // Commission
        $commission = db_fetch_one($conn, "
            SELECT * FROM commissions WHERE lead_id = ?
        ", 'i', [$lead['id']]);

        json_response([
            'lead' => $lead,
            'followups' => $followups,
            'logs' => $logs,
            'documents' => $documents,
            'commission' => $commission
        ]);
        break;

    case 'leads/assign':
        api_require_login();
        if ($method !== 'POST') json_error("Method not allowed", 405);
        
        $id = (int)($input['id'] ?? 0);
        $executive_id = !empty($input['executive_id']) ? (int)$input['executive_id'] : null;
        $financer_id = !empty($input['financer_id']) ? (int)$input['financer_id'] : null;
        $agent_id = !empty($input['agent_id']) ? (int)$input['agent_id'] : null;
        $dealer_id = !empty($input['dealer_id']) ? (int)$input['dealer_id'] : null;

        $rc_status = $input['rc_status'] ?? 'pending';
        $rc_number = trim($input['rc_number'] ?? '');
        $insurance_status = $input['insurance_status'] ?? 'pending';
        $insurance_number = trim($input['insurance_number'] ?? '');
        $rto_status = $input['rto_status'] ?? 'pending';

        // Bank details
        $customer_bank_name = trim($input['customer_bank_name'] ?? '');
        $customer_account_number = trim($input['customer_account_number'] ?? '');
        $customer_ifsc_code = trim($input['customer_ifsc_code'] ?? '');

        // Fetch lead
        $lead = db_fetch_one($conn, "SELECT * FROM leads WHERE id = ?", 'i', [$id]);
        if (!$lead) json_error("Lead not found.");

        // If Agent is assigned, bank details are mandatory
        if ($agent_id) {
            if (empty($customer_bank_name) || empty($customer_account_number) || empty($customer_ifsc_code)) {
                json_error("Client Bank Details (Bank Name, Account Number, IFSC) are mandatory when an Agent is assigned.");
            }
        }

        $statusSql = "";
        $newStatus = $lead['status'];
        if (($executive_id || $financer_id || $agent_id || $dealer_id) && in_array($lead['status'], ['new', 'rejected'])) {
            $newStatus = 'pending';
            $statusSql = ", status = 'pending', status_date = CURDATE()";
        }

        db_query($conn, "
            UPDATE leads SET 
                executive_id = ?, financer_id = ?, agent_id = ?, dealer_id = ?,
                rc_status = ?, rc_number = ?, insurance_status = ?, insurance_number = ?, rto_status = ?,
                customer_bank_name = ?, customer_account_number = ?, customer_ifsc_code = ? $statusSql
            WHERE id = ?
        ", 'iiiissssssssi', [
            $executive_id, $financer_id, $agent_id, $dealer_id,
            $rc_status, $rc_number, $insurance_status, $insurance_number, $rto_status,
            $customer_bank_name, $customer_account_number, $customer_ifsc_code, $id
        ]);

        log_lead_action($conn, $id, 'Lead Assigned/Updated', 'Executive & checklist params updated.', current_user_id());
        if ($newStatus !== $lead['status']) {
            log_lead_action($conn, $id, 'Status Changed', "From {$lead['status']} to {$newStatus} (Auto-assigned via checklist)", current_user_id());
        }
        
        json_response(['message' => 'Lead assignments and status gates updated.']);
        break;

    case 'leads/status':
        api_require_login();
        if ($method !== 'POST') json_error("Method not allowed", 405);

        $id = (int)($input['id'] ?? 0);
        $status = $input['status'] ?? '';
        $remarks = trim($input['remarks'] ?? '');

        if (!in_array($status, ['new', 'pending', 'initiated', 'approved', 'disbursed', 'rejected', 'on_hold'])) {
            json_error("Invalid status.");
        }

        $lead = db_fetch_one($conn, "SELECT * FROM leads WHERE id = ?", 'i', [$id]);
        if (!$lead) json_error("Lead not found.");

        // Validation for Disbursement
        if ($status === 'disbursed') {
            $gate = can_disburse_lead($conn, $lead);
            if ($gate !== true) {
                json_error($gate);
            }
        }

        // Update lead status
        if ($status === 'rejected') {
            db_query($conn, "UPDATE leads SET status = 'rejected', status_date = CURDATE(), executive_id = NULL, financer_id = NULL, channel_id = NULL, channel_executive_id = NULL WHERE id = ?", 'i', [$id]);
        } else {
            db_query($conn, "UPDATE leads SET status = ?, status_date = CURDATE() WHERE id = ?", 'si', [$status, $id]);
        }

        // Insert followup history
        db_query($conn, "
            INSERT INTO lead_followups (lead_id, followup_date, remarks, status_changed_to, created_by)
            VALUES (?, CURDATE(), ?, ?, ?)
        ", 'issi', [$id, $remarks ?: "Status changed to " . ucfirst($status), $status, current_user_id()]);

        // Create Commissions row if status is 'disbursed'
        if ($status === 'disbursed') {
            // Check if commission row exists
            $commRow = db_fetch_one($conn, "SELECT id FROM commissions WHERE lead_id = ?", 'i', [$id]);
            if (!$commRow) {
                // Compute commission (1% of loan amount by default, or based on system setting)
                $percent = (float)get_setting('default_commission_rate', '1.0');
                $commission_amount = round(($lead['loan_amount'] * $percent) / 100, 2);
                
                db_query($conn, "
                    INSERT INTO commissions (lead_id, agent_id, commission_amount, paid_amount, payout_90_status, payout_10_status)
                    VALUES (?, ?, ?, 0, 'pending', 'pending')
                ", 'iid', [$id, $lead['agent_id'], $commission_amount]);
            }
        }

        log_lead_action($conn, $id, 'Status Updated', "Status changed to " . strtoupper($status) . ". Remarks: " . $remarks, current_user_id());

        if ($status === 'approved' || $status === 'disbursed') {
            $docType = $status === 'disbursed' ? 'Disbursal Certificate' : 'Sanction Letter';
            log_lead_action($conn, $id, 'WhatsApp Notification Triggered', "Automated WhatsApp {$docType} notification generated for customer ({$lead['customer_mobile']}).", current_user_id());
        }

        json_response(['message' => 'Status updated successfully.']);
        break;

    // ----------------------------------------------------
    // FOLLOW-UPS ENDPOINTS
    // ----------------------------------------------------
    case 'followups':
        api_require_login();
        if ($method === 'GET') {
            $isExecutive = is_executive();
            $isChannelAgent = is_channel_agent();
            $isAgent = is_agent();
            
            $whereScope = "1=1";
            $paramsScope = [];
            $typesScope = '';

            if ($isExecutive) {
                $execRow = db_fetch_one($conn, "SELECT id FROM executives WHERE user_id = ?", 'i', [current_user_id()]);
                $execId = $execRow['id'] ?? 0;
                $whereScope = "l.executive_id = ?";
                $paramsScope = [$execId];
                $typesScope = 'i';
            } elseif ($isChannelAgent) {
                $cheRow = db_fetch_one($conn, "SELECT id FROM channel_executives WHERE user_id = ?", 'i', [current_user_id()]);
                $cheId = $cheRow['id'] ?? 0;
                $whereScope = "(l.created_by = ? OR l.channel_executive_id = ?)";
                $paramsScope = [current_user_id(), $cheId];
                $typesScope = 'ii';
            } elseif ($isAgent) {
                $agRow = db_fetch_one($conn, "SELECT id FROM agents WHERE user_id = ?", 'i', [current_user_id()]);
                $agId = $agRow['id'] ?? 0;
                $whereScope = "(l.created_by = ? OR l.agent_id = ?)";
                $paramsScope = [current_user_id(), $agId];
                $typesScope = 'ii';
            }

            $followups = db_fetch_all($conn, "
                SELECT lf.id, lf.followup_date, lf.next_followup_date, lf.remarks, lf.status_changed_to,
                       l.lead_id, l.id as lead_real_id, l.customer_name, l.customer_mobile, l.status as lead_status,
                       COALESCE(NULLIF(lf.status_changed_to, ''), l.status) as followup_status
                FROM lead_followups lf
                JOIN leads l ON lf.lead_id = l.id
                WHERE lf.id = (SELECT MAX(id) FROM lead_followups WHERE lead_id = l.id)
                  AND l.status != 'disbursed'
                  AND $whereScope
                ORDER BY lf.id DESC
            ", $typesScope, $paramsScope);

            json_response(['followups' => $followups]);
        }
        break;

    case 'followups/add':
        api_require_login();
        if ($method !== 'POST') json_error("Method not allowed", 405);

        $lead_id = (int)($input['lead_id'] ?? 0);
        $remarks = trim($input['remarks'] ?? '');
        $next_followup_date = !empty($input['next_followup_date']) ? $input['next_followup_date'] : null;
        $status = $input['status'] ?? ''; // Optional status update

        if (empty($remarks)) {
            json_error("Remarks are required.");
        }

        $lead = db_fetch_one($conn, "SELECT * FROM leads WHERE id = ?", 'i', [$lead_id]);
        if (!$lead) json_error("Lead not found.");

        db_query($conn, "
            INSERT INTO lead_followups (lead_id, followup_date, next_followup_date, remarks, status_changed_to, created_by)
            VALUES (?, CURDATE(), ?, ?, ?, ?)
        ", 'isssi', [$lead_id, $next_followup_date, $remarks, $status ?: null, current_user_id()]);

        if (!empty($status) && $status !== $lead['status']) {
            if ($status === 'disbursed') {
                $newly_uploaded = [];
                if (isset($_FILES['disburse_docs']['error']) && is_array($_FILES['disburse_docs']['error'])) {
                    foreach ($_FILES['disburse_docs']['error'] as $docType => $error) {
                        if ($error === UPLOAD_ERR_OK) {
                            $newly_uploaded[] = $docType;
                        }
                    }
                }

                // Handle Bank Details Update for Disbursement
                $customer_bank_name = trim($input['customer_bank_name'] ?? '');
                $customer_account_number = trim($input['customer_account_number'] ?? '');
                $customer_ifsc_code = trim($input['customer_ifsc_code'] ?? '');

                if (!empty($customer_bank_name) || !empty($customer_account_number) || !empty($customer_ifsc_code)) {
                    db_query($conn, "UPDATE leads SET customer_bank_name=?, customer_account_number=?, customer_ifsc_code=? WHERE id=?", 
                        'sssi', [$customer_bank_name, $customer_account_number, $customer_ifsc_code, $lead_id]
                    );
                    // Update in-memory lead array for the can_disburse_lead check
                    $lead['customer_bank_name'] = $customer_bank_name;
                    $lead['customer_account_number'] = $customer_account_number;
                    $lead['customer_ifsc_code'] = $customer_ifsc_code;
                }

                $ins_comp = trim($input['insurance_company'] ?? $_POST['insurance_company'] ?? '');
                $pol_num = trim($input['policy_number'] ?? $_POST['policy_number'] ?? '');
                $exp_date = !empty($input['insurance_expiry_date']) ? $input['insurance_expiry_date'] : (!empty($_POST['insurance_expiry_date']) ? $_POST['insurance_expiry_date'] : null);

                if (!empty($ins_comp) || !empty($pol_num) || !empty($exp_date)) {
                    db_query($conn, "UPDATE leads SET insurance_company=?, policy_number=?, insurance_expiry_date=? WHERE id=?", 
                        'sssi', [$ins_comp, $pol_num, $exp_date, $lead_id]
                    );
                    $lead['insurance_company'] = $ins_comp;
                    $lead['policy_number'] = $pol_num;
                    $lead['insurance_expiry_date'] = $exp_date;
                }

                $gate = can_disburse_lead($conn, $lead, $newly_uploaded);
                if ($gate !== true) json_error($gate);

                if (is_admin() || is_manager()) {
                    db_query($conn, "UPDATE lead_documents SET verification_status = 'verified' WHERE lead_id = ? AND verification_status = 'pending' AND IFNULL(verification_notes, '') != 'Archived / Removed by user'", 'i', [$lead_id]);
                }

                // Handle inline document uploads after eligibility check passes
                if (isset($_FILES['disburse_docs']['tmp_name']) && is_array($_FILES['disburse_docs']['tmp_name'])) {
                    $uploadDir = __DIR__ . '/../uploads/leads/';
                    if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);
                    foreach ($_FILES['disburse_docs']['tmp_name'] as $docType => $tmpName) {
                        if ($tmpName && is_uploaded_file($tmpName)) {
                            $ext = strtolower(pathinfo($_FILES['disburse_docs']['name'][$docType], PATHINFO_EXTENSION));
                            $safeLeadId = preg_replace('/[^A-Za-z0-9\-]/', '_', $lead['lead_id']);
                            $newFileName = $safeLeadId . '_' . $docType . '_' . bin2hex(random_bytes(8)) . '.' . $ext;
                            if (move_uploaded_file($tmpName, $uploadDir . $newFileName)) {
                                $dbPath = 'uploads/leads/' . $newFileName;
                                $cat = in_array($docType, ['rc', 'insurance']) ? 'vehicle' : 'kyc';
                                db_query($conn, "INSERT INTO lead_documents (lead_id, category, document_type, file_path, verification_status) VALUES (?, ?, ?, ?, 'verified')", 'isss', [$lead_id, $cat, $docType, $dbPath]);
                            }
                        }
                    }
                }

                // Update lead status to disbursed
                db_query($conn, "UPDATE leads SET status = 'disbursed', status_date = CURDATE() WHERE id = ?", 'i', [$lead_id]);

                // Create Commissions row if status is 'disbursed'
                $commRow = db_fetch_one($conn, "SELECT id FROM commissions WHERE lead_id = ?", 'i', [$lead_id]);
                if (!$commRow) {
                    $percent = (float)get_setting('default_commission_rate', '1.0');
                    $commission_amount = round(($lead['loan_amount'] * $percent) / 100, 2);
                    if (!empty($lead['agent_id'])) {
                        db_query($conn, "
                            INSERT INTO commissions (lead_id, agent_id, commission_amount, paid_amount, payout_90_status, payout_10_status)
                            VALUES (?, ?, ?, 0, 'pending', 'pending')
                        ", 'iid', [$lead_id, $lead['agent_id'], $commission_amount]);
                    } else {
                        db_query($conn, "
                            INSERT INTO commissions (lead_id, commission_amount, paid_amount, payout_90_status, payout_10_status)
                            VALUES (?, ?, 0, 'pending', 'pending')
                        ", 'id', [$lead_id, $commission_amount]);
                    }
                }

                log_lead_action($conn, $lead_id, 'Status & Followup Update', "Status: DISBURSED | Next Followup: " . ($next_followup_date ?: 'None') . " | Remarks: " . $remarks, current_user_id());
            } elseif ($status === 'reassign') {
                db_query($conn, "UPDATE leads SET status = 'new', executive_id = NULL, assigned_date = NULL, status_date = CURDATE() WHERE id = ?", 'i', [$lead_id]);
                log_lead_action($conn, $lead_id, 'Status & Followup Update', "Status: RE-ASSIGNED TO POOL | Next Followup: " . ($next_followup_date ?: 'None') . " | Remarks: " . $remarks, current_user_id());
            } else {
                db_query($conn, "UPDATE leads SET status = ?, status_date = CURDATE() WHERE id = ?", 'si', [$status, $lead_id]);
                log_lead_action($conn, $lead_id, 'Status & Followup Update', "Status: " . strtoupper($status) . " | Next Followup: " . ($next_followup_date ?: 'None') . " | Remarks: " . $remarks, current_user_id());
            }
        } else {
            log_lead_action($conn, $lead_id, 'Followup Added', "Next Followup: " . ($next_followup_date ?: 'None') . " | Remarks: " . $remarks, current_user_id());
        }

        json_response(['message' => 'Followup logged successfully.']);
        break;

    // ----------------------------------------------------
    // COMMISSIONS ENDPOINTS
    // ----------------------------------------------------
    case 'commissions':
        api_require_login();
        if ($method !== 'GET') json_error("Method not allowed", 405);

        $whereScope = "1=1";
        $paramsScope = [];
        $typesScope = '';

        if (is_channel_agent()) {
            $cheRow = db_fetch_one($conn, "SELECT id FROM channel_executives WHERE user_id = ?", 'i', [current_user_id()]);
            $cheId = $cheRow['id'] ?? 0;
            $whereScope = "(l.created_by = ? OR l.channel_executive_id = ?)";
            $paramsScope = [current_user_id(), $cheId];
            $typesScope = 'ii';
        } elseif (is_agent()) {
            $agRow = db_fetch_one($conn, "SELECT id FROM agents WHERE user_id = ?", 'i', [current_user_id()]);
            $agId = $agRow['id'] ?? 0;
            $whereScope = "(l.created_by = ? OR l.agent_id = ? OR c.agent_id = ?)";
            $paramsScope = [current_user_id(), $agId, $agId];
            $typesScope = 'iii';
        }

        // Fetch commissions with lead and agent info
        $sql = "
            SELECT c.*, l.lead_id as lead_code, l.lead_id as lead_ref, l.customer_name, l.loan_amount, l.status as lead_status,
                   l.rc_status, l.insurance_status, l.rto_status,
                   a.name as agent_name, a.pan_number
            FROM commissions c
            JOIN leads l ON c.lead_id = l.id
            LEFT JOIN agents a ON c.agent_id = a.id
            WHERE $whereScope AND l.status = 'disbursed'
            ORDER BY c.created_at DESC
        ";
        $commissions = db_fetch_all($conn, $sql, $typesScope ?: '', $paramsScope);
        foreach ($commissions as &$comm) {
            $gross = (float)($comm['commission_amount'] ?? 0);
            $pan = trim($comm['pan_number'] ?? '');
            $rate = (!empty($pan) && strlen($pan) >= 10) ? 5.00 : 20.00;
            if (isset($comm['tds_rate']) && (float)$comm['tds_rate'] > 0) {
                $rate = (float)$comm['tds_rate'];
            }
            $tds = round($gross * ($rate / 100), 2);
            $net = round($gross - $tds, 2);
            $comm['tds_rate'] = $rate;
            $comm['tds_amount'] = $tds;
            $comm['net_payable'] = $net;
        }
        unset($comm);

        json_response(['commissions' => $commissions]);
        break;

    case 'commissions/approve':
        api_require_role('admin', 'manager');
        if ($method === 'POST') {
            $id = (int)($input['id'] ?? 0);
            $status = trim($input['status'] ?? 'approved');
            $reason = trim($input['rejection_reason'] ?? '');
            if ($id > 0 && in_array($status, ['approved', 'rejected'])) {
                $uid = current_user_id();
                db_query($conn, "UPDATE commissions SET approval_status = ?, approved_by = ?, approval_date = NOW() WHERE id = ?", "sii", [$status, $uid, $id]);
                json_response(['message' => "Commission payout marked as $status."]);
            } else {
                json_error("Invalid commission approval request.", 400);
            }
        }
        break;

    case 'commissions/batch_payout':
        api_require_role('admin', 'manager', 'staff');
        if ($method === 'POST') {
            $ids = $input['commission_ids'] ?? [];
            if (!is_array($ids) || empty($ids)) {
                json_error("No commissions selected for batch settlement.", 400);
            }
            $mode = trim($input['payment_mode'] ?? 'bank_transfer');
            $notes = trim($input['notes'] ?? 'Batch Settlement');
            $batch_id = 'BATCH-' . date('Ymd-His');
            $status = (current_role() === 'staff') ? 'pending_approval' : 'approved';

            $count = 0;
            foreach ($ids as $cid) {
                $cid = (int)$cid;
                if ($cid > 0) {
                    $row = db_fetch_one($conn, "SELECT c.commission_amount, a.pan_number FROM commissions c LEFT JOIN agents a ON c.agent_id = a.id WHERE c.id = ?", 'i', [$cid]);
                    if ($row) {
                        $gross = (float)$row['commission_amount'];
                        $pan = trim($row['pan_number'] ?? '');
                        $rate = (!empty($pan) && strlen($pan) >= 10) ? 5.00 : 20.00;
                        $tds = round($gross * ($rate / 100), 2);
                        $net = round($gross - $tds, 2);
                        db_query($conn, "UPDATE commissions SET paid_amount = ?, tds_rate = ?, tds_amount = ?, net_payable = ?, payment_date = CURDATE(), payment_mode = ?, notes = CONCAT(IFNULL(notes,''), '\n', ?), batch_id = ?, approval_status = ? WHERE id = ?", "ddddssssi", [$net, $rate, $tds, $net, $mode, $notes, $batch_id, $status, $cid]);
                        $count++;
                    }
                }
            }
            json_response(['message' => "Successfully processed $count commissions into settlement batch $batch_id.", 'batch_id' => $batch_id]);
        }
        break;

    case 'commissions/payout':
        api_require_role('admin', 'manager', 'staff');
        if ($method !== 'POST') json_error("Method not allowed", 405);

        $id = (int)($input['id'] ?? 0);
        $comm = db_fetch_one($conn, "SELECT * FROM commissions WHERE id = ?", 'i', [$id]);
        if (!$comm) json_error("Commission record not found.");

        if (isset($input['amount'])) {
            $amount = (float)$input['amount'];
            $mode = trim($input['payment_mode'] ?? 'NEFT');
            $notes = trim($input['notes'] ?? '');
            $new_paid = (float)$comm['paid_amount'] + $amount;
            $new_notes = trim(($comm['notes'] ?? '') . "\n" . $notes);

            db_query($conn, "
                UPDATE commissions SET
                    paid_amount = ?, payment_date = CURDATE(), payment_mode = ?, notes = ?
                WHERE id = ?
            ", 'dssi', [$new_paid, $mode, $new_notes, $id]);

            log_lead_action($conn, $comm['lead_id'], 'Commission Payout Released', "Released ₹{$amount} via {$mode}", current_user_id());
        } else {
            $commission_amount = isset($input['commission_amount']) ? (float)$input['commission_amount'] : (float)$comm['commission_amount'];
            $paid_amount = isset($input['paid_amount']) ? (float)$input['paid_amount'] : (float)$comm['paid_amount'];
            $payment_date = !empty($input['payment_date']) ? $input['payment_date'] : $comm['payment_date'];
            $payment_mode = isset($input['payment_mode']) ? $input['payment_mode'] : $comm['payment_mode'];
            $payout_90_status = $input['payout_90_status'] ?? $comm['payout_90_status'];
            $payout_10_status = $input['payout_10_status'] ?? $comm['payout_10_status'];
            $notes = isset($input['notes']) ? trim($input['notes']) : $comm['notes'];

            db_query($conn, "
                UPDATE commissions SET
                    commission_amount = ?, paid_amount = ?, payment_date = ?, payment_mode = ?,
                    payout_90_status = ?, payout_10_status = ?, notes = ?
                WHERE id = ?
            ", 'ddsssssi', [$commission_amount, $paid_amount, $payment_date, $payment_mode, $payout_90_status, $payout_10_status, $notes, $id]);

            log_lead_action($conn, $comm['lead_id'], 'Commission Payout Updated', "Total Comm: ₹{$commission_amount} | Paid: ₹{$paid_amount}", current_user_id());
        }

        json_response(['message' => 'Payout details updated successfully.']);
        break;

    // ----------------------------------------------------
    // REPORTS ENDPOINTS
    // ----------------------------------------------------
    case 'reports':
        api_require_login();
        if ($method !== 'GET') json_error("Method not allowed", 405);

        $whereParts = ["1=1"];
        $params = [];
        $types = '';

        if (is_channel_agent()) {
            $cheRow = db_fetch_one($conn, "SELECT id FROM channel_executives WHERE user_id = ?", 'i', [current_user_id()]);
            $cheId = $cheRow['id'] ?? 0;
            $whereParts[] = "(l.created_by = ? OR l.channel_executive_id = ?)";
            $params[] = current_user_id();
            $params[] = $cheId;
            $types .= 'ii';
        } elseif (is_agent()) {
            $agRow = db_fetch_one($conn, "SELECT id FROM agents WHERE user_id = ?", 'i', [current_user_id()]);
            $agId = $agRow['id'] ?? 0;
            $whereParts[] = "(l.created_by = ? OR l.agent_id = ?)";
            $params[] = current_user_id();
            $params[] = $agId;
            $types .= 'ii';
        } elseif (is_executive()) {
            $execRow = db_fetch_one($conn, "SELECT id FROM executives WHERE user_id = ?", 'i', [current_user_id()]);
            $execId = $execRow['id'] ?? 0;
            $whereParts[] = "l.executive_id = ?";
            $params[] = $execId;
            $types .= 'i';
        }

        if (!empty($_GET['agent_id'])) {
            $whereParts[] = "l.agent_id = ?";
            $params[] = (int)$_GET['agent_id'];
            $types .= 'i';
        }
        if (!empty($_GET['executive_id'])) {
            $whereParts[] = "l.executive_id = ?";
            $params[] = (int)$_GET['executive_id'];
            $types .= 'i';
        }
        if (!empty($_GET['financer_id'])) {
            $whereParts[] = "l.financer_id = ?";
            $params[] = (int)$_GET['financer_id'];
            $types .= 'i';
        }
        if (!empty($_GET['status'])) {
            $whereParts[] = "l.status = ?";
            $params[] = $_GET['status'];
            $types .= 's';
        }
        if (!empty($_GET['start_date'])) {
            $whereParts[] = "l.lead_date >= ?";
            $params[] = $_GET['start_date'];
            $types .= 's';
        }
        if (!empty($_GET['end_date'])) {
            $whereParts[] = "l.lead_date <= ?";
            $params[] = $_GET['end_date'];
            $types .= 's';
        }

        $whereSql = implode(' AND ', $whereParts);

        $records = db_fetch_all($conn, "
            SELECT l.*, a.name as agent_name, f.name as financer_name, ex.name as executive_name, ch.name as channel_name, che.name as channel_executive_name,
                   c.commission_amount, c.paid_amount, c.payout_90_status, c.payout_10_status
            FROM leads l
            LEFT JOIN agents a ON l.agent_id = a.id
            LEFT JOIN financers f ON l.financer_id = f.id
            LEFT JOIN executives ex ON l.executive_id = ex.id
            LEFT JOIN channels ch ON l.channel_id = ch.id
            LEFT JOIN channel_executives che ON l.channel_executive_id = che.id
            LEFT JOIN commissions c ON l.id = c.lead_id
            WHERE $whereSql
            ORDER BY l.lead_date DESC
        ", $types, $params);

        // Summaries
        $summary = [
            'totalLeads' => count($records),
            'totalDisbursed' => 0,
            'totalLoanAmount' => 0.0,
            'totalCommission' => 0.0,
            'totalPaid' => 0.0,
        ];

        foreach ($records as $r) {
            $summary['totalLoanAmount'] += (float)($r['loan_amount'] ?? 0);
            $summary['totalCommission'] += (float)($r['commission_amount'] ?? 0);
            $summary['totalPaid'] += (float)($r['paid_amount'] ?? 0);
            if ($r['status'] === 'disbursed') {
                $summary['totalDisbursed']++;
            }
        }

        json_response([
            'records' => $records,
            'summary' => $summary
        ]);
        break;
    // ----------------------------------------------------
    // BANKING ENDPOINTS
    // ----------------------------------------------------
    case 'banking':
        api_require_login();
        if ($method !== 'GET') json_error("Method not allowed", 405);
        // Grouped settlements by Financer
        $sql = "
            SELECT l.id, l.lead_id, l.customer_name, l.vehicle_make_model, l.loan_amount,
                   f.name as financer_name,
                   b.received_amount,
                   (SELECT SUM(amount) FROM lead_deductions WHERE lead_id = l.id) as total_deductions,
                   (SELECT SUM(amount) FROM lead_transactions WHERE lead_id = l.id AND approval_status = 'approved') as total_paid
            FROM leads l
            LEFT JOIN financers f ON l.financer_id = f.id
            LEFT JOIN lead_banking b ON l.id = b.lead_id
            WHERE l.status = 'disbursed'
            ORDER BY f.name, l.lead_date DESC
        ";
        $records = db_fetch_all($conn, $sql);
        
        $grouped = [];
        foreach ($records as $r) {
            $client = $r['financer_name'] ?: 'Unknown Client';
            if (!isset($grouped[$client])) {
                $grouped[$client] = [
                    'client' => $client,
                    'stats' => ['received' => 0, 'deductions' => 0, 'payable' => 0, 'balance' => 0],
                    'records' => []
                ];
            }
            $received = (float)($r['received_amount'] ?? 0);
            $deductions = (float)($r['total_deductions'] ?? 0);
            $payable = $received - $deductions;
            $paid = (float)($r['total_paid'] ?? 0);
            $balance = $payable - $paid;

            $grouped[$client]['stats']['received'] += $received;
            $grouped[$client]['stats']['deductions'] += $deductions;
            $grouped[$client]['stats']['payable'] += $payable;
            $grouped[$client]['stats']['balance'] += $balance;
            
            $grouped[$client]['records'][] = $r;
        }
        json_response(['grouped' => array_values($grouped)]);
        break;

    case 'banking/transactions':
        api_require_login();
        if ($method !== 'GET') json_error("Method not allowed", 405);
        $sql = "
            SELECT t.*, l.lead_id as lead_code, l.customer_name 
            FROM lead_transactions t
            JOIN leads l ON t.lead_id = l.id
            ORDER BY t.created_at DESC
        ";
        $transactions = db_fetch_all($conn, $sql);
        json_response(['transactions' => $transactions]);
        break;

    case 'banking/transactions/approve':
        api_require_role('admin', 'manager');
        if ($method !== 'POST') json_error("Method not allowed", 405);
        $id = (int)($input['id'] ?? 0);
        $status = trim($input['status'] ?? '');
        $reason = trim($input['rejection_reason'] ?? '');
        if (!$id || !in_array($status, ['approved', 'rejected'])) {
            json_error("Invalid parameters.");
        }
        db_query($conn, "UPDATE lead_transactions SET approval_status = ?, rejection_reason = ?, approved_by = ?, approval_date = NOW() WHERE id = ?", "ssii", [$status, $reason, current_user_id(), $id]);
        json_response(['message' => "Transaction marked as $status"]);
        break;

    case 'banking/settle':
        api_require_role('admin', 'manager');
        if ($method !== 'POST') json_error("Method not allowed", 405);
        
        $lead_id = (int)($input['lead_id'] ?? 0);
        $received_amount = (float)($input['received_amount'] ?? 0);
        $received_date = !empty($input['received_date']) ? $input['received_date'] : null;
        $rc_charges = (float)($input['rc_charges'] ?? 0);
        $insurance_charges = (float)($input['insurance_charges'] ?? 0);
        $rto_charges = (float)($input['rto_charges'] ?? 0);
        $other_charges = (float)($input['other_charges'] ?? 0);
        $banking_notes = trim($input['banking_notes'] ?? '');

        if (!$lead_id) json_error("Lead ID is required.");

        $existing = db_fetch_one($conn, "SELECT id FROM lead_banking WHERE lead_id = ?", 'i', [$lead_id]);
        
        if ($existing) {
            db_query($conn, "
                UPDATE lead_banking SET
                    received_amount = ?, received_date = ?, rc_charges = ?, insurance_charges = ?, rto_charges = ?, other_charges = ?, banking_notes = ?
                WHERE lead_id = ?
            ", "dsddddsi", [
                $received_amount, $received_date, $rc_charges, $insurance_charges, $rto_charges, $other_charges, $banking_notes, $lead_id
            ]);
        } else {
            db_query($conn, "
                INSERT INTO lead_banking (lead_id, received_amount, received_date, rc_charges, insurance_charges, rto_charges, other_charges, banking_notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ", "idsdddds", [
                $lead_id, $received_amount, $received_date, $rc_charges, $insurance_charges, $rto_charges, $other_charges, $banking_notes
            ]);
        }

        log_lead_action($conn, $lead_id, 'Bank Settlement Updated', "Received Amount updated to $received_amount", current_user_id());
        json_response(['message' => "Bank settlement saved successfully."]);
        break;

    case 'banking/ledger':
        api_require_login();
        if ($method === 'GET') {
            $entries = db_fetch_all($conn, "SELECT * FROM bank_ledger ORDER BY post_date DESC, id DESC");
            $balanceRow = db_fetch_one($conn, "SELECT running_balance FROM bank_ledger ORDER BY post_date DESC, id DESC LIMIT 1");
            $currentBalance = $balanceRow ? (float)$balanceRow['running_balance'] : 0;
            json_response(['entries' => $entries, 'current_balance' => $currentBalance]);
        } elseif ($method === 'POST') {
            api_require_role('admin', 'manager');
            $post_date = $input['post_date'] ?? date('Y-m-d');
            $cust = $input['customer_name'] ?? '';
            $reg = $input['reg_no'] ?? '';
            $loan = (float)($input['loan_amount'] ?? 0);
            $ded = (float)($input['deduction_info'] ?? 0);
            $status = $input['status'] ?? 'Clear';
            $desc = $input['account_description'] ?? '';
            $debit = (float)($input['debit_amount'] ?? 0);
            $credit = (float)($input['credit_amount'] ?? 0);
            $pending = (float)($input['pending_amount'] ?? 0);
            $rem = $input['remarks'] ?? '';
            
            // Get previous balance
            $prev = db_fetch_one($conn, "SELECT running_balance FROM bank_ledger ORDER BY post_date DESC, id DESC LIMIT 1");
            $prevBal = $prev ? (float)$prev['running_balance'] : 0;
            $newBal = $prevBal + $credit - $debit;

            db_query($conn, "INSERT INTO bank_ledger (post_date, customer_name, reg_no, loan_amount, deduction_info, status, account_description, debit_amount, credit_amount, running_balance, pending_amount, remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", "sssdsssdddds", [
                $post_date, $cust, $reg, $loan, $ded, $status, $desc, $debit, $credit, $newBal, $pending, $rem
            ]);
            json_response(['message' => 'Ledger entry added']);
        }
        break;

    case 'banking/ledger/import':
        api_require_role('admin', 'manager');
        if ($method !== 'POST') json_error("Method not allowed", 405);
        if (empty($_FILES['file'])) json_error("No file uploaded.");
        $file = $_FILES['file']['tmp_name'];
        if (($handle = fopen($file, "r")) !== FALSE) {
            $header = fgetcsv($handle, 1000, ","); // Skip header
            $count = 0;
            while (($data = fgetcsv($handle, 1000, ",")) !== FALSE) {
                if (count($data) < 9) continue;
                // Basic CSV format: Post Date, Customer, Reg No, Loan Amt, Deduction, Status, Account Desc, Debit, Credit, Balance, Pending, Remarks
                $post_date = date('Y-m-d', strtotime($data[0]));
                $cust = $data[1];
                $reg = $data[2];
                $loan = (float)$data[3];
                $ded = (float)$data[4];
                $status = $data[5];
                $desc = $data[6];
                $debit = (float)$data[7];
                $credit = (float)$data[8];
                $pending = isset($data[10]) ? (float)$data[10] : 0;
                $rem = isset($data[11]) ? $data[11] : '';

                $prev = db_fetch_one($conn, "SELECT running_balance FROM bank_ledger ORDER BY post_date DESC, id DESC LIMIT 1");
                $prevBal = $prev ? (float)$prev['running_balance'] : 0;
                $newBal = $prevBal + $credit - $debit;

                db_query($conn, "INSERT INTO bank_ledger (post_date, customer_name, reg_no, loan_amount, deduction_info, status, account_description, debit_amount, credit_amount, running_balance, pending_amount, remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", "sssdsssdddds", [
                    $post_date, $cust, $reg, $loan, $ded, $status, $desc, $debit, $credit, $newBal, $pending, $rem
                ]);
                $count++;
            }
            fclose($handle);
            json_response(['message' => "$count rows imported successfully."]);
        } else {
            json_error("Failed to parse file.");
        }
        break;

    // ----------------------------------------------------
    // DOCUMENTS ENDPOINTS
    // ----------------------------------------------------
    case 'documents/upload':
        api_require_login();
        if (current_role() === 'staff') json_error("Access denied: Staff members cannot access or upload documents.", 403);
        if ($method !== 'POST') json_error("Method not allowed", 405);

        $lead_id = (int)($_POST['lead_id'] ?? 0);
        $document_type = $_POST['document_type'] ?? '';
        $category = $_POST['category'] ?? '';
        $expiry_date = !empty($_POST['expiry_date']) ? $_POST['expiry_date'] : null;

        // Auto-assign category if not provided
        if (empty($category)) {
            if (in_array($document_type, ['aadhaar', 'pan', 'bank_statement', 'photo'])) $category = 'kyc';
            elseif (in_array($document_type, ['rc', 'insurance', 'driving_license'])) $category = 'vehicle';
            elseif (in_array($document_type, ['sanction_letter', 'loan_agreement', 'mandate_form'])) $category = 'sanction';
            else $category = 'dealer';
        }

        if (!$lead_id || empty($document_type)) {
            json_error("Lead ID and Document Type are required.");
        }

        if (empty($_FILES['file'])) {
            json_error("No file uploaded.");
        }

        $file = $_FILES['file'];
        
        // Validate file size using configurable system setting
        $max_size_mb = (int)get_setting('max_upload_size_mb', '5');
        $max_size_bytes = $max_size_mb * 1024 * 1024;
        if ($file['size'] > $max_size_bytes) {
            json_error("File size exceeds the limit of {$max_size_mb} MB.");
        }

        // Ensure uploads directory exists
        $upload_dir = __DIR__ . '/../uploads/';
        if (!is_dir($upload_dir)) {
            mkdir($upload_dir, 0777, true);
        }

        // Validate extension
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $allowed = ['pdf', 'jpg', 'jpeg', 'png'];
        if (!in_array($ext, $allowed)) {
            json_error("Invalid file format. Allowed: " . implode(', ', $allowed));
        }

        // Validate MIME type
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);
        $allowed_mimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        if (!in_array($mime, $allowed_mimes)) {
            json_error("Invalid file contents.");
        }

        // Save file
        $fileName = 'lead_' . $lead_id . '_' . $document_type . '_' . time() . '.' . $ext;
        $destPath = $upload_dir . $fileName;

        if (move_uploaded_file($file['tmp_name'], $destPath)) {
            $file_size = filesize($destPath) ?: 0;
            $file_rel_path = 'uploads/' . $fileName;
            db_query($conn, "
                INSERT INTO lead_documents (lead_id, category, document_type, file_path, expiry_date, file_size, verification_status)
                VALUES (?, ?, ?, ?, ?, ?, 'pending')
            ", 'issssi', [$lead_id, $category, $document_type, $file_rel_path, $expiry_date, $file_size]);
            
            $docId = $conn->insert_id;
            log_lead_action($conn, $lead_id, 'Document Uploaded', "Uploaded document of type: " . strtoupper($document_type) . " ({$category})", current_user_id());

            json_response([
                'message' => 'Document uploaded successfully',
                'document' => [
                    'id' => $docId,
                    'lead_id' => $lead_id,
                    'category' => $category,
                    'document_type' => $document_type,
                    'file_path' => $file_rel_path,
                    'expiry_date' => $expiry_date,
                    'file_size' => $file_size,
                    'verification_status' => 'pending'
                ]
            ]);
        } else {
            json_error("Failed to save uploaded file.");
        }
        break;

    case 'documents/verify':
        api_require_role('admin', 'manager');
        if (current_role() === 'staff') json_error("Access denied: Staff members cannot access or verify documents.", 403);
        if ($method !== 'POST') json_error("Method not allowed", 405);

        $id = (int)($input['id'] ?? 0);
        $status = $input['status'] ?? ''; // 'verified', 'rejected'
        $notes = trim($input['notes'] ?? '');

        if (!in_array($status, ['verified', 'rejected'])) {
            json_error("Invalid verification status.");
        }

        $doc = db_fetch_one($conn, "SELECT * FROM lead_documents WHERE id = ?", 'i', [$id]);
        if (!$doc) json_error("Document not found.");

        db_query($conn, "
            UPDATE lead_documents SET verification_status = ?, verification_notes = ? WHERE id = ?
        ", 'ssi', [$status, $notes, $id]);

        log_lead_action($conn, $doc['lead_id'], 'Document Verified', "Document ID {$id} ({$doc['document_type']}) marked as " . strtoupper($status) . ". Notes: " . $notes, current_user_id());

        json_response(['message' => 'Document verification status updated successfully.']);
        break;

    case 'documents/delete':
        api_require_login();
        if (!is_admin() && !is_manager()) json_error("Only Admins and Managers can archive documents.", 403);
        if ($method !== 'DELETE') json_error("Method not allowed", 405);
        $id = (int)($_GET['id'] ?? 0);

        $doc = db_fetch_one($conn, "SELECT * FROM lead_documents WHERE id = ?", 'i', [$id]);
        if (!$doc) json_error("Document not found.");

        // Soft-archive document to preserve audit trail (No permanent deletion)
        db_query($conn, "UPDATE lead_documents SET verification_status = 'rejected', verification_notes = 'Archived / Removed by user' WHERE id = ?", 'i', [$id]);
        log_lead_action($conn, $doc['lead_id'], 'Document Archived', "Archived document of type: " . strtoupper($doc['document_type']), current_user_id());

        json_response(['message' => 'Document archived successfully.']);
        break;

    // ----------------------------------------------------
    // SETUP ENDPOINTS (AGENTS, EXECUTIVES, DEALERS, FINANCERS, USERS)
    // ----------------------------------------------------
    case 'dealers':
    case 'setup/dealers':
    case 'agents':
    case 'setup/agents':
        if ($method === 'GET') {
            api_require_login();
            $agents = db_fetch_all($conn, "SELECT * FROM agents ORDER BY name ASC");
            json_response(['agents' => $agents, 'dealers' => $agents]);
        }
        api_require_role('admin', 'manager', 'staff');
        if ($method === 'POST') {
            $name = trim($input['name'] ?? '');
            $mobile = trim($input['mobile'] ?? '');
            $email = trim($input['email'] ?? '');
            $address = trim($input['address'] ?? '');
            $pan_number = trim($input['pan_number'] ?? '');
            $bank_account = trim($input['bank_account'] ?? '');
            $ifsc_code = trim($input['ifsc_code'] ?? '');
            $is_active = (int)($input['is_active'] ?? 1);

            if (empty($name)) json_error("Name is required.");

            db_query($conn, "
                INSERT INTO agents (name, mobile, email, address, pan_number, bank_account, ifsc_code, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ", 'sssssssi', [$name, $mobile, $email, $address, $pan_number, $bank_account, $ifsc_code, $is_active]);

            sync_all_user_role_entities($conn);
            json_response(['message' => 'Agent created successfully', 'id' => $conn->insert_id]);
        } elseif ($method === 'PUT') {
            if (!is_admin() && !is_manager()) json_error("Only Admins and Managers can edit or delete master network records.", 403);
            $id = (int)($input['id'] ?? 0);
            $name = trim($input['name'] ?? '');
            $mobile = trim($input['mobile'] ?? '');
            $email = trim($input['email'] ?? '');
            $address = trim($input['address'] ?? '');
            $pan_number = trim($input['pan_number'] ?? '');
            $bank_account = trim($input['bank_account'] ?? '');
            $ifsc_code = trim($input['ifsc_code'] ?? '');
            $is_active = (int)($input['is_active'] ?? 1);

            if (empty($name) || !$id) json_error("ID and Name are required.");

            db_query($conn, "
                UPDATE agents SET
                    name = ?, mobile = ?, email = ?, address = ?, pan_number = ?, bank_account = ?, ifsc_code = ?, is_active = ?
                WHERE id = ?
            ", 'sssssssii', [$name, $mobile, $email, $address, $pan_number, $bank_account, $ifsc_code, $is_active, $id]);

            sync_all_user_role_entities($conn);
            json_response(['message' => 'Agent updated successfully']);
        } elseif ($method === 'DELETE') {
            if (!is_admin() && !is_manager()) json_error("Only Admins and Managers can edit or delete master network records.", 403);
            $id = (int)($_GET['id'] ?? 0);
            db_query($conn, "DELETE FROM agents WHERE id = ?", 'i', [$id]);
            json_response(['message' => 'Agent deleted successfully']);
        }
        break;

    case 'executives':
    case 'setup/executives':
        if ($method === 'GET') {
            api_require_login();
            $execs = db_fetch_all($conn, "SELECT * FROM executives ORDER BY name ASC");
            foreach ($execs as &$ex) {
                $ifscVal = $ex['ifsc'] ?? $ex['ifsc_code'] ?? '';
                $ex['ifsc'] = $ifscVal;
                $ex['ifsc_code'] = $ifscVal;
            }
            json_response(['executives' => $execs]);
        }
        api_require_role('admin', 'manager', 'staff');
        if ($method === 'POST') {
            $name = trim($input['name'] ?? '');
            $mobile = trim($input['mobile'] ?? '');
            $email = trim($input['email'] ?? '');
            $financer_id = !empty($input['financer_id']) ? (int)$input['financer_id'] : null;
            $bank_account = trim($input['bank_account'] ?? '');
            $ifsc = trim($input['ifsc'] ?? $input['ifsc_code'] ?? '');
            $pan_number = trim($input['pan_number'] ?? '');
            $is_active = (int)($input['is_active'] ?? 1);

            if (empty($name)) json_error("Name is required.");
            if (!empty($mobile)) {
                $mobile = preg_replace('/\D/', '', $mobile);
                if (strlen($mobile) !== 10 && !empty($mobile)) json_error("Mobile number must be exactly 10 numeric digits.");
            }

            db_query($conn, "
                INSERT INTO executives (name, mobile, email, financer_id, bank_account, ifsc, ifsc_code, pan_number, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ", 'sssissssi', [$name, $mobile, $email, $financer_id, $bank_account, $ifsc, $ifsc, $pan_number, $is_active]);

            sync_all_user_role_entities($conn);
            json_response(['message' => 'Executive created successfully', 'id' => $conn->insert_id]);
        } elseif ($method === 'PUT') {
            if (!is_admin() && !is_manager()) json_error("Only Admins and Managers can edit or delete master network records.", 403);
            $id = (int)($input['id'] ?? 0);
            $name = trim($input['name'] ?? '');
            $mobile = trim($input['mobile'] ?? '');
            $email = trim($input['email'] ?? '');
            $financer_id = !empty($input['financer_id']) ? (int)$input['financer_id'] : null;
            $bank_account = trim($input['bank_account'] ?? '');
            $ifsc = trim($input['ifsc'] ?? $input['ifsc_code'] ?? '');
            $pan_number = trim($input['pan_number'] ?? '');
            $is_active = (int)($input['is_active'] ?? 1);

            if (empty($name) || !$id) json_error("ID and Name are required.");
            if (!empty($mobile)) {
                $mobile = preg_replace('/\D/', '', $mobile);
                if (strlen($mobile) !== 10 && !empty($mobile)) json_error("Mobile number must be exactly 10 numeric digits.");
            }

            db_query($conn, "
                UPDATE executives SET name = ?, mobile = ?, email = ?, financer_id = ?, bank_account = ?, ifsc = ?, ifsc_code = ?, pan_number = ?, is_active = ?
                WHERE id = ?
            ", 'sssissssii', [$name, $mobile, $email, $financer_id, $bank_account, $ifsc, $ifsc, $pan_number, $is_active, $id]);

            sync_all_user_role_entities($conn);
            json_response(['message' => 'Executive updated successfully']);
        } elseif ($method === 'DELETE') {
            if (!is_admin() && !is_manager()) json_error("Only Admins and Managers can edit or delete master network records.", 403);
            $id = (int)($_GET['id'] ?? 0);
            db_query($conn, "DELETE FROM executives WHERE id = ?", 'i', [$id]);
            json_response(['message' => 'Executive deleted successfully']);
        }
    case 'financers':
    case 'setup/financers':
        if ($method === 'GET') {
            api_require_login();
            $financers = db_fetch_all($conn, "SELECT * FROM financers ORDER BY name ASC");
            json_response(['financers' => $financers]);
        }
        api_require_role('admin', 'manager', 'staff');
        if ($method === 'POST') {
            $name = trim($input['name'] ?? '');
            $contact_person = trim($input['contact_person'] ?? '');
            $mobile = trim($input['mobile'] ?? '');
            $notes = trim($input['notes'] ?? '');
            $is_active = (int)($input['is_active'] ?? 1);

            if (empty($name)) json_error("Name is required.");

            db_query($conn, "
                INSERT INTO financers (name, contact_person, mobile, notes, is_active)
                VALUES (?, ?, ?, ?, ?)
            ", 'ssssi', [$name, $contact_person, $mobile, $notes, $is_active]);

            sync_all_user_role_entities($conn);
            json_response(['message' => 'Financer created successfully', 'id' => $conn->insert_id]);
        } elseif ($method === 'PUT') {
            if (!is_admin() && !is_manager()) json_error("Only Admins and Managers can edit or delete master network records.", 403);
            $id = (int)($input['id'] ?? 0);
            $name = trim($input['name'] ?? '');
            $contact_person = trim($input['contact_person'] ?? '');
            $mobile = trim($input['mobile'] ?? '');
            $notes = trim($input['notes'] ?? '');
            $is_active = (int)($input['is_active'] ?? 1);

            if (empty($name) || !$id) json_error("ID and Name are required.");

            db_query($conn, "
                UPDATE financers SET name = ?, contact_person = ?, mobile = ?, notes = ?, is_active = ?
                WHERE id = ?
            ", 'ssssii', [$name, $contact_person, $mobile, $notes, $is_active, $id]);

            sync_all_user_role_entities($conn);
            json_response(['message' => 'Financer updated successfully']);
        } elseif ($method === 'DELETE') {
            if (!is_admin() && !is_manager()) json_error("Only Admins and Managers can edit or delete master network records.", 403);
            $id = (int)($_GET['id'] ?? 0);
            db_query($conn, "DELETE FROM financers WHERE id = ?", 'i', [$id]);
            json_response(['message' => 'Financer deleted successfully']);
        }
        break;

    case 'channels':
    case 'setup/channels':
        if ($method === 'GET') {
            api_require_login();
            $channels = db_fetch_all($conn, "SELECT * FROM channels ORDER BY name ASC");
            json_response(['channels' => $channels]);
        }
        api_require_role('admin', 'manager', 'staff');
        if ($method === 'POST') {
            $name = trim($input['name'] ?? '');
            $contact_person = trim($input['contact_person'] ?? '');
            $mobile = trim($input['mobile'] ?? '');
            $email = trim($input['email'] ?? '');
            $notes = trim($input['notes'] ?? '');
            $is_active = (int)($input['is_active'] ?? 1);

            if (empty($name)) json_error("Channel Name is required.");

            db_query($conn, "
                INSERT INTO channels (name, contact_person, mobile, email, notes, is_active)
                VALUES (?, ?, ?, ?, ?, ?)
            ", 'sssssi', [$name, $contact_person, $mobile, $email, $notes, $is_active]);

            sync_all_user_role_entities($conn);
            json_response(['message' => 'Channel created successfully', 'id' => $conn->insert_id]);
        } elseif ($method === 'PUT') {
            if (!is_admin() && !is_manager()) json_error("Only Admins and Managers can edit or delete master network records.", 403);
            $id = (int)($input['id'] ?? 0);
            $name = trim($input['name'] ?? '');
            $contact_person = trim($input['contact_person'] ?? '');
            $mobile = trim($input['mobile'] ?? '');
            $email = trim($input['email'] ?? '');
            $notes = trim($input['notes'] ?? '');
            $is_active = (int)($input['is_active'] ?? 1);

            if (empty($name) || !$id) json_error("ID and Channel Name are required.");

            db_query($conn, "
                UPDATE channels SET name = ?, contact_person = ?, mobile = ?, email = ?, notes = ?, is_active = ?
                WHERE id = ?
            ", 'sssssii', [$name, $contact_person, $mobile, $email, $notes, $is_active, $id]);

            sync_all_user_role_entities($conn);
            json_response(['message' => 'Channel updated successfully']);
        } elseif ($method === 'DELETE') {
            if (!is_admin() && !is_manager()) json_error("Only Admins and Managers can edit or delete master network records.", 403);
            $id = (int)($_GET['id'] ?? 0);
            db_query($conn, "DELETE FROM channels WHERE id = ?", 'i', [$id]);
            json_response(['message' => 'Channel deleted successfully']);
        }
        break;

    case 'channel_executives':
    case 'setup/channel_executives':
        if ($method === 'GET') {
            api_require_login();
            $execs = db_fetch_all($conn, "
                SELECT ce.*, c.name as channel_name, u.email as user_email, u.name as user_name, u.is_active as user_is_active
                FROM channel_executives ce 
                LEFT JOIN channels c ON ce.channel_id = c.id 
                LEFT JOIN users u ON ce.user_id = u.id
                ORDER BY ce.name ASC
            ");
            json_response(['channel_executives' => $execs]);
        }
        api_require_role('admin', 'manager', 'staff');
        if ($method === 'POST') {
            $channel_id = !empty($input['channel_id']) ? (int)$input['channel_id'] : null;
            $user_id = !empty($input['user_id']) ? (int)$input['user_id'] : null;
            $name = trim($input['name'] ?? '');
            $mobile = trim($input['mobile'] ?? '');
            $email = trim($input['email'] ?? '');
            $bank_name = trim($input['bank_name'] ?? '');
            $bank_account = trim($input['bank_account'] ?? '');
            $ifsc_code = trim($input['ifsc_code'] ?? '');
            $pan_number = trim($input['pan_number'] ?? '');
            $is_active = (int)($input['is_active'] ?? 1);
            
            $enable_portal_access = !empty($input['enable_portal_access']);
            $portal_password = trim($input['portal_password'] ?? '');

            if (empty($name) || empty($mobile)) json_error("Name and Mobile are required.");

            // Option 1: Unified One-Click Portal Access Creation
            if ($enable_portal_access || !empty($portal_password)) {
                if (empty($email)) json_error("Email address is required to enable portal login access.");
                $existing_user = db_fetch_one($conn, "SELECT id FROM users WHERE email = ?", 's', [$email]);
                if ($existing_user) {
                    $user_id = $existing_user['id'];
                    if (!empty($portal_password)) {
                        $hash = password_hash($portal_password, PASSWORD_DEFAULT);
                        db_query($conn, "UPDATE users SET name = ?, password = ?, role = 'channel_agent', is_active = ? WHERE id = ?", 'ssii', [$name, $hash, $is_active, $user_id]);
                    } else {
                        db_query($conn, "UPDATE users SET name = ?, role = 'channel_agent', is_active = ? WHERE id = ?", 'sii', [$name, $is_active, $user_id]);
                    }
                } else {
                    if (empty($portal_password)) json_error("Password is required when granting new portal login access.");
                    $hash = password_hash($portal_password, PASSWORD_DEFAULT);
                    db_query($conn, "INSERT INTO users (name, email, password, role, is_active) VALUES (?, ?, ?, 'channel_agent', ?)", 'sssi', [$name, $email, $hash, $is_active]);
                    $user_id = $conn->insert_id;
                }
            }

            db_query($conn, "
                INSERT INTO channel_executives (channel_id, user_id, name, mobile, email, bank_name, bank_account, ifsc_code, pan_number, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ", 'iisssssssi', [$channel_id, $user_id, $name, $mobile, $email, $bank_name, $bank_account, $ifsc_code, $pan_number, $is_active]);

            sync_all_user_role_entities($conn);
            json_response(['message' => 'Channel Agent created successfully', 'id' => $conn->insert_id]);
        } elseif ($method === 'PUT') {
            if (!is_admin() && !is_manager()) json_error("Only Admins and Managers can edit or delete master network records.", 403);
            $id = (int)($input['id'] ?? 0);
            $channel_id = !empty($input['channel_id']) ? (int)$input['channel_id'] : null;
            $user_id = !empty($input['user_id']) ? (int)$input['user_id'] : null;
            $name = trim($input['name'] ?? '');
            $mobile = trim($input['mobile'] ?? '');
            $email = trim($input['email'] ?? '');
            $bank_name = trim($input['bank_name'] ?? '');
            $bank_account = trim($input['bank_account'] ?? '');
            $ifsc_code = trim($input['ifsc_code'] ?? '');
            $pan_number = trim($input['pan_number'] ?? '');
            $is_active = (int)($input['is_active'] ?? 1);
            
            $enable_portal_access = !empty($input['enable_portal_access']);
            $portal_password = trim($input['portal_password'] ?? '');

            if (empty($name) || empty($mobile) || !$id) json_error("ID, Name, and Mobile are required.");

            // Option 1: Unified One-Click Portal Access Management
            if ($enable_portal_access || !empty($portal_password)) {
                if (empty($email)) json_error("Email address is required to enable portal login access.");
                $existing_user = db_fetch_one($conn, "SELECT id FROM users WHERE email = ?", 's', [$email]);
                $target_user_id = $user_id ?: ($existing_user['id'] ?? null);
                if ($target_user_id) {
                    $user_id = $target_user_id;
                    if (!empty($portal_password)) {
                        $hash = password_hash($portal_password, PASSWORD_DEFAULT);
                        db_query($conn, "UPDATE users SET name = ?, email = ?, password = ?, role = 'channel_agent', is_active = ? WHERE id = ?", 'sssii', [$name, $email, $hash, $is_active, $user_id]);
                    } else {
                        db_query($conn, "UPDATE users SET name = ?, email = ?, role = 'channel_agent', is_active = ? WHERE id = ?", 'ssii', [$name, $email, $is_active, $user_id]);
                    }
                } else {
                    if (empty($portal_password)) json_error("Password is required when granting new portal login access.");
                    $hash = password_hash($portal_password, PASSWORD_DEFAULT);
                    db_query($conn, "INSERT INTO users (name, email, password, role, is_active) VALUES (?, ?, ?, 'channel_agent', ?)", 'sssi', [$name, $email, $hash, $is_active]);
                    $user_id = $conn->insert_id;
                }
            } elseif (!$enable_portal_access && $user_id) {
                // If portal access was turned off, deactivate the linked login account
                db_query($conn, "UPDATE users SET is_active = 0 WHERE id = ?", 'i', [$user_id]);
            }

            db_query($conn, "
                UPDATE channel_executives SET channel_id = ?, user_id = ?, name = ?, mobile = ?, email = ?, bank_name = ?, bank_account = ?, ifsc_code = ?, pan_number = ?, is_active = ?
                WHERE id = ?
            ", 'iisssssssii', [$channel_id, $user_id, $name, $mobile, $email, $bank_name, $bank_account, $ifsc_code, $pan_number, $is_active, $id]);

            sync_all_user_role_entities($conn);
            json_response(['message' => 'Channel Agent updated successfully']);
        } elseif ($method === 'DELETE') {
            if (!is_admin() && !is_manager()) json_error("Only Admins and Managers can edit or delete master network records.", 403);
            $id = (int)($_GET['id'] ?? 0);
            db_query($conn, "DELETE FROM channel_executives WHERE id = ?", 'i', [$id]);
            json_response(['message' => 'Channel Agent deleted successfully']);
        }
        break;

    case 'setup/users':
        api_require_login();
        if ($method === 'GET' || $method === 'POST' || $method === 'DELETE') {
            api_require_role('admin', 'manager');
        }
        if ($method === 'GET') {
            db_query($conn, "UPDATE users SET role = 'manager' WHERE role = '' OR role = 'finance_manager'");
            $users = db_fetch_all($conn, "SELECT id, name, email, role, is_active, created_at FROM users ORDER BY name ASC");
            json_response(['users' => $users]);
        } elseif ($method === 'POST') {
            $name = trim($input['name'] ?? '');
            $email = trim($input['email'] ?? '');
            $password = $input['password'] ?? '';
            $role = $input['role'] ?? 'staff';
            if ($role === 'finance_manager') $role = 'manager';
            $is_active = (int)($input['is_active'] ?? 1);

            if (empty($name) || empty($email) || empty($password)) {
                json_error("Name, Email, and Password are required.");
            }
            if (!in_array($role, ['admin', 'manager', 'staff', 'agent', 'executive', 'channel_agent', 'rto_desk', 'insurance_desk'])) {
                json_error("Invalid role selected.");
            }

            // Check duplicate email
            $dup = db_fetch_one($conn, "SELECT id FROM users WHERE email = ?", 's', [$email]);
            if ($dup) json_error("Email is already registered.");

            $hash = password_hash($password, PASSWORD_DEFAULT);

            db_query($conn, "
                INSERT INTO users (name, email, password, role, is_active)
                VALUES (?, ?, ?, ?, ?)
            ", 'ssssi', [$name, $email, $hash, $role, $is_active]);

            json_response(['message' => 'User created successfully', 'id' => $conn->insert_id]);
        } elseif ($method === 'PUT') {
            $id = (int)($input['id'] ?? 0);
            if (!in_array(current_role(), ['admin', 'manager'])) {
                if ($id !== current_user_id()) {
                    json_error("Access denied: You can only update your own account settings.", 403);
                }
                $currentUser = db_fetch_one($conn, "SELECT name, email, role, is_active FROM users WHERE id = ?", 'i', [$id]);
                if (!$currentUser) json_error("User not found.");
                
                // Restricted roles (staff, channel_agent, agent, executive, etc.) can ONLY change password, NOT name, email (username), or role!
                $name = $currentUser['name'];
                $email = $currentUser['email'];
                $role = $currentUser['role'];
                $is_active = $currentUser['is_active'];
            } else {
                api_require_role('admin', 'manager');
                $name = trim($input['name'] ?? '');
                $email = trim($input['email'] ?? '');
                $role = $input['role'] ?? 'staff';
                if ($role === 'finance_manager') $role = 'manager';
                $is_active = (int)($input['is_active'] ?? 1);

                if (empty($name) || empty($email) || !$id) {
                    json_error("ID, Name, and Email are required.");
                }
                if (!in_array($role, ['admin', 'manager', 'staff', 'agent', 'executive', 'channel_agent', 'rto_desk', 'insurance_desk'])) {
                    json_error("Invalid role selected.");
                }
            }

            if ($id === current_user_id() && $is_active === 0) {
                json_error("Security block: You cannot lock or deactivate your own active account.");
            }
            if ($id === current_user_id() && $role !== current_role()) {
                json_error("Security block: You cannot modify your own assigned system role.");
            }

            $target = db_fetch_one($conn, "SELECT role FROM users WHERE id = ?", 'i', [$id]);
            if ($target && $target['role'] === 'admin') {
                json_error("Admin accounts are protected and cannot be modified.");
            }

            // Check duplicate email
            $dup = db_fetch_one($conn, "SELECT id FROM users WHERE email = ? AND id != ?", 'si', [$email, $id]);
            if ($dup) json_error("Email is already registered by another user.");

            if (!empty($input['password'])) {
                $hash = password_hash($input['password'], PASSWORD_DEFAULT);
                db_query($conn, "
                    UPDATE users SET name = ?, email = ?, password = ?, role = ?, is_active = ?
                    WHERE id = ?
                ", 'ssssii', [$name, $email, $hash, $role, $is_active, $id]);
            } else {
                db_query($conn, "
                    UPDATE users SET name = ?, email = ?, role = ?, is_active = ?
                    WHERE id = ?
                ", 'sssii', [$name, $email, $role, $is_active, $id]);
            }

            json_response(['message' => 'User updated successfully']);
        } elseif ($method === 'DELETE') {
            $id = (int)($_GET['id'] ?? 0);
            if ($id === current_user_id()) {
                json_error("You cannot delete your own account.");
            }
            $target = db_fetch_one($conn, "SELECT role FROM users WHERE id = ?", 'i', [$id]);
            if ($target && $target['role'] === 'admin') {
                json_error("Admin accounts are protected and cannot be deleted.");
            }
            db_query($conn, "DELETE FROM users WHERE id = ?", 'i', [$id]);
            json_response(['message' => 'User deleted successfully']);
        }
        break;

    // ----------------------------------------------------
    // SYSTEM SETTINGS
    // ----------------------------------------------------
    case 'settings/public':
        if ($method !== 'GET') json_error("Method not allowed", 405);
        $res = db_fetch_all($conn, "
            SELECT setting_key, setting_value 
            FROM system_settings 
            WHERE setting_key IN (
                'company_name', 'contact_number', 'support_email', 'office_address', 'whatsapp_number', 'app_name',
                'slide1_title', 'slide1_description', 'slide1_badge',
                'slide2_title', 'slide2_description', 'slide2_badge',
                'slide3_title', 'slide3_description', 'slide3_badge',
                'slide4_title', 'slide4_description', 'slide4_badge',
                'instagram_url', 'facebook_url', 'linkedin_url', 'twitter_url'
            )
        ");
        $settings = [];
        $settings['app_name'] = 'LeadFlow Pro';
        $settings['company_name'] = 'LeadFlow Pro';
        $settings['contact_number'] = '+91 98765 43210';
        $settings['support_email'] = 'support@leadflowpro.com';
        $settings['office_address'] = '102, Business Arcade, Main Road, New Delhi, India';
        $settings['whatsapp_number'] = '+91 98765 43210';
        $settings['instagram_url'] = 'https://instagram.com';
        $settings['facebook_url'] = 'https://facebook.com';
        $settings['linkedin_url'] = 'https://linkedin.com';
        $settings['twitter_url'] = 'https://twitter.com';

        // Slideshow Defaults
        $settings['slide1_title'] = 'Passenger Cars Finance';
        $settings['slide1_description'] = 'Low-interest rates starting at 9.5% p.a. for hatchbacks, sedans, and luxury SUVs with flexible tenures up to 7 years.';
        $settings['slide1_badge'] = 'Passenger Vehicle';
        $settings['slide2_title'] = 'Commercial & Cargo Trucks';
        $settings['slide2_description'] = 'Empower your transport business. Funding up to 90% LTV on loaders, commercial trailers, and cargo buses.';
        $settings['slide2_badge'] = 'Commercial Vehicle';
        $settings['slide3_title'] = 'Balance Transfer & Top-up';
        $settings['slide3_description'] = 'Transfer your high-interest auto loan to our network banks and unlock additional liquidity with top-up features.';
        $settings['slide3_badge'] = 'Refinancing';
        $settings['slide4_title'] = 'Join as a Partner DSA';
        $settings['slide4_description'] = 'Earn up to 1.5% payout with a standard 90/10 agent split model. Complete Maker-Checker transparency.';
        $settings['slide4_badge'] = 'Earn Commissions';

        foreach ($res as $row) {
            $settings[$row['setting_key']] = $row['setting_value'];
        }
        json_response(['settings' => $settings]);
        break;

    case 'settings':
        api_require_role('admin');
        if ($method === 'GET') {
            // Get all settings
            $res = db_fetch_all($conn, "SELECT setting_key, setting_value FROM system_settings");
            $settings = [];
            foreach ($res as $row) {
                $settings[$row['setting_key']] = $row['setting_value'];
            }
            json_response(['settings' => $settings]);
        } elseif ($method === 'POST') {
            // Strict Schema Validation
            $errors = validate_settings_schema($input);
            if (!empty($errors)) {
                json_error(implode(" ", $errors), 400);
            }

            foreach ($input as $key => $val) {
                db_query($conn, "
                    INSERT INTO system_settings (setting_key, setting_value) 
                    VALUES (?, ?) 
                    ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
                ", 'ss', [$key, $val]);
            }
            json_response(['message' => 'Settings updated successfully']);
        }
        break;

    // ----------------------------------------------------
    // NETWORK ENDPOINTS
    // ----------------------------------------------------
    case 'executives':
        api_require_login();
        if ($method === 'GET') {
            $executives = db_fetch_all($conn, "
                SELECT e.id, e.name, e.mobile, e.email, e.financer_id, e.bank_account, e.ifsc, e.pan_number, e.user_id, e.is_active, 'executive' as role,
                       f.name as financer_name,
                       COUNT(l.id) as leads_count,
                       SUM(CASE WHEN l.status='disbursed' THEN 1 ELSE 0 END) as disbursed_count
                FROM executives e
                LEFT JOIN financers f ON e.financer_id = f.id
                LEFT JOIN leads l ON l.executive_id = e.id
                GROUP BY e.id
                ORDER BY e.name
            ");
            json_response(['executives' => $executives]);
        } elseif ($method === 'POST') {
            api_require_role('admin', 'manager', 'staff');
            $name = trim($input['name'] ?? '');
            $mobile = trim($input['mobile'] ?? '');
            $email = trim($input['email'] ?? '');
            $financer_id = !empty($input['financer_id']) ? (int)$input['financer_id'] : null;
            $bank_account = trim($input['bank_account'] ?? '');
            $ifsc = trim($input['ifsc'] ?? '');
            $pan_number = trim($input['pan_number'] ?? '');
            
            db_query($conn, "INSERT INTO executives (name, mobile, email, financer_id, bank_account, ifsc, pan_number) VALUES (?, ?, ?, ?, ?, ?, ?)", "sssisss", [$name, $mobile, $email, $financer_id, $bank_account, $ifsc, $pan_number]);
            json_response(['message' => 'Executive added']);
        } elseif ($method === 'PUT') {
            api_require_role('admin', 'manager', 'staff');
            $id = (int)($input['id'] ?? 0);
            $name = trim($input['name'] ?? '');
            $mobile = trim($input['mobile'] ?? '');
            $email = trim($input['email'] ?? '');
            $financer_id = !empty($input['financer_id']) ? (int)$input['financer_id'] : null;
            $bank_account = trim($input['bank_account'] ?? '');
            $ifsc = trim($input['ifsc'] ?? '');
            $pan_number = trim($input['pan_number'] ?? '');
            $is_active = isset($input['is_active']) ? (int)$input['is_active'] : 1;
            
            db_query($conn, "UPDATE executives SET name=?, mobile=?, email=?, financer_id=?, bank_account=?, ifsc=?, pan_number=?, is_active=? WHERE id=?", "sssisssii", [$name, $mobile, $email, $financer_id, $bank_account, $ifsc, $pan_number, $is_active, $id]);
            json_response(['message' => 'Executive updated']);
        } elseif ($method === 'DELETE') {
            api_require_role('admin');
            $id = (int)($_GET['id'] ?? 0);
            db_query($conn, "DELETE FROM executives WHERE id = ?", 'i', [$id]);
            json_response(['message' => 'Executive deleted']);
        }
        break;



    case 'banking':
        api_require_login();
        if ($method === 'GET') {
            $sql = "
                SELECT 
                    l.id, l.lead_id, l.lead_date, l.customer_name, l.vehicle_make_model, l.loan_amount,
                    f.name as financer_name,
                    b.received_amount, b.received_date, 
                    (SELECT SUM(amount) FROM lead_deductions WHERE lead_id = l.id) as total_deductions,
                    (SELECT SUM(amount) FROM lead_transactions WHERE lead_id = l.id) as total_paid,
                    (SELECT MAX(payment_date) FROM lead_transactions WHERE lead_id = l.id) as last_payment_date
                FROM leads l
                LEFT JOIN financers f ON l.financer_id = f.id
                LEFT JOIN lead_banking b ON l.id = b.lead_id
                WHERE l.status = 'disbursed'
                ORDER BY l.updated_at DESC
            ";
            $records = db_fetch_all($conn, $sql);
            
            // Group by financer
            $grouped = [];
            foreach ($records as $row) {
                $client = $row['financer_name'] ?: 'Unassigned Financer';
                if (!isset($grouped[$client])) {
                    $grouped[$client] = [
                        'records' => [],
                        'stats' => [
                            'loan' => 0, 'received' => 0, 'deductions' => 0,
                            'payable' => 0, 'paid' => 0, 'balance' => 0
                        ]
                    ];
                }
                
                $received = (float)($row['received_amount'] ?? 0);
                $deductions = (float)($row['total_deductions'] ?? 0);
                $payable = $received - $deductions;
                $paid = (float)($row['total_paid'] ?? 0);
                $balance = $payable - $paid;

                $grouped[$client]['records'][] = $row;
                $grouped[$client]['stats']['loan'] += (float)($row['loan_amount'] ?? 0);
                $grouped[$client]['stats']['received'] += $received;
                $grouped[$client]['stats']['deductions'] += $deductions;
                $grouped[$client]['stats']['payable'] += $payable;
                $grouped[$client]['stats']['paid'] += $paid;
                $grouped[$client]['stats']['balance'] += $balance;
            }
            // Frontend expects an array of grouped objects
            $bankingArray = [];
            foreach ($grouped as $client => $data) {
                $bankingArray[] = [
                    'client' => $client,
                    'records' => $data['records'],
                    'stats' => $data['stats']
                ];
            }
            json_response(['grouped' => $bankingArray]);
        }
        break;

    case 'banking/transactions':
        api_require_login();
        if ($method === 'GET') {
            $sql = "
                SELECT t.*, l.lead_id as lead_code, l.customer_name, u.name as created_by_name
                FROM lead_transactions t
                JOIN leads l ON t.lead_id = l.id
                LEFT JOIN users u ON t.created_by = u.id
                ORDER BY t.payment_date DESC, t.id DESC
            ";
            $txs = db_fetch_all($conn, $sql);
            json_response(['transactions' => $txs]);
        }
        break;

    case 'banking/transactions/approve':
        api_require_role('admin', 'manager');
        if ($method === 'POST') {
            $id = (int)($input['id'] ?? 0);
            $status = trim($input['status'] ?? 'approved');
            $reason = trim($input['rejection_reason'] ?? '');
            if ($id > 0 && in_array($status, ['approved', 'rejected'])) {
                $uid = current_user_id();
                db_query($conn, "UPDATE lead_transactions SET approval_status = ?, approved_by = ?, approval_date = NOW(), rejection_reason = ? WHERE id = ?", "sisi", [$status, $uid, $reason, $id]);
                json_response(['message' => "Payout transaction marked as $status."]);
            } else {
                json_error("Invalid transaction approval request.", 400);
            }
        }
        break;

    case 'banking/ledger':
        api_require_login();
        if ($method === 'GET') {
            // Fetch all entries, ordered chronologically to calculate correct running balances
            $sql = "SELECT * FROM company_ledger ORDER BY post_date ASC, id ASC";
            $entries = db_fetch_all($conn, $sql);
            
            $running_balance = 0;
            foreach ($entries as &$entry) {
                $running_balance += (float)$entry['credit_amount'];
                $running_balance -= (float)$entry['debit_amount'];
                $entry['running_balance'] = $running_balance;
            }
            unset($entry);
            
            // Reverse so that latest transactions are returned first for display
            $entries = array_reverse($entries);
            json_response([
                'entries' => $entries,
                'current_balance' => $running_balance
            ]);
        } elseif ($method === 'POST') {
            api_require_role('admin', 'staff');
            $post_date = !empty($input['post_date']) ? $input['post_date'] : date('Y-m-d');
            $customer_name = trim($input['customer_name'] ?? '');
            $reg_no = trim($input['reg_no'] ?? '');
            $loan_amount = (float)($input['loan_amount'] ?? 0);
            $deduction_info = (float)($input['deduction_info'] ?? 0);
            $status = trim($input['status'] ?? 'Clear');
            $account_description = trim($input['account_description'] ?? '');
            $debit_amount = (float)($input['debit_amount'] ?? 0);
            $credit_amount = (float)($input['credit_amount'] ?? 0);
            $pending_amount = (float)($input['pending_amount'] ?? 0);
            $remarks = trim($input['remarks'] ?? '');
            
            $db_status = $status === 'Clear' ? 'Clear' : 'Pending';
            
            $stmt = $conn->prepare("
                INSERT INTO company_ledger 
                (post_date, customer_name, reg_no, loan_amount, deduction_info, status, account_description, debit_amount, credit_amount, pending_amount, remarks, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $uid = current_user_id();
            $stmt->bind_param(
                'sssddssdddsi', 
                $post_date, $customer_name, $reg_no, $loan_amount, $deduction_info,
                $db_status, $account_description, $debit_amount, $credit_amount, $pending_amount, $remarks, $uid
            );
            $stmt->execute();
            
            json_response(['message' => 'Ledger entry added successfully']);
        }
        break;

    case 'banking/ledger/import':
        api_require_role('admin', 'staff');
        if ($method !== 'POST') json_error("Method not allowed", 405);
        
        if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
            json_error("No valid file uploaded");
        }
        
        $filePath = $_FILES['file']['tmp_name'];
        $zip = new ZipArchive();
        if ($zip->open($filePath) !== TRUE) {
            json_error("Failed to open Excel file. Make sure it is a valid .xlsx file.");
        }
        
        // Read shared strings
        $sharedStrings = [];
        if (($index = $zip->locateName('xl/sharedStrings.xml')) !== false) {
            $data = $zip->getFromIndex($index);
            $xml = simplexml_load_string($data);
            if ($xml && $xml->si) {
                foreach ($xml->si as $si) {
                    if (isset($si->t)) {
                        $sharedStrings[] = (string)$si->t;
                    } else if (isset($si->r)) {
                        // Rich text runs
                        $textParts = [];
                        foreach ($si->r as $r) {
                            $textParts[] = (string)$r->t;
                        }
                        $sharedStrings[] = implode('', $textParts);
                    } else {
                        $sharedStrings[] = '';
                    }
                }
            }
        }
        
        // Read sheet1
        $rows = [];
        if (($index = $zip->locateName('xl/worksheets/sheet1.xml')) !== false) {
            $data = $zip->getFromIndex($index);
            $xml = simplexml_load_string($data);
            
            if ($xml && $xml->sheetData && $xml->sheetData->row) {
                foreach ($xml->sheetData->row as $row) {
                    $rowNum = (int)$row['r'];
                    $rowData = [];
                    
                    foreach ($row->c as $cell) {
                        $r = (string)$cell['r'];
                        $colLetter = preg_replace('/[0-9]/', '', $r);
                        $type = (string)$cell['t'];
                        $val = (string)$cell->v;
                        
                        if ($type === 's' && $val !== '') {
                            $val = $sharedStrings[(int)$val] ?? $val;
                        }
                        $rowData[$colLetter] = $val;
                    }
                    $rows[$rowNum] = $rowData;
                }
            }
        }
        $zip->close();
        
        if (empty($rows)) {
            json_error("The uploaded sheet is empty or invalid.");
        }
        
        // Helper function to parse dates inside the request block
        if (!function_exists('parse_excel_date_val')) {
            function parse_excel_date_val($val) {
                if (is_numeric($val)) {
                    $valInt = (int)$val;
                    if ($valInt > 25569) {
                        $utc_days = $valInt - 25569;
                        $utc_value = $utc_days * 86400;
                        return date('Y-m-d', $utc_value);
                    }
                }
                if (preg_match('/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/', trim($val), $matches)) {
                    return "{$matches[3]}-{$matches[2]}-{$matches[1]}";
                }
                $timestamp = strtotime($val);
                return $timestamp ? date('Y-m-d', $timestamp) : date('Y-m-d');
            }
        }
        
        $importedCount = 0;
        $uid = current_user_id();
        
        $stmtInsert = $conn->prepare("
            INSERT INTO company_ledger 
            (post_date, customer_name, reg_no, loan_amount, deduction_info, status, account_description, debit_amount, credit_amount, pending_amount, remarks, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $conn->begin_transaction();
        
        try {
            foreach ($rows as $rowNum => $row) {
                if ($rowNum === 1) continue; // Skip header row
                
                $post_date = trim($row['A'] ?? '');
                $customer_name = trim($row['B'] ?? '');
                $reg_no = trim($row['C'] ?? '');
                $loan_amount = (float)($row['D'] ?? 0);
                $deduction_info = (float)($row['E'] ?? 0);
                $status = trim($row['F'] ?? 'Clear');
                $account_desc = trim($row['G'] ?? '');
                $debit_amount = (float)($row['H'] ?? 0);
                $credit_amount = (float)($row['I'] ?? 0);
                $pending_amount = (float)($row['K'] ?? 0);
                $remarks = trim($row['L'] ?? '');
                
                if (empty($post_date) && empty($customer_name) && empty($account_desc) && $debit_amount == 0 && $credit_amount == 0) {
                    continue;
                }
                
                $db_post_date = parse_excel_date_val($post_date);
                $db_status = (strcasecmp($status, 'Clear') === 0 || strcasecmp($status, 'Clear') === 0) ? 'Clear' : 'Pending';
                
                $stmtInsert->bind_param(
                    'sssddssdddsi', 
                    $db_post_date, $customer_name, $reg_no, $loan_amount, $deduction_info,
                    $db_status, $account_desc, $debit_amount, $credit_amount, $pending_amount, $remarks, $uid
                );
                $stmtInsert->execute();
                $importedCount++;
                
                // Auto reconciliation with disbursed leads
                if (!empty($reg_no)) {
                    $cleaned_reg = str_replace(' ', '', $reg_no);
                    $lead = db_fetch_one($conn, "SELECT id FROM leads WHERE REPLACE(registration_number, ' ', '') = ? LIMIT 1", 's', [$cleaned_reg]);
                    if ($lead) {
                        $lead_id = $lead['id'];
                        
                        if ($credit_amount > 0) {
                            $bankingRow = db_fetch_one($conn, "SELECT id FROM lead_banking WHERE lead_id = ?", 'i', [$lead_id]);
                            if ($bankingRow) {
                                db_query($conn, "
                                    UPDATE lead_banking 
                                    SET received_amount = ?, received_date = ?, updated_at = CURRENT_TIMESTAMP 
                                    WHERE lead_id = ?
                                ", "dsi", [$credit_amount, $db_post_date, $lead_id]);
                            } else {
                                db_query($conn, "
                                    INSERT INTO lead_banking (lead_id, received_amount, received_date) 
                                    VALUES (?, ?, ?)
                                ", "ids", [$lead_id, $credit_amount, $db_post_date]);
                            }
                            
                            if ($deduction_info > 0) {
                                $existingDeduction = db_fetch_one($conn, "
                                    SELECT id FROM lead_deductions 
                                    WHERE lead_id = ? AND ABS(amount - ?) < 0.01 LIMIT 1
                                ", "id", [$lead_id, $deduction_info]);
                                
                                if (!$existingDeduction) {
                                    db_query($conn, "
                                        INSERT INTO lead_deductions (lead_id, description, amount, created_by) 
                                        VALUES (?, ?, ?, ?)
                                    ", "isdi", [$lead_id, 'Financer Bank Statement Deduction', $deduction_info, $uid]);
                                }
                            }
                        }
                        
                        if ($debit_amount > 0) {
                            $existingTx = db_fetch_one($conn, "
                                SELECT id FROM lead_transactions 
                                WHERE lead_id = ? AND ABS(amount - ?) < 0.01 AND payment_date = ? LIMIT 1
                            ", "ids", [$lead_id, $debit_amount, $db_post_date]);
                            
                            if (!$existingTx) {
                                $ref_no = '';
                                if (preg_match('/IMPSP2A(\d+)/', $account_desc, $m)) $ref_no = $m[1];
                                elseif (preg_match('/RTGS[A-Z0-9]+/', $account_desc, $m)) $ref_no = $m[0];
                                elseif (preg_match('/NEFT[A-Z0-9]+/', $account_desc, $m)) $ref_no = $m[0];
                                
                                db_query($conn, "
                                    INSERT INTO lead_transactions 
                                    (lead_id, amount, payout_type, beneficiary_name, payment_date, payment_mode, status, reference_number, notes, created_by)
                                    VALUES (?, ?, 'customer', ?, ?, 'bank_transfer', 'completed', ?, ?, ?)
                                ", "idsssssi", [$lead_id, $debit_amount, $customer_name, $db_post_date, $ref_no, $account_desc, $uid]);
                            }
                        }
                    }
                }
            }
            
            $conn->commit();
            json_response([
                'message' => "Successfully imported $importedCount bank ledger transactions and reconciled matches.",
                'imported' => $importedCount
            ]);
        } catch (Exception $e) {
            $conn->rollback();
            json_error("Error importing sheet: " . $e->getMessage(), 500);
        }
        break;

    // ----------------------------------------------------
    // SYSTEM AUDIT TRAIL
    // ----------------------------------------------------
    case 'audit':
        api_require_role('admin');
        if ($method !== 'GET') json_error("Method not allowed", 405);
        $logs = db_fetch_all($conn, "
            SELECT 'Lead Action' as log_type, l.lead_id as ref_id, u.name as user_name, ll.action, ll.details, ll.created_at, NULL as ip_address
            FROM lead_logs ll
            LEFT JOIN leads l ON ll.lead_id = l.id
            LEFT JOIN users u ON ll.performed_by = u.id
            UNION ALL
            SELECT 'System Action', id, (SELECT name FROM users WHERE id = user_id), action, details, created_at, ip_address
            FROM system_logs
            UNION ALL
            SELECT 'Failed Login', 0, 'Unknown', 'Login Failed', 'Failed attempt', attempt_time, ip_address
            FROM failed_logins
            ORDER BY created_at DESC
            LIMIT 500
        ");
        json_response(['logs' => $logs]);
        break;

    case 'leads/log_interaction':
        api_require_login();
        if ($method !== 'POST') json_error("Method not allowed", 405);
        $lead_id = (int)($input['lead_id'] ?? 0);
        $type = trim($input['type'] ?? '');
        if (!$lead_id || !$type) json_error("Lead ID and Interaction Type are required.");
        
        $action = "Contacted via " . ucfirst($type);
        $details = "Executive initiated a " . strtolower($type) . " interaction from the system.";
        log_lead_action($conn, $lead_id, $action, $details, current_user_id());
        
        db_query($conn, "INSERT INTO system_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)", "isss", [current_user_id(), 'Communication Logged', "Logged $type for Lead ID: $lead_id", $_SERVER['REMOTE_ADDR'] ?? '']);
        
        json_response(['message' => 'Interaction logged successfully.']);
        break;

    // ----------------------------------------------------
    // FALLBACK
    // ----------------------------------------------------
    default:
        json_error("Endpoint not found: " . $path, 404);
}
