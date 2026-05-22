<?php
// leads/assign.php — Assign Lead
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';

// Only Admin or Staff should assign leads
if (!is_admin() && !is_staff()) {
    flash('error', 'You do not have permission to assign leads.');
    header('Location: ' . BASE_URL . '/leads/index.php');
    exit;
}

$leadIdParam = $_GET['id'] ?? '';
$lead = db_fetch_one($conn, "SELECT * FROM leads WHERE lead_id = ?", 's', [$leadIdParam]);

if (!$lead) {
    flash('error', 'Lead not found.');
    header('Location: ' . BASE_URL . '/leads/index.php');
    exit;
}

$pageTitle      = 'Assign Lead: ' . $lead['lead_id'];
$pageBreadcrumb = 'Leads / ' . $lead['lead_id'] . ' / Assign';

$agents     = db_fetch_all($conn, "SELECT id, name FROM agents WHERE is_active=1 ORDER BY name");
$financers  = db_fetch_all($conn, "SELECT id, name FROM financers WHERE is_active=1 ORDER BY name");
$dealers    = db_fetch_all($conn, "SELECT id, name FROM dealers WHERE is_active=1 ORDER BY name");
$executives = db_fetch_all($conn, "SELECT id, name FROM executives WHERE is_active=1 ORDER BY name");

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verify_csrf()) { die('Invalid CSRF token'); }

    $agent_id     = (int)($_POST['agent_id'] ?? 0) ?: null;
    $financer_id  = (int)($_POST['financer_id'] ?? 0) ?: null;
    $dealer_id    = (int)($_POST['dealer_id'] ?? 0) ?: null;
    $executive_id = (int)($_POST['executive_id'] ?? 0) ?: null;
    
    $bank_name = trim($_POST['customer_bank_name'] ?? '');
    $acc_num   = trim($_POST['customer_account_number'] ?? '');
    $ifsc      = trim($_POST['customer_ifsc_code'] ?? '');
    
    $rc_status        = $_POST['rc_status'] ?? $lead['rc_status'];
    $rc_number        = trim($_POST['rc_number'] ?? '');
    $insurance_status = $_POST['insurance_status'] ?? $lead['insurance_status'];
    $insurance_number = trim($_POST['insurance_number'] ?? '');
    $rto_status       = $_POST['rto_status'] ?? $lead['rto_status'];

    if ($agent_id) {
        if (!$bank_name || !$acc_num || !$ifsc) {
            flash('error', 'Bank details (Name, Account No, IFSC) are required when assigning an Agent.');
            header('Location: ' . BASE_URL . '/leads/assign.php?id=' . urlencode($lead['lead_id']));
            exit;
        }
        if ($rc_status === 'pending' || $insurance_status === 'pending' || $rto_status === 'pending') {
            flash('error', 'Document statuses (RC, Insurance, RTO) must be completed (not Pending) before assigning an Agent.');
            header('Location: ' . BASE_URL . '/leads/assign.php?id=' . urlencode($lead['lead_id']));
            exit;
        }
        if ($rc_status === 'received' && empty($rc_number)) {
            flash('error', 'RC Number is required when RC Status is Received.');
            header('Location: ' . BASE_URL . '/leads/assign.php?id=' . urlencode($lead['lead_id']));
            exit;
        }
        if ($insurance_status === 'received' && empty($insurance_number)) {
            flash('error', 'Insurance Number is required when Insurance Status is Received.');
            header('Location: ' . BASE_URL . '/leads/assign.php?id=' . urlencode($lead['lead_id']));
            exit;
        }
    }

    $stmt = $conn->prepare("UPDATE leads SET agent_id=?, financer_id=?, dealer_id=?, executive_id=?, customer_bank_name=?, customer_account_number=?, customer_ifsc_code=?, rc_status=?, rc_number=?, insurance_status=?, insurance_number=?, rto_status=? WHERE id=?");
    $stmt->bind_param('iiiissssssssi', $agent_id, $financer_id, $dealer_id, $executive_id, $bank_name, $acc_num, $ifsc, $rc_status, $rc_number, $insurance_status, $insurance_number, $rto_status, $lead['id']);
    
    if ($stmt->execute()) {
        log_lead_action($conn, $lead['id'], 'Lead Assigned', 'Assignment updated by ' . current_user()['name'], current_user_id());
        flash('success', 'Lead assigned successfully!');
        header('Location: ' . BASE_URL . '/leads/view.php?id=' . urlencode($lead['lead_id']));
        exit;
    } else {
        flash('error', 'Database error: ' . $conn->error);
    }
}

$headerActions = '<a href="<?= BASE_URL ?>/leads/view.php?id=' . e($lead['lead_id']) . '"
    class="btn btn-secondary btn-sm shadow-sm">
    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg> Back to Lead
</a>';

require_once __DIR__ . '/../includes/header.php';
?>

