<?php
// leads/verify_doc.php — Verify document endpoint
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';

require_role('admin', 'staff');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: ' . BASE_URL . '/dashboard.php');
    exit;
}

if (!verify_csrf()) {
    die('Invalid CSRF token');
}

$docId  = (int)($_POST['doc_id'] ?? 0);
$status = trim($_POST['verification_status'] ?? '');
$notes  = trim($_POST['verification_notes'] ?? '');

$allowedStatuses = ['pending', 'verified', 'rejected'];
if (!in_array($status, $allowedStatuses)) {
    flash('error', 'Invalid verification status.');
    header('Location: ' . BASE_URL . '/leads/index.php');
    exit;
}

// Fetch the document and associated lead
$doc = db_fetch_one($conn, "
    SELECT d.*, l.lead_id 
    FROM lead_documents d
    JOIN leads l ON d.lead_id = l.id
    WHERE d.id = ?
", 'i', [$docId]);

if (!$doc) {
    flash('error', 'Document not found.');
    header('Location: ' . BASE_URL . '/leads/index.php');
    exit;
}

// Update the verification details
$stmt = $conn->prepare("
    UPDATE lead_documents 
    SET verification_status = ?, verification_notes = ? 
    WHERE id = ?
");
$stmt->bind_param('ssi', $status, $notes, $docId);

if ($stmt->execute()) {
    $statusText = ucfirst($status);
    log_lead_action($conn, $doc['lead_id'], 'Document Verified', 
        "Marked " . ucfirst(str_replace('_', ' ', $doc['document_type'])) . " as {$statusText}. Notes: " . ($notes ?: 'None'), 
        current_user_id()
    );
    flash('success', 'Document verification status updated successfully.');
} else {
    flash('error', 'Database error: ' . $conn->error);
}

header('Location: ' . BASE_URL . '/leads/view.php?id=' . urlencode($doc['lead_id']));
exit;
