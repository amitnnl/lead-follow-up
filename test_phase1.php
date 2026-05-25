<?php
// test_phase1.php — Verification suite for Phase 1
require_once __DIR__ . '/includes/db.php';
require_once __DIR__ . '/includes/auth.php';

header('Content-Type: text/plain');

echo "=== LeadFlow Pro: Phase 1 Verification Suite ===\n\n";

$pass = true;

// 1. Check leads table schema
$check_leads = $conn->query("SHOW COLUMNS FROM leads LIKE 'loan_type'");
if ($check_leads->num_rows > 0) {
    $col = $check_leads->fetch_assoc();
    echo "[PASS] 'loan_type' column exists. Type: {$col['Type']}\n";
} else {
    echo "[FAIL] 'loan_type' column does not exist!\n";
    $pass = false;
}

// 2. Check users role enum
$check_users = $conn->query("SHOW COLUMNS FROM users LIKE 'role'");
if ($check_users->num_rows > 0) {
    $col = $check_users->fetch_assoc();
    if (str_contains($col['Type'], 'executive')) {
        echo "[PASS] 'users.role' ENUM successfully extended to include 'executive'. Type: {$col['Type']}\n";
    } else {
        echo "[FAIL] 'users.role' ENUM does NOT include 'executive'! Type: {$col['Type']}\n";
        $pass = false;
    }
} else {
    echo "[FAIL] 'users.role' column not found!\n";
    $pass = false;
}

// 3. Test insert & retrieve refinance lead
echo "\nTesting lead insert with Refinance loan type...\n";
$testLeadId = 'DSA-TEST-REF-01';
// Delete if already exists
$conn->query("DELETE FROM leads WHERE lead_id = '$testLeadId'");

$stmt = $conn->prepare("
    INSERT INTO leads 
    (lead_id, lead_date, customer_name, customer_mobile, loan_amount, loan_type, status, rc_status, insurance_status, rto_status, payout_status, created_by)
    VALUES (?, CURDATE(), 'Test Refinance Customer', '9999999999', 500000.00, 'refinance', 'new', 'pending', 'pending', 'pending', 'pending', 1)
");
$stmt->bind_param('s', $testLeadId);
if ($stmt->execute()) {
    $insertedId = $conn->insert_id;
    echo "[PASS] Test refinance lead inserted. ID: {$insertedId}\n";
    
    // Retrieve and verify
    $lead = db_fetch_one($conn, "SELECT * FROM leads WHERE id = ?", 'i', [$insertedId]);
    if ($lead && $lead['loan_type'] === 'refinance') {
        echo "[PASS] Test refinance lead retrieved successfully and 'loan_type' matches 'refinance'!\n";
    } else {
        echo "[FAIL] Failed to retrieve refinance lead or 'loan_type' does not match!\n";
        $pass = false;
    }
    
    // Clean up test lead
    $conn->query("DELETE FROM leads WHERE id = {$insertedId}");
    echo "Test refinance lead cleaned up.\n";
} else {
    echo "[FAIL] Failed to insert test refinance lead: " . $conn->error . "\n";
    $pass = false;
}

// 4. Test SFE query scoping
echo "\nTesting SFE query scoping variables...\n";
// Let's mock Vikram Kumar who has SFE executive record linked to user 2
$sfeUser = db_fetch_one($conn, "SELECT id, name FROM users WHERE email = 'vikram@dsaleads.com'");
if ($sfeUser) {
    $execRow = db_fetch_one($conn, "SELECT id FROM executives WHERE user_id = ?", 'i', [$sfeUser['id']]);
    if ($execRow) {
        $execId = $execRow['id'];
        echo "[PASS] SFE record found for User '{$sfeUser['name']}' (user_id: {$sfeUser['id']}). SFE executive_id: {$execId}\n";
        
        // Let's run a scoped query as a dry run
        $whereScope = "l.executive_id = ?";
        $paramsScope = [$execId];
        $typesScope = 'i';
        $leadsCount = db_fetch_one($conn, "SELECT COUNT(*) as cnt FROM leads l WHERE $whereScope", $typesScope, $paramsScope)['cnt'] ?? 0;
        echo "[PASS] Query scoping executed successfully. Dynamic leads count for SFE {$execId} is: {$leadsCount}\n";
    } else {
        echo "[WARN] SFE record not found for Vikram Kumar user. Please make sure user_id is mapped correctly.\n";
    }
} else {
    echo "[WARN] User vikram@dsaleads.com not found. Skipping SFE mock query test.\n";
}

// 5. Test WhatsApp URL Generation
echo "\nTesting WhatsApp url generation helper...\n";
$testMobile = '9876543210';
$url = whatsapp_url($testMobile, 'Amit Sharma', 'DSA-2025-0001', 'pending');
if (str_contains($url, 'wa.me/919876543210') && str_contains($url, 'Pending')) {
    echo "[PASS] whatsapp_url() helper correctly standardizes mobile and encodes prefilled template status!\n";
    echo "Generated URL: {$url}\n";
} else {
    echo "[FAIL] whatsapp_url() helper returned invalid format: {$url}\n";
    $pass = false;
}

echo "\n================================================\n";
if ($pass) {
    echo "Phase 1 & 2 verification tests passed successfully! 🚀\n";
} else {
    echo "Some tests failed. Please inspect errors.\n";
}
