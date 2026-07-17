<?php
// leads/upload_doc.php — Handles document uploads with watermarking
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';
require_login();

if (is_staff()) {
    flash('error', 'Access denied: Staff members cannot access or upload documents.');
    header("Location: " . BASE_URL . "/leads/index.php");
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') die('Invalid request');
if (!verify_csrf()) die('Invalid CSRF');

$leadId = (int)($_POST['lead_db_id'] ?? 0);
$docType = trim($_POST['document_type'] ?? 'other');

if (!$leadId || empty($_FILES['doc_file']['name'])) {
    flash('error', 'Please select a file and document type.');
    header("Location: " . BASE_URL . "/leads/index.php");
    exit;
}

$lead = db_fetch_one($conn, "SELECT lead_id FROM leads WHERE id=?", 'i', [$leadId]);
if (!$lead) die('Lead not found.');
$leadStrId = $lead['lead_id'];

$file = $_FILES['doc_file'];
$uploadDir = __DIR__ . '/../uploads/leads/' . $leadStrId . '/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
$allowed = ['jpg', 'jpeg', 'png', 'pdf'];
if (!in_array($ext, $allowed)) {
    flash('error', 'Only JPG, PNG, and PDF files are allowed.');
    header("Location: " . BASE_URL . "/leads/view.php?id=" . $leadStrId . "&tab=documents");
    exit;
}

$fileName = time() . '_' . rand(1000, 9999) . '.' . $ext;
$destPath = $uploadDir . $fileName;

if (move_uploaded_file($file['tmp_name'], $destPath)) {
    
    // Apply Watermark if it's an image
    if (in_array($ext, ['jpg', 'jpeg', 'png'])) {
        if ($ext === 'jpg' || $ext === 'jpeg') {
            $image = @imagecreatefromjpeg($destPath);
        } else {
            $image = @imagecreatefrompng($destPath);
        }
        
        if ($image) {
            $width = imagesx($image);
            $height = imagesy($image);
            
            $textColor = imagecolorallocatealpha($image, 255, 255, 255, 60);
            $text = "For LeadFlow Pro Finance Purpose Only - " . date('d/m/Y');
            
            $font = 5;
            $tw = imagefontwidth($font) * strlen($text);
            $th = imagefontheight($font);
            
            $x = $width - $tw - 10;
            $y = $height - $th - 10;
            
            imagestring($image, $font, $x, $y, $text, $textColor);
            imagestringup($image, $font, $width/2, $height/2 + ($tw/2), $text, $textColor);
            
            if ($ext === 'jpg' || $ext === 'jpeg') {
                imagejpeg($image, $destPath, 90);
            } else {
                imagepng($image, $destPath, 9);
            }
            imagedestroy($image);
        }
    }
    
    $relPath = 'uploads/leads/' . $leadStrId . '/' . $fileName;
    
    // Delete existing doc of this type
    db_query($conn, "DELETE FROM lead_documents WHERE lead_id=? AND document_type=?", 'is', [$leadId, $docType]);
    
    // Insert new
    $stmt = $conn->prepare("INSERT INTO lead_documents (lead_id, document_type, file_path) VALUES (?, ?, ?)");
    $stmt->bind_param('iss', $leadId, $docType, $relPath);
    $stmt->execute();
    
    log_lead_action($conn, $leadId, 'Document Uploaded', "Uploaded {$docType}", current_user_id());
    flash('success', 'Document uploaded successfully.');
} else {
    flash('error', 'Failed to upload document.');
}

header("Location: " . BASE_URL . "/leads/view.php?id=" . urlencode($leadStrId) . "&tab=documents");
exit;