<div class="max-w-3xl mx-auto animate-fade-up">
    <div class="card mb-6">
        <div class="card-header">
            <h2>Assign Lead Details</h2>
        </div>
        
        <div class="p-6 bg-brand-50/20 dark:bg-brand-950/10 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
            <div>
                <div class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Customer</div>
                <div class="font-bold text-slate-900 dark:text-white text-lg tracking-tight"><?= e($lead['customer_name']) ?></div>
            </div>
            <div class="text-right">
                <div class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Vehicle</div>
                <div class="font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-sec-600 dark:from-brand-400 dark:to-sec-400 text-lg tracking-tight"><?= e($lead['vehicle_make_model'] ?: 'N/A') ?></div>
            </div>
        </div>

        <form method="POST" action="" class="p-6 space-y-6">
            <?= csrf_field() ?>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Agent -->
                <div>
                    <label class="form-label" id="lbl_agent_id">Agent / DSA</label>
                    <select name="agent_id" class="form-select">
                        <option value="">— Unassigned —</option>
                        <?php foreach ($agents as $a): ?>
                        <option value="<?= $a['id'] ?>" <?= ($lead['agent_id'] == $a['id']) ? 'selected' : '' ?>>
                            <?= e($a['name']) ?>
                        </option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <!-- Financer -->
                <div>
                    <label class="form-label" id="lbl_financer_id">Financer / Bank</label>
                    <select name="financer_id" class="form-select">
                        <option value="">— Unassigned —</option>
                        <?php foreach ($financers as $f): ?>
                        <option value="<?= $f['id'] ?>" <?= ($lead['financer_id'] == $f['id']) ? 'selected' : '' ?>>
                            <?= e($f['name']) ?>
                        </option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <!-- Dealer -->
                <div>
                    <label class="form-label" id="lbl_dealer_id">Dealer</label>
                    <select name="dealer_id" class="form-select">
                        <option value="">— Unassigned —</option>
                        <?php foreach ($dealers as $d): ?>
                        <option value="<?= $d['id'] ?>" <?= ($lead['dealer_id'] == $d['id']) ? 'selected' : '' ?>>
                            <?= e($d['name']) ?>
                        </option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <!-- SFE -->
                <div>
                    <label class="form-label" id="lbl_executive_id">SFE / Executive</label>
                    <select name="executive_id" class="form-select border-brand-200/60 dark:border-brand-900/40 bg-brand-50/30 dark:bg-brand-950/20 focus:bg-white dark:focus:bg-slate-900 transition-all duration-300">
                        <option value="">— Unassigned —</option>
                        <?php foreach ($executives as $ex): ?>
                        <option value="<?= $ex['id'] ?>" <?= ($lead['executive_id'] == $ex['id']) ? 'selected' : '' ?>>
                            <?= e($ex['name']) ?>
                        </option>
                        <?php endforeach; ?>
                    </select>
                    <p class="text-xs text-slate-400 mt-2 font-medium">The executive will be responsible for follow-ups.</p>
                </div>
            </div>

            <!-- Document Status (Required for Agents) -->
            <div class="mt-6 border-t border-slate-100 dark:border-slate-800 pt-6">
                <h3 class="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-2">
                    <span class="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-brand-600 dark:text-brand-400 text-xs shadow-sm">📄</span>
                    Document Status
                </h3>
                <p class="text-xs text-rose-500 mb-4 font-semibold" id="doc_req_msg">* Must be completed (not "Pending") to assign an Agent.</p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="flex gap-3">
                        <div class="flex-1">
                            <label class="form-label" id="lbl_rc">RC Status</label>
                            <select name="rc_status" id="rc_status" class="form-select">
                                <option value="pending" <?= ($lead['rc_status']=='pending') ? 'selected' : '' ?>>Pending</option>
                                <option value="received" <?= ($lead['rc_status']=='received') ? 'selected' : '' ?>>Received</option>
                                <option value="not_applicable" <?= ($lead['rc_status']=='not_applicable') ? 'selected' : '' ?>>N/A</option>
                            </select>
                        </div>
                        <div class="flex-1">
                            <label class="form-label" id="lbl_rc_num">RC Number</label>
                            <input type="text" name="rc_number" id="rc_number" class="form-input" value="<?= e($lead['rc_number'] ?? '') ?>" placeholder="e.g. DL1C...">
                        </div>
                    </div>
                    <div class="flex gap-3">
                        <div class="flex-1">
                            <label class="form-label" id="lbl_ins">Insurance Status</label>
                            <select name="insurance_status" id="insurance_status" class="form-select">
                                <option value="pending" <?= ($lead['insurance_status']=='pending') ? 'selected' : '' ?>>Pending</option>
                                <option value="received" <?= ($lead['insurance_status']=='received') ? 'selected' : '' ?>>Received</option>
                                <option value="not_applicable" <?= ($lead['insurance_status']=='not_applicable') ? 'selected' : '' ?>>N/A</option>
                            </select>
                        </div>
                        <div class="flex-1">
                            <label class="form-label" id="lbl_ins_num">Insurance No.</label>
                            <input type="text" name="insurance_number" id="insurance_number" class="form-input" value="<?= e($lead['insurance_number'] ?? '') ?>" placeholder="e.g. POL123...">
                        </div>
                    </div>
                    <div>
                        <label class="form-label" id="lbl_rto">RTO Status</label>
                        <select name="rto_status" id="rto_status" class="form-select">
                            <option value="pending" <?= ($lead['rto_status']=='pending') ? 'selected' : '' ?>>Pending</option>
                            <option value="done" <?= ($lead['rto_status']=='done') ? 'selected' : '' ?>>Done</option>
                            <option value="not_applicable" <?= ($lead['rto_status']=='not_applicable') ? 'selected' : '' ?>>N/A</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- Bank Details (Required for Agents) -->
            <div class="mt-6 border-t border-slate-100 dark:border-slate-800 pt-6">
                <h3 class="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-2">
                    <span class="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-brand-600 dark:text-brand-400 text-xs shadow-sm">🏦</span>
                    Client Bank Details
                </h3>
                <p class="text-xs text-rose-500 mb-4 font-semibold">* Required if assigning an Agent.</p>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label class="form-label" id="lbl_bank_name">Bank Name</label>
                        <input type="text" name="customer_bank_name" id="customer_bank_name" class="form-input"
                               value="<?= e($lead['customer_bank_name'] ?? '') ?>" placeholder="e.g. HDFC Bank">
                    </div>
                    <div>
                        <label class="form-label" id="lbl_acc_num">Account Number</label>
                        <input type="text" name="customer_account_number" id="customer_account_number" class="form-input"
                               value="<?= e($lead['customer_account_number'] ?? '') ?>" placeholder="e.g. 50100...">
                    </div>
                    <div>
                        <label class="form-label" id="lbl_ifsc">IFSC Code</label>
                        <input type="text" name="customer_ifsc_code" id="customer_ifsc_code" class="form-input"
                               value="<?= e($lead['customer_ifsc_code'] ?? '') ?>" placeholder="e.g. HDFC0001234">
                    </div>
                </div>
            </div>

            <div class="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <a href="<?= BASE_URL ?>/leads/view.php?id=<?= urlencode($lead['lead_id']) ?>" 
                   class="btn btn-secondary py-2.5">Cancel</a>
                <button type="submit" 
                        class="btn-primary py-2.5 shadow-md hover-glow">
                    Save Assignment
                </button>
            </div>
        </form>
    </div>
