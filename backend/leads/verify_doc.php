<?php
// leads/verify_doc.php — Handles document verification
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';
require_role('admin');

if (is_staff()) {
    flash('error', 'Access denied: Staff members cannot access or verify documents.');
    header("Location: " . BASE_URL . "/leads/index.php");
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') die('Invalid request');
if (!verify_csrf()) die('Invalid CSRF');

$leadId = (int)($_POST['lead_db_id'] ?? 0);
$docId = (int)($_POST['document_id'] ?? 0);
$status = $_POST['verification_status'] ?? 'pending';
$notes = trim($_POST['verification_notes'] ?? '');

if (!$leadId || !$docId) {
    flash('error', 'Invalid request parameters.');
    header("Location: " . BASE_URL . "/leads/index.php");
    exit;
}

$lead = db_fetch_one($conn, "SELECT lead_id FROM leads WHERE id=?", 'i', [$leadId]);
if (!$lead) die('Lead not found.');

$stmt = $conn->prepare("UPDATE lead_documents SET verification_status=?, verification_notes=? WHERE id=? AND lead_id=?");
$stmt->bind_param('ssii', $status, $notes, $docId, $leadId);

if ($stmt->execute()) {
    log_lead_action($conn, $leadId, 'Document Verified', "Status set to: " . ucfirst($status), current_user_id());
    flash('success', 'Document verification status updated.');
} else {
    flash('error', 'Failed to update verification status.');
}

header("Location: " . BASE_URL . "/leads/view.php?id=" . urlencode($lead['lead_id']) . "&tab=documents");
exit;
