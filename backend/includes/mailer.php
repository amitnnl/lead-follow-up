<?php
// includes/mailer.php — Global SMTP Mailer utility using PHPMailer
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/../vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

/**
 * Send an HTML email via the globally configured SMTP server.
 *
 * @param string|array $to Email address(es) to send to.
 * @param string $subject The subject line.
 * @param string $html_body The HTML email body.
 * @param array $attachments Optional array of file paths to attach.
 * @return bool True on success, false on failure.
 */
function send_system_email($to, string $subject, string $html_body, array $attachments = []): bool {
    // 1. Fetch settings from DB
    $host = get_setting('smtp_host', '');
    $port = get_setting('smtp_port', '587');
    $user = get_setting('smtp_user', '');
    $pass = get_setting('smtp_pass', '');
    $app_name = get_setting('app_name', 'LeadFlow Pro');
    
    $mail = new PHPMailer(true);
    
    try {
        // Only use SMTP if host is provided, otherwise fallback to local PHP mail()
        if (!empty($host)) {
            $mail->isSMTP();
            $mail->Host       = $host;
            $mail->SMTPAuth   = !empty($user);
            if ($mail->SMTPAuth) {
                $mail->Username   = $user;
                $mail->Password   = $pass;
                $mail->SMTPSecure = ($port == 465) ? PHPMailer::ENCRYPTION_SMTPS : PHPMailer::ENCRYPTION_STARTTLS;
            }
            $mail->Port       = $port;
        }

        // Recipients
        $fromEmail = !empty($user) ? $user : 'noreply@' . ($_SERVER['HTTP_HOST'] ?? 'localhost');
        $mail->setFrom($fromEmail, $app_name);
        
        if (is_array($to)) {
            foreach ($to as $address) {
                $mail->addAddress($address);
            }
        } else {
            $mail->addAddress($to);
        }

        // Attachments
        foreach ($attachments as $filePath) {
            if (file_exists($filePath)) {
                $mail->addAttachment($filePath);
            }
        }

        // Content
        $mail->isHTML(true);
        $mail->Subject = $subject;
        
        // Wrap the raw HTML body in a standardized branding wrapper if needed, 
        // or just send the provided HTML.
        $mail->Body    = $html_body;
        $mail->AltBody = strip_tags(str_replace(['<br>', '<br/>', '</p>'], "\n", $html_body));

        return $mail->send();
    } catch (Exception $e) {
        error_log("Mailer Error: {$mail->ErrorInfo}");
        return false;
    }
}
