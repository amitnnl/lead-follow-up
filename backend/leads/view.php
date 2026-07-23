<?php
// Prevent browser caching
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");

// leads/view.php — Lead Detail View
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';

$leadIdParam = $_GET['id'] ?? '';
$lead = db_fetch_one($conn, "
    SELECT l.*,
           a.name as agent_name, a.mobile as agent_mobile,
           f.name as financer_name, f.dsa_code as financer_dsa_code,
           d.name as dealer_name,
           ex.name as executive_name, ex.mobile as executive_mobile
    FROM leads l
    LEFT JOIN agents a      ON l.agent_id = a.id
    LEFT JOIN financers f   ON l.financer_id = f.id
    LEFT JOIN dealers d     ON l.dealer_id = d.id
    LEFT JOIN executives ex ON l.executive_id = ex.id
    WHERE l.lead_id = ?
", 's', [$leadIdParam]);

if (!$lead) {
    flash('error', 'Lead not found.');
    header('Location: ' . BASE_URL . '/leads/index.php');
    exit;
}

// Security: Prevent executives from viewing leads they are not assigned to
if (is_executive() && (int)$lead['executive_id'] !== (int)$_SESSION['user_id']) {
    flash('error', 'Permission denied. This lead is not assigned to you.');
    header('Location: ' . BASE_URL . '/leads/index.php');
    exit;
}

// Security: Prevent agents (DSA) from viewing leads they don't own
if (is_agent()) {
    $agRow = db_fetch_one($conn, "SELECT id FROM agents WHERE user_id = ?", 'i', [current_user_id()]);
    $agId = $agRow['id'] ?? 0;
    if ((int)$lead['created_by'] !== current_user_id() && (int)$lead['agent_id'] !== $agId) {
        flash('error', 'Permission denied. You do not own this lead.');
        header('Location: ' . BASE_URL . '/leads/index.php');
        exit;
    }
}

// Security: Prevent channel agents from viewing leads they don't own
if (is_channel_agent()) {
    $cheRow = db_fetch_one($conn, "SELECT id FROM channel_executives WHERE user_id = ?", 'i', [current_user_id()]);
    $cheId = $cheRow['id'] ?? 0;
    if ((int)$lead['created_by'] !== current_user_id() && (int)$lead['channel_executive_id'] !== $cheId) {
        flash('error', 'Permission denied. You do not own this lead.');
        header('Location: ' . BASE_URL . '/leads/index.php');
        exit;
    }
}

$pageTitle      = 'Lead: ' . $lead['lead_id'];
$pageBreadcrumb = 'Leads / ' . $lead['lead_id'];

// Fetch lead documents (Restrict staff access)
if (is_staff()) {
    $documentsQuery = [];
    $docsMap = [];
} else {
    $documentsQuery = db_fetch_all($conn, "SELECT * FROM lead_documents WHERE lead_id = ?", 'i', [$lead['id']]);
    $docsMap = array_column($documentsQuery, null, 'document_type');
}

// Fetch commission splits details
$commission = db_fetch_one($conn, "SELECT * FROM commissions WHERE lead_id = ?", 'i', [$lead['id']]);
$agents = db_fetch_all($conn, "SELECT id, name FROM agents WHERE is_active=1 ORDER BY name");

$selectedCommissionAgentName = '';
if ($commission && !empty($commission['agent_id'])) {
    foreach ($agents as $a) {
        if ($a['id'] == $commission['agent_id']) {
            $selectedCommissionAgentName = $a['name'];
            break;
        }
    }
}
if (empty($selectedCommissionAgentName) && !empty($lead['agent_name'])) {
    $selectedCommissionAgentName = $lead['agent_name'];
}

// Fetch team notes
$notesList = db_fetch_all($conn, "
    SELECT n.*, u.name as user_name 
    FROM lead_notes n 
    JOIN users u ON n.user_id = u.id 
    WHERE n.lead_id = ? 
    ORDER BY n.created_at ASC
", 'i', [$lead['id']]);

// Handle add note
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'add_note') {
    if (!verify_csrf()) die('Invalid CSRF token');
    $noteText = trim($_POST['note_text'] ?? '');
    if ($noteText !== '') {
        db_query($conn, "INSERT INTO lead_notes (lead_id, user_id, note) VALUES (?, ?, ?)", 'iis', [
            $lead['id'],
            current_user_id(),
            $noteText
        ]);
        
        // Notify the executive if they didn't write the note
        if ($lead['executive_id']) {
            $execUser = db_fetch_one($conn, "SELECT user_id FROM executives WHERE id = ?", 'i', [$lead['executive_id']]);
            if ($execUser && $execUser['user_id'] && $execUser['user_id'] != current_user_id()) {
                add_notification($conn, $execUser['user_id'], "New note added to lead " . $lead['lead_id'], BASE_URL . "/leads/view.php?id=" . $lead['lead_id'] . "&tab=notes");
            }
        }

        flash('success', 'Note added successfully.');
    }
    header('Location: ' . BASE_URL . '/leads/view.php?id=' . urlencode($lead['lead_id']) . '&tab=notes');
    exit;
}

// Handle manage commission POST inside leads/view.php
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['manage_commission'])) {
    if (!verify_csrf()) die('Invalid CSRF token');
    $agentId   = get_or_create_agent_by_name($conn, $_POST['channel_name'] ?? '');
    $commAmt   = (float)($_POST['commission_amount'] ?? 0);
    
    // Split details
    $payout90Status = $_POST['payout_90_status'] ?? 'pending';
    $payout90Date   = $_POST['payout_90_date'] ?? null;
    $payout90Mode   = $_POST['payout_90_mode'] ?? null;
    $payout10Status = $_POST['payout_10_status'] ?? 'pending';
    $payout10Date   = $_POST['payout_10_date'] ?? null;
    $payout10Mode   = $_POST['payout_10_mode'] ?? null;
    $additionalPayout = (float)($_POST['additional_payout'] ?? 0);
    $notes     = trim($_POST['notes'] ?? '');
    
    // New Financial Fields
    $irrPercentage = isset($_POST['irr_percentage']) && $_POST['irr_percentage'] !== '' ? (float)$_POST['irr_percentage'] : null;
    $payoutPercentage = isset($_POST['payout_percentage']) && $_POST['payout_percentage'] !== '' ? (float)$_POST['payout_percentage'] : null;
    $grossPayout = (float)($_POST['gross_payout'] ?? 0);
    $tdsAmount = (float)($_POST['tds_amount'] ?? 0);
    $gstAmount = (float)($_POST['gst_amount'] ?? 0);
    $channelPaidAmount = (float)($_POST['channel_paid_amount'] ?? $commAmt); // fallback to commAmt if not provided
    
    // Server-side calculations
    $netPayout = $grossPayout - $tdsAmount - $gstAmount;
    $balancePayout = $netPayout - $channelPaidAmount;

    // Use channelPaidAmount as the base for 90/10 split if provided, otherwise commAmt
    if (isset($_POST['channel_paid_amount'])) {
        $commAmt = $channelPaidAmount;
    }
    
    $payout90Date = $payout90Date ?: null;
    $payout90Mode = $payout90Mode ?: null;
    $payout10Date = $payout10Date ?: null;
    $payout10Mode = $payout10Mode ?: null;

    $paidAmt = ($payout90Status === 'paid' ? $commAmt * 0.90 : 0.0) + ($payout10Status === 'paid' ? $commAmt * 0.10 : 0.0) + $additionalPayout;

    $payDate = null;
    $payMode = null;
    if ($payout10Status === 'paid') {
        $payDate = $payout10Date;
        $payMode = $payout10Mode;
    } elseif ($payout90Status === 'paid') {
        $payDate = $payout90Date;
        $payMode = $payout90Mode;
    }

    if ($commission) {
        $stmt = $conn->prepare("
            UPDATE commissions 
            SET agent_id=?, commission_amount=?, paid_amount=?, payment_date=?, payment_mode=?, notes=?,
                payout_90_status=?, payout_90_date=?, payout_90_mode=?,
                payout_10_status=?, payout_10_date=?, payout_10_mode=?,
                additional_payout=?, irr_percentage=?, payout_percentage=?, 
                gross_payout=?, tds_amount=?, gst_amount=?, net_payout=?, 
                channel_paid_amount=?, balance_payout=?
            WHERE id=?
        ");
        $stmt->bind_param(
            'iddsssssssssddddddddi',
            $agentId, $commAmt, $paidAmt, $payDate, $payMode, $notes,
            $payout90Status, $payout90Date, $payout90Mode,
            $payout10Status, $payout10Date, $payout10Mode,
            $additionalPayout, $irrPercentage, $payoutPercentage,
            $grossPayout, $tdsAmount, $gstAmount, $netPayout,
            $channelPaidAmount, $balancePayout, $commission['id']
        );
        $stmt->execute();
        log_lead_action($conn, $lead['id'], 'Commission Updated', "Gross: ₹" . number_format($grossPayout) . ", Agent Share: ₹" . number_format($commAmt) . ", Paid: ₹" . number_format($paidAmt), current_user_id());
        flash('success', 'Commission details updated successfully.');
    } else {
        $stmt = $conn->prepare("
            INSERT INTO commissions (
                lead_id, agent_id, commission_amount, paid_amount, payment_date, payment_mode, notes,
                payout_90_status, payout_90_date, payout_90_mode,
                payout_10_status, payout_10_date, payout_10_mode,
                additional_payout, irr_percentage, payout_percentage,
                gross_payout, tds_amount, gst_amount, net_payout,
                channel_paid_amount, balance_payout
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->bind_param(
            'iiddsssssssssdddddddd',
            $lead['id'], $agentId, $commAmt, $paidAmt, $payDate, $payMode, $notes,
            $payout90Status, $payout90Date, $payout90Mode,
            $payout10Status, $payout10Date, $payout10Mode,
            $additionalPayout, $irrPercentage, $payoutPercentage,
            $grossPayout, $tdsAmount, $gstAmount, $netPayout,
            $channelPaidAmount, $balancePayout
        );
        $stmt->execute();
        log_lead_action($conn, $lead['id'], 'Commission Recorded', "Total: ₹" . number_format($commAmt) . ", Paid: ₹" . number_format($paidAmt), current_user_id());
        flash('success', 'Commission details recorded successfully.');
    }
    
    header("Location: " . BASE_URL . "/leads/view.php?id=" . urlencode($lead['lead_id']));
    exit;
}

// Follow-ups
$followups = db_fetch_all($conn, "
    SELECT lf.*, u.name as done_by
    FROM lead_followups lf
    LEFT JOIN users u ON lf.created_by = u.id
    WHERE lf.lead_id = ?
    ORDER BY lf.followup_date ASC, lf.id ASC
", 'i', [$lead['id']]);

// Audit logs
$logs = db_fetch_all($conn, "
    SELECT ll.*, u.name as done_by
    FROM lead_logs ll
    LEFT JOIN users u ON ll.performed_by = u.id
    WHERE ll.lead_id = ?
    ORDER BY ll.created_at ASC
", 'i', [$lead['id']]);

// Handle new follow-up POST
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'delete_followup') {
    if (!verify_csrf()) die('Invalid CSRF');
    if (!is_admin() && !is_staff()) die('Unauthorized');
    
    $fuId = (int)$_POST['followup_id'];
    db_query($conn, "DELETE FROM lead_followups WHERE id=?", 'i', [$fuId]);
    flash('success', 'Follow-up deleted successfully.');
    header('Location: ' . BASE_URL . '/leads/view.php?id=' . $leadIdParam . '&tab=followups');
    exit;
}
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['add_followup'])) {
    if (!verify_csrf()) die('Invalid CSRF token');
    $remarks  = trim($_POST['remarks'] ?? '');
    $nextDate = $_POST['next_followup_date'] ?? null;
    $newStatus = $_POST['new_status'] ?? $lead['status'];
    
    if ($remarks) {
        $bank_name = '';
        $acc_num = '';
        $ifsc = '';
        $rc_status = '';
        $rc_number = '';
        $insurance_status = '';
        $insurance_number = '';
        $rto_status = '';
        
        // Validate BEFORE inserting follow-up or uploading docs to prevent partial saves
        if ($newStatus === 'disbursed') {
            $bank_name = trim($_POST['customer_bank_name'] ?? '');
            $acc_num   = trim($_POST['customer_account_number'] ?? '');
            $ifsc      = trim($_POST['customer_ifsc_code'] ?? '');
            $rc_status = $_POST['rc_status'] ?? $lead['rc_status'];
            $rc_number = trim($_POST['rc_number'] ?? '');
            $insurance_status = $_POST['insurance_status'] ?? $lead['insurance_status'];
            $insurance_number = trim($_POST['insurance_number'] ?? '');
            $rto_status = $_POST['rto_status'] ?? $lead['rto_status'];
            
            $temp_lead = array_merge($lead, [
                'customer_bank_name' => $bank_name,
                'customer_account_number' => $acc_num,
                'customer_ifsc_code' => $ifsc,
                'rc_status' => $rc_status,
                'insurance_status' => $insurance_status
            ]);
            
            $newly_uploaded = [];
            if (isset($_FILES['disburse_docs']['error']) && is_array($_FILES['disburse_docs']['error'])) {
                foreach ($_FILES['disburse_docs']['error'] as $docType => $error) {
                    if ($error === UPLOAD_ERR_OK) {
                        $newly_uploaded[] = $docType;
                    } elseif ($error !== UPLOAD_ERR_NO_FILE) {
                        flash('error', "File upload failed for " . strtoupper($docType) . " (Error code: $error). The file may be too large (PHP default limit is often 2MB).");
                        header("Location: " . BASE_URL . "/leads/view.php?id=" . urlencode($lead['lead_id']));
                        exit;
                    }
                }
            }
            $eligibility = can_disburse_lead($conn, $temp_lead, $newly_uploaded);
            if ($eligibility !== true) {
                flash('error', $eligibility);
                header("Location: " . BASE_URL . "/leads/view.php?id=" . urlencode($lead['lead_id']));
                exit;
            }
        }

        // Handle inline document uploads after eligibility check passes
        if (isset($_FILES['disburse_docs']) && $newStatus === 'disbursed') {
            $uploadDir = __DIR__ . '/../uploads/leads/';
            if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);
            foreach ($_FILES['disburse_docs']['tmp_name'] as $docType => $tmpName) {
                if ($tmpName && is_uploaded_file($tmpName)) {
                    $ext = strtolower(pathinfo($_FILES['disburse_docs']['name'][$docType], PATHINFO_EXTENSION));
                    $safeLeadId = preg_replace('/[^A-Za-z0-9\-]/', '_', $lead['lead_id']);
                    $newFileName = $safeLeadId . '_' . $docType . '_' . bin2hex(random_bytes(8)) . '.' . $ext;
                    if (move_uploaded_file($tmpName, $uploadDir . $newFileName)) {
                        $dbPath = 'uploads/leads/' . $newFileName;
                        db_query($conn, "INSERT INTO lead_documents (lead_id, document_type, file_path) VALUES (?, ?, ?)", 'iss', [$lead['id'], $docType, $dbPath]);
                    }
                }
            }
        }

        db_query($conn, "
            INSERT INTO lead_followups (lead_id, followup_date, next_followup_date, remarks, status_changed_to, created_by)
            VALUES (?,CURDATE(),?,?,?,?)
        ", 'isssi', [$lead['id'], $nextDate ?: null, $remarks, $newStatus, current_user_id()]);

        // Capture bank and document fields if provided
        $updateSql = "UPDATE leads SET status=?, status_date=CURDATE()";
        $updateParams = [$newStatus];
        $updateTypes = 's';
        
        if ($newStatus === 'disbursed') {
            $updateSql .= ", customer_bank_name=?, customer_account_number=?, customer_ifsc_code=?, rc_status=?, rc_number=?, insurance_status=?, insurance_number=?, rto_status=?";
            $updateParams = array_merge($updateParams, [$bank_name, $acc_num, $ifsc, $rc_status, $rc_number, $insurance_status, $insurance_number, $rto_status]);
            $updateTypes .= 'ssssssss';
        }
        
        $updateSql .= " WHERE id=?";
        $updateParams[] = $lead['id'];
        $updateTypes .= 'i';
        
        db_query($conn, $updateSql, $updateTypes, $updateParams);

        if ($newStatus !== $lead['status']) {
            log_lead_action($conn, $lead['id'], 'Status Changed', "From {$lead['status']} to {$newStatus}", current_user_id());
            
            if ($newStatus === 'disbursed' && $lead['status'] !== 'disbursed') {
                require_once __DIR__ . '/../includes/notifications.php';
                notify_customer_disbursed($conn, $lead['id'], $lead['customer_name'], $lead['customer_mobile'], $lead['lead_id']);
            }
            
            $lead['status'] = $newStatus;
        }

        // Auto-Release Logic: 10% Commission
        if (
            ($rc_status === 'received' || $rc_status === 'not_applicable') && 
            ($insurance_status === 'received' || $insurance_status === 'not_applicable') && 
            ($rto_status === 'done' || $rto_status === 'not_applicable')
        ) {
            db_query($conn, "UPDATE commissions SET payout_10_status='eligible' WHERE lead_id=? AND payout_10_status='pending'", 'i', [$lead['id']]);
        }

        log_lead_action($conn, $lead['id'], 'Follow-up Added', $remarks, current_user_id());
        flash('success', 'Follow-up added successfully.');
        header("Location: " . BASE_URL . "/leads/view.php?id=" . urlencode($lead['lead_id']));
        exit;
    }
}

// Handle Banking Updates
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['update_banking'])) {
    if (!verify_csrf()) die('Invalid CSRF token');
    $receivedAmt = (float)($_POST['received_amount'] ?? 0);
    $receivedDate = $_POST['received_date'] ?: null;
    $notes = trim($_POST['banking_notes'] ?? '');

    db_query($conn, "
        INSERT INTO lead_banking (lead_id, received_amount, received_date, banking_notes)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
            received_amount=VALUES(received_amount), received_date=VALUES(received_date),
            banking_notes=VALUES(banking_notes)
    ", 'isds', [$lead['id'], $receivedAmt, $receivedDate, $notes]);
    
    flash('success', 'Banking details updated successfully.');
    header("Location: " . BASE_URL . "/leads/view.php?id=" . urlencode($lead['lead_id']) . "&tab=banking");
    exit;
}

// Handle Add Deduction
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['add_deduction'])) {
    if (!verify_csrf()) die('Invalid CSRF token');
    $desc = trim($_POST['description'] ?? '');
    $amt = (float)($_POST['amount'] ?? 0);
    if ($desc && $amt > 0) {
        db_query($conn, "INSERT INTO lead_deductions (lead_id, description, amount, created_by) VALUES (?, ?, ?, ?)", 'isdi', [$lead['id'], $desc, $amt, current_user_id()]);
        flash('success', 'Deduction added successfully.');
    } else {
        flash('error', 'Please provide a valid description and amount.');
    }
    header("Location: " . BASE_URL . "/leads/view.php?id=" . urlencode($lead['lead_id']) . "&tab=banking");
    exit;
}

