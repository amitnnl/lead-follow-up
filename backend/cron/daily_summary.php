<?php
// cron/daily_summary.php — Automated Daily Digest Script
// Runs at the end of the day to email admins a summary of today's performance.

require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/mailer.php';

// Prevent direct browser access unless a secret key is provided
$secret = getenv('CRON_SECRET') ?: get_setting('cron_secret', 'dsa_cron_secret_77');
$isCli = (php_sapi_name() === 'cli');
$isManual = (isset($_GET['key']) && $_GET['key'] === $secret);

if (!$isCli && !$isManual) {
    http_response_code(403);
    die("Forbidden");
}

echo "Generating Daily Summary...\n";

$today = date('Y-m-d');

// 1. Get New Leads Today
$new_leads = db_fetch_one($conn, "SELECT COUNT(*) as cnt FROM leads WHERE DATE(created_at) = ?", 's', [$today])['cnt'] ?? 0;

// 2. Get Disbursed Today
$disbursed_stats = db_fetch_one($conn, "
    SELECT COUNT(*) as cnt, SUM(loan_amount) as total_val 
    FROM leads 
    WHERE status = 'disbursed' AND DATE(updated_at) = ?
", 's', [$today]);

$disbursed_cnt = $disbursed_stats['cnt'] ?? 0;
$disbursed_val = $disbursed_stats['total_val'] ?? 0;

// 3. Get SLA Violations Today
$sla_days = (int)get_setting('followup_sla_days', '3');
$sla_threshold_date = date('Y-m-d', strtotime("-$sla_days days"));
$sla_violations = db_fetch_one($conn, "
    SELECT COUNT(*) as cnt FROM leads l
    LEFT JOIN lead_followups lf ON l.id = lf.lead_id AND lf.id = (SELECT MAX(id) FROM lead_followups WHERE lead_id = l.id)
    WHERE l.status NOT IN ('disbursed', 'rejected')
      AND (lf.next_followup_date < ? OR (lf.next_followup_date IS NULL AND DATE(l.created_at) < ?))
", 'ss', [$sla_threshold_date, $sla_threshold_date])['cnt'] ?? 0;


// Email the admins
$admins = db_fetch_all($conn, "SELECT email FROM users WHERE role = 'admin' AND is_active = 1");
$admin_emails = array_column($admins, 'email');

if (!empty($admin_emails)) {
    $appName = get_setting('app_name', 'LeadFlow Pro');
    $subject = "📅 Daily Performance Digest - " . date('d M Y');
    
    $val_formatted = format_currency((float)$disbursed_val);
    
    $html_body = "
    <html>
    <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f8fafc; padding: 20px;'>
        <div style='max-width: 600px; margin: 0 auto; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);'>
            <div style='background-color: #0f172a; color: #fff; padding: 20px; text-align: center;'>
                <h2 style='margin: 0; font-size: 22px;'>$appName</h2>
                <p style='margin: 5px 0 0 0; color: #94a3b8;'>Daily Performance Digest - " . date('l, d M Y') . "</p>
            </div>
            
            <div style='padding: 30px;'>
                <h3 style='color: #1e293b; margin-top: 0;'>Hello Admin,</h3>
                <p style='color: #475569;'>Here is a snapshot of today's business performance:</p>
                
                <table style='width: 100%; border-collapse: collapse; margin-top: 20px;'>
                    <tr>
                        <td style='padding: 15px; background: #f1f5f9; border-radius: 8px 0 0 8px; width: 50%; border-right: 2px solid #fff;'>
                            <span style='display: block; color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;'>New Leads Added</span>
                            <strong style='display: block; font-size: 28px; color: #0f172a;'>$new_leads</strong>
                        </td>
                        <td style='padding: 15px; background: #ecfdf5; border-radius: 0 8px 8px 0; width: 50%;'>
                            <span style='display: block; color: #059669; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;'>Files Disbursed</span>
                            <strong style='display: block; font-size: 28px; color: #065f46;'>$disbursed_cnt</strong>
                        </td>
                    </tr>
                </table>
                
                <div style='margin-top: 15px; padding: 20px; background: #eef2ff; border-radius: 8px; text-align: center;'>
                    <span style='display: block; color: #4338ca; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;'>Total Loan Value Disbursed</span>
                    <strong style='font-size: 36px; color: #3730a3;'>₹$val_formatted</strong>
                </div>
                
                <div style='margin-top: 25px; padding: 15px; border-left: 4px solid #ef4444; background: #fef2f2;'>
                    <strong style='color: #b91c1c;'>⚠️ Attention Required</strong>
                    <p style='margin: 5px 0 0 0; color: #7f1d1d; font-size: 14px;'>
                        There are currently <strong>$sla_violations</strong> leads that have breached the $sla_days-day SLA limit.
                    </p>
                </div>
                
                <div style='text-align: center; margin-top: 30px;'>
                    <a href='" . BASE_URL . "/reports/' style='display: inline-block; padding: 12px 25px; background: #4f46e5; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold;'>View Full MIS Report</a>
                </div>
            </div>
            
            <div style='background-color: #f1f5f9; padding: 15px; text-align: center; color: #94a3b8; font-size: 12px;'>
                This is an automated digest from $appName.
            </div>
        </div>
    </body>
    </html>
    ";

    if (send_system_email($admin_emails, $subject, $html_body)) {
        echo "Daily digest sent to admins.\n";
    } else {
        echo "Failed to send daily digest.\n";
    }
} else {
    echo "No admin emails found.\n";
}

if ($isManual) {
    session_start();
    $_SESSION['flash_success'] = "Daily Summary generated and emailed to Admins successfully.";
    header("Location: " . BASE_URL . "/dashboard.php");
    exit;
}
