<?php
// test_phase3.php — Verification suite for Phase 3
require_once __DIR__ . '/includes/db.php';
require_once __DIR__ . '/includes/auth.php';

header('Content-Type: text/plain');

echo "=== LeadFlow Pro: Phase 3 Verification Suite ===\n\n";

$pass = true;

// 1. Check table existence
$check_table = $conn->query("SHOW TABLES LIKE 'lead_documents'");
if ($check_table->num_rows > 0) {
    echo "[PASS] 'lead_documents' table initialized successfully in MySQL.\n";
} else {
    echo "[FAIL] 'lead_documents' table is missing from MySQL!\n";
    $pass = false;
}

// 2. Validate columns structure
if ($pass) {
    $columns = [];
    $res = $conn->query("SHOW COLUMNS FROM lead_documents");
    while ($row = $res->fetch_assoc()) {
        $columns[$row['Field']] = $row['Type'];
    }
    
    $expected = [
        'id'                  => 'int',
        'lead_id'             => 'int',
        'document_type'       => "enum('aadhaar','pan','bank_statement','rc','insurance','vehicle_image','other')",
        'file_path'           => 'varchar(255)',
        'verification_status' => "enum('pending','verified','rejected')",
        'verification_notes'  => 'text',
        'uploaded_at'         => 'timestamp'
    ];
    
    foreach ($expected as $colName => $colType) {
        if (isset($columns[$colName]) && str_contains(strtolower($columns[$colName]), $colType)) {
            echo "[PASS] Column '$colName' verified with correct type mapping: {$columns[$colName]}\n";
        } else {
            echo "[FAIL] Column '$colName' missing or incorrect type! Found: " . ($columns[$colName] ?? 'None') . "\n";
            $pass = false;
        }
    }
}

// 3. Test mock insert and slot mapping
if ($pass) {
    echo "\nTesting mock document upload and list mapping...\n";
    
    // Insert mock document for lead 1
    $conn->query("DELETE FROM lead_documents WHERE lead_id = 1 AND document_type = 'aadhaar'");
    $stmt = $conn->prepare("
        INSERT INTO lead_documents (lead_id, document_type, file_path, verification_status)
        VALUES (1, 'aadhaar', 'uploads/leads/test_mock_aadhaar.pdf', 'pending')
    ");
    if ($stmt->execute()) {
        $docId = $conn->insert_id;
        echo "[PASS] Mock document record successfully inserted. ID: {$docId}\n";
        
        // Retrieve and map
        $documentsQuery = db_fetch_all($conn, "SELECT * FROM lead_documents WHERE lead_id = 1");
        $docsMap = array_column($documentsQuery, null, 'document_type');
        
        if (isset($docsMap['aadhaar']) && $docsMap['aadhaar']['file_path'] === 'uploads/leads/test_mock_aadhaar.pdf') {
            echo "[PASS] Documents mapped to slots successfully. Slot 'aadhaar' verified!\n";
        } else {
            echo "[FAIL] Failed to retrieve mapped slots!\n";
            $pass = false;
        }
        
        // Test status update mock (verify_doc.php logic)
        echo "\nTesting mock verify status controller update...\n";
        $newStatus = 'verified';
        $newNotes = 'Verification verified via test suite';
        
        $up = $conn->prepare("UPDATE lead_documents SET verification_status = ?, verification_notes = ? WHERE id = ?");
        $up->bind_param('ssi', $newStatus, $newNotes, $docId);
        if ($up->execute()) {
            $updatedDoc = db_fetch_one($conn, "SELECT * FROM lead_documents WHERE id = ?", 'i', [$docId]);
            if ($updatedDoc && $updatedDoc['verification_status'] === 'verified' && $updatedDoc['verification_notes'] === $newNotes) {
                echo "[PASS] Document status updated and verification notes successfully verified!\n";
            } else {
                echo "[FAIL] Failed to update verification status or notes mismatch!\n";
                $pass = false;
            }
        } else {
            echo "[FAIL] Failed to execute update statement: " . $conn->error . "\n";
            $pass = false;
        }
        
        // Clean up mock document
        $conn->query("DELETE FROM lead_documents WHERE id = {$docId}");
        echo "Mock document cleaned up.\n";
    } else {
        echo "[FAIL] Failed to insert mock document: " . $conn->error . "\n";
        $pass = false;
    }
}

echo "\n================================================\n";
if ($pass) {
    echo "Phase 3 verification tests passed successfully! 🚀\n";
} else {
    echo "Some tests failed. Please inspect errors.\n";
}
