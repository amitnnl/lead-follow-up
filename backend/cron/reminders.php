<?php
// cron/reminders.php — Automated Follow-up Reminder Script
// This script is meant to be run via a Server Cron Job daily at 8:00 AM.
require_once __DIR__ . '/../includes/db.php';

// Prevent direct browser access unless a secret key is provided (for manual testing via the dashboard)
$secret = getenv('CRON_SECRET') ?: get_setting('cron_secret', 'dsa_cron_secret_77');
$isCli = (php_sapi_name() === 'cli');
$isManual = (isset($_GET['key']) && $_GET['key'] === $secret);

if (!$isCli && !$isManual) {
    http_response_code(403);
    die("Forbidden");
}

echo "Starting Automated Follow-up Reminders...\n";

// 1. Get all executives who have overdue or today's follow-ups
$executives = db_fetch_all($conn, "
    SELECT ex.id, ex.name, ex.mobile, u.email as user_email
    FROM executives ex
    LEFT JOIN users u ON ex.user_id = u.id
    WHERE ex.is_active = 1
");

$totalEmailsSent = 0;

foreach ($executives as $ex) {
    // Find overdue and today's follow-ups for this executive
    $followups = db_fetch_all($conn, "
        SELECT lf.id, l.lead_id, l.customer_name, l.customer_mobile, lf.next_followup_date, lf.remarks
        FROM lead_followups lf
        JOIN leads l ON lf.lead_id = l.id
        WHERE l.executive_id = ?
          AND l.status NOT IN ('disbursed', 'rejected')
          AND lf.next_followup_date <= CURDATE()
        ORDER BY lf.next_followup_date ASC
    ", 'i', [$ex['id']]);

    if (empty($followups)) {
        continue;
    }

    $overdueCount = 0;
    $todayCount = 0;
    $htmlList = "";

    foreach ($followups as $fu) {
        $isOverdue = ($fu['next_followup_date'] < date('Y-m-d'));
        if ($isOverdue) $overdueCount++; else $todayCount++;
        
        $status = $isOverdue ? "<span style='color:red;'>[OVERDUE]</span>" : "<span style='color:orange;'>[TODAY]</span>";
        
        $htmlList .= "
            <li style='margin-bottom: 10px; padding: 10px; border: 1px solid #ddd; background: #fafafa;'>
                <strong>$status Lead {$fu['lead_id']} - {$fu['customer_name']}</strong><br>
                📞 <a href='tel:{$fu['customer_mobile']}'>{$fu['customer_mobile']}</a><br>
                <em>Last Remark:</em> {$fu['remarks']}
            </li>
        ";
    }

    // Compose Email
    $to = $ex['user_email'] ?: '';
    if (!$to) {
        echo "Skipping Executive ID {$ex['id']} ({$ex['name']}) - No valid email address.\n";
        continue;
    }

    $subject = "Your Daily Follow-ups: $todayCount Today, $overdueCount Overdue";
    
    $message = "
    <html>
    <head>
      <title>Daily Follow-up Reminders</title>
    </head>
    <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
      <h2>Hello {$ex['name']},</h2>
      <p>Here is your follow-up summary for today (" . date('d M Y') . "):</p>
      
      <div style='display: flex; gap: 20px; margin-bottom: 20px;'>
          <div style='padding: 15px; background: #fff3cd; border: 1px solid #ffeeba;'>
              <strong style='font-size: 1.2rem; color: #856404;'>$todayCount</strong><br>Scheduled Today
          </div>
          <div style='padding: 15px; background: #f8d7da; border: 1px solid #f5c6cb;'>
              <strong style='font-size: 1.2rem; color: #721c24;'>$overdueCount</strong><br>Overdue
          </div>
      </div>
      
      <h3>Pending Calls:</h3>
      <ul style='list-style-type: none; padding-left: 0;'>
          $htmlList
      </ul>
      
      <p style='margin-top: 30px; font-size: 0.9em; color: #666;'>
        Please log into the <a href='" . BASE_URL . "'>DSA Portal</a> to update these leads.
      </p>
    </body>
    </html>
    ";

    // Headers for HTML email
    $headers = "MIME-Version: 1.0" . "\r\n";
    $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
    $headers .= "From: LeadFlow System <noreply@" . ($_SERVER['HTTP_HOST'] ?? 'localhost') . ">" . "\r\n";

    // Send the email (using standard PHP mail, standard on cPanel)
    if (mail($to, $subject, $message, $headers)) {
        echo "Sent reminder to {$ex['name']} ($to)\n";
        $totalEmailsSent++;
    } else {
        echo "Failed to send to {$ex['name']} ($to)\n";
    }
}

echo "\nFinished! Total emails sent: $totalEmailsSent\n";

if ($isManual) {
    // If called manually from the browser, redirect back with a success message
    session_start();
    $_SESSION['flash_success'] = "Automated reminders triggered successfully. Sent $totalEmailsSent emails.";
    header("Location: " . BASE_URL . "/followups/index.php");
    exit;
}
