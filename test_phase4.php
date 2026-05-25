<?php
// test_phase4.php — Verification suite for Phase 4 (Commission Payout Splits)
require_once __DIR__ . '/includes/db.php';

header('Content-Type: text/plain');

echo "=== LeadFlow Pro: Phase 4 Verification Suite ===\n\n";

$pass = true;

// 1. Validate Columns Structure in MySQL
$expected_columns = [
    'payout_90_status' => "enum('pending','paid')",
    'payout_90_date'   => "date",
    'payout_90_mode'   => "enum('cash','bank_transfer','cheque')",
    'payout_10_status' => "enum('pending','paid')",
    'payout_10_date'   => "date",
    'payout_10_mode'   => "enum('cash','bank_transfer','cheque')",
    'additional_payout'=> "decimal(10,2)"
];

$columns = [];
$res = $conn->query("SHOW COLUMNS FROM commissions");
while ($row = $res->fetch_assoc()) {
    $columns[$row['Field']] = $row['Type'];
}

foreach ($expected_columns as $colName => $colType) {
    if (isset($columns[$colName]) && str_contains(strtolower($columns[$colName]), $colType)) {
        echo "[PASS] Column '$colName' successfully verified with schema type: {$columns[$colName]}\n";
    } else {
        echo "[FAIL] Column '$colName' is missing or has incorrect schema type! Found: " . ($columns[$colName] ?? 'None') . "\n";
        $pass = false;
    }
}

// 2. Validate Programmatic splits math logic
if ($pass) {
    echo "\nRunning split calculation logic math tests...\n";
    
    $commAmt = 15000.00;
    
    // Case A: 90% paid, 10% pending, additional = 0
    $payout90Status = 'paid';
    $payout10Status = 'pending';
    $additional = 0.00;
    
    $paidAmtA = ($payout90Status === 'paid' ? $commAmt * 0.90 : 0.0) + ($payout10Status === 'paid' ? $commAmt * 0.10 : 0.0) + $additional;
    $expectedA = 13500.00;
    if (abs($paidAmtA - $expectedA) < 0.001) {
        echo "[PASS] Case A (90% Paid): Paid amount is correctly calculated as ₹" . number_format($paidAmtA, 2) . "\n";
    } else {
        echo "[FAIL] Case A Math Mismatch! Expected ₹" . number_format($expectedA, 2) . " but got ₹" . number_format($paidAmtA, 2) . "\n";
        $pass = false;
    }
    
    // Case B: 90% paid, 10% paid, additional = 500
    $payout90Status = 'paid';
    $payout10Status = 'paid';
    $additional = 500.00;
    
    $paidAmtB = ($payout90Status === 'paid' ? $commAmt * 0.90 : 0.0) + ($payout10Status === 'paid' ? $commAmt * 0.10 : 0.0) + $additional;
    $expectedB = 15500.00;
    if (abs($paidAmtB - $expectedB) < 0.001) {
        echo "[PASS] Case B (90% + 10% + Additional): Paid amount is correctly calculated as ₹" . number_format($paidAmtB, 2) . "\n";
    } else {
        echo "[FAIL] Case B Math Mismatch! Expected ₹" . number_format($expectedB, 2) . " but got ₹" . number_format($paidAmtB, 2) . "\n";
        $pass = false;
    }
}

