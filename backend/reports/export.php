<?php
// reports/export.php — Advanced Reporting Export Fix
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';
require_login();
require_role('admin', 'staff');

$fromDate = $_GET['from'] ?? date('Y-m-01');
$toDate   = $_GET['to']   ?? date('Y-m-d');
$agentFilter = (int)($_GET['agent_id'] ?? 0);
$execFilter  = (int)($_GET['executive_id'] ?? 0);
$finFilter   = (int)($_GET['financer_id'] ?? 0);
$tab = $_GET['tab'] ?? 'agent';

// Build dynamic WHERE clauses for the leads table joins
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

header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="' . $tab . '_report_' . date('Ymd_His') . '.csv"');
$output = fopen('php://output', 'w');

if ($tab === 'agent') {
    fputcsv($output, ['Agent', 'Total Leads', 'New', 'Pending', 'Approved', 'Disbursed', 'Rejected', 'Total Loan Value', 'Total Payout', 'Conversion %']);
    
    $sql = "
        SELECT a.name as agent_name,
               COUNT(l.id) as total_leads,
               SUM(CASE WHEN l.status='new' THEN 1 ELSE 0 END) as new_leads,
               SUM(CASE WHEN l.status='pending' THEN 1 ELSE 0 END) as pending_leads,
               SUM(CASE WHEN l.status='approved' THEN 1 ELSE 0 END) as approved_leads,
               SUM(CASE WHEN l.status='disbursed' THEN 1 ELSE 0 END) as disbursed_leads,
               SUM(CASE WHEN l.status='rejected' THEN 1 ELSE 0 END) as rejected_leads,
               SUM(l.loan_amount) as total_loan_value,
               SUM((SELECT lb.received_amount - COALESCE((SELECT SUM(amount) FROM lead_deductions WHERE lead_id = l.id), 0) FROM lead_banking lb WHERE lb.lead_id = l.id)) as total_payout
        FROM agents a
        LEFT JOIN leads l ON l.agent_id=a.id AND $leadConditions
        GROUP BY a.id
        ORDER BY disbursed_leads DESC
    ";
    
    $data = db_fetch_all($conn, $sql, $types, $params);
    foreach ($data as $r) {
        $conversion = $r['total_leads'] > 0 ? round(($r['disbursed_leads'] / $r['total_leads']) * 100, 1) : 0;
        fputcsv($output, [
            $r['agent_name'],
            $r['total_leads'],
            $r['new_leads'],
            $r['pending_leads'],
            $r['approved_leads'],
            $r['disbursed_leads'],
            $r['rejected_leads'],
            $r['total_loan_value'] ?? '0',
            $r['total_payout'] ?? '0',
            $conversion . '%'
        ]);
    }
} elseif ($tab === 'exec') {
    fputcsv($output, ['Executive', 'Total Leads', 'Disbursed', 'Rejected', 'Total Loan Value', 'Conversion %']);
    
    $sql = "
        SELECT ex.name as exec_name,
               COUNT(l.id) as total_leads,
               SUM(CASE WHEN l.status='disbursed' THEN 1 ELSE 0 END) as disbursed,
               SUM(CASE WHEN l.status='rejected' THEN 1 ELSE 0 END) as rejected,
               SUM(l.loan_amount) as loan_value
        FROM executives ex
        LEFT JOIN leads l ON l.executive_id=ex.id AND $leadConditions
        GROUP BY ex.id 
        ORDER BY disbursed DESC
    ";
    
    $data = db_fetch_all($conn, $sql, $types, $params);
    foreach ($data as $r) {
        $conversion = $r['total_leads'] > 0 ? round(($r['disbursed'] / $r['total_leads']) * 100, 1) : 0;
        fputcsv($output, [
            $r['exec_name'],
            $r['total_leads'],
            $r['disbursed'],
            $r['rejected'],
            $r['loan_value'] ?? '0',
            $conversion . '%'
        ]);
    }
} elseif ($tab === 'financer') {
    fputcsv($output, ['Financer', 'Total Leads', 'Disbursed', 'Total Loan Value']);
    
    $sql = "
        SELECT f.name as financer_name,
               COUNT(l.id) as total_leads,
               SUM(CASE WHEN l.status='disbursed' THEN 1 ELSE 0 END) as disbursed,
               SUM(l.loan_amount) as loan_value
        FROM financers f
        LEFT JOIN leads l ON l.financer_id=f.id AND $leadConditions
        GROUP BY f.id 
        ORDER BY loan_value DESC
    ";
    
    $data = db_fetch_all($conn, $sql, $types, $params);
    foreach ($data as $r) {
        fputcsv($output, [
            $r['financer_name'],
            $r['total_leads'],
            $r['disbursed'],
            $r['loan_value'] ?? '0'
        ]);
    }
} elseif ($tab === 'daily') {
    fputcsv($output, ['Date', 'Total Leads', 'Approved/Disbursed', 'Loan Value']);
    
    $sql = "
        SELECT l.lead_date,
               COUNT(*) as total,
               SUM(CASE WHEN l.status='approved' OR l.status='disbursed' THEN 1 ELSE 0 END) as approved,
               SUM(l.loan_amount) as loan_value
        FROM leads l
        WHERE $leadConditions
        GROUP BY l.lead_date 
        ORDER BY l.lead_date DESC
    ";
    
    $data = db_fetch_all($conn, $sql, $types, $params);
    foreach ($data as $r) {
        fputcsv($output, [
            $r['lead_date'],
            $r['total'],
            $r['approved'],
            $r['loan_value'] ?? '0'
        ]);
    }
}

fclose($output);
exit;
