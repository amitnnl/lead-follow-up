<?php
// cron/sla_alerts.php — Automated SLA Escalation Script
// Runs daily to find leads that are overdue beyond the SLA limit and email admins.

require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/mailer.php';

// Prevent direct browser access unless a secret key is provided (for manual testing)
$secret = getenv('CRON_SECRET') ?: get_setting('cron_secret', 'dsa_cron_secret_77');
$isCli = (php_sapi_name() === 'cli');
$isManual = (isset($_GET['key']) && $_GET['key'] === $secret);

if (!$isCli && !$isManual) {
    http_response_code(403);
    die("Forbidden");
}

echo "Starting SLA Alert Scan...\n";

// Fetch SLA Days
$sla_days = (int)get_setting('followup_sla_days', '3');
$sla_threshold_date = date('Y-m-d', strtotime("-$sla_days days"));

// Find all leads whose next followup date is older than the threshold, and are still active
$overdue_leads = db_fetch_all($conn, "
    SELECT l.id, l.customer_name, l.customer_mobile, lf.next_followup_date, ex.name as executive_name
    FROM leads l
    LEFT JOIN lead_followups lf ON l.id = lf.lead_id AND lf.id = (
        SELECT MAX(id) FROM lead_followups WHERE lead_id = l.id
    )
    LEFT JOIN executives ex ON l.executive_id = ex.id
    WHERE l.status NOT IN ('disbursed', 'rejected')
      AND (lf.next_followup_date < ? OR (lf.next_followup_date IS NULL AND DATE(l.created_at) < ?))
", 'ss', [$sla_threshold_date, $sla_threshold_date]);

if (empty($overdue_leads)) {
    echo "No SLA violations found.\n";
    if ($isManual) {
        session_start();
        $_SESSION['flash_success'] = "SLA Scan Complete: No violations found.";
        header("Location: " . BASE_URL . "/dashboard.php");
    }
    exit;
}

// Escalate leads (optional logic, could change status or flag)
foreach ($overdue_leads as $lead) {
    log_lead_action($conn, $lead['id'], 'SLA Escalate', "Lead breached $sla_days-day followup SLA.");
}

// Email the admins
$admins = db_fetch_all($conn, "SELECT email FROM users WHERE role = 'admin' AND is_active = 1");
$admin_emails = array_column($admins, 'email');

if (!empty($admin_emails)) {
    $count = count($overdue_leads);
    $html_list = '';
    foreach ($overdue_leads as $lead) {
        $dateStr = $lead['next_followup_date'] ?? 'Never';
        $html_list .= "
        <tr>
            <td style='padding: 10px; border-bottom: 1px solid #eee;'><strong>#{$lead['id']} - {$lead['customer_name']}</strong></td>
            <td style='padding: 10px; border-bottom: 1px solid #eee;'>{$lead['executive_name']}</td>
            <td style='padding: 10px; border-bottom: 1px solid #eee; color: #dc2626;'>$dateStr</td>
        </tr>";
    }

    $subject = "🚨 SLA Alert: $count Leads Neglected";
    
    $html_body = "
    <html>
    <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
        <h2 style='color: #dc2626;'>SLA Violation Report</h2>
        <p>The following <strong>$count</strong> leads have missed their follow-ups by more than the allowed $sla_days days:</p>
        
        <table style='width: 100%; border-collapse: collapse; text-align: left; background: #fff; margin-top: 20px;'>
            <thead>
                <tr style='background: #f8fafc;'>
                    <th style='padding: 10px; border-bottom: 2px solid #cbd5e1;'>Lead Details</th>
                    <th style='padding: 10px; border-bottom: 2px solid #cbd5e1;'>Assigned Executive</th>
                    <th style='padding: 10px; border-bottom: 2px solid #cbd5e1;'>Last Scheduled Follow-up</th>
                </tr>
            </thead>
            <tbody>
                $html_list
            </tbody>
        </table>
        
        <p style='margin-top: 30px; font-size: 0.9em; color: #666;'>
            Please log into the <a href='" . BASE_URL . "'>DSA Portal</a> immediately to reassign or escalate these accounts.
        </p>
    </body>
    </html>
    ";

    if (send_system_email($admin_emails, $subject, $html_body)) {
        echo "SLA Alert email sent to admins.\n";
    } else {
        echo "Failed to send SLA Alert email.\n";
    }
} else {
    echo "No admin emails found to send SLA alert to.\n";
}

if ($isManual) {
    session_start();
    $_SESSION['flash_success'] = "SLA Scan Complete: Found " . count($overdue_leads) . " violations. Alerts dispatched.";
    header("Location: " . BASE_URL . "/dashboard.php");
    exit;
}