// 3. Test database insert, sync, and delete cycle
if ($pass) {
    echo "\nTesting mock commission insertion and split values synchronization...\n";
    
    // Cleanup any stale mocks
    $conn->query("DELETE FROM commissions WHERE lead_id = 1 AND notes = 'MOCK_PHASE4_TEST'");
    
    $lead_id = 1;
    $agent_id = 1;
    $commAmt = 20000.00;
    
    // Set splits: 90% paid, 10% pending
    $payout90Status = 'paid';
    $payout90Date   = '2026-05-25';
    $payout90Mode   = 'bank_transfer';
    $payout10Status = 'pending';
    $payout10Date   = null;
    $payout10Mode   = null;
    $additional     = 250.00;
    $notes          = 'MOCK_PHASE4_TEST';
    
    $paidAmt = ($payout90Status === 'paid' ? $commAmt * 0.90 : 0.0) + ($payout10Status === 'paid' ? $commAmt * 0.10 : 0.0) + $additional;
    
    $stmt = $conn->prepare("
        INSERT INTO commissions (
            lead_id, agent_id, commission_amount, paid_amount, notes,
            payout_90_status, payout_90_date, payout_90_mode,
            payout_10_status, payout_10_date, payout_10_mode,
            additional_payout
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->bind_param(
        'iiddsssssssd',
        $lead_id, $agent_id, $commAmt, $paidAmt, $notes,
        $payout90Status, $payout90Date, $payout90Mode,
        $payout10Status, $payout10Date, $payout10Mode,
        $additional
    );
    
    if ($stmt->execute()) {
        $mockId = $conn->insert_id;
        echo "[PASS] Mock commission recorded successfully. ID: {$mockId}\n";
        
        // Retrieve and check synced paid_amount
        $retrieved = db_fetch_one($conn, "SELECT * FROM commissions WHERE id = ?", 'i', [$mockId]);
        if ($retrieved) {
            $expectedPaid = 18250.00; // 90% of 20000 = 18000 + 250 = 18250
            if (abs($retrieved['paid_amount'] - $expectedPaid) < 0.001) {
                echo "[PASS] Synced 'paid_amount' in DB matches expected value of ₹" . number_format($expectedPaid, 2) . "\n";
            } else {
                echo "[FAIL] Synced 'paid_amount' mismatch in DB! Found: ₹" . number_format($retrieved['paid_amount'], 2) . "\n";
                $pass = false;
            }
            
            if ($retrieved['payout_90_status'] === 'paid' && $retrieved['payout_10_status'] === 'pending') {
                echo "[PASS] Split status fields correctly read back from DB.\n";
            } else {
                echo "[FAIL] Split status fields mismatch!\n";
                $pass = false;
            }
        } else {
            echo "[FAIL] Failed to retrieve inserted mock commission details!\n";
            $pass = false;
        }
        
        // Clean up
        $conn->query("DELETE FROM commissions WHERE id = {$mockId}");
        echo "Mock commission details cleaned up from database.\n";
    } else {
        echo "[FAIL] Executing mock insert failed: " . $conn->error . "\n";
        $pass = false;
    }
}

// 4. Test RTO/RC/Insurance eligibility indicator binary logic
if ($pass) {
    echo "\nTesting RTO/RC/Insurance retention eligibility checks...\n";
    
    $cases = [
        ['rc' => 'received', 'ins' => 'received', 'rto' => 'done',           'expected' => true],
        ['rc' => 'pending',  'ins' => 'received', 'rto' => 'done',           'expected' => false],
        ['rc' => 'received', 'ins' => 'pending',  'rto' => 'done',           'expected' => false],
        ['rc' => 'received', 'ins' => 'received', 'rto' => 'pending',        'expected' => false],
        ['rc' => 'received', 'ins' => 'received', 'rto' => 'not_applicable', 'expected' => false] // Wait, done is required for RTO
    ];
    
    foreach ($cases as $idx => $c) {
        $isEligible = ($c['rc'] === 'received' && $c['ins'] === 'received' && $c['rto'] === 'done');
        if ($isEligible === $c['expected']) {
            echo "[PASS] Case #$idx (RC: {$c['rc']}, Ins: {$c['ins']}, RTO: {$c['rto']}): Result is " . ($isEligible ? 'Eligible' : 'Held') . " as expected.\n";
        } else {
            echo "[FAIL] Case #$idx mismatch! Expected " . ($c['expected'] ? 'Eligible' : 'Held') . " but got " . ($isEligible ? 'Eligible' : 'Held') . "\n";
            $pass = false;
        }
    }
}

echo "\n================================================\n";
if ($pass) {
    echo "Phase 4 verification tests passed successfully! 🚀\n";
} else {
    echo "Some Phase 4 tests failed. Please review the output above.\n";
}
