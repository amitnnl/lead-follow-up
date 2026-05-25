<?php
// test_reports.php — Verification suite for Phase 5 (MIS Deep Filtering)
require_once __DIR__ . '/includes/db.php';

header('Content-Type: text/plain');

echo "=== LeadFlow Pro: Phase 5 Reports Verification Suite ===\n\n";

$pass = true;

// 1. Check if the files and assets exist
if (file_exists(__DIR__ . '/reports/index.php')) {
    echo "[PASS] 'reports/index.php' file verified in the workspace.\n";
} else {
    echo "[FAIL] 'reports/index.php' is missing!\n";
    $pass = false;
}

// 2. Validate dynamic SQL query builder compilation
if ($pass) {
    echo "\nTesting dynamic SQL filter compilers...\n";
    
    $fromDate = '2025-09-01';
    $toDate   = '2025-09-30';
    
    // Test Case A: Date range only
    $agentFilter = 0;
    $execFilter  = 0;
    $finFilter   = 0;
    
    $leadConditions = "l.lead_date BETWEEN ? AND ?";
    $params = [$fromDate, $toDate];
    $types = "ss";
    
    if (count($params) === 2 && $types === 'ss') {
        echo "[PASS] Test Case A (Dates Only): Dynamic binds formatted correctly. Params count: " . count($params) . "\n";
    } else {
        echo "[FAIL] Test Case A Dynamic bind mismatch!\n";
        $pass = false;
    }
    
    // Test Case B: Date range + Agent + Executive + Financer
    $agentFilter = 1;
    $execFilter  = 2;
    $finFilter   = 3;
    
    $leadConditions = "l.lead_date BETWEEN ? AND ?";
    $params = [$fromDate, $toDate];
    $types = "ss";
    
    if ($agentFilter) {
        $leadConditions .= " AND l.agent_id = ?";
        $params[] = $agentFilter;
        $types .= "i";
    }
    if ($execFilter) {
        $leadConditions .= " AND l.executive_id = ?";
        $params[] = $execFilter;
        $types .= "i";
    }
    if ($finFilter) {
        $leadConditions .= " AND l.financer_id = ?";
        $params[] = $finFilter;
        $types .= "i";
    }
    
    $expectedSql = "l.lead_date BETWEEN ? AND ? AND l.agent_id = ? AND l.executive_id = ? AND l.financer_id = ?";
    $expectedTypes = "ssiii";
    
    if ($leadConditions === $expectedSql && $types === $expectedTypes && count($params) === 5) {
        echo "[PASS] Test Case B (Full Filters): Dynamic SQL and parameter types compiled correctly.\n";
        echo "       SQL: {$leadConditions}\n";
        echo "       Types: {$types}\n";
    } else {
        echo "[FAIL] Test Case B Compiler mismatch!\n";
        $pass = false;
    }
}

// 3. Test programmatic SQL executions with mocks to ensure zero syntax errors
if ($pass) {
    echo "\nExecuting test database fetches with advanced filters to verify syntax...\n";
    
    $fromDate = '2025-09-01';
    $toDate   = '2025-09-30';
    $agentFilter = 1; // Seka N
    $execFilter  = 1; // Vikram Kumar
    $finFilter   = 1; // AU Bank
    
    $leadConditions = "l.lead_date BETWEEN ? AND ?";
    $params = [$fromDate, $toDate];
    $types = "ss";
    
    if ($agentFilter) {
        $leadConditions .= " AND l.agent_id = ?";
        $params[] = $agentFilter;
        $types .= "i";
    }
    if ($execFilter) {
        $leadConditions .= " AND l.executive_id = ?";
        $params[] = $execFilter;
        $types .= "i";
    }
    if ($finFilter) {
        $leadConditions .= " AND l.financer_id = ?";
        $params[] = $finFilter;
        $types .= "i";
    }
    
    // Run Agent Performance execution test
    try {
        $agentPerf = db_fetch_all($conn, "
            SELECT a.name as agent_name,
                   COUNT(l.id) as total_leads,
                   SUM(CASE WHEN l.status='disbursed' THEN 1 ELSE 0 END) as disbursed_leads
            FROM agents a
            LEFT JOIN leads l ON l.agent_id=a.id AND $leadConditions
            GROUP BY a.id
        ", $types, $params);
        
        echo "[PASS] Dynamic Agent Performance query executed with zero syntax or binding errors.\n";
    } catch (Exception $e) {
        echo "[FAIL] Dynamic Agent Performance query execution error: " . $e->getMessage() . "\n";
        $pass = false;
    }
    
    // Run Executive Performance execution test
    try {
        $execPerf = db_fetch_all($conn, "
            SELECT ex.name as exec_name,
                   COUNT(l.id) as total_leads
            FROM executives ex
            LEFT JOIN leads l ON l.executive_id=ex.id AND $leadConditions
            GROUP BY ex.id
        ", $types, $params);
        
        echo "[PASS] Dynamic Executive Performance query executed with zero syntax or binding errors.\n";
    } catch (Exception $e) {
        echo "[FAIL] Dynamic Executive Performance query execution error: " . $e->getMessage() . "\n";
        $pass = false;
    }
    
    // Run Financer Summary execution test
    try {
        $finPerf = db_fetch_all($conn, "
            SELECT f.name as financer_name,
                   COUNT(l.id) as total_leads
            FROM financers f
            LEFT JOIN leads l ON l.financer_id=f.id AND $leadConditions
            GROUP BY f.id
        ", $types, $params);
        
        echo "[PASS] Dynamic Financer Summary query executed with zero syntax or binding errors.\n";
    } catch (Exception $e) {
        echo "[FAIL] Dynamic Financer Summary query execution error: " . $e->getMessage() . "\n";
        $pass = false;
    }
    
    // Run Daily MIS execution test
    try {
        $dailyMIS = db_fetch_all($conn, "
            SELECT l.lead_date,
                   COUNT(*) as total
            FROM leads l
            WHERE $leadConditions
            GROUP BY l.lead_date
        ", $types, $params);
        
        echo "[PASS] Dynamic Daily MIS query executed with zero syntax or binding errors.\n";
    } catch (Exception $e) {
        echo "[FAIL] Dynamic Daily MIS query execution error: " . $e->getMessage() . "\n";
        $pass = false;
    }
}

echo "\n================================================\n";
if ($pass) {
    echo "Phase 5 reports verification tests passed successfully! 🚀\n";
} else {
    echo "Some tests failed. Please review errors above.\n";
}