// Handle Delete Deduction
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['delete_deduction'])) {
    if (!verify_csrf()) die('Invalid CSRF token');
    $deductionId = (int)$_POST['deduction_id'];
    db_query($conn, "DELETE FROM lead_deductions WHERE id = ? AND lead_id = ?", 'ii', [$deductionId, $lead['id']]);
    flash('success', 'Deduction removed.');
    header("Location: " . BASE_URL . "/leads/view.php?id=" . urlencode($lead['lead_id']) . "&tab=banking");
    exit;
}

// Handle Add Payout
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['add_payout'])) {
    if (!verify_csrf()) die('Invalid CSRF token');
    $payoutAmt = (float)($_POST['payout_amount'] ?? 0);
    $paymentDate = $_POST['payment_date'] ?: date('Y-m-d');
    $paymentMode = $_POST['payment_mode'] ?? 'bank_transfer';
    $refNum = trim($_POST['reference_number'] ?? '');
    $notes = trim($_POST['payout_notes'] ?? '');
    $payoutType = $_POST['payout_type'] ?? 'customer';
    $beneficiaryName = trim($_POST['beneficiary_name'] ?? '');

    // Validate that the payout amount does not exceed the remaining balance
    // Re-calculate the balance to be safe
    $banking = db_fetch_one($conn, "SELECT * FROM lead_banking WHERE lead_id = ?", 'i', [$lead['id']]);
    $transactions = db_fetch_all($conn, "SELECT amount FROM lead_transactions WHERE lead_id = ?", 'i', [$lead['id']]);
    $total_paid = array_sum(array_column($transactions, 'amount'));
    $received = (float)($banking['received_amount'] ?? 0);
    $lead_deductions_temp = db_fetch_all($conn, "SELECT amount FROM lead_deductions WHERE lead_id = ?", 'i', [$lead['id']]);
    $deductions = array_sum(array_column($lead_deductions_temp, 'amount'));
    $payable = $received - $deductions;
    $balance = $payable - $total_paid;

    if ($payoutAmt > 0 && $payoutAmt <= $balance + 0.01) { // 0.01 tolerance for float
        db_query($conn, "
            INSERT INTO lead_transactions (lead_id, amount, payment_date, payment_mode, reference_number, notes, payout_type, beneficiary_name, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ", 'idssssssi', [$lead['id'], $payoutAmt, $paymentDate, $paymentMode, $refNum, $notes, $payoutType, $beneficiaryName, current_user_id()]);
        
        flash('success', 'Payout transaction added successfully.');
    } elseif ($payoutAmt > $balance + 0.01) {
        flash('error', 'Payout amount exceeds the remaining balance.');
    } else {
        flash('error', 'Payout amount must be greater than zero.');
    }
    header("Location: " . BASE_URL . "/leads/view.php?id=" . urlencode($lead['lead_id']) . "&tab=banking");
    exit;
}

// Fetch Banking Data
$banking = db_fetch_one($conn, "SELECT * FROM lead_banking WHERE lead_id = ?", 'i', [$lead['id']]);
$transactions = db_fetch_all($conn, "SELECT t.*, u.name as created_by_name FROM lead_transactions t LEFT JOIN users u ON t.created_by = u.id WHERE t.lead_id = ? ORDER BY t.payment_date ASC, t.id ASC", 'i', [$lead['id']]);

$total_paid = array_sum(array_column($transactions, 'amount'));
$received = (float)($banking['received_amount'] ?? 0);
$lead_deductions = db_fetch_all($conn, "SELECT * FROM lead_deductions WHERE lead_id = ? ORDER BY created_at ASC", 'i', [$lead['id']]);
$deductions = array_sum(array_column($lead_deductions, 'amount'));
$payable = $received - $deductions;
$balance = $payable - $total_paid;

$headerActions = '
<div class="flex items-center gap-2">
    <a href="' . BASE_URL . '/leads/index.php"
       class="btn btn-secondary btn-sm">
       <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
       All Leads
    </a>'
. (is_admin() || is_staff() ? '
    <a href="' . BASE_URL . '/leads/edit.php?id=' . e($lead['lead_id']) . '"
       class="btn btn-primary btn-sm">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
        Edit Lead
    </a>' : '')
. '
</div>';

require_once __DIR__ . '/../includes/header.php';
?>

<?php
$stage = 1; // Created
if ($lead['executive_id']) $stage = 2; // Assigned
if ($lead['executive_id'] && count($followups) > 0) $stage = 3; // Follow-up Active

function stage_class($current, $target) {
    if ($current === $target) return 'bg-brand-600 text-white shadow-lg shadow-brand-500/20 border-transparent';
    if ($current > $target) return 'bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300 border-brand-200/50 font-semibold';
    return 'bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-900/40 dark:border-slate-800/80';
}
?>
<!-- Workflow Progress -->
<div class="flex items-center gap-2 md:gap-4 mb-6 card p-2 overflow-x-auto overflow-y-hidden">
    <div class="flex-1 min-w-[110px] text-center text-xs font-bold uppercase tracking-wider py-2.5 rounded-xl border transition-colors <?= stage_class($stage, 1) ?>">
        1. Created
    </div>
    <svg class="w-5 h-5 text-slate-300 dark:text-slate-700 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
    <div class="flex-1 min-w-[110px] text-center text-xs font-bold uppercase tracking-wider py-2.5 rounded-xl border transition-colors <?= stage_class($stage, 2) ?>">
        2. Assigned
    </div>
    <svg class="w-5 h-5 text-slate-300 dark:text-slate-700 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
    <div class="flex-1 min-w-[110px] text-center text-xs font-bold uppercase tracking-wider py-2.5 rounded-xl border transition-colors <?= stage_class($stage, 3) ?>">
        3. Follow-up
    </div>
</div>

<?php $activeTab = $_GET['tab'] ?? 'overview'; ?>
<div class="grid grid-cols-1 <?= ($activeTab === 'overview' || $activeTab === 'followups') ? 'lg:grid-cols-3' : 'lg:grid-cols-1' ?> gap-6">
    <!-- Left / Main Content -->
    <div class="<?= ($activeTab === 'overview' || $activeTab === 'followups') ? 'lg:col-span-2' : 'lg:col-span-1' ?> space-y-6">
        <!-- Header Card -->
        <div class="card p-6">
            <div class="flex items-start justify-between flex-wrap gap-4">
                <div>
                    <div class="flex items-center gap-3 mb-1.5 flex-wrap">
                        <span class="text-xl font-extrabold font-mono text-brand-600 dark:text-brand-400"><?= e($lead['lead_id']) ?></span>
                        <?= status_badge($lead['status']) ?>
                        <?= loan_type_badge($lead['loan_type']) ?>
                    </div>
                    <h2 class="text-2xl font-black text-slate-800 dark:text-white tracking-tight"><?= e($lead['customer_name']) ?></h2>
                    
                    <div class="flex items-center flex-wrap gap-4 mt-2.5 text-sm text-slate-500 dark:text-slate-400">
                        <a href="tel:<?= e($lead['customer_mobile']) ?>" class="flex items-center gap-1.5 hover:text-brand-500 transition-colors">
                            <svg class="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                            <?= e($lead['customer_mobile']) ?>
                        </a>
                        <?php if ($lead['customer_mobile2']): ?>
                        <a href="tel:<?= e($lead['customer_mobile2']) ?>" class="flex items-center gap-1.5 hover:text-brand-500 transition-colors">
                            <svg class="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                            <?= e($lead['customer_mobile2']) ?>
                        </a>
                        <?php endif; ?>
                        <a href="<?= whatsapp_link($lead['customer_mobile'], "Hello " . trim(explode(' ', $lead['customer_name'])[0]) . ", I am following up regarding your vehicle loan file ({$lead['lead_id']}).") ?>" target="_blank"
                           class="flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 font-bold transition-colors">
                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.717-1.458L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.03-5.115-2.903-6.99C16.26 1.876 13.784.843 11.15.842 5.712.842 1.29 5.26 1.285 10.7c-.002 1.716.446 3.393 1.3 4.89l-.995 3.636 3.73-.978c1.477.806 3.011 1.233 4.73 1.233z"/></svg>
                            WhatsApp
                        </a>
                    </div>
                    <?php if ($lead['customer_address']): ?>
                    <div class="text-sm text-slate-400 dark:text-slate-500 mt-2.5 flex items-center gap-1.5">
                        <svg class="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                        <span><?= e($lead['customer_address']) ?></span>
                    </div>
                    <?php endif; ?>
                </div>
                <div class="text-right">
                    <div class="text-xs font-bold text-slate-400 uppercase tracking-wider">Lead Date</div>
                    <div class="text-base font-extrabold text-slate-700 dark:text-slate-300 mt-1 font-mono">
                        <?= date('d M Y', strtotime($lead['lead_date'])) ?>
                    </div>
                </div>
            </div>
        </div>

        <!-- Tabs Navigation -->
        <div class="flex flex-wrap gap-2 mb-6">
            <?php
            $tabs = [
                'overview'  => ['icon' => '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>', 'label' => 'Overview'],
                'documents' => ['icon' => '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>', 'label' => 'Documents'],
                'followups' => ['icon' => '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>', 'label' => 'Follow-ups'],
                'notes'     => ['icon' => '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>', 'label' => 'Team Notes'],
            ];
            if ($lead['status'] === 'disbursed') {
                $tabs['banking']    = ['icon' => '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>', 'label' => 'Banking & Payouts'];
            }
            if (is_staff()) {
                unset($tabs['documents']);
            }
            foreach ($tabs as $key => $tab):
                $isActive = $activeTab === $key;
                $activeClass = $isActive ? 'bg-brand-600 text-white shadow-md shadow-brand-500/30' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800';
            ?>
            <a href="?id=<?= urlencode($lead['lead_id']) ?>&tab=<?= $key ?>" 
               class="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 <?= $activeClass ?>">
                <?= $tab['icon'] ?>
                <?= $tab['label'] ?>
            </a>
            <?php endforeach; ?>
        </div>

        <?php if ($activeTab === 'overview'): ?>
        <!-- Details Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Left Column -->
            <div class="space-y-6">
            <!-- Assignment -->
            <div class="card p-6">
                <div class="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800/40 pb-3">
                    <h3 class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <svg class="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                        Assignment
                    </h3>
                    <?php if (is_admin() || is_staff()): ?>
                    <a href="<?php echo BASE_URL; ?>/leads/assign.php?id=<?= urlencode($lead['lead_id']) ?>" class="btn btn-secondary btn-xs">Assign</a>
                    <?php endif; ?>
                </div>
                <dl class="space-y-3.5 text-sm">
                    <?php
                    $aFields = [];
                    if (!empty($lead['dealer_name'])) $aFields['Source: Dealer'] = $lead['dealer_name'];
                    if (!empty($lead['agent_name'])) $aFields['Source: Channel'] = $lead['agent_name'];
                    $aFields['Financer'] = $lead['financer_name'];
                    if (!empty($lead['financer_dsa_code'])) $aFields['DSA Code'] = $lead['financer_dsa_code'];
                    if (!empty($lead['financer_lead_number'])) $aFields['Financer Lead No.'] = $lead['financer_lead_number'];
                    $aFields['SFE/Executive'] = $lead['executive_name'];
                    foreach ($aFields as $label => $val): ?>
                    <div class="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/40 pb-2 last:border-b-0 last:pb-0">
                        <dt class="text-slate-400 dark:text-slate-500 font-medium"><?= $label ?></dt>
                        <dd class="font-semibold text-slate-800 dark:text-slate-200"><?= $val ? e($val) : '<span class="text-slate-300 dark:text-slate-700">—</span>' ?></dd>
                    </div>
                    <?php endforeach; ?>
                </dl>
            </div>

            <!-- Vehicle & Loan -->
            <div class="card p-6">
                <h3 class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800/40 pb-3">
                    <svg class="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"/></svg>
                    Vehicle & Loan
                </h3>
                <dl class="space-y-3.5 text-sm">
                    <?php
                    $vFields = [
                        'Vehicle'       => $lead['vehicle_make_model'],
                        'Year'          => $lead['year_of_manufacture'],
                        'Reg. Number'   => $lead['registration_number'],
                        'Loan Amount'   => $lead['loan_amount'] ? format_currency((float)$lead['loan_amount']) : null,
                    ];
                    foreach ($vFields as $label => $val):
                        if ($val): ?>
                    <div class="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/40 pb-2 last:border-b-0 last:pb-0">
                        <dt class="text-slate-400 dark:text-slate-500 font-medium"><?= $label ?></dt>
                        <dd class="font-semibold text-slate-800 dark:text-slate-200"><?= e($val) ?></dd>
                    </div>
                    <?php endif; endforeach; ?>
                </dl>
            </div>

            <!-- Client Bank Details -->
            <?php if ($lead['customer_bank_name'] || $lead['customer_account_number'] || $lead['customer_ifsc_code']): ?>
            <div class="card p-6">
                <h3 class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800/40 pb-3">
                    <svg class="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                    Client Bank Details
                </h3>
                <dl class="space-y-3.5 text-sm">
                    <div class="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/40 pb-2 last:border-b-0 last:pb-0">
                        <dt class="text-slate-400 dark:text-slate-500 font-medium">Bank Name</dt>
                        <dd class="font-semibold text-slate-800 dark:text-slate-200"><?= e($lead['customer_bank_name'] ?: '—') ?></dd>
                    </div>
                    <div class="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/40 pb-2 last:border-b-0 last:pb-0">
                        <dt class="text-slate-400 dark:text-slate-500 font-medium">Account No.</dt>
                        <dd class="font-semibold text-slate-800 dark:text-slate-200 font-mono"><?= e($lead['customer_account_number'] ?: '—') ?></dd>
                    </div>
                    <div class="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/40 pb-2 last:border-b-0 last:pb-0">
                        <dt class="text-slate-400 dark:text-slate-500 font-medium">IFSC Code</dt>
                        <dd class="font-semibold text-slate-800 dark:text-slate-200 font-mono"><?= e($lead['customer_ifsc_code'] ?: '—') ?></dd>
                    </div>
                </dl>
            </div>
            <?php endif; ?>

            <!-- Document Status -->
            <div class="card p-6">
                <h3 class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800/40 pb-3">
                    <svg class="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    Document Status
                </h3>
                <div class="space-y-3.5">
                    <?php
                    $docs = [
                        ['RC', $lead['rc_status'], $lead['rc_number']],
                        ['Insurance', $lead['insurance_status'], $lead['insurance_number']],
                        ['RTO', $lead['rto_status'], ''],
                    ];
                    foreach ($docs as [$label, $status, $number]):
                        $badgeCls = match($status) {
                            'received','done' => 'badge-emerald',
                            'not_applicable'  => 'badge-gray',
                            default           => 'badge-yellow',
                        };
                    ?>
                    <div class="flex flex-col border border-slate-100 dark:border-slate-800/40 rounded-xl px-4 py-3 text-sm">
                        <div class="flex items-center justify-between">
                            <span class="font-bold text-slate-700 dark:text-slate-300"><?= $label ?></span>
                            <span class="badge <?= $badgeCls ?>">
                                <?= ucfirst(str_replace('_',' ',$status)) ?>
                            </span>
                        </div>
                        <?php if ($number): ?>
                        <div class="mt-2 text-xs font-mono font-bold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60 px-2 py-1 rounded inline-block self-start border border-slate-100 dark:border-slate-800/40">
                            No: <?= e($number) ?>
                        </div>
                        <?php endif; ?>
                    </div>
                    <?php endforeach; ?>
                </div>
            </div>
            </div>
            <!-- Right Column -->
            <div class="space-y-6">
        <!-- Quick Actions -->
        <div class="card p-6">
            <h3 class="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4 border-b border-slate-100 dark:border-slate-800/40 pb-3">Quick Actions</h3>
            <div class="space-y-2.5">
                <?php if (is_admin() || is_staff()): ?>
                <a href="<?php echo BASE_URL; ?>/leads/assign.php?id=<?= e($lead['lead_id']) ?>"
                   class="flex items-center gap-3 w-full px-4 py-3 bg-brand-50 hover:bg-brand-100/80 text-brand-700 rounded-xl text-sm font-semibold transition-all duration-300 border border-brand-100/50 dark:bg-brand-950/20 dark:hover:bg-brand-950/40 dark:text-brand-300 dark:border-brand-900/30">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    Assign / Route Lead
                </a>
                <?php endif; ?>
                <a href="<?= whatsapp_url($lead['customer_mobile'], $lead['customer_name'], $lead['lead_id'], $lead['status']) ?>"
                   target="_blank"
                   class="flex items-center gap-3 w-full px-4 py-3 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-700 rounded-xl text-sm font-semibold transition-all duration-300 border border-emerald-100/50 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/30">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.717-1.458L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.03-5.115-2.903-6.99C16.26 1.876 13.784.843 11.15.842 5.712.842 1.29 5.26 1.285 10.7c-.002 1.716.446 3.393 1.3 4.89l-.995 3.636 3.73-.978c1.477.806 3.011 1.233 4.73 1.233z"/></svg>
                    WhatsApp Customer
                </a>
                <a href="tel:<?= e($lead['customer_mobile']) ?>"
                   class="flex items-center gap-3 w-full px-4 py-3 bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700 rounded-xl text-sm font-semibold transition-all duration-300 border border-indigo-100/50 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900/30">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                    Call Customer
                </a>
                <a href="<?php echo BASE_URL; ?>/leads/edit.php?id=<?= e($lead['lead_id']) ?>"
                   class="flex items-center gap-3 w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold transition-all duration-300 border border-slate-200/50 dark:bg-slate-900/30 dark:hover:bg-slate-900/60 dark:text-slate-300 dark:border-slate-800/40">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    Edit Lead Details
                </a>
                <?php if (is_admin()): ?>
                <form action="<?php echo BASE_URL; ?>/leads/delete.php" method="POST" class="w-full" hx-confirm="Are you sure you want to completely delete this lead? This cannot be undone.">
                    <?= csrf_field() ?>
                    <input type="hidden" name="id" value="<?= e($lead['lead_id']) ?>">
                    <button type="submit" class="flex items-center gap-3 w-full px-4 py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-sm font-semibold transition-all duration-300 border border-rose-100/50 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/30">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        Delete Lead
                    </button>
                </form>
                <?php endif; ?>
                <a href="javascript:window.print()"
                   class="flex items-center gap-3 w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold transition-all duration-300 border border-slate-200/50 dark:bg-slate-900/30 dark:hover:bg-slate-900/60 dark:text-slate-300 dark:border-slate-800/40">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                    Print / Save as PDF Sheet
                </a>
            </div>
        </div>

            </div>
        </div>
        <?php endif; // end overview ?>

        <?php if ($activeTab === 'commission'): ?>
        <!-- Payout & Commission Splits Panel -->
        <div class="card p-6">
            <div class="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800/40 pb-3">
                <h3 class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <svg class="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    Payout & Commission Splits
                </h3>
                <?php if (is_admin() || is_staff()): ?>
                <button onclick="openManageCommModal()" class="btn btn-secondary btn-xs font-bold flex items-center gap-1 cursor-pointer">
                    ⚙ Manage
                </button>
                <?php endif; ?>
            </div>
            
            <?php if ($commission): 
                $dueAmt = (float)$commission['commission_amount'] - (float)$commission['paid_amount'];
                $isRetentionEligible = ($lead['rc_status'] === 'received' && $lead['insurance_status'] === 'received' && $lead['rto_status'] === 'done');
            ?>
            <div class="space-y-4">
                <!-- Financial Breakdown -->
                <div class="bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-2xl border border-slate-100/60 dark:border-slate-800/30 space-y-4">
                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gross Payout</div>
                            <div class="text-sm font-extrabold text-slate-800 dark:text-white mt-0.5 font-mono"><?= format_currency((float)$commission['gross_payout']) ?></div>
                        </div>
                        <div>
                            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Net Payout</div>
                            <div class="text-sm font-extrabold text-brand-600 mt-0.5 font-mono"><?= format_currency((float)$commission['net_payout']) ?></div>
                        </div>
                        <div>
                            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TDS (5%)</div>
                            <div class="text-sm font-bold text-slate-600 dark:text-slate-400 mt-0.5 font-mono"><?= format_currency((float)$commission['tds_amount']) ?></div>
                        </div>
                        <div>
                            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">GST (18%)</div>
                            <div class="text-sm font-bold text-slate-600 dark:text-slate-400 mt-0.5 font-mono"><?= format_currency((float)$commission['gst_amount']) ?></div>
                        </div>
                    </div>
                    <div class="border-t border-slate-200/60 dark:border-slate-800/60 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Channel Paid</div>
                            <div class="text-sm font-extrabold text-slate-800 dark:text-white mt-0.5 font-mono"><?= format_currency((float)$commission['channel_paid_amount']) ?></div>
                        </div>
                        <div>
                            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Company Balance</div>
                            <div class="text-sm font-extrabold text-emerald-600 mt-0.5 font-mono"><?= format_currency((float)$commission['balance_payout']) ?></div>
                        </div>
                    </div>
                </div>
                
                <!-- Splits Flow -->
                <div class="space-y-3">
                    <!-- 90% Initial Split -->
                    <div class="border border-slate-100 dark:border-slate-800/40 rounded-xl px-4 py-3 text-sm flex flex-col justify-between">
                        <div class="flex items-center justify-between">
                            <div class="flex flex-col">
                                <span class="font-bold text-slate-750 dark:text-slate-300">Initial Payout (90%)</span>
                                <span class="text-xs text-slate-400 font-mono">₹<?= number_format($commission['commission_amount'] * 0.90, 2) ?></span>
                            </div>
                            <span class="badge <?= $commission['payout_90_status'] === 'paid' ? 'badge-emerald' : 'badge-yellow' ?>">
                                <?= ucfirst($commission['payout_90_status']) ?>
                            </span>
                        </div>
                        <?php if ($commission['payout_90_status'] === 'paid' && $commission['payout_90_date']): ?>
                        <div class="mt-2 text-[11px] text-slate-500 font-mono">
                            Paid: <?= date('d M Y', strtotime($commission['payout_90_date'])) ?> via <?= ucfirst(str_replace('_',' ',$commission['payout_90_mode'])) ?>
                        </div>
                        <?php endif; ?>
                    </div>
                    
                    <!-- 10% Retention Split -->
                    <div class="border border-slate-100 dark:border-slate-800/40 rounded-xl px-4 py-3 text-sm flex flex-col justify-between">
                        <div class="flex items-center justify-between">
                            <div class="flex flex-col">
                                <span class="font-bold text-slate-750 dark:text-slate-300">Retention Held (10%)</span>
                                <span class="text-xs text-slate-400 font-mono">₹<?= number_format($commission['commission_amount'] * 0.10, 2) ?></span>
                            </div>
                            <span class="badge <?= $commission['payout_10_status'] === 'paid' ? 'badge-emerald' : 'badge-gray' ?>">
                                <?= ucfirst($commission['payout_10_status']) ?>
                            </span>
                        </div>
                        <?php if ($commission['payout_10_status'] === 'paid' && $commission['payout_10_date']): ?>
                        <div class="mt-2 text-[11px] text-slate-500 font-mono">
                            Paid: <?= date('d M Y', strtotime($commission['payout_10_date'])) ?> via <?= ucfirst(str_replace('_',' ',$commission['payout_10_mode'])) ?>
                        </div>
                        <?php else: ?>
                        <div class="mt-2 flex items-center justify-between">
                            <?php if ($isRetentionEligible): ?>
                            <span class="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                                ✓ Eligible for Release
                            </span>
                            <?php else: ?>
                            <span class="text-[11px] text-amber-500 dark:text-amber-400 font-medium flex items-center gap-0.5" title="Requires RC, Insurance & RTO verification">
                                ⚠️ Held: Pending RC/Ins/RTO
                            </span>
                            <?php endif; ?>
                        </div>
                        <?php endif; ?>
                    </div>
                    
                    <!-- Additional Payouts -->
                    <?php if ($commission['additional_payout'] > 0): ?>
                    <div class="border border-slate-100 dark:border-slate-800/40 rounded-xl px-4 py-3 text-sm flex justify-between items-center">
                        <span class="font-bold text-slate-700 dark:text-slate-300">Additional Payouts</span>
                        <span class="font-bold font-mono text-slate-800 dark:text-slate-200"><?= format_currency((float)$commission['additional_payout']) ?></span>
                    </div>
                    <?php endif; ?>
                </div>
            </div>
            <?php else: ?>
            <div class="text-center py-6">
                <div class="text-xs font-semibold text-slate-400 italic">No commission split details recorded yet.</div>
                <?php if (is_admin() || is_staff()): ?>
                <button onclick="openManageCommModal()" class="btn btn-primary btn-sm mt-3 w-full cursor-pointer">
                    Record Commission Split
                </button>
                <?php endif; ?>
            </div>
            <?php endif; ?>
            </div>
            <!-- Right Column -->
            <div class="space-y-6">
        <!-- Quick Actions -->
        <div class="card p-6">
            <h3 class="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4 border-b border-slate-100 dark:border-slate-800/40 pb-3">Quick Actions</h3>
            <div class="space-y-2.5">
                <?php if (is_admin() || is_staff()): ?>
                <a href="<?php echo BASE_URL; ?>/leads/assign.php?id=<?= e($lead['lead_id']) ?>"
                   class="flex items-center gap-3 w-full px-4 py-3 bg-brand-50 hover:bg-brand-100/80 text-brand-700 rounded-xl text-sm font-semibold transition-all duration-300 border border-brand-100/50 dark:bg-brand-950/20 dark:hover:bg-brand-950/40 dark:text-brand-300 dark:border-brand-900/30">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    Assign / Route Lead
                </a>
                <?php endif; ?>
                <a href="<?= whatsapp_url($lead['customer_mobile'], $lead['customer_name'], $lead['lead_id'], $lead['status']) ?>"
                   target="_blank"
                   class="flex items-center gap-3 w-full px-4 py-3 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-700 rounded-xl text-sm font-semibold transition-all duration-300 border border-emerald-100/50 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/30">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.717-1.458L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.03-5.115-2.903-6.99C16.26 1.876 13.784.843 11.15.842 5.712.842 1.29 5.26 1.285 10.7c-.002 1.716.446 3.393 1.3 4.89l-.995 3.636 3.73-.978c1.477.806 3.011 1.233 4.73 1.233z"/></svg>
                    WhatsApp Customer
                </a>
                <a href="tel:<?= e($lead['customer_mobile']) ?>"
                   class="flex items-center gap-3 w-full px-4 py-3 bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700 rounded-xl text-sm font-semibold transition-all duration-300 border border-indigo-100/50 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900/30">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                    Call Customer
                </a>
                <a href="<?php echo BASE_URL; ?>/leads/edit.php?id=<?= e($lead['lead_id']) ?>"
                   class="flex items-center gap-3 w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold transition-all duration-300 border border-slate-200/50 dark:bg-slate-900/30 dark:hover:bg-slate-900/60 dark:text-slate-300 dark:border-slate-800/40">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    Edit Lead Details
                </a>
                <?php if (is_admin()): ?>
                <form action="<?php echo BASE_URL; ?>/leads/delete.php" method="POST" class="w-full" hx-confirm="Are you sure you want to completely delete this lead? This cannot be undone.">
                    <?= csrf_field() ?>
                    <input type="hidden" name="id" value="<?= e($lead['lead_id']) ?>">
                    <button type="submit" class="flex items-center gap-3 w-full px-4 py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-sm font-semibold transition-all duration-300 border border-rose-100/50 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/30">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        Delete Lead
                    </button>
                </form>
                <?php endif; ?>
                <a href="javascript:window.print()"
                   class="flex items-center gap-3 w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold transition-all duration-300 border border-slate-200/50 dark:bg-slate-900/30 dark:hover:bg-slate-900/60 dark:text-slate-300 dark:border-slate-800/40">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                    Print / Save as PDF Sheet
                </a>
            </div>
        </div>

            </div>
        </div>
        <?php endif; // end overview ?>

        <?php if ($activeTab === 'documents'): ?>
        <?php if (is_staff()): ?>
        <div class="card p-8 text-center text-slate-500 dark:text-slate-400">
            <div class="text-3xl mb-3">🛡️</div>
            <h3 class="text-base font-bold text-slate-800 dark:text-white mb-1">Access Restricted</h3>
            <p class="text-sm">Staff members do not have permission to view or access uploaded documents.</p>
        </div>
        <?php else: ?>
        <!-- Phase 3: Documents Upload & Verification Panel -->
        <div class="card">
            <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-800/60">
                <h3 class="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <svg class="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    📂 Customer Documents & Verification
                </h3>
            </div>
            <div class="card-body p-6 space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <?php
                    $docSlots = [
                        'aadhaar'        => 'Aadhaar Card',
                        'pan'            => 'PAN Card',
                        'bank_statement' => 'Bank Statement',
                        'rc'             => 'RC Certificate',
                        'insurance'      => 'Insurance Document',
                        'vehicle_image'  => 'Vehicle Image',
                        'other'          => 'Other Support Document'
                    ];
                    
                    foreach ($docSlots as $type => $label):
                        $doc = $docsMap[$type] ?? null;
                    ?>
                    <div class="border border-slate-100 dark:border-slate-800/40 rounded-2xl p-4 flex flex-col justify-between bg-slate-50/50 dark:bg-slate-900/30">
                        <div class="flex items-start justify-between gap-2 mb-3">
                            <div>
                                <h4 class="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500"><?= $label ?></h4>
                                <?php if ($doc): ?>
                                    <div class="text-[10px] text-slate-400 mt-1 font-mono max-w-[140px] truncate">
                                        Uploaded: <?= date('d M Y', strtotime($doc['uploaded_at'])) ?>
                                    </div>
                                <?php else: ?>
                                    <div class="text-xs text-slate-400 mt-1 font-medium italic">Not uploaded yet</div>
                                <?php endif; ?>
                            </div>
                            
                            <?php if ($doc):
                                $statusCls = match($doc['verification_status']) {
                                    'verified' => 'badge-green',
                                    'rejected' => 'badge-red',
                                    default    => 'badge-yellow',
                                };
                            ?>
                                <span class="badge <?= $statusCls ?> flex-shrink-0">
                                    <?= ucfirst($doc['verification_status']) ?>
                                </span>
                            <?php endif; ?>
                        </div>
                        
                        <?php if ($doc && $doc['verification_notes']): ?>
                        <div class="text-[11px] text-rose-600 dark:text-rose-400 bg-rose-50/30 dark:bg-rose-950/10 px-2.5 py-1.5 rounded-lg border border-rose-100/50 dark:border-rose-900/20 mb-3 leading-normal">
                            <strong>Note:</strong> <?= e($doc['verification_notes']) ?>
                        </div>
                        <?php endif; ?>

                        <div class="flex items-center gap-2 mt-auto">
                            <?php if ($doc): ?>
                                <!-- Preview Button -->
                                <button type="button" onclick="previewDoc('<?= BASE_URL . '/' . e($doc['file_path']) ?>', '<?= e($label) ?>')"
                                        class="btn btn-secondary btn-xs py-2 px-3 flex-1 flex items-center justify-center gap-1 cursor-pointer">
                                    👁️ Preview
                                </button>
                                
                                <!-- Admin Verify Action -->
                                <?php if (is_admin()): ?>
                                <button type="button" onclick="openVerifyModal(<?= $doc['id'] ?>, '<?= $doc['verification_status'] ?>', '<?= e($doc['verification_notes'] ?? '') ?>', '<?= e($label) ?>')"
                                        class="btn btn-primary btn-xs py-2 px-3 flex-1 flex items-center justify-center gap-1 font-semibold cursor-pointer">
                                    ✓ Verify
                                </button>
                                <?php endif; ?>
                            <?php else: ?>
                                <!-- File Upload Trigger -->
                                <form action="<?php echo BASE_URL; ?>/leads/upload_doc.php" method="POST" enctype="multipart/form-data" class="w-full flex items-center gap-2">
                                    <?= csrf_field() ?>
                                    <input type="hidden" name="lead_db_id" value="<?= $lead['id'] ?>">
                                    <input type="hidden" name="document_type" value="<?= $type ?>">
                                    
                                    <div class="relative flex-1">
                                        <input type="file" name="doc_file" required onchange="this.form.submit()" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" id="file_<?= $type ?>">
                                        <label for="file_<?= $type ?>" class="btn btn-secondary btn-xs w-full py-2 px-3 flex items-center justify-center gap-1.5 cursor-pointer">
                                            📤 Upload
                                        </label>
                                    </div>
                                </form>
                            <?php endif; ?>
                        </div>
                    </div>
                    <?php endforeach; ?>
                </div>
            </div>
        </div>
        <?php endif; // end !is_staff ?>
        <?php endif; // end documents ?>

        <?php if ($activeTab === 'followups'): ?>
        <!-- Notes -->
        <?php if ($lead['query_notes']): ?>
        <div class="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6 relative overflow-hidden">
            <div class="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
            <h3 class="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/></svg>
                Query / Notes
            </h3>
            <p class="text-sm text-amber-800 dark:text-amber-300 leading-relaxed font-medium"><?= nl2br(e($lead['query_notes'])) ?></p>
        </div>
        <?php endif; ?>

        <!-- Follow-ups List -->
        <div class="card">
            <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                <h3 class="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <svg class="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    Follow-up History
                </h3>
            </div>
            <?php if ($followups): ?>
            <div class="relative px-6 py-5">
                <!-- Vertical Line -->
                <div class="absolute left-[2.25rem] top-8 bottom-8 w-0.5 bg-slate-200 dark:bg-slate-800/60"></div>
                <div class="space-y-6">
                    <?php foreach ($followups as $fu): ?>
                    <div class="relative pl-10 group">
                        <!-- Timeline Dot -->
                        <div class="absolute left-[-5px] top-1.5 w-3 h-3 rounded-full bg-brand-500 ring-4 ring-white dark:ring-slate-900 group-hover:scale-125 transition-transform duration-300 shadow-sm shadow-brand-500/50"></div>
                        <div class="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-4 border border-slate-100 dark:border-slate-800/40 shadow-sm group-hover:shadow-md transition-shadow">
                            <div class="flex items-start justify-between gap-4">
                                <div class="flex-1">
                                    <p class="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium"><?= nl2br(e($fu['remarks'])) ?></p>
                                    <div class="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-xs text-slate-400 dark:text-slate-500">
                                        <span class="flex items-center gap-1 font-semibold text-slate-500 dark:text-slate-400">
                                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                                            <?= date('d M Y', strtotime($fu['followup_date'])) ?>
                                        </span>
                                        <?php if ($fu['next_followup_date']): ?>
                                        <span class="flex items-center gap-1 text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/30 px-2 py-0.5 rounded-md border border-brand-100 dark:border-brand-900/30">
                                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"/></svg>
                                            Next: <strong><?= date('d M Y', strtotime($fu['next_followup_date'])) ?></strong>
                                        </span>
                                        <?php endif; ?>
                                        <?php if ($fu['done_by']): ?>
                                        <span class="flex items-center gap-1">
                                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                                            by <?= e($fu['done_by']) ?>
                                        </span>
                                        <?php endif; ?>
                                    </div>
                                </div>
                                <?php if ($fu['status_changed_to']): ?>
                                <div class="flex-shrink-0"><?= status_badge($fu['status_changed_to']) ?></div>
                                <?php endif; ?>
                                <?php if (is_admin() || is_staff()): ?>
                                <div class="flex-shrink-0 ml-2">
                                    <form method="POST" action="" class="inline-block m-0 p-0" onsubmit="return confirm('Are you sure you want to delete this follow-up?');">
                                        <?= csrf_field() ?>
                                        <input type="hidden" name="action" value="delete_followup">
                                        <input type="hidden" name="followup_id" value="<?= $fu['id'] ?>">
                                        <button type="submit" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors" title="Delete Follow-up">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                        </button>
                                    </form>
                                </div>
                                <?php endif; ?>
                            </div>
                        </div>
                    </div>
                    <?php endforeach; ?>
                </div>
            </div>
            <?php else: ?>
            <div class="px-6 py-10 text-center text-slate-400 dark:text-slate-500 text-sm">
                <svg class="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                No follow-ups recorded yet.
            </div>
            <?php endif; ?>
        </div>
        <?php endif; // end followups ?>

        <?php if ($activeTab === 'notes'): ?>
        <!-- Team Notes Tab -->
        <div class="card p-6 min-h-[500px] flex flex-col">
            <h3 class="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4 border-b border-slate-100 dark:border-slate-800/40 pb-3 flex items-center gap-2">
                <svg class="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
                Internal Team Notes
            </h3>
            
            <div class="flex-1 overflow-y-auto mb-4 space-y-4 pr-2">
                <?php if ($notesList): ?>
                    <?php foreach ($notesList as $note): 
                        $isMe = $note['user_id'] == current_user_id();
                    ?>
                    <div class="flex flex-col <?= $isMe ? 'items-end' : 'items-start' ?>">
                        <div class="max-w-[80%] <?= $isMe ? 'bg-brand-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200' ?> rounded-2xl px-4 py-2 shadow-sm">
                            <?php if (!$isMe): ?>
                                <div class="text-[10px] font-bold text-slate-400 mb-0.5"><?= e($note['user_name']) ?></div>
                            <?php endif; ?>
                            <div class="text-sm leading-relaxed"><?= nl2br(e($note['note'])) ?></div>
                            <div class="text-[10px] mt-1 <?= $isMe ? 'text-brand-200' : 'text-slate-400' ?> text-right">
                                <?= date('d M, h:i A', strtotime($note['created_at'])) ?>
                            </div>
                        </div>
                    </div>
                    <?php endforeach; ?>
                <?php else: ?>
                    <div class="flex items-center justify-center h-full text-slate-400 text-sm italic">
                        No team notes yet. Start the conversation!
                    </div>
                <?php endif; ?>
            </div>
            
            <!-- Note Input Form -->
            <form action="" method="POST" class="mt-auto border-t border-slate-100 dark:border-slate-800/40 pt-4 flex gap-2">
                <?= csrf_field() ?>
                <input type="hidden" name="action" value="add_note">
                <textarea name="note_text" rows="2" class="form-input flex-1 resize-none rounded-xl" placeholder="Type a note..." required></textarea>
                <button type="submit" class="btn btn-primary rounded-xl px-4 flex items-center justify-center self-end">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                </button>
            </form>
        </div>
        <?php endif; // end notes ?>

        <?php if ($activeTab === 'banking' && $lead['status'] === 'disbursed'): ?>
        <!-- Banking & Payouts Section -->
    <div class="card overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm" id="banking-section">
        <!-- Dashboard Header -->
        <div class="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-6 flex items-center justify-between">
            <div>
                <h3 class="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-200">
                    <svg class="w-6 h-6 text-brand-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    Banking & Client Payouts Overview
                </h3>
                <p class="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage finances, deductions, and client payments</p>
            </div>
            <div class="hidden sm:block">
                <?php 
                    $percentPaid = $payable > 0 ? min(100, round(($total_paid / $payable) * 100)) : ($balance > 0 ? 0 : 100);
                ?>
                <div class="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                    <div class="text-right">
                        <div class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Payout Status</div>
                        <div class="font-black text-2xl text-slate-800 dark:text-slate-200 leading-none"><?= $percentPaid ?>%</div>
                    </div>
                    <!-- Circular progress ring -->
                    <div class="relative w-12 h-12 flex-shrink-0">
                        <svg class="w-12 h-12 transform -rotate-90">
                            <circle class="text-slate-200 dark:text-slate-700" stroke-width="4" stroke="currentColor" fill="transparent" r="20" cx="24" cy="24"/>
                            <circle class="text-brand-500 transition-all duration-1000 ease-out" stroke-width="4" stroke-dasharray="125.66" stroke-dashoffset="<?= 125.66 - (125.66 * $percentPaid / 100) ?>" stroke-linecap="round" stroke="currentColor" fill="transparent" r="20" cx="24" cy="24"/>
                        </svg>
                    </div>
                </div>
            </div>
        </div>

        <!-- Metric Cards -->
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-5 gap-4">
            <!-- Received -->
            <div class="bg-white dark:bg-slate-950 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800/60 transition hover:shadow-md group">
                <div class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><div class="w-1.5 h-1.5 rounded-full bg-slate-300"></div> Total Received</div>
                <div class="text-lg lg:text-xl font-black text-slate-800 dark:text-white group-hover:text-emerald-500 transition-colors"><?= format_currency($received) ?></div>
            </div>
            <!-- Deductions -->
            <div class="bg-white dark:bg-slate-950 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800/60 transition hover:shadow-md group">
                <div class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><div class="w-1.5 h-1.5 rounded-full bg-rose-300"></div> Total Deducted</div>
                <div class="text-lg lg:text-xl font-black text-rose-500 group-hover:scale-105 transition-transform transform origin-left"><?= format_currency($deductions) ?></div>
            </div>
            <!-- Net Payable -->
            <div class="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-2xl shadow-sm border border-emerald-100 dark:border-emerald-800/30 transition hover:shadow-md relative overflow-hidden group">
                <div class="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 opacity-10 rounded-bl-full group-hover:scale-110 transition-transform"></div>
                <div class="text-[10px] font-bold text-emerald-700 dark:text-emerald-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><div class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div> Net Payable</div>
                <div class="text-lg lg:text-xl font-black text-emerald-600 dark:text-emerald-400"><?= format_currency($payable) ?></div>
            </div>
            <!-- Total Paid -->
            <div class="bg-white dark:bg-slate-950 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800/60 transition hover:shadow-md group">
                <div class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><div class="w-1.5 h-1.5 rounded-full bg-brand-300"></div> Total Paid</div>
                <div class="text-lg lg:text-xl font-black text-brand-500 group-hover:scale-105 transition-transform transform origin-left"><?= format_currency($total_paid) ?></div>
            </div>
            <!-- Balance Due -->
            <div class="bg-<?= $balance > 0 ? 'amber' : 'emerald' ?>-50 dark:bg-<?= $balance > 0 ? 'amber' : 'emerald' ?>-900/10 p-4 rounded-2xl shadow-sm border border-<?= $balance > 0 ? 'amber' : 'emerald' ?>-100 dark:border-<?= $balance > 0 ? 'amber' : 'emerald' ?>-800/30 transition hover:shadow-md">
                <div class="text-[10px] font-bold text-<?= $balance > 0 ? 'amber' : 'emerald' ?>-700 dark:text-<?= $balance > 0 ? 'amber' : 'emerald' ?>-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><div class="w-1.5 h-1.5 rounded-full bg-<?= $balance > 0 ? 'amber' : 'emerald' ?>-400 <?= $balance > 0 ? 'animate-ping' : '' ?>"></div> Balance Due</div>
                <div class="text-lg lg:text-xl font-black text-<?= $balance > 0 ? 'amber' : 'emerald' ?>-600 dark:text-<?= $balance > 0 ? 'emerald' : 'emerald' ?>-400"><?= format_currency($balance) ?></div>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-0">
            <!-- Left: Financer Receipt & Deductions Form -->
            <div class="p-6 lg:border-r border-b lg:border-b-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                <h4 class="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-5 flex items-center gap-2.5">
                    <span class="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shadow-sm">1</span>
                    Receipt & Deductions
                </h4>
                <form method="POST" action="" class="space-y-4">
                    <?= csrf_field() ?>
                    <input type="hidden" name="update_banking" value="1">
                    
                    <div class="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60 space-y-4 hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label class="form-label text-[10px] uppercase font-bold text-slate-500 tracking-wider">Received Amount</label>
                                <div class="relative mt-1 group">
                                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span class="text-emerald-500 font-bold sm:text-sm">₹</span>
                                    </div>
                                    <input type="number" step="1" name="received_amount" value="<?= e($banking['received_amount'] ?? '') ?>" class="form-input pl-7 bg-white dark:bg-slate-950 font-black text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 focus:border-emerald-500 focus:ring-emerald-500 transition-shadow shadow-sm">
                                </div>
                            </div>
                            <div>
                                <label class="form-label text-[10px] uppercase font-bold text-slate-500 tracking-wider">Received Date</label>
                                <input type="date" name="received_date" value="<?= (!empty($banking['received_date']) && $banking['received_date'] !== '0000-00-00') ? e($banking['received_date']) : '' ?>" class="form-input mt-1 bg-white dark:bg-slate-950 font-medium text-slate-700 dark:text-slate-300 shadow-sm border-slate-200 dark:border-slate-800">
                            </div>
                        </div>

                        <div class="pt-2">
                            <label class="form-label text-[10px] uppercase font-bold text-slate-500 tracking-wider">Internal Notes</label>
                            <input type="text" name="banking_notes" value="<?= e($banking['banking_notes'] ?? '') ?>" class="form-input mt-1 bg-white dark:bg-slate-950 text-sm shadow-sm" placeholder="Add remarks here...">
                        </div>
                    </div>
                    
                    <button type="submit" class="w-full bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 flex items-center justify-center gap-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>
                        Update Financials
                    </button>
                </form>

                <div class="mt-8">
                    <h4 class="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-4 flex items-center justify-between">
                        <span class="flex items-center gap-2">
                            <svg class="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/></svg>
                            Deductions
                        </span>
                        <span class="bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded text-[10px] font-bold"><?= count($lead_deductions) ?> item(s)</span>
                    </h4>

                    <div class="space-y-3 mb-4">
                        <?php if (empty($lead_deductions)): ?>
                            <div class="text-center py-4 text-xs font-medium text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">No deductions added yet.</div>
                        <?php else: ?>
                            <?php foreach ($lead_deductions as $ded): ?>
                            <div class="flex items-center justify-between p-3 bg-rose-50/50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800/30 rounded-xl">
                                <div>
                                    <div class="text-sm font-bold text-slate-800 dark:text-slate-200"><?= e($ded['description']) ?></div>
                                    <div class="text-[10px] text-slate-500"><?= date('d M Y h:i A', strtotime($ded['created_at'])) ?></div>
                                </div>
                                <div class="flex items-center gap-3">
                                    <span class="font-black text-rose-500">-<?= format_currency($ded['amount']) ?></span>
                                    <form method="POST" action="" class="inline m-0 p-0" onsubmit="return confirm('Are you sure you want to remove this deduction?');">
                                        <?= csrf_field() ?>
                                        <input type="hidden" name="delete_deduction" value="1">
                                        <input type="hidden" name="deduction_id" value="<?= $ded['id'] ?>">
                                        <button type="submit" class="p-1 text-slate-400 hover:text-rose-600 transition-colors" title="Remove Deduction">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                        </button>
                                    </form>
                                </div>
                            </div>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </div>

                    <form method="POST" action="" class="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 flex items-end gap-2">
                        <?= csrf_field() ?>
                        <input type="hidden" name="add_deduction" value="1">
                        <div class="flex-1">
                            <label class="form-label text-[10px] uppercase font-bold text-slate-500 tracking-wider">Description</label>
                            <input type="text" name="description" required placeholder="e.g. File Charge" class="form-input mt-1 text-sm bg-white dark:bg-slate-950">
                        </div>
                        <div class="w-1/3">
                            <label class="form-label text-[10px] uppercase font-bold text-slate-500 tracking-wider">Amount (₹)</label>
                            <input type="number" step="0.01" name="amount" required placeholder="0.00" class="form-input mt-1 text-sm bg-white dark:bg-slate-950 text-rose-500 font-bold">
                        </div>
                        <button type="submit" class="bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white p-2.5 rounded-lg shadow-sm transition-colors" title="Quick Add">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                        </button>
                    </form>
                </div>
            </div>

            <!-- Right: Payout Transactions -->
            <div class="p-6 bg-slate-50/50 dark:bg-slate-900/20 relative">
                <h4 class="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-5 flex items-center justify-between">
                    <span class="flex items-center gap-2.5">
                        <span class="bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shadow-sm">2</span>
                        Payout Ledger
                    </span>
                    <span class="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded text-[10px] font-bold"><?= count($transactions) ?> record(s)</span>
                </h4>

                <div class="space-y-3 mb-6 max-h-[360px] overflow-y-auto pr-2 custom-scrollbar">
                    <?php if (empty($transactions)): ?>
                    <div class="flex flex-col items-center justify-center py-12 px-4 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-white/50 dark:bg-slate-900/50">
                        <div class="w-14 h-14 rounded-full bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center mb-4 text-brand-400">
                            <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                        </div>
                        <h5 class="text-sm font-bold text-slate-700 dark:text-slate-300">No payouts dispatched</h5>
                        <p class="text-xs text-slate-500 mt-1 max-w-[220px]">When you transfer money to the client, record it below to update the ledger.</p>
                    </div>
                    <?php else: ?>
                        <div class="relative">
                            <!-- Timeline Line -->
                            <div class="absolute left-[1.625rem] top-4 bottom-4 w-0.5 bg-slate-200 dark:bg-slate-800"></div>
                            
                            <div class="space-y-4 relative">
                                <?php foreach ($transactions as $idx => $t): ?>
                                <div class="relative pl-12 group">
                                    <!-- Timeline Node -->
                                    <div class="absolute left-[1.3125rem] top-3.5 w-3 h-3 rounded-full bg-brand-500 ring-4 ring-white dark:ring-slate-900 group-hover:scale-125 transition-transform duration-300 shadow-sm shadow-brand-500/40 z-10"></div>
                                    
                                    <div class="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 group-hover:-translate-y-0.5">
                                        <div class="flex items-center justify-between mb-1">
                                            <div class="font-black text-brand-600 dark:text-brand-400 text-lg"><?= format_currency($t['amount']) ?></div>
                                            <div class="text-[10px] font-bold text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded"><?= date('d M Y', strtotime($t['payment_date'])) ?></div>
                                        </div>
                                        
                                        <div class="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">
                                            <?= ucwords(str_replace('_', ' ', $t['payout_type'])) ?>
                                            <?php if ($t['beneficiary_name']): ?>
                                                <span class="text-xs text-slate-500 font-medium">→ <?= e($t['beneficiary_name']) ?></span>
                                            <?php endif; ?>
                                        </div>

                                        <div class="flex flex-wrap items-center gap-2 mt-2">
                                            <span class="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                                <?php if ($t['payment_mode'] === 'bank_transfer') echo '<svg class="w-3 h-3 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>'; ?>
                                                <?php if ($t['payment_mode'] === 'cash') echo '<svg class="w-3 h-3 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>'; ?>
                                                <?php if ($t['payment_mode'] === 'cheque') echo '<svg class="w-3 h-3 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>'; ?>
                                                <?= ucwords(str_replace('_', ' ', $t['payment_mode'])) ?>
                                            </span>
                                            <?php if ($t['reference_number']): ?>
                                            <span class="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-500 border border-amber-100 dark:border-amber-800">
                                                Ref: <?= e($t['reference_number']) ?>
                                            </span>
                                            <?php endif; ?>
                                        </div>
                                        
                                        <?php if ($t['notes']): ?>
                                        <p class="text-[11px] text-slate-500 mt-2.5 font-medium italic border-l-2 border-slate-200 dark:border-slate-700 pl-2">"<?= e($t['notes']) ?>"</p>
                                        <?php endif; ?>
                                    </div>
                                </div>
                                <?php endforeach; ?>
                            </div>
                        </div>
                    <?php endif; ?>
                </div>

                <?php if ($balance > 0): ?>
                <div class="relative mt-8">
                    <div class="absolute -inset-1 bg-gradient-to-r from-brand-500 to-indigo-500 rounded-[1.5rem] blur opacity-15"></div>
                    <form method="POST" action="" class="relative bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-brand-500/5">
                        <?= csrf_field() ?>
                        <input type="hidden" name="add_payout" value="1">
                        
                        <div class="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                            <h5 class="text-xs font-black uppercase tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-indigo-600 flex items-center gap-1.5">
                                <svg class="w-4 h-4 text-brand-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
                                Issue Payment
                            </h5>
                            <span class="text-[10px] font-bold bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 px-2 py-1 rounded border border-rose-100 dark:border-rose-900/50">Due: <?= format_currency($balance) ?></span>
                        </div>
                        
                        <div class="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label class="form-label text-[10px] uppercase font-bold text-slate-500 tracking-wider">Payout Type</label>
                                <select name="payout_type" class="form-select text-sm mt-1 shadow-sm font-medium" required>
                                    <option value="customer">Customer Payment</option>
                                    <option value="dealer">Dealer Settlement</option>
                                    <option value="insurance">Insurance Payment</option>
                                    <option value="rto">RTO Payment</option>
                                    <option value="accessories">Accessories Payment</option>
                                    <option value="vendor">Vendor Payment</option>
                                    <option value="dsa_charge">DSA Charges</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label class="form-label text-[10px] uppercase font-bold text-slate-500 tracking-wider">Beneficiary Name</label>
                                <input type="text" name="beneficiary_name" class="form-input text-sm mt-1 shadow-sm" placeholder="Name of Person/Company">
                            </div>
                            <div>
                                <label class="form-label text-[10px] uppercase font-bold text-slate-500 tracking-wider">Amount (₹)</label>
                                <input type="number" step="1" name="payout_amount" value="<?= $balance ?>" max="<?= $balance ?>" class="form-input text-sm font-black text-slate-800 dark:text-white mt-1 border-brand-200 focus:border-brand-500 focus:ring-brand-500 shadow-sm" required>
                            </div>
                            <div>
                                <label class="form-label text-[10px] uppercase font-bold text-slate-500 tracking-wider">Date</label>
                                <input type="date" name="payment_date" value="<?= date('Y-m-d') ?>" class="form-input text-sm mt-1 shadow-sm" required>
                            </div>
                            <div>
                                <label class="form-label text-[10px] uppercase font-bold text-slate-500 tracking-wider">Mode</label>
                                <select name="payment_mode" class="form-select text-sm mt-1 shadow-sm font-medium" required>
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="cash">Cash</option>
                                    <option value="cheque">Cheque</option>
                                </select>
                            </div>
                            <div>
                                <label class="form-label text-[10px] uppercase font-bold text-slate-500 tracking-wider">Reference No</label>
                                <input type="text" name="reference_number" class="form-input text-sm mt-1 shadow-sm" placeholder="e.g. UTR1234">
                            </div>
                            <div class="col-span-2">
                                <label class="form-label text-[10px] uppercase font-bold text-slate-500 tracking-wider">Notes</label>
                                <input type="text" name="payout_notes" class="form-input text-sm mt-1 shadow-sm" placeholder="Any additional details...">
                            </div>
                        </div>
                        
                        <button type="submit" class="w-full bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-brand-500/30 transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center gap-2">
                            <span>Process Payout</span>
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                        </button>
                    </form>
                </div>
                <?php else: ?>
                <div class="p-8 rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10 border border-emerald-100/50 dark:border-emerald-800/20 text-center flex flex-col items-center justify-center mt-6">
                    <div class="w-20 h-20 bg-white dark:bg-slate-900 rounded-full shadow-md flex items-center justify-center text-emerald-500 mb-4 border border-emerald-50 dark:border-emerald-800/50 transform hover:scale-110 transition-transform duration-500">
                        <svg class="w-10 h-10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    </div>
                    <h5 class="text-emerald-800 dark:text-emerald-400 font-black text-2xl tracking-tight">Fully Settled!</h5>
                    <p class="text-emerald-600/80 dark:text-emerald-500/80 text-sm mt-2 max-w-[250px]">The ledger is perfectly balanced and all payouts for this lead have been completed.</p>
                </div>
                <?php endif; ?>
            </div>
        </div>
    </div>
    <style>
        .custom-scrollbar::-webkit-scrollbar {
            width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
            background-color: #cbd5e1;
            border-radius: 20px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
            background-color: #334155;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background-color: #94a3b8;
        }
    </style>
    </div>
    <?php endif; // end banking ?>
    </div> <!-- Close Main Content Div -->

    <?php if ($activeTab === 'overview' || $activeTab === 'followups'): ?>
    <!-- Right: Actions -->
    <div class="space-y-6">
        <!-- Add Follow-up -->
        <div class="card p-6">
            <h3 class="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800/40 pb-3">
                <svg class="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                Add Follow-up
            </h3>
            <form method="POST" action="" class="space-y-4" id="followUpForm" enctype="multipart/form-data" onsubmit="return validateFollowUpForm(event);" novalidate>
                <?= csrf_field() ?>
                <input type="hidden" name="add_followup" value="1">
                <div>
                    <label class="form-label required-lbl">Remarks</label>
                    <textarea name="remarks" class="form-input resize-none h-24"
                              placeholder="Enter follow-up remarks..." required></textarea>
                </div>
                <div>
                    <label class="form-label">Next Follow-up Date</label>
                    <input type="date" name="next_followup_date" class="form-input"
                           value="<?= date('Y-m-d', strtotime('+1 day')) ?>">
                </div>
                <div>
                    <label class="form-label">Update Status</label>
                    <select name="new_status" id="new_status_select" class="form-select" onchange="toggleDisbursedFields()">
                        <?php 
                        $followup_statuses = ['pending', 'approved', 'disbursed', 'rejected'];
                        if (!in_array($lead['status'], $followup_statuses)) {
                            array_unshift($followup_statuses, $lead['status']);
                        }
                        foreach ($followup_statuses as $s): 
                        ?>
                        <option value="<?= $s ?>" <?= ($lead['status'] === $s) ? 'selected' : '' ?>>
                            <?= ucfirst(str_replace('_',' ',$s)) ?>
                        </option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <div id="disbursed_fields" style="display: none;" class="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4 space-y-4">
                    <p class="text-xs text-rose-500 font-semibold">* Required for Disbursed status.</p>
                    
                    <h4 class="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-2">📄 Document Status</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="flex flex-col gap-2">
                            <label class="form-label text-xs">RC Status</label>
                            <select name="rc_status" id="fu_rc_status" class="form-select text-sm py-1.5" onchange="toggleDisbursedFields()">
                                <option value="pending" <?= ($lead['rc_status']=='pending') ? 'selected' : '' ?>>Pending</option>
                                <option value="received" <?= ($lead['rc_status']=='received') ? 'selected' : '' ?>>Received</option>
                                <option value="not_applicable" <?= ($lead['rc_status']=='not_applicable') ? 'selected' : '' ?>>N/A</option>
                            </select>
                            <input type="text" name="rc_number" id="fu_rc_number" class="form-input text-sm py-1.5 mt-1" value="<?= e($lead['rc_number'] ?? '') ?>" placeholder="RC Number">
                            <div id="fu_rc_file_wrapper" style="display: none;" class="mt-1">
                                <input type="file" name="disburse_docs[rc]" id="fu_rc_file" class="form-input text-xs" accept="image/*,.pdf">
                            </div>
                        </div>
                        <div class="flex flex-col gap-2">
                            <label class="form-label text-xs">Insurance Status</label>
                            <select name="insurance_status" id="fu_insurance_status" class="form-select text-sm py-1.5" onchange="toggleDisbursedFields()">
                                <option value="pending" <?= ($lead['insurance_status']=='pending') ? 'selected' : '' ?>>Pending</option>
                                <option value="received" <?= ($lead['insurance_status']=='received') ? 'selected' : '' ?>>Received</option>
                                <option value="not_applicable" <?= ($lead['insurance_status']=='not_applicable') ? 'selected' : '' ?>>N/A</option>
                            </select>
                            <input type="text" name="insurance_number" id="fu_insurance_number" class="form-input text-sm py-1.5 mt-1" value="<?= e($lead['insurance_number'] ?? '') ?>" placeholder="Insurance No.">
                            <div id="fu_ins_file_wrapper" style="display: none;" class="mt-1">
                                <input type="file" name="disburse_docs[insurance]" id="fu_ins_file" class="form-input text-xs" accept="image/*,.pdf">
                            </div>
                        </div>
                        <div class="md:col-span-2">
                            <label class="form-label text-xs">RTO Status</label>
                            <select name="rto_status" id="fu_rto_status" class="form-select text-sm py-1.5">
                                <option value="pending" <?= ($lead['rto_status']=='pending') ? 'selected' : '' ?>>Pending</option>
                                <option value="done" <?= ($lead['rto_status']=='done') ? 'selected' : '' ?>>Done</option>
                                <option value="not_applicable" <?= ($lead['rto_status']=='not_applicable') ? 'selected' : '' ?>>N/A</option>
                            </select>
                        </div>
                    </div>

                    <?php if (($lead['vehicle_condition'] ?? '') === 'new'): ?>
                    <h4 class="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-2 mt-4">🛡️ New Vehicle Insurance Details</h4>
                    <p class="text-xs text-amber-600 font-semibold mb-1">Required for disbursing a new vehicle:</p>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label class="form-label text-xs">Insurance Company *</label>
                            <input type="text" name="insurance_company" id="fu_new_ins_comp" class="form-input text-sm py-1.5" value="<?= e($lead['insurance_company'] ?? '') ?>" placeholder="Company Name">
                        </div>
                        <div>
                            <label class="form-label text-xs">Policy Number *</label>
                            <input type="text" name="policy_number" id="fu_new_pol_num" class="form-input text-sm py-1.5 font-mono" value="<?= e($lead['policy_number'] ?? '') ?>" placeholder="Policy Number">
                        </div>
                        <div>
                            <label class="form-label text-xs">Expiry Date *</label>
                            <input type="date" name="insurance_expiry_date" id="fu_new_ins_exp" class="form-input text-sm py-1.5" value="<?= e($lead['insurance_expiry_date'] ?? '') ?>">
                        </div>
                    </div>
                    <?php else: ?>
                    <h4 class="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-2 mt-4">🏦 Client Bank Details</h4>
                    <div class="grid grid-cols-1 gap-4">
                        <div>
                            <input type="text" name="customer_bank_name" id="fu_bank_name" class="form-input text-sm py-1.5" value="<?= e($lead['customer_bank_name'] ?? '') ?>" placeholder="Bank Name">
                        </div>
                        <div>
                            <input type="text" name="customer_account_number" id="fu_acc_num" class="form-input text-sm py-1.5" value="<?= e($lead['customer_account_number'] ?? '') ?>" placeholder="Account Number">
                        </div>
                        <div>
                            <input type="text" name="customer_ifsc_code" id="fu_ifsc" class="form-input text-sm py-1.5" value="<?= e($lead['customer_ifsc_code'] ?? '') ?>" placeholder="IFSC Code">
                        </div>
                    </div>

                    <?php
                    $missing_core = [];
                    foreach(['aadhaar' => 'Aadhaar Card', 'pan' => 'PAN Card', 'bank_statement' => 'Bank Statement', 'other' => 'Others'] as $k => $v) {
                        if ($k === 'other') {
                            if (!isset($docsMap['other']) && !isset($docsMap['others'])) $missing_core['other'] = $v;
                        } else {
                            if (!isset($docsMap[$k])) $missing_core[$k] = $v;
                        }
                    }
                    if (!empty($missing_core)): 
                    ?>
                    <h4 class="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-2 mt-4">📄 Mandatory Documents to Upload</h4>
                    <p class="text-xs text-rose-500 font-semibold mb-1">Please upload the missing mandatory documents before disbursing the lead:</p>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <?php foreach ($missing_core as $docKey => $docLabel): ?>
                        <div>
                            <label class="form-label text-xs"><?= $docLabel ?> *</label>
                            <input type="file" name="disburse_docs[<?= $docKey ?>]" id="fu_doc_<?= $docKey ?>" class="form-input text-xs" accept="image/*,.pdf">
                        </div>
                        <?php endforeach; ?>
                    </div>
                    <?php endif; ?>
                    <?php endif; ?>
                </div>

                <script>
                // Global validation function for follow-up form submission
                function validateFollowUpForm(e) {
                    var evt = e || window.event;
                    try {
                        const form = document.getElementById('followUpForm');
                        if (!form) return true;

                        const statusSelect = document.getElementById('new_status_select');
                        const bankInputs = ['fu_bank_name', 'fu_acc_num', 'fu_ifsc'];
                        const rcSelect = document.getElementById('fu_rc_status');
                        const rcNum = document.getElementById('fu_rc_number');
                        const insSelect = document.getElementById('fu_insurance_status');
                        const insNum = document.getElementById('fu_insurance_number');
                        const hasRcDoc = <?= isset($docsMap['rc']) ? 'true' : 'false' ?>;
                        const hasInsDoc = <?= isset($docsMap['insurance']) ? 'true' : 'false' ?>;
                        const missingCoreKeys = <?= json_encode(array_keys($missing_core ?? [])) ?>;

                        // Reset highlight styles
                        const allInputs = form.querySelectorAll('input, textarea, select');
                        allInputs.forEach(el => {
                            el.classList.remove('border-red-500', 'bg-red-50', 'dark:bg-red-900/20');
                        });

                        // 1. Remarks validation (always required)
                        const remarksEl = form.querySelector('textarea[name="remarks"]');
                        if (remarksEl && !remarksEl.value.trim()) {
                            alert("Please enter follow-up remarks.");
                            remarksEl.classList.add('border-red-500', 'bg-red-50', 'dark:bg-red-900/20');
                            remarksEl.focus();
                            if (evt && evt.preventDefault) evt.preventDefault();
                            if (evt) evt.returnValue = false;
                            return false;
                        }

                        // 2. Disbursed fields validation
                        if (statusSelect && statusSelect.value === 'disbursed') {
                            const isNewVehicle = <?= (($lead['vehicle_condition'] ?? '') === 'new') ? 'true' : 'false' ?>;
                            if (isNewVehicle) {
                                const insComp = document.getElementById('fu_new_ins_comp');
                                const polNum = document.getElementById('fu_new_pol_num');
                                const insExp = document.getElementById('fu_new_ins_exp');
                                if ((insComp && !insComp.value.trim()) || (polNum && !polNum.value.trim()) || (insExp && !insExp.value.trim())) {
                                    alert("Please fill in all New Vehicle Insurance Details (Company, Policy Number, Expiry Date) before disbursing.");
                                    if (insComp && !insComp.value.trim()) insComp.focus();
                                    else if (polNum && !polNum.value.trim()) polNum.focus();
                                    else if (insExp && !insExp.value.trim()) insExp.focus();
                                    if (evt && evt.preventDefault) evt.preventDefault();
                                    if (evt) evt.returnValue = false;
                                    return false;
                                }
                            } else {
                                // 2.1 First, validate Missing Core Documents
                                let missingCore = false;
                                let firstMissingCoreEl = null;
                                missingCoreKeys.forEach(k => {
                                    const el = document.getElementById('fu_doc_' + k);
                                    if (el && !el.value) {
                                        missingCore = true;
                                        el.classList.add('border-red-500', 'bg-red-50', 'dark:bg-red-900/20');
                                        if (!firstMissingCoreEl) {
                                            firstMissingCoreEl = el;
                                        }
                                    }
                                });

                                if (missingCore) {
                                    alert("Please upload all missing mandatory documents (marked with *).");
                                    if (firstMissingCoreEl) {
                                        firstMissingCoreEl.focus();
                                    }
                                    if (evt && evt.preventDefault) evt.preventDefault();
                                    if (evt) evt.returnValue = false;
                                    return false;
                                }

                            // 2.2 Next, validate RC status and its file/number
                            if (rcSelect && rcSelect.value === 'received') {
                                if (!hasRcDoc) {
                                    const rcFileEl = document.getElementById('fu_rc_file');
                                    if (rcFileEl && !rcFileEl.value) {
                                        alert("Please upload the RC document.");
                                        rcFileEl.classList.add('border-red-500', 'bg-red-50', 'dark:bg-red-900/20');
                                        rcFileEl.focus();
                                        if (evt && evt.preventDefault) evt.preventDefault();
                                        if (evt) evt.returnValue = false;
                                        return false;
                                    }
                                }
                                if (rcNum && !rcNum.value.trim()) {
                                    alert("Please enter the RC Number.");
                                    rcNum.classList.add('border-red-500', 'bg-red-50', 'dark:bg-red-900/20');
                                    rcNum.focus();
                                    if (evt && evt.preventDefault) evt.preventDefault();
                                    if (evt) evt.returnValue = false;
                                    return false;
                                }
                            }

                            // 2.3 Next, validate Insurance status and its file/number
                            if (insSelect && insSelect.value === 'received') {
                                if (!hasInsDoc) {
                                    const insFileEl = document.getElementById('fu_ins_file');
                                    if (insFileEl && !insFileEl.value) {
                                        alert("Please upload the Insurance document.");
                                        insFileEl.classList.add('border-red-500', 'bg-red-50', 'dark:bg-red-900/20');
                                        insFileEl.focus();
                                        if (evt && evt.preventDefault) evt.preventDefault();
                                        if (evt) evt.returnValue = false;
                                        return false;
                                    }
                                }
                                if (insNum && !insNum.value.trim()) {
                                    alert("Please enter the Insurance Number.");
                                    insNum.classList.add('border-red-500', 'bg-red-50', 'dark:bg-red-900/20');
                                    insNum.focus();
                                    if (evt && evt.preventDefault) evt.preventDefault();
                                    if (evt) evt.returnValue = false;
                                    return false;
                                }
                            }

                            // 2.4 Last, validate Bank Details
                            let missingBank = false;
                            let firstMissingBankEl = null;
                            bankInputs.forEach(id => {
                                const el = document.getElementById(id);
                                if (el && !el.value.trim()) {
                                    missingBank = true;
                                    el.classList.add('border-red-500', 'bg-red-50', 'dark:bg-red-900/20');
                                    if (!firstMissingBankEl) {
                                        firstMissingBankEl = el;
                                    }
                                }
                            });

                            if (missingBank) {
                                alert("Please fill in all client bank details (Bank Name, Account Number, and IFSC) before disbursing the lead.");
                                if (firstMissingBankEl) {
                                    firstMissingBankEl.focus();
                                }
                                if (evt && evt.preventDefault) evt.preventDefault();
                                if (evt) evt.returnValue = false;
                                return false;
                            }
                            }
                        }
                        return true;
                    } catch (err) {
                        console.error(err);
                        alert("Validation error occurred: " + err.message);
                        if (evt && evt.preventDefault) evt.preventDefault();
                        if (evt) evt.returnValue = false;
                        return false;
                    }
                }

                // Global toggle function
                window.toggleDisbursedFields = function() {
                    const statusSelect = document.getElementById('new_status_select');
                    const disbursedFields = document.getElementById('disbursed_fields');
                    if (!statusSelect || !disbursedFields) return;
                    
                    const bankInputs = ['fu_bank_name', 'fu_acc_num', 'fu_ifsc'];
                    const rcSelect = document.getElementById('fu_rc_status');
                    const rcNum = document.getElementById('fu_rc_number');
                    const insSelect = document.getElementById('fu_insurance_status');
                    const insNum = document.getElementById('fu_insurance_number');
                    const rcFile = document.getElementById('fu_rc_file');
                    const rcFileWrap = document.getElementById('fu_rc_file_wrapper');
                    const insFile = document.getElementById('fu_ins_file');
                    const insFileWrap = document.getElementById('fu_ins_file_wrapper');
                    const hasRcDoc = <?= isset($docsMap['rc']) ? 'true' : 'false' ?>;
                    const hasInsDoc = <?= isset($docsMap['insurance']) ? 'true' : 'false' ?>;
                    const missingCoreKeys = <?= json_encode(array_keys($missing_core ?? [])) ?>;

                    const isDisbursed = statusSelect.value === 'disbursed';
                    disbursedFields.style.display = isDisbursed ? 'block' : 'none';
                    
                    const isNewVehicle = <?= (($lead['vehicle_condition'] ?? '') === 'new') ? 'true' : 'false' ?>;
                    if (isNewVehicle) {
                        ['fu_new_ins_comp', 'fu_new_pol_num', 'fu_new_ins_exp'].forEach(id => {
                            const el = document.getElementById(id);
                            if (el) el.required = isDisbursed;
                        });
                    } else {
                        bankInputs.forEach(id => {
                            const el = document.getElementById(id);
                            if (el) el.required = isDisbursed;
                        });
                        
                        missingCoreKeys.forEach(k => {
                            const el = document.getElementById('fu_doc_' + k);
                            if (el) el.required = isDisbursed;
                        });
                    }
                    
                    if (isDisbursed) {
                        if (rcNum) rcNum.required = (rcSelect && rcSelect.value === 'received');
                        if (insNum) insNum.required = (insSelect && insSelect.value === 'received');
                        
                        if (rcSelect && rcSelect.value === 'received' && !hasRcDoc) {
                            if (rcFile) rcFile.required = true;
                            if (rcFileWrap) rcFileWrap.style.display = 'block';
                        } else {
                            if (rcFile) rcFile.required = false;
                            if (rcFileWrap) rcFileWrap.style.display = 'none';
                        }
                        
                        if (insSelect && insSelect.value === 'received' && !hasInsDoc) {
                            if (insFile) insFile.required = true;
                            if (insFileWrap) insFileWrap.style.display = 'block';
                        } else {
                            if (insFile) insFile.required = false;
                            if (insFileWrap) insFileWrap.style.display = 'none';
                        }
                    } else {
                        if (rcNum) rcNum.required = false;
                        if (insNum) insNum.required = false;
                        if (rcFile) rcFile.required = false;
                        if (insFile) insFile.required = false;
                        if (rcFileWrap) rcFileWrap.style.display = 'none';
                        if (insFileWrap) insFileWrap.style.display = 'none';
                    }
                };

                // Initialize state on script load
                toggleDisbursedFields();
                </script>

                <button type="submit" class="w-full btn btn-primary mt-4">
                    Save Follow-up
                </button>
            </form>
        </div>

        <!-- Audit Log -->
        <?php if ($logs): ?>
        <div class="card p-6">
            <h3 class="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800/40 pb-3">
                <svg class="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                Audit Log
            </h3>
            <div class="space-y-4">
                <?php foreach ($logs as $log): ?>
                <div class="flex items-start gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span class="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 flex-shrink-0"></span>
                    <div>
                        <span class="font-bold text-slate-700 dark:text-slate-300"><?= e($log['action']) ?></span>
                        <?php if ($log['details']): ?> — <span class="text-slate-600 dark:text-slate-400"><?= e($log['details']) ?></span><?php endif; ?>
                        <div class="text-slate-400 dark:text-slate-500 mt-1"><?= date('d M Y H:i', strtotime($log['created_at'])) ?></div>
                    </div>
                </div>
                <?php endforeach; ?>
            </div>
        </div>
        <?php endif; ?>
    </div>
    </div>
    <?php endif; // end right actions ?>
</div>

<!-- Document Preview Modal -->
<div id="previewModal" class="modal-backdrop hidden" onclick="if(event.target===this)closePreviewModal()">
    <div class="modal-panel max-w-4xl" style="height: 85vh; display: flex; flex-direction: column;">
        <div class="modal-header flex flex-wrap items-center justify-between gap-2">
            <h3 id="previewTitle" class="font-bold text-slate-700 dark:text-white uppercase tracking-wider flex-1">Document Preview</h3>
            
            <div id="docControls" class="flex items-center gap-1.5 mr-2">
                <button type="button" onclick="transformDoc('rotate')" class="btn btn-secondary btn-xs px-2 py-1 flex items-center gap-1" title="Rotate 90°">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                </button>
                <button type="button" onclick="transformDoc('zoom_in')" class="btn btn-secondary btn-xs px-2 py-1 flex items-center gap-1" title="Zoom In">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"/></svg>
                </button>
                <button type="button" onclick="transformDoc('zoom_out')" class="btn btn-secondary btn-xs px-2 py-1 flex items-center gap-1" title="Zoom Out">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"/></svg>
                </button>
                <button type="button" onclick="printDoc()" class="btn btn-secondary btn-xs px-2 py-1 flex items-center gap-1" title="Print">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                </button>
            </div>

            <button onclick="closePreviewModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 text-2xl cursor-pointer ml-auto">×</button>
        </div>
        <div class="modal-body flex-1 p-0 overflow-auto relative bg-slate-950 flex items-center justify-center">
            <!-- Iframe for PDF, Image tag for images -->
            <iframe id="pdfPreview" class="w-full h-full border-none hidden" src=""></iframe>
            <div id="imagePreviewContainer" class="hidden w-full h-full flex items-center justify-center overflow-auto p-4">
                <img id="imagePreview" class="max-w-full max-h-full object-contain transition-transform duration-200" style="transform-origin: center;" src="" alt="Preview">
            </div>
        </div>
    </div>
</div>

<?php if (is_admin()): ?>
<!-- Verification Modal -->
<div id="verifyModal" class="modal-backdrop hidden" onclick="if(event.target===this)closeVerifyModal()">
    <div class="modal-panel max-w-md">
        <div class="modal-header">
            <h3 id="verifyTitle" class="font-bold text-slate-700 dark:text-white uppercase tracking-wider">Verify Document</h3>
            <button onclick="closeVerifyModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 text-2xl cursor-pointer">×</button>
        </div>
        <form action="<?php echo BASE_URL; ?>/leads/verify_doc.php" method="POST" class="modal-body space-y-4">
            <?= csrf_field() ?>
            <input type="hidden" name="doc_id" id="verifyDocId" value="">
            
            <div>
                <label class="form-label required-lbl">Verification Status</label>
                <select name="verification_status" id="verifyStatus" class="form-select" required>
                    <option value="pending">Pending</option>
                    <option value="verified">Verified</option>
                    <option value="rejected">Rejected</option>
                </select>
            </div>
            <div>
                <label class="form-label">Notes / Remarks</label>
                <textarea name="verification_notes" id="verifyNotes" class="form-input resize-none h-24" placeholder="Enter reason if rejected or other notes..."></textarea>
            </div>
            
            <div class="modal-footer">
                <button type="button" onclick="closeVerifyModal()" class="btn btn-secondary cursor-pointer">Cancel</button>
                <button type="submit" class="btn btn-primary cursor-pointer">Save Status</button>
            </div>
        </form>
    </div>
</div>

<!-- Manage Commission Split Modal -->
<div id="manageCommModal" class="modal-backdrop hidden" onclick="if(event.target===this)closeManageCommModal()">
    <div class="modal-panel" style="max-width:36rem">
        <div class="modal-header">
            <h3 id="manageCommTitle" class="font-bold text-slate-700 dark:text-white uppercase tracking-wider">
                <?= $commission ? 'Update Commission Split' : 'Record Commission Split' ?>
            </h3>
            <button onclick="closeManageCommModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 text-2xl cursor-pointer">×</button>
        </div>
        <form method="POST" action="" class="modal-body space-y-4">
            <?= csrf_field() ?>
            <input type="hidden" name="manage_commission" value="1">
            
            <div class="grid grid-cols-2 gap-4">
                <div class="col-span-2 md:col-span-1">
                    <label class="form-label font-semibold">Channel Partner</label>
                    <input type="text" name="channel_name" id="fmAgent" class="form-input text-sm py-1.5" list="channel_list" value="<?= e($selectedCommissionAgentName) ?>" autocomplete="off" placeholder="Type channel name...">
                    <datalist id="channel_list">
                        <?php foreach ($agents as $a): ?>
                        <option value="<?= e($a['name']) ?>"></option>
                        <?php endforeach; ?>
                    </datalist>
                </div>
                
                <div class="col-span-2 md:col-span-1">
                    <label class="form-label font-semibold">IRR (%)</label>
                    <input type="number" name="irr_percentage" id="fmIrr" class="form-input font-mono text-sm" step="0.01" value="<?= $commission ? (float)$commission['irr_percentage'] : 0 ?>">
                </div>

                <div class="col-span-2 md:col-span-1">
                    <label class="form-label font-semibold">Payout (%)</label>
                    <input type="number" name="payout_percentage" id="fmPayoutPct" class="form-input font-mono text-sm" step="0.01" value="<?= $commission ? (float)$commission['payout_percentage'] : 0 ?>">
                </div>

                <div class="col-span-2 md:col-span-1">
                    <label class="form-label font-semibold text-brand-600">Gross Payout (₹)</label>
                    <input type="number" name="gross_payout" id="fmGross" class="form-input font-mono font-bold text-slate-800" step="0.01" value="<?= $commission ? (float)$commission['gross_payout'] : 0 ?>" required>
                </div>

                <div class="col-span-2 md:col-span-1">
                    <label class="form-label text-xs">TDS Amount (5%)</label>
                    <input type="number" name="tds_amount" id="fmTds" class="form-input font-mono text-sm" step="0.01" value="<?= $commission ? (float)$commission['tds_amount'] : 0 ?>">
                </div>

                <div class="col-span-2 md:col-span-1">
                    <label class="form-label text-xs">GST Amount (18%)</label>
                    <input type="number" name="gst_amount" id="fmGst" class="form-input font-mono text-sm" step="0.01" value="<?= $commission ? (float)$commission['gst_amount'] : 0 ?>">
                </div>

                <div class="col-span-2 md:col-span-1">
                    <label class="form-label font-semibold text-brand-600">Net Payout</label>
                    <input type="text" id="fmNetPayout" class="form-input font-mono bg-slate-50 border-slate-200 text-brand-700 font-bold" readonly value="₹0.00">
                </div>

                <div class="col-span-2 md:col-span-1">
                    <label class="form-label font-semibold">Agent Share / Channel Paid (₹)</label>
                    <input type="number" name="channel_paid_amount" id="fmComm" class="form-input font-mono font-bold text-slate-800" step="0.01" value="<?= $commission ? ($commission['channel_paid_amount'] > 0 ? (float)$commission['channel_paid_amount'] : (float)$commission['commission_amount']) : 0 ?>" required>
                    <div id="mSplitCalculator" class="text-[11px] text-brand-600 dark:text-brand-400 mt-1 font-semibold flex justify-between">
                        <span>90% = ₹0.00</span>
                        <span>10% = ₹0.00</span>
                    </div>
                </div>

                <div class="col-span-2 md:col-span-1">
                    <label class="form-label font-semibold text-emerald-600">Company Balance Payout</label>
                    <input type="text" id="fmBalance" class="form-input font-mono bg-emerald-50 border-emerald-200 text-emerald-700 font-bold" readonly value="₹0.00">
                </div>
                
                <!-- 90% Initial Split Card -->
                <div class="col-span-2 md:col-span-1 border border-slate-100 dark:border-slate-800/60 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-900/30">
                    <h4 class="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-3 flex justify-between items-center">
                        <span>90% Initial Payout</span>
                        <span id="mLabel90" class="text-brand-600 dark:text-brand-400 font-mono">₹0.00</span>
                    </h4>
                    <div class="space-y-3">
                        <div>
                            <label class="form-label text-xs">Status</label>
                            <select name="payout_90_status" id="fmP90Status" class="form-select text-sm py-1.5">
                                <option value="pending" <?= $commission && $commission['payout_90_status'] === 'paid' ? '' : 'selected' ?>>Pending</option>
                                <option value="paid" <?= $commission && $commission['payout_90_status'] === 'paid' ? 'selected' : '' ?>>Paid</option>
                            </select>
                        </div>
                        <div>
                            <label class="form-label text-xs">Payment Date</label>
                            <input type="date" name="payout_90_date" id="fmP90Date" class="form-input text-sm py-1.5" value="<?= ($commission && !empty($commission['payout_90_date']) && $commission['payout_90_date'] !== '0000-00-00') ? e($commission['payout_90_date']) : '' ?>">
                        </div>
                        <div>
                            <label class="form-label text-xs">Payment Mode</label>
                            <select name="payout_90_mode" id="fmP90Mode" class="form-select text-sm py-1.5">
                                <option value="">— Select —</option>
                                <option value="bank_transfer" <?= $commission && $commission['payout_90_mode'] === 'bank_transfer' ? 'selected' : '' ?>>Bank Transfer</option>
                                <option value="cash" <?= $commission && $commission['payout_90_mode'] === 'cash' ? 'selected' : '' ?>>Cash</option>
                                <option value="cheque" <?= $commission && $commission['payout_90_mode'] === 'cheque' ? 'selected' : '' ?>>Cheque</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <!-- 10% Retention Split Card -->
                <div class="col-span-2 md:col-span-1 border border-slate-100 dark:border-slate-800/60 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-900/30">
                    <h4 class="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-3 flex justify-between items-center">
                        <span>10% Retention Payout</span>
                        <span id="mLabel10" class="text-brand-600 dark:text-brand-400 font-mono">₹0.00</span>
                    </h4>
                    <div class="space-y-3">
                        <div>
                            <label class="form-label text-xs">Status</label>
                            <select name="payout_10_status" id="fmP10Status" class="form-select text-sm py-1.5">
                                <option value="pending" <?= $commission && $commission['payout_10_status'] === 'paid' ? '' : 'selected' ?>>Pending</option>
                                <option value="paid" <?= $commission && $commission['payout_10_status'] === 'paid' ? 'selected' : '' ?>>Paid</option>
                            </select>
                        </div>
                        <div>
                            <label class="form-label text-xs">Payment Date</label>
                            <input type="date" name="payout_10_date" id="fmP10Date" class="form-input text-sm py-1.5" value="<?= ($commission && !empty($commission['payout_10_date']) && $commission['payout_10_date'] !== '0000-00-00') ? e($commission['payout_10_date']) : '' ?>">
                        </div>
                        <div>
                            <label class="form-label text-xs">Payment Mode</label>
                            <select name="payout_10_mode" id="fmP10Mode" class="form-select text-sm py-1.5">
                                <option value="">— Select —</option>
                                <option value="bank_transfer" <?= $commission && $commission['payout_10_mode'] === 'bank_transfer' ? 'selected' : '' ?>>Bank Transfer</option>
                                <option value="cash" <?= $commission && $commission['payout_10_mode'] === 'cash' ? 'selected' : '' ?>>Cash</option>
                                <option value="cheque" <?= $commission && $commission['payout_10_mode'] === 'cheque' ? 'selected' : '' ?>>Cheque</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <div class="col-span-2 grid grid-cols-2 gap-4">
                    <div>
                        <label class="form-label">Additional Payout (₹)</label>
                        <input type="number" name="additional_payout" id="fmAddPayout" class="form-input font-mono" step="100" value="<?= $commission ? (float)$commission['additional_payout'] : 0 ?>">
                    </div>
                    <div>
                        <label class="form-label font-semibold">Net Received (Paid Calc)</label>
                        <input type="text" id="fmPaidCalc" class="form-input font-mono bg-slate-50 text-slate-500 border-slate-200" readonly value="₹0.00">
                    </div>
                </div>
                
                <div class="col-span-2">
                    <label class="form-label">Notes</label>
                    <input type="text" name="notes" id="fmNotes" class="form-input" placeholder="Transaction ref, bank etc..." value="<?= $commission ? e($commission['notes'] ?? '') : '' ?>">
                </div>
            </div>
            
            <div class="modal-footer">
                <button type="button" onclick="closeManageCommModal()" class="btn btn-secondary cursor-pointer">Cancel</button>
                <button type="submit" class="btn btn-primary cursor-pointer">Save Commission</button>
            </div>
        </form>
    </div>
</div>
<?php endif; ?>

<!-- Document Preview Modal -->
<div id="previewModal" class="modal-backdrop hidden overflow-y-auto" onclick="if(event.target===this)closePreviewModal()">
    <div class="modal-panel my-8 mx-auto bg-slate-900" style="max-width:800px">
        <div class="modal-header border-b border-slate-700">
            <h3 id="previewTitle" class="font-bold text-white uppercase tracking-wider flex items-center gap-2">Preview Document</h3>
            <div class="flex items-center gap-2">
                <button type="button" onclick="printDoc()" class="btn btn-secondary btn-sm flex items-center gap-1 cursor-pointer">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                    Print
                </button>
                <button onclick="closePreviewModal()" type="button" class="text-slate-400 hover:text-white text-2xl cursor-pointer">×</button>
            </div>
        </div>
        <div class="p-0 bg-slate-800 flex justify-center items-center relative overflow-hidden" style="min-height: 400px; max-height: 70vh;">
            <iframe id="pdfPreview" class="w-full h-[600px] hidden" src=""></iframe>
            <div id="imagePreviewContainer" class="w-full h-full flex justify-center items-center overflow-auto hidden">
                <img id="imagePreview" src="" class="max-w-full max-h-[70vh] object-contain transition-transform duration-200" alt="Document Preview">
            </div>
        </div>
        <div id="docControls" class="bg-slate-900 p-3 flex justify-center gap-2 hidden border-t border-slate-700">
            <button type="button" onclick="transformDoc('zoom_out')" class="btn btn-secondary btn-sm bg-slate-800 text-white border-slate-700 hover:bg-slate-700 cursor-pointer">Zoom Out</button>
            <button type="button" onclick="transformDoc('zoom_in')" class="btn btn-secondary btn-sm bg-slate-800 text-white border-slate-700 hover:bg-slate-700 cursor-pointer">Zoom In</button>
            <button type="button" onclick="transformDoc('rotate')" class="btn btn-secondary btn-sm bg-slate-800 text-white border-slate-700 hover:bg-slate-700 cursor-pointer">Rotate</button>
        </div>
    </div>
</div>

<!-- Verify Document Modal -->
<div id="verifyModal" class="modal-backdrop hidden overflow-y-auto" onclick="if(event.target===this)closeVerifyModal()">
    <div class="modal-panel my-8 mx-auto" style="max-width:32rem">
        <div class="modal-header border-b border-slate-100">
            <h3 id="verifyTitle" class="font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">Verify Document</h3>
            <button onclick="closeVerifyModal()" type="button" class="text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 text-2xl cursor-pointer">×</button>
        </div>
        <form method="POST" action="<?php echo BASE_URL; ?>/leads/verify_doc.php" class="modal-body space-y-4">
            <?= csrf_field() ?>
            <input type="hidden" name="lead_db_id" value="<?= $lead['id'] ?>">
            <input type="hidden" name="document_id" id="verifyDocId" value="">
            
            <div>
                <label class="form-label required-lbl">Verification Status</label>
                <select name="verification_status" id="verifyStatus" class="form-select" required>
                    <option value="pending">Pending</option>
                    <option value="verified">Verified ✅</option>
                    <option value="rejected">Rejected ❌</option>
                </select>
            </div>
            
            <div>
                <label class="form-label">Verification Notes / Reason</label>
                <textarea name="verification_notes" id="verifyNotes" class="form-input resize-none h-24" placeholder="If rejected, state the reason..."></textarea>
            </div>
            
            <div class="modal-footer pt-4 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onclick="closeVerifyModal()" class="btn btn-secondary px-6">Cancel</button>
                <button type="submit" class="btn btn-primary px-8">Save Status</button>
            </div>
        </form>
    </div>
</div>


<script>
let docScale = 1;
let docRotation = 0;

function previewDoc(url, label) {
    document.getElementById('previewTitle').textContent = 'Preview — ' + label;
    const isPdf = url.toLowerCase().endsWith('.pdf');
    
    const iframe = document.getElementById('pdfPreview');
    const imgContainer = document.getElementById('imagePreviewContainer');
    const img = document.getElementById('imagePreview');
    const controls = document.getElementById('docControls');
    
    // Reset transforms
    docScale = 1;
    docRotation = 0;
    img.style.transform = `scale(${docScale}) rotate(${docRotation}deg)`;
    
    if (isPdf) {
        iframe.src = url;
        iframe.classList.remove('hidden');
        imgContainer.classList.add('hidden');
        controls.classList.add('hidden'); // PDF has native controls
    } else {
        img.src = url;
        imgContainer.classList.remove('hidden');
        iframe.classList.add('hidden');
        iframe.src = '';
        controls.classList.remove('hidden');
    }
    
    openModal('previewModal');
}

function transformDoc(action) {
    if (action === 'zoom_in') docScale += 0.25;
    if (action === 'zoom_out') docScale = Math.max(0.25, docScale - 0.25);
    if (action === 'rotate') docRotation = (docRotation + 90) % 360;
    
    const img = document.getElementById('imagePreview');
    img.style.transform = `scale(${docScale}) rotate(${docRotation}deg)`;
}

function printDoc() {
    const img = document.getElementById('imagePreview');
    if (!img.src) return;
    
    const win = window.open('');
    win.document.write(`
        <html><head><title>Print Document</title></head>
        <body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;">
            <img src="${img.src}" style="max-width:100%;max-height:100%;transform:rotate(${docRotation}deg);">
        </body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 250);
}

function closePreviewModal() {
    closeModal('previewModal');
    document.getElementById('pdfPreview').src = '';
    document.getElementById('imagePreview').src = '';
}

function openVerifyModal(id, currentStatus, currentNotes, label) {
    document.getElementById('verifyTitle').textContent = 'Verify — ' + label;
    document.getElementById('verifyDocId').value = id;
    document.getElementById('verifyStatus').value = currentStatus;
    document.getElementById('verifyNotes').value = currentNotes;
    
    openModal('verifyModal');
}

function closeVerifyModal() {
    closeModal('verifyModal');
}

function openManageCommModal() {
    if (window.reCalcMDetails) window.reCalcMDetails();
    openModal('manageCommModal');
}
function closeManageCommModal() {
    closeModal('manageCommModal');
}

// Inline Payout Calculators for Lead View Modal
$(document).ready(function() {
    const mComm = document.getElementById('fmComm');
    const mP90 = document.getElementById('fmP90Status');
    const mP10 = document.getElementById('fmP10Status');
    const mAdd = document.getElementById('fmAddPayout');
    const fmGross = document.getElementById('fmGross');
    const fmTds = document.getElementById('fmTds');
    const fmGst = document.getElementById('fmGst');
    const fmNetPayout = document.getElementById('fmNetPayout');
    const fmBalance = document.getElementById('fmBalance');
    
    if (mComm) {
        // Auto-calculate TDS and GST from Gross
        if (fmGross) {
            fmGross.addEventListener('input', function() {
                const gross = parseFloat(this.value) || 0;
                fmTds.value = (gross * 0.05).toFixed(2);
                fmGst.value = (gross * 0.18).toFixed(2);
                reCalcMDetails();
            });
        }
        
        // Manual override triggers recalculation
        if (fmTds) fmTds.addEventListener('input', reCalcMDetails);
        if (fmGst) fmGst.addEventListener('input', reCalcMDetails);
        
        function reCalcMDetails() {
            // New Financial Fields Math
            const gross = parseFloat(fmGross ? fmGross.value : 0) || 0;
            const tds = parseFloat(fmTds ? fmTds.value : 0) || 0;
            const gst = parseFloat(fmGst ? fmGst.value : 0) || 0;
            const channelPaid = parseFloat(mComm.value) || 0;
            
            const net = gross - tds - gst;
            const balance = net - channelPaid;
            
            if (fmNetPayout) fmNetPayout.value = `₹${net.toLocaleString('en-IN', {minimumFractionDigits:2})}`;
            if (fmBalance) fmBalance.value = `₹${balance.toLocaleString('en-IN', {minimumFractionDigits:2})}`;
            
            // 90/10 Split Logic (Existing)
            const add = parseFloat(mAdd.value) || 0;
            
            const part90 = (channelPaid * 0.90).toFixed(2);
            const part10 = (channelPaid * 0.10).toFixed(2);
            
            document.getElementById('mSplitCalculator').innerHTML = `
                <span>90% = ₹${parseFloat(part90).toLocaleString('en-IN', {minimumFractionDigits:2})}</span>
                <span>10% = ₹${parseFloat(part10).toLocaleString('en-IN', {minimumFractionDigits:2})}</span>
            `;
            document.getElementById('mLabel90').textContent = `₹${parseFloat(part90).toLocaleString('en-IN', {minimumFractionDigits:2})}`;
            document.getElementById('mLabel10').textContent = `₹${parseFloat(part10).toLocaleString('en-IN', {minimumFractionDigits:2})}`;
            
            let paid = 0;
            if (mP90.value === 'paid') paid += channelPaid * 0.90;
            if (mP10.value === 'paid') paid += channelPaid * 0.10;
            paid += add;
            
            document.getElementById('fmPaidCalc').value = `₹${paid.toLocaleString('en-IN', {minimumFractionDigits:2})}`;
            
            // Requirements toggles
            document.getElementById('fmP90Date').required = (mP90.value === 'paid');
            document.getElementById('fmP90Mode').required = (mP90.value === 'paid');
            document.getElementById('fmP10Date').required = (mP10.value === 'paid');
            document.getElementById('fmP10Mode').required = (mP10.value === 'paid');
        }
        
        mComm.addEventListener('input', reCalcMDetails);
        mP90.addEventListener('change', reCalcMDetails);
        mP10.addEventListener('change', reCalcMDetails);
        mAdd.addEventListener('input', reCalcMDetails);
        
        window.reCalcMDetails = reCalcMDetails;
    }
});
</script>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
