<?php
// leads/upload_doc.php — Upload document endpoint
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';

require_login();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: ' . BASE_URL . '/dashboard.php');
    exit;
}

if (!verify_csrf()) {
    die('Invalid CSRF token');
}

$leadDbId = (int)($_POST['lead_db_id'] ?? 0);
$docType  = trim($_POST['document_type'] ?? '');

$lead = db_fetch_one($conn, "SELECT id, lead_id FROM leads WHERE id = ?", 'i', [$leadDbId]);
if (!$lead) {
    flash('error', 'Lead not found.');
    header('Location: ' . BASE_URL . '/leads/index.php');
    exit;
}

$allowedTypes = ['aadhaar','pan','bank_statement','rc','insurance','vehicle_image','other'];
if (!in_array($docType, $allowedTypes)) {
    flash('error', 'Invalid document type.');
    header('Location: ' . BASE_URL . '/leads/view.php?id=' . urlencode($lead['lead_id']));
    exit;
}

if (!isset($_FILES['doc_file']) || $_FILES['doc_file']['error'] !== UPLOAD_ERR_OK) {
    flash('error', 'No file was uploaded or file upload error occurred.');
    header('Location: ' . BASE_URL . '/leads/view.php?id=' . urlencode($lead['lead_id']));
    exit;
}

$fileSize = $_FILES['doc_file']['size'];
$fileTmp  = $_FILES['doc_file']['tmp_name'];
$fileType = $_FILES['doc_file']['type'];

// Validate File Size (Max 5MB)
if ($fileSize > 5 * 1024 * 1024) {
    flash('error', 'File size exceeds maximum limit of 5MB.');
    header('Location: ' . BASE_URL . '/leads/view.php?id=' . urlencode($lead['lead_id']));
    exit;
}

// Validate Mime Types
$allowedMimes = [
    'image/jpeg'      => 'jpg',
    'image/jpg'       => 'jpg',
    'image/png'       => 'png',
    'image/webp'      => 'webp',
    'application/pdf' => 'pdf'
];

$finfo = finfo_open(FILEINFO_MIME_TYPE);
$realMime = finfo_file($finfo, $fileTmp);
finfo_close($finfo);

if (!array_key_exists($realMime, $allowedMimes)) {
    flash('error', 'Invalid file type. Only JPEG, PNG, WEBP, and PDF documents are allowed.');
    header('Location: ' . BASE_URL . '/leads/view.php?id=' . urlencode($lead['lead_id']));
    exit;
}

$ext = $allowedMimes[$realMime];

// Generate unique secure filename
$safeLeadId = preg_replace('/[^A-Za-z0-9\-]/', '_', $lead['lead_id']);
$newFilename = $safeLeadId . '_' . $docType . '_' . bin2hex(random_bytes(8)) . '.' . $ext;

$uploadDir = __DIR__ . '/../uploads/leads';
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

$targetPath = $uploadDir . '/' . $newFilename;

if (move_uploaded_file($fileTmp, $targetPath)) {
    $dbPath = 'uploads/leads/' . $newFilename;
    
    // Check if document of this type already exists for this lead
    $existing = db_fetch_one($conn, 
        "SELECT id, file_path FROM lead_documents WHERE lead_id = ? AND document_type = ?", 
        'is', [$leadDbId, $docType]
    );
    
    if ($existing) {
        // Delete old file
        $oldPath = __DIR__ . '/../' . $existing['file_path'];
        if (file_exists($oldPath)) {
            @unlink($oldPath);
        }
        
        // Update record (resetting status to pending on new upload)
        $stmt = $conn->prepare("
            UPDATE lead_documents 
            SET file_path = ?, verification_status = 'pending', verification_notes = NULL, uploaded_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ");
        $stmt->bind_param('si', $dbPath, $existing['id']);
        $stmt->execute();
    } else {
        // Insert new record
        $stmt = $conn->prepare("
            INSERT INTO lead_documents (lead_id, document_type, file_path, verification_status)
            VALUES (?, ?, ?, 'pending')
        ");
        $stmt->bind_param('iss', $leadDbId, $docType, $dbPath);
        $stmt->execute();
    }
    
    // Log action
    log_lead_action($conn, $leadDbId, 'Document Uploaded', "Uploaded " . ucfirst(str_replace('_', ' ', $docType)) . " document.", current_user_id());
    flash('success', ucfirst(str_replace('_', ' ', $docType)) . ' document uploaded successfully.');
} else {
    flash('error', 'Failed to save uploaded file. Please check folder write permissions.');
}

header('Location: ' . BASE_URL . '/leads/view.php?id=' . urlencode($lead['lead_id']));
exit;
