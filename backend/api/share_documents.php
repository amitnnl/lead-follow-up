<?php
/**
 * api/share_documents.php
 * Endpoint to merge selected documents into a PDF and send via Email or return a WhatsApp link.
 */

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (empty($origin) || strpos($origin, 'http://localhost') === 0 || strpos($origin, 'http://127.0.0.1') === 0) {
    header("Access-Control-Allow-Origin: " . ($origin ?: 'http://localhost:5173'));
}
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../vendor/autoload.php';

use setasign\Fpdi\Fpdi;
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

if (!is_logged_in()) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
if (empty($input)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid request']);
    exit;
}

$lead_id = intval($input['lead_id'] ?? 0);
$doc_ids = $input['document_ids'] ?? [];
$channel = $input['channel'] ?? 'email'; // email or whatsapp
$recipient = trim($input['recipient'] ?? '');
$message = trim($input['message'] ?? '');

if (!$lead_id || empty($doc_ids) || empty($recipient)) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required fields (lead_id, document_ids, recipient)']);
    exit;
}

require_once __DIR__ . '/../includes/pdf_generator.php';

$pdfResult = generate_documents_pdf($conn, $lead_id, $doc_ids);

if (!$pdfResult['success']) {
    http_response_code(400);
    echo json_encode(['error' => $pdfResult['error']]);
    exit;
}

$output_path = $pdfResult['output_path'];
$output_filename = $pdfResult['output_filename'];

if ($channel === 'email') {
    // Send via email
    $sys_settings = [];
    $res = $conn->query("SELECT setting_key, setting_value FROM system_settings");
    while ($row = $res->fetch_assoc()) $sys_settings[$row['setting_key']] = $row['setting_value'];

    $mail = new PHPMailer(true);
    try {
        if (!empty($sys_settings['smtp_host'])) {
            $mail->isSMTP();
            $mail->Host       = $sys_settings['smtp_host'];
            $mail->SMTPAuth   = true;
            $mail->Username   = $sys_settings['smtp_user'];
            $mail->Password   = $sys_settings['smtp_pass'];
            $mail->SMTPSecure = $sys_settings['smtp_secure'] ?: PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port       = $sys_settings['smtp_port'] ?: 587;
        }

        $mail->setFrom($sys_settings['support_email'] ?? 'no-reply@example.com', $sys_settings['company_name'] ?? 'LeadFlow Pro');
        $mail->addAddress($recipient);
        
        $mail->Subject = 'Documents for Lead #' . $lead_id;
        $mail->Body    = $message ?: "Please find the attached documents for Lead #$lead_id.";
        $mail->addAttachment($output_path, 'Lead_Documents.pdf');

        $mail->send();
        echo json_encode(['success' => true, 'message' => 'Email sent successfully.']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => "Message could not be sent. Mailer Error: {$mail->ErrorInfo}"]);
    }
} else if ($channel === 'whatsapp') {
    // Return a URL to the file
    $scheme = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http");
    $host = $_SERVER['HTTP_HOST'];
    // Assuming backend is hosted in a standard way
    $path = dirname($_SERVER['PHP_SELF']);
    // Since this file is in api/, uploads is at ../uploads
    // For URL construction, it depends on web server config. Usually:
    // /api/share_documents.php -> /uploads/exports/...
    // Let's strip /api from path
    $base_path = str_replace('/api', '', $path);
    $public_url = rtrim($scheme . "://" . $host . $base_path, '/') . "/uploads/exports/" . $output_filename;
    
    echo json_encode(['success' => true, 'url' => $public_url]);
} else {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid channel']);
}
