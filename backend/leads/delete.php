<?php
// leads/delete.php — Delete a Lead
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';

if (!is_admin()) {
    flash('error', 'Only administrators can delete leads.');
    header('Location: ' . BASE_URL . '/leads/index.php');
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verify_csrf()) { die('Invalid CSRF token'); }

    $leadIdParam = $_POST['id'] ?? '';
    
    $lead = db_fetch_one($conn, "SELECT id, lead_id FROM leads WHERE lead_id = ?", 's', [$leadIdParam]);
    
    if (!$lead) {
        flash('error', 'Lead not found.');
    } else {
        // Because of ON DELETE CASCADE in the schema, this will also delete
        // associated follow-ups, logs, and commissions.
        $stmt = $conn->prepare("DELETE FROM leads WHERE id = ?");
        $stmt->bind_param('i', $lead['id']);
        
        if ($stmt->execute()) {
            flash('success', "Lead {$lead['lead_id']} has been deleted.");
        } else {
            flash('error', 'Database error: ' . $conn->error);
        }
    }
}

header('Location: ' . BASE_URL . '/leads/index.php');
exit;
