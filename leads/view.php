<?php
// leads/view.php — Lead Detail View
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';

$leadIdParam = $_GET['id'] ?? '';
$lead = db_fetch_one($conn, "
    SELECT l.*,
           a.name as agent_name, a.mobile as agent_mobile,
           f.name as financer_name,
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

$pageTitle      = 'Lead: ' . $lead['lead_id'];
$pageBreadcrumb = 'Leads / ' . $lead['lead_id'];

// Follow-ups
$followups = db_fetch_all($conn, "
    SELECT lf.*, u.name as done_by
    FROM lead_followups lf
    LEFT JOIN users u ON lf.created_by = u.id
    WHERE lf.lead_id = ?
    ORDER BY lf.followup_date DESC
", 'i', [$lead['id']]);

// Audit logs
$logs = db_fetch_all($conn, "
    SELECT ll.*, u.name as done_by
    FROM lead_logs ll
    LEFT JOIN users u ON ll.performed_by = u.id
    WHERE ll.lead_id = ?
    ORDER BY ll.created_at DESC LIMIT 20
", 'i', [$lead['id']]);

// Handle new follow-up POST
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['add_followup'])) {
    if (!verify_csrf()) die('Invalid CSRF token');
    $remarks  = trim($_POST['remarks'] ?? '');
    $nextDate = $_POST['next_followup_date'] ?? null;
    $newStatus = $_POST['new_status'] ?? $lead['status'];
    
    if ($remarks) {
        db_query($conn, "
            INSERT INTO lead_followups (lead_id, followup_date, next_followup_date, remarks, status_changed_to, created_by)
            VALUES (?,CURDATE(),?,?,?,?)
        ", 'isssi', [$lead['id'], $nextDate ?: null, $remarks, $newStatus, current_user_id()]);

        // Capture bank and document fields if provided
        $updateSql = "UPDATE leads SET status=?, status_date=CURDATE()";
        $updateParams = [$newStatus];
        $updateTypes = 's';
        
        if (is_admin() && $newStatus === 'disbursed') {
            $bank_name = trim($_POST['customer_bank_name'] ?? '');
            $acc_num   = trim($_POST['customer_account_number'] ?? '');
            $ifsc      = trim($_POST['customer_ifsc_code'] ?? '');
            $rc_status = $_POST['rc_status'] ?? $lead['rc_status'];
            $rc_number = trim($_POST['rc_number'] ?? '');
            $insurance_status = $_POST['insurance_status'] ?? $lead['insurance_status'];
            $insurance_number = trim($_POST['insurance_number'] ?? '');
            $rto_status = $_POST['rto_status'] ?? $lead['rto_status'];
            
            // Validate them
            if (!$bank_name || !$acc_num || !$ifsc) {
                flash('error', 'Bank details are required when disbursing.');
                header("Location: " . BASE_URL . "/leads/view.php?id=" . urlencode($lead['lead_id']));
                exit;
            }
            if ($rc_status === 'pending' || $insurance_status === 'pending' || $rto_status === 'pending') {
                flash('error', 'Document statuses must be completed (not Pending) when disbursing.');
                header("Location: " . BASE_URL . "/leads/view.php?id=" . urlencode($lead['lead_id']));
                exit;
            }

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
            $lead['status'] = $newStatus;
        }
        log_lead_action($conn, $lead['id'], 'Follow-up Added', $remarks, current_user_id());
        flash('success', 'Follow-up added successfully.');
        header("Location: " . BASE_URL . "/leads/view.php?id=" . urlencode($lead['lead_id']));
        exit;
    }
}

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

<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- Left: Lead Detail -->
    <div class="lg:col-span-2 space-y-6">
        <!-- Header Card -->
        <div class="card p-6">
            <div class="flex items-start justify-between flex-wrap gap-4">
                <div>
                    <div class="flex items-center gap-3 mb-1.5 flex-wrap">
                        <span class="text-xl font-extrabold font-mono text-brand-600 dark:text-brand-400"><?= e($lead['lead_id']) ?></span>
                        <?= status_badge($lead['status']) ?>
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
                        <a href="https://wa.me/91<?= preg_replace('/\D/','',$lead['customer_mobile']) ?>" target="_blank"
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

        <!-- Details Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        'Referred By'   => $lead['referred_by'],
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
                    $aFields = [
                        'Agent / DSA'   => $lead['agent_name'],
                        'Financer'      => $lead['financer_name'],
                        'Dealer'        => $lead['dealer_name'],
                        'SFE/Executive' => $lead['executive_name'],
                    ];
                    foreach ($aFields as $label => $val): ?>
                    <div class="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/40 pb-2 last:border-b-0 last:pb-0">
                        <dt class="text-slate-400 dark:text-slate-500 font-medium"><?= $label ?></dt>
                        <dd class="font-semibold text-slate-800 dark:text-slate-200"><?= $val ? e($val) : '<span class="text-slate-300 dark:text-slate-700">—</span>' ?></dd>
                    </div>
                    <?php endforeach; ?>
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

            <!-- Payout -->
            <div class="card p-6">
                <h3 class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800/40 pb-3">
                    <svg class="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    Payout Details
                </h3>
                <div class="text-center py-4 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-slate-100/60 dark:border-slate-800/30">
                    <div class="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-sec-500 font-mono">
                        <?= $lead['payout_amount'] ? format_currency((float)$lead['payout_amount']) : '—' ?>
                    </div>
                    <div class="mt-3">
                        <?php
                        $badgeCls = match($lead['payout_status']) {
                            'paid'    => 'badge-emerald',
                            'partial' => 'badge-yellow',
                            default   => 'badge-gray',
                        };
                        ?>
                        <span class="badge <?= $badgeCls ?>">
                            Status: <?= ucfirst($lead['payout_status']) ?>
                        </span>
                    </div>
                </div>
            </div>
        </div>

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
    </div>

    <!-- Right: Actions -->
    <div class="space-y-6">
        <!-- Add Follow-up -->
        <div class="card p-6">
            <h3 class="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800/40 pb-3">
                <svg class="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                Add Follow-up
            </h3>
            <form method="POST" action="" class="space-y-4" id="followUpForm">
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
                    <select name="new_status" id="new_status_select" class="form-select">
                        <?php foreach (['new','pending','approved','disbursed','rejected','on_hold'] as $s): ?>
                        <option value="<?= $s ?>" <?= ($lead['status'] === $s) ? 'selected' : '' ?>>
                            <?= ucfirst(str_replace('_',' ',$s)) ?>
                        </option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <?php if (is_admin()): ?>
                <div id="disbursed_fields" style="display: none;" class="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4 space-y-4">
                    <p class="text-xs text-rose-500 font-semibold">* Required for Disbursed status.</p>
                    
                    <h4 class="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-2">📄 Document Status</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="flex flex-col gap-2">
                            <label class="form-label text-xs">RC Status</label>
                            <select name="rc_status" id="fu_rc_status" class="form-select text-sm py-1.5">
                                <option value="pending" <?= ($lead['rc_status']=='pending') ? 'selected' : '' ?>>Pending</option>
                                <option value="received" <?= ($lead['rc_status']=='received') ? 'selected' : '' ?>>Received</option>
                                <option value="not_applicable" <?= ($lead['rc_status']=='not_applicable') ? 'selected' : '' ?>>N/A</option>
                            </select>
                            <input type="text" name="rc_number" id="fu_rc_number" class="form-input text-sm py-1.5 mt-1" value="<?= e($lead['rc_number'] ?? '') ?>" placeholder="RC Number">
                        </div>
                        <div class="flex flex-col gap-2">
                            <label class="form-label text-xs">Insurance Status</label>
                            <select name="insurance_status" id="fu_insurance_status" class="form-select text-sm py-1.5">
                                <option value="pending" <?= ($lead['insurance_status']=='pending') ? 'selected' : '' ?>>Pending</option>
                                <option value="received" <?= ($lead['insurance_status']=='received') ? 'selected' : '' ?>>Received</option>
                                <option value="not_applicable" <?= ($lead['insurance_status']=='not_applicable') ? 'selected' : '' ?>>N/A</option>
                            </select>
                            <input type="text" name="insurance_number" id="fu_insurance_number" class="form-input text-sm py-1.5 mt-1" value="<?= e($lead['insurance_number'] ?? '') ?>" placeholder="Insurance No.">
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
                </div>
                <script>
                document.addEventListener('DOMContentLoaded', function() {
                    const statusSelect = document.getElementById('new_status_select');
                    const disbursedFields = document.getElementById('disbursed_fields');
                    const bankInputs = ['fu_bank_name', 'fu_acc_num', 'fu_ifsc'];
                    const rcSelect = document.getElementById('fu_rc_status');
                    const rcNum = document.getElementById('fu_rc_number');
                    const insSelect = document.getElementById('fu_insurance_status');
                    const insNum = document.getElementById('fu_insurance_number');

                    function toggleDisbursedFields() {
                        const isDisbursed = statusSelect.value === 'disbursed';
                        if (disbursedFields) {
                            disbursedFields.style.display = isDisbursed ? 'block' : 'none';
                        }
                        
                        bankInputs.forEach(id => {
                            const el = document.getElementById(id);
                            if (el) el.required = isDisbursed;
                        });
                        
                        if (isDisbursed) {
                            rcNum.required = (rcSelect.value === 'received');
                            insNum.required = (insSelect.value === 'received');
                        } else {
                            if (rcNum) rcNum.required = false;
                            if (insNum) insNum.required = false;
                        }
                    }

                    if (statusSelect) {
                        statusSelect.addEventListener('change', toggleDisbursedFields);
                        toggleDisbursedFields(); // init
                    }
                    if (rcSelect) rcSelect.addEventListener('change', toggleDisbursedFields);
                    if (insSelect) insSelect.addEventListener('change', toggleDisbursedFields);
                    
                    const form = document.getElementById('followUpForm');
                    if (form) {
                        form.addEventListener('submit', function(e) {
                            if (statusSelect.value === 'disbursed') {
                                const rc = document.getElementById('fu_rc_status').value;
                                const ins = document.getElementById('fu_insurance_status').value;
                                const rto = document.getElementById('fu_rto_status').value;
                                if (rc === 'pending' || ins === 'pending' || rto === 'pending') {
                                    e.preventDefault();
                                    alert('Document statuses cannot be "Pending" when marking as disbursed.');
                                }
                            }
                        });
                    }
                });
                </script>
                <?php endif; ?>

                <button type="submit" class="w-full btn btn-primary mt-4">
                    Save Follow-up
                </button>
            </form>
        </div>

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
                <a href="https://wa.me/91<?= preg_replace('/\D/','',$lead['customer_mobile']) ?>"
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
                    Print Lead Sheet
                </a>
            </div>
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
                        <div class="text-slate-400 dark:text-slate-500 mt-1"><?= date('d M Y H:i', strtotime($log['created_at'])) ?> · <span class="font-semibold text-slate-500"><?= e($log['done_by'] ?? 'System') ?></span></div>
                    </div>
                </div>
                <?php endforeach; ?>
            </div>
        </div>
        <?php endif; ?>
    </div>
</div>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
