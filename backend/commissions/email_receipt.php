<?php
// commissions/email_receipt.php — Endpoint to email commission receipt
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/mailer.php';

require_login();
header('Content-Type: application/json');

$comm_id = (int)($_GET['id'] ?? 0);

if (!$comm_id) {
    echo json_encode(['success' => false, 'error' => 'Invalid commission ID']);
    exit;
}

$c = db_fetch_one($conn, "
    SELECT c.*, l.lead_id as lead_str_id, l.customer_name,
           a.name as agent_name, a.email as agent_email
    FROM commissions c
    JOIN leads l ON c.lead_id = l.id
    LEFT JOIN agents a ON c.agent_id = a.id
    WHERE c.id = ?
", 'i', [$comm_id]);

if (!$c) {
    echo json_encode(['success' => false, 'error' => 'Commission record not found']);
    exit;
}

if (empty($c['agent_email'])) {
    echo json_encode(['success' => false, 'error' => 'Agent does not have an email address on file']);
    exit;
}

$agent_email = $c['agent_email'];
$agent_name = $c['agent_name'] ?: 'Agent';
$amount = number_format($c['amount'], 2);
$date = date('d M Y', strtotime($c['created_at']));
$lead_str = $c['lead_str_id'];
$customer = $c['customer_name'];
$ref = $c['reference_number'] ?: 'N/A';
$mode = ucfirst($c['payment_mode'] ?: 'Bank Transfer');
$appName = get_setting('app_name', 'LeadFlow Pro');

$subject = "Commission Receipt - $appName";

$html_body = "
<div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;'>
    <div style='background-color: #4f46e5; color: #fff; padding: 20px; text-align: center;'>
        <h2 style='margin: 0; font-size: 24px;'>$appName</h2>
        <p style='margin: 5px 0 0 0; opacity: 0.8;'>Payment Receipt</p>
    </div>
    <div style='padding: 30px; background-color: #fff;'>
        <p style='font-size: 16px; color: #334155;'>Hello <strong>$agent_name</strong>,</p>
        <p style='font-size: 16px; color: #334155;'>We have processed your commission payout for lead <strong>$lead_str ($customer)</strong>.</p>
        
        <div style='background-color: #f8fafc; border-left: 4px solid #4f46e5; padding: 15px; margin: 25px 0; border-radius: 4px;'>
            <h3 style='margin: 0 0 10px 0; color: #1e293b; font-size: 28px;'>₹$amount</h3>
            <p style='margin: 0; color: #64748b; font-size: 14px;'>Paid on $date via $mode</p>
            <p style='margin: 5px 0 0 0; color: #64748b; font-size: 14px;'>Reference: <strong>$ref</strong></p>
        </div>
        
        <p style='font-size: 14px; color: #64748b; margin-top: 30px;'>Thank you for your excellent work!</p>
    </div>
    <div style='background-color: #f1f5f9; padding: 15px; text-align: center; color: #94a3b8; font-size: 12px;'>
        This is an automated email from $appName. Please do not reply directly to this email.
    </div>
</div>
";

if (send_system_email($agent_email, $subject, $html_body)) {
    echo json_encode(['success' => true, 'email' => $agent_email]);
} else {
    echo json_encode(['success' => false, 'error' => 'Failed to send email. Check SMTP settings.']);
}