</div>


<script>
document.addEventListener('DOMContentLoaded', function() {
    const agentSelect = document.querySelector('select[name="agent_id"]');
    const bankInputs = ['customer_bank_name', 'customer_account_number', 'customer_ifsc_code'];
    const lblPrefix = ['lbl_bank_name', 'lbl_acc_num', 'lbl_ifsc'];
    
    const docSelects = ['rc_status', 'insurance_status', 'rto_status'];
    const docLbls = ['lbl_rc', 'lbl_ins', 'lbl_rto'];

    function validateAgentRequirements() {
        const isAgentSelected = agentSelect.value !== "";
        
        // Bank Requirements
        bankInputs.forEach((id, index) => {
            document.getElementById(id).required = isAgentSelected;
            const lbl = document.getElementById(lblPrefix[index]);
            if (isAgentSelected) {
                lbl.classList.add('required-lbl');
            } else {
                lbl.classList.remove('required-lbl');
            }
        });
        
        // Document Requirements (Can't be "pending" if agent is selected)
        docSelects.forEach((id, index) => {
            const lbl = document.getElementById(docLbls[index]);
            if (isAgentSelected) {
                lbl.classList.add('required-lbl');
            } else {
                lbl.classList.remove('required-lbl');
            }
        });
        
        // Toggle RC/Insurance number requirements based on status
        const rcStatus = document.getElementById('rc_status').value;
        const insStatus = document.getElementById('insurance_status').value;
        
        const reqRcNum = isAgentSelected && rcStatus === 'received';
        document.getElementById('rc_number').required = reqRcNum;
        if (reqRcNum) document.getElementById('lbl_rc_num').classList.add('required-lbl');
        else document.getElementById('lbl_rc_num').classList.remove('required-lbl');
        
        const reqInsNum = isAgentSelected && insStatus === 'received';
        document.getElementById('insurance_number').required = reqInsNum;
        if (reqInsNum) document.getElementById('lbl_ins_num').classList.add('required-lbl');
        else document.getElementById('lbl_ins_num').classList.remove('required-lbl');
    }

    // Form submission validation for Document Status
    document.querySelector('form').addEventListener('submit', function(e) {
        if (agentSelect.value !== "") {
            let hasPendingDoc = false;
            docSelects.forEach(id => {
                if (document.getElementById(id).value === 'pending') {
                    hasPendingDoc = true;
                    document.getElementById(id).style.borderColor = '#ef4444';
                } else {
                    document.getElementById(id).style.borderColor = '';
                }
            });
            if (hasPendingDoc) {
                e.preventDefault();
                alert('You must update the Document Status (RC, Insurance, RTO) from "Pending" before assigning an Agent.');
            }
        }
    });

    agentSelect.addEventListener('change', validateAgentRequirements);
    document.getElementById('rc_status').addEventListener('change', validateAgentRequirements);
    document.getElementById('insurance_status').addEventListener('change', validateAgentRequirements);
    validateAgentRequirements(); // Run on load
});
</script>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
