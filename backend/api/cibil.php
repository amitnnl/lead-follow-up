<?php
// backend/api/cibil.php
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';

header('Content-Type: application/json');

if (!is_logged_in()) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$role = current_role();
// Restrict to admins/staff typically, or anyone if allowed. Let's allow admin, staff, manager.
if (!in_array($role, ['admin', 'manager', 'staff'])) {
    http_response_code(403);
    echo json_encode(['error' => 'Forbidden']);
    exit;
}

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST' && $action === 'fetch') {
    $input = json_decode(file_get_contents('php://input'), true);
    $lead_id = intval($input['lead_id'] ?? 0);
    $pan_number = strtoupper(trim($input['pan_number'] ?? ''));
    $aadhaar_number = preg_replace('/\D/', '', trim($input['aadhaar_number'] ?? ''));
    $dob = trim($input['dob'] ?? '');
    $consent_acquired = filter_var($input['consent_acquired'] ?? false, FILTER_VALIDATE_BOOLEAN);
    
    if (!$lead_id || (!$pan_number && !$aadhaar_number) || !$dob) {
        http_response_code(400);
        echo json_encode(['error' => 'Lead ID, DOB, and either PAN Card number or Aadhaar Card number are required.']);
        exit;
    }
    
    if (!$consent_acquired) {
        http_response_code(400);
        echo json_encode(['error' => 'Explicit customer consent is legally mandated before fetching a CIBIL score.']);
        exit;
    }

    // Verify lead exists
    $lead = db_fetch_one($conn, "SELECT id FROM leads WHERE id=?", 'i', [$lead_id]);
    if (!$lead) {
        http_response_code(404);
        echo json_encode(['error' => 'Lead not found']);
        exit;
    }

    // ==========================================
    // DUMMY API CALL SIMULATION
    // ==========================================
    sleep(1); 
    
    $dummy_score = rand(650, 850);
    $dummy_report_url = "https://example.com/cibil_report_dummy.pdf";
    $dummy_json = json_encode(['status' => 'success', 'score' => $dummy_score, 'provider' => 'Dummy_API', 'aadhaar' => $aadhaar_number]);
    
    $user_id = current_user_id();

    // 1. Insert into lead_cibil_checks
    $stmt = $conn->prepare("INSERT INTO lead_cibil_checks (lead_id, pan_number, dob, cibil_score, report_url, api_response_json, fetched_by) VALUES (?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("ississi", $lead_id, $pan_number, $dob, $dummy_score, $dummy_report_url, $dummy_json, $user_id);
    
    if ($stmt->execute()) {
        $check_id = $conn->insert_id;
        
        // 2. Update leads table (updating PAN, Aadhaar if provided, DOB, and CIBIL score)
        if (!empty($aadhaar_number)) {
            $update_stmt = $conn->prepare("UPDATE leads SET customer_pan = COALESCE(NULLIF(?, ''), customer_pan), customer_aadhaar = ?, customer_dob = ?, cibil_score = ? WHERE id = ?");
            $update_stmt->bind_param("sssii", $pan_number, $aadhaar_number, $dob, $dummy_score, $lead_id);
            $update_stmt->execute();
        } else {
            $update_stmt = $conn->prepare("UPDATE leads SET customer_pan = ?, customer_dob = ?, cibil_score = ? WHERE id = ?");
            $update_stmt->bind_param("ssii", $pan_number, $dob, $dummy_score, $lead_id);
            $update_stmt->execute();
        }

        // 3. Add to lead_logs
        $log_action = "CIBIL Checked";
        $log_details = "Fetched CIBIL Score. Score: $dummy_score, PAN: $pan_number, Aadhaar: $aadhaar_number (Customer Consent Verified)";
        $log_stmt = $conn->prepare("INSERT INTO lead_logs (lead_id, action, details, performed_by) VALUES (?, ?, ?, ?)");
        $log_stmt->bind_param("issi", $lead_id, $log_action, $log_details, $user_id);
        $log_stmt->execute();

        echo json_encode([
            'success' => true,
            'data' => [
                'score' => $dummy_score,
                'report_url' => $dummy_report_url
            ]
        ]);
    } else {
        http_response_code(500); 
        echo json_encode(['error' => 'Database error while saving CIBIL check']);
    }
    exit;
}

if ($method === 'GET' && $action === 'history') {
    $lead_id = intval($_GET['lead_id'] ?? 0);
    if (!$lead_id) {
        http_response_code(400); echo json_encode(['error' => 'Lead ID required']); exit;
    }
    
    $res = $conn->query("SELECT id, pan_number, dob, cibil_score, report_url, created_at, 
                        (SELECT name FROM users WHERE id = fetched_by) as fetched_by_name
                        FROM lead_cibil_checks 
                        WHERE lead_id = $lead_id 
                        ORDER BY created_at DESC");
    $history = [];
    while ($row = $res->fetch_assoc()) {
        $history[] = $row;
    }
    
    echo json_encode(['history' => $history]);
    exit;
}

http_response_code(404);
echo json_encode(['error' => 'Invalid action']);
