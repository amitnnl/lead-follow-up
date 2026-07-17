<?php
// commissions/index.php — Payout & Commission Tracking
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';
require_role('admin', 'staff', 'finance_manager');
$pageTitle      = 'Commissions & Payouts';
$pageBreadcrumb = 'Commission Tracking';

// Handle Clawback POST
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'clawback') {
    if (!verify_csrf()) die('Invalid CSRF');
    $commissionId = (int)($_POST['commission_id'] ?? 0);
    $reversalAmt  = (float)($_POST['reversal_amount'] ?? 0);
    $reversalDate = $_POST['reversal_date'] ?: date('Y-m-d');
    $reason       = trim($_POST['reason'] ?? '');
    
    if ($commissionId && $reversalAmt > 0) {
        $comm = db_fetch_one($conn, "SELECT * FROM commissions WHERE id=?", 'i', [$commissionId]);
        if ($comm) {
            db_query($conn, "INSERT INTO clawbacks (commission_id, lead_id, agent_id, reversal_amount, reversal_date, reason, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)", 'iiidssi', [$commissionId, $comm['lead_id'], $comm['agent_id'], $reversalAmt, $reversalDate, $reason, current_user_id()]);
            // Deduct from balance payout (Profit)
            db_query($conn, "UPDATE commissions SET balance_payout = balance_payout - ? WHERE id=?", 'di', [$reversalAmt, $commissionId]);
            log_lead_action($conn, $comm['lead_id'], 'Commission Clawback', "Clawback initiated: ₹" . number_format($reversalAmt) . " Reason: " . $reason, current_user_id());
            flash('success', 'Clawback processed successfully.');
        }
    }
    header('Location: ' . BASE_URL . '/commissions/index.php'); exit;
}

// Handle add commission POST
if ($_SERVER['REQUEST_METHOD'] === 'POST' && empty($_POST['action'])) {
    if (!verify_csrf()) die('Invalid CSRF');
    $leadDbId  = (int)($_POST['lead_db_id'] ?? 0);
    $agentId   = (int)($_POST['agent_id'] ?? 0) ?: null;
    $editId    = (int)($_POST['edit_id'] ?? 0);
    $notes     = trim($_POST['notes'] ?? '');

    // Advanced Payouts Data
    $payoutMonth = trim($_POST['payout_month'] ?? '');
    $irr         = (float)($_POST['irr_percentage'] ?? 0);
    $payoutPct   = (float)($_POST['payout_percentage'] ?? 0);
    $gross       = (float)($_POST['gross_payout'] ?? 0);
    $tds         = (float)($_POST['tds_amount'] ?? 0);
    $gst         = (float)($_POST['gst_amount'] ?? 0);
    $net         = (float)($_POST['net_payout'] ?? 0);
    $channelPaid = (float)($_POST['channel_paid_amount'] ?? 0);
    $channelDate = $_POST['channel_payment_date'] ?: null;
    $balance     = (float)($_POST['balance_payout'] ?? 0);

    // Old split data (preserved for backwards compatibility, mostly hidden)
    $payout90Status = $_POST['payout_90_status'] ?? 'pending';
    $payout90Date   = $_POST['payout_90_date'] ?: null;
    $payout90Mode   = $_POST['payout_90_mode'] ?: null;
    $payout10Status = $_POST['payout_10_status'] ?? 'pending';
    $payout10Date   = $_POST['payout_10_date'] ?: null;
    $payout10Mode   = $_POST['payout_10_mode'] ?: null;
    $additionalPayout = (float)($_POST['additional_payout'] ?? 0);
    
    // We can map the old commission_amount to gross, and paid_amount to net to not break legacy reports
    $commAmt = $gross;
    $paidAmt = $net;

    if ($leadDbId) {
        if ($editId) {
            $oldComm = db_fetch_one($conn, "SELECT c.*, a.mobile as agent_phone, a.name as agent_name, l.lead_id as lead_str_id FROM commissions c LEFT JOIN agents a ON c.agent_id=a.id JOIN leads l ON c.lead_id=l.id WHERE c.id=?", 'i', [$editId]);
            $stmt = $conn->prepare("
                UPDATE commissions 
                SET agent_id=?, commission_amount=?, paid_amount=?, notes=?,
                    payout_month=?, irr_percentage=?, payout_percentage=?,
                    gross_payout=?, tds_amount=?, gst_amount=?, net_payout=?,
                    channel_paid_amount=?, channel_payment_date=?, balance_payout=?,
                    payout_90_status=?, payout_90_date=?, payout_90_mode=?,
                    payout_10_status=?, payout_10_date=?, payout_10_mode=?,
                    additional_payout=?
                WHERE id=?
            ");
            $stmt->bind_param(
                'iddssdddddddssssssssdi',
                $agentId, $commAmt, $paidAmt, $notes,
                $payoutMonth, $irr, $payoutPct,
                $gross, $tds, $gst, $net,
                $channelPaid, $channelDate, $balance,
                $payout90Status, $payout90Date, $payout90Mode,
                $payout10Status, $payout10Date, $payout10Mode,
                $additionalPayout, $editId
            );
            $stmt->execute();
            
            if ($oldComm && $oldComm['agent_phone']) {
                require_once __DIR__ . '/../includes/notifications.php';
                if ($oldComm['payout_90_status'] !== 'paid' && $payout90Status === 'paid') {
                    notify_agent_payout($conn, $agentId, $oldComm['agent_name'], $oldComm['agent_phone'], $net * 0.9, $oldComm['lead_str_id']);
                }
                if ($oldComm['payout_10_status'] !== 'paid' && $payout10Status === 'paid') {
                    notify_agent_payout($conn, $agentId, $oldComm['agent_name'], $oldComm['agent_phone'], $net * 0.1, $oldComm['lead_str_id']);
                }
            }

            log_lead_action($conn, $leadDbId, 'Commission Updated', "Updated Payout: Gross ₹" . number_format($gross) . ", Profit ₹" . number_format($balance), current_user_id());
            flash('success', 'Payout details updated.');
        } else {
            $stmt = $conn->prepare("
                INSERT INTO commissions (
                    lead_id, agent_id, commission_amount, paid_amount, notes,
                    payout_month, irr_percentage, payout_percentage,
                    gross_payout, tds_amount, gst_amount, net_payout,
                    channel_paid_amount, channel_payment_date, balance_payout,
                    payout_90_status, payout_90_date, payout_90_mode,
                    payout_10_status, payout_10_date, payout_10_mode,
                    additional_payout
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->bind_param(
                'iiddssdddddddssssssssd',
                $leadDbId, $agentId, $commAmt, $paidAmt, $notes,
                $payoutMonth, $irr, $payoutPct,
                $gross, $tds, $gst, $net,
                $channelPaid, $channelDate, $balance,
                $payout90Status, $payout90Date, $payout90Mode,
                $payout10Status, $payout10Date, $payout10Mode,
                $additionalPayout
            );
            $stmt->execute();
            log_lead_action($conn, $leadDbId, 'Commission Recorded', "Recorded Payout: Gross ₹" . number_format($gross) . ", Profit ₹" . number_format($balance), current_user_id());
            flash('success', 'Payout details recorded.');
        }
    }
    header('Location: ' . BASE_URL . '/commissions/index.php'); exit;
}

// Summary stats
$totalGross = db_fetch_one($conn,"SELECT SUM(gross_payout) as t FROM commissions")['t'] ?? 0;
$totalNet   = db_fetch_one($conn,"SELECT SUM(net_payout) as t FROM commissions")['t'] ?? 0;
$totalProfit = db_fetch_one($conn,"SELECT SUM(balance_payout) as t FROM commissions")['t'] ?? 0;

$commissions = db_fetch_all($conn,"
    SELECT c.*, c.lead_id as lead_db_id, l.lead_id as lead_str_id, l.customer_name, l.loan_amount, l.status as lead_status,
           l.disbursement_date, l.financer_branch,
           a.name as agent_name
    FROM commissions c
    JOIN leads l ON c.lead_id=l.id
    LEFT JOIN agents a ON c.agent_id=a.id
    ORDER BY c.created_at DESC
");

$leads  = db_fetch_all($conn,"SELECT id, lead_id, customer_name, loan_amount FROM leads WHERE status IN('approved','disbursed') ORDER BY lead_id");
$agents = db_fetch_all($conn,"SELECT id, name FROM agents WHERE is_active=1 ORDER BY name");

$headerActions = '<button onclick="openModal(\'addModal\')" class="btn btn-primary flex items-center gap-1.5 cursor-pointer">
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
    Record Payout
</button>';
require_once __DIR__ . '/../includes/header.php';
?>

<!-- Summary Cards -->
<div class="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
    <div class="kpi-panel">
        <div class="kpi-icon-container bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </div>
        <div>
            <div class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Gross Payout</div>
            <div class="text-2xl font-extrabold text-slate-800 dark:text-white mt-1 font-mono"><?= format_currency((float)$totalGross) ?></div>
        </div>
    </div>
    <div class="kpi-panel">
        <div class="kpi-icon-container bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </div>
        <div>
            <div class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Net Received (from Financer)</div>
            <div class="text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-1 font-mono"><?= format_currency((float)$totalNet) ?></div>
        </div>
    </div>
    <div class="kpi-panel">
        <div class="kpi-icon-container bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
        </div>
        <div>
            <div class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Profit (Balance)</div>
            <div class="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 font-mono"><?= format_currency((float)$totalProfit) ?></div>
        </div>
    </div>
</div>

<div class="card">
    <div class="overflow-x-auto">
        <table id="commTable" class="w-full text-sm whitespace-nowrap">
            <thead>
                <tr>
                    <th>Month</th>
                    <th>Loan A/C (Lead)</th>
                    <th>Customer</th>
                    <th>Loan Amt / IRR</th>
                    <th>Gross</th>
                    <th>TDS / GST</th>
                    <th>Net Received</th>
                    <th>Channel Paid</th>
                    <th>Profit</th>
                    <th class="text-center">Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($commissions as $c): ?>
                <tr>
                    <td class="font-bold text-slate-600 dark:text-slate-400"><?= e($c['payout_month'] ?: '—') ?></td>
                    <td>
                        <a href="<?php echo BASE_URL; ?>/leads/view.php?id=<?= e($c['lead_str_id']) ?>" class="text-brand-600 dark:text-brand-400 hover:underline font-mono text-xs font-black">
                            <?= e($c['lead_str_id']) ?>
                        </a>
                    </td>
                    <td class="font-bold text-slate-800 dark:text-slate-200">
                        <?= e($c['customer_name']) ?>
                        <div class="text-[10px] text-slate-400 font-normal"><?= e($c['financer_branch'] ?: '—') ?></div>
                    </td>
                    <td>
                        <div class="font-mono text-xs text-slate-800 dark:text-slate-200"><?= format_currency((float)$c['loan_amount']) ?></div>
                        <div class="text-[10px] text-slate-500">IRR: <span class="font-bold"><?= (float)($c['irr_percentage']??0) ?>%</span> | Pct: <span class="font-bold"><?= (float)($c['payout_percentage']??0) ?>%</span></div>
                    </td>
                    <td class="font-bold text-slate-850 dark:text-slate-200 font-mono"><?= format_currency((float)$c['gross_payout']) ?></td>
                    <td>
                        <div class="text-[10px] text-slate-500 font-mono border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 inline-block">
                            <span class="text-rose-500 font-semibold" title="TDS">₹<?= number_format((float)$c['tds_amount'], 2) ?></span> /
                            <span class="text-amber-600 dark:text-amber-500 font-semibold" title="GST">₹<?= number_format((float)$c['gst_amount'], 2) ?></span>
                        </div>
                    </td>
                    <td class="font-bold text-blue-600 dark:text-blue-400 font-mono"><?= format_currency((float)$c['net_payout']) ?></td>
                    <td>
                        <div class="font-bold text-slate-600 dark:text-slate-400 font-mono"><?= format_currency((float)$c['channel_paid_amount']) ?></div>
                        <div class="text-[10px] text-slate-400"><?= e($c['agent_name'] ?: 'Direct') ?> <?= $c['channel_payment_date'] ? '('.date('d/m/y', strtotime($c['channel_payment_date'])).')' : '' ?></div>
                    </td>
                    <td class="font-extrabold text-emerald-600 dark:text-emerald-400 font-mono bg-emerald-50/50 dark:bg-emerald-900/10"><?= format_currency((float)$c['balance_payout']) ?></td>
                    
                    <td>
                        <div class="flex items-center justify-center gap-1.5">
                            <a href="<?php echo BASE_URL; ?>/commissions/statement.php?id=<?= $c['id'] ?>" target="_blank"
                               class="p-2 text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/80 rounded-xl transition-all duration-300 shadow-sm cursor-pointer" title="Print Statement">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                            </a>
                            <button onclick='editComm(<?= json_encode($c) ?>)'
                                    class="p-2 text-brand-600 hover:text-brand-900 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/40 dark:hover:bg-brand-950/80 rounded-xl transition-all duration-300 shadow-sm cursor-pointer" title="Edit">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                            </button>
                            <button onclick='openClawbackModal(<?= $c['id'] ?>, <?= json_encode($c['customer_name']) ?>, <?= (float)$c['balance_payout'] ?>)'
                                    class="p-2 text-rose-600 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/80 rounded-xl transition-all duration-300 shadow-sm cursor-pointer" title="Clawback (Reverse)">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            </button>
                        </div>
                    </td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>

<!-- Modal -->
<div id="addModal" class="modal-backdrop hidden overflow-y-auto" onclick="if(event.target===this)closeCommModal()">
    <div class="modal-panel my-8 mx-auto" style="max-width:54rem">
        <div class="modal-header">
            <h3 id="modalTitle" class="font-bold text-slate-700 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <svg class="w-5 h-5 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                Payout Calculator
            </h3>
            <button onclick="closeCommModal()" type="button" class="text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 text-2xl cursor-pointer">×</button>
        </div>
        <form method="POST" class="modal-body space-y-6">
            <?= csrf_field() ?>
            <input type="hidden" name="edit_id" id="editId" value="0">
            
            <!-- Section 1: Basic Info -->
            <div class="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label class="form-label required-lbl">Lead / Loan A/C</label>
                    <select name="lead_db_id" id="fLead" class="form-select" required onchange="updateLoanAmount()">
                        <option value="">— Select Lead —</option>
                        <?php foreach ($leads as $l): ?>
                        <option value="<?= $l['id'] ?>" data-loan="<?= $l['loan_amount'] ?>"><?= e($l['lead_id']) ?> — <?= e($l['customer_name']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div>
                    <label class="form-label">Month</label>
                    <input type="text" name="payout_month" id="fMonth" class="form-input" placeholder="e.g. A-APR">
                </div>
                <div>
                    <label class="form-label">Agent (Channel Name)</label>
                    <select name="agent_id" id="fAgent" class="form-select">
                        <option value="">— Direct / None —</option>
                        <?php foreach ($agents as $a): ?>
                        <option value="<?= $a['id'] ?>"><?= e($a['name']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div>
                    <label class="form-label text-slate-500">Loan Amount</label>
                    <input type="text" id="dispLoan" class="form-input bg-slate-100 dark:bg-slate-900 border-dashed text-slate-500 font-mono" readonly value="0">
                </div>
                <div>
                    <label class="form-label">IRR (%)</label>
                    <input type="number" step="0.01" name="irr_percentage" id="fIrr" class="form-input font-mono" placeholder="18.50">
                </div>
                <div>
                    <label class="form-label">Payout (%)</label>
                    <input type="number" step="0.01" name="payout_percentage" id="fPayoutPct" class="form-input font-mono" placeholder="1.50">
                </div>
            </div>

            <!-- Section 2: Payout Math -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <!-- Gross to Net -->
                <div class="md:col-span-2 space-y-4">
                    <h4 class="text-sm font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 pb-2">1. Financer Payout</h4>
                    
                    <div class="grid grid-cols-2 gap-4">
                        <div class="col-span-2">
                            <label class="form-label text-brand-600 dark:text-brand-400 font-bold">Gross Payout Amount (₹)</label>
                            <input type="number" step="0.01" name="gross_payout" id="fGross" class="form-input font-mono text-lg font-bold border-brand-200 dark:border-brand-800 focus:border-brand-500 focus:ring-brand-500" value="0" required>
                        </div>
                        
                        <div>
                            <label class="form-label text-rose-600 dark:text-rose-400 text-xs">TDS Amount (5%)</label>
                            <div class="relative">
                                <span class="absolute left-3 top-2.5 text-slate-400">₹</span>
                                <input type="number" step="0.01" name="tds_amount" id="fTds" class="form-input font-mono pl-8 text-rose-600 bg-rose-50/30 dark:bg-rose-900/10" value="0">
                            </div>
                        </div>
                        
                        <div>
                            <label class="form-label text-amber-600 dark:text-amber-500 text-xs">GST Amount (18%)</label>
                            <div class="relative">
                                <span class="absolute left-3 top-2.5 text-slate-400">₹</span>
                                <input type="number" step="0.01" name="gst_amount" id="fGst" class="form-input font-mono pl-8 text-amber-600 bg-amber-50/30 dark:bg-amber-900/10" value="0">
                            </div>
                        </div>
                        
                        <div class="col-span-2 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                            <label class="form-label text-blue-700 dark:text-blue-400 font-bold">Net Payout Received (₹)</label>
                            <div class="relative">
                                <span class="absolute left-3 top-3 text-blue-500 font-bold">₹</span>
                                <input type="number" step="0.01" name="net_payout" id="fNet" class="form-input font-mono font-bold text-xl pl-8 text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-900 border-blue-200" value="0" readonly>
                            </div>
                            <div class="text-[10px] text-blue-500 mt-1">Calculated as: Gross - TDS - GST</div>
                        </div>
                    </div>
                </div>

                <!-- Agent Payment -->
                <div class="space-y-4">
                    <h4 class="text-sm font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 pb-2">2. Channel Distribution</h4>
                    
                    <div>
                        <label class="form-label text-slate-700 dark:text-slate-300">Channel Paid Amount (₹)</label>
                        <input type="number" step="0.01" name="channel_paid_amount" id="fChannelPaid" class="form-input font-mono" value="0">
                    </div>
                    
                    <div>
                        <label class="form-label text-slate-700 dark:text-slate-300">Payment Date</label>
                        <input type="date" name="channel_payment_date" id="fChannelDate" class="form-input text-sm">
                    </div>
                    
                    <div class="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800 mt-4">
                        <label class="form-label text-emerald-700 dark:text-emerald-400 font-bold text-lg">Balance Payout (Profit)</label>
                        <div class="relative mt-2">
                            <span class="absolute left-3 top-3 text-emerald-500 font-bold">₹</span>
                            <input type="number" step="0.01" name="balance_payout" id="fBalance" class="form-input font-mono font-black text-2xl pl-8 text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-900 border-emerald-200 shadow-inner" value="0" readonly>
                        </div>
                        <div class="text-[10px] text-emerald-600 mt-1">Calculated as: Net Received - Channel Paid</div>
                    </div>
                </div>
            </div>
            
            <!-- Details -->
            <div>
                <label class="form-label">Notes</label>
                <input type="text" name="notes" id="fNotes" class="form-input" placeholder="Any additional notes...">
            </div>
            
            <!-- Legacy Fields (Hidden) -->
            <div class="hidden">
                <input type="hidden" name="payout_90_status" id="fP90Status" value="pending">
                <input type="hidden" name="payout_10_status" id="fP10Status" value="pending">
                <input type="hidden" name="payout_90_date" id="fP90Date" value="">
                <input type="hidden" name="payout_10_date" id="fP10Date" value="">
                <input type="hidden" name="payout_90_mode" id="fP90Mode" value="">
                <input type="hidden" name="payout_10_mode" id="fP10Mode" value="">
                <input type="hidden" name="additional_payout" id="fAddPayout" value="0">
            </div>
            
            <div class="modal-footer pt-4 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onclick="closeCommModal()" class="btn btn-secondary px-6">Cancel</button>
                <button type="submit" class="btn btn-primary px-8">Save Payout Details</button>
            </div>
        </form>
    </div>
</div>

<!-- Clawback Modal -->
<div id="clawbackModal" class="modal-backdrop hidden overflow-y-auto" onclick="if(event.target===this)closeClawbackModal()">
    <div class="modal-panel my-8 mx-auto" style="max-width:32rem">
        <div class="modal-header border-b border-rose-100 dark:border-rose-900/30">
            <h3 class="font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                Initiate Clawback
            </h3>
            <button onclick="closeClawbackModal()" type="button" class="text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 text-2xl cursor-pointer">×</button>
        </div>
        <form method="POST" class="modal-body space-y-4">
            <?= csrf_field() ?>
            <input type="hidden" name="action" value="clawback">
            <input type="hidden" name="commission_id" id="cbCommId" value="">
            
            <p class="text-sm text-slate-600 dark:text-slate-400">
                Customer: <strong id="cbCustomer" class="text-slate-800 dark:text-slate-200"></strong><br>
                Available Balance: <strong id="cbBalance" class="text-emerald-600 dark:text-emerald-400"></strong>
            </p>
            
            <div>
                <label class="form-label required-lbl">Reversal Amount (₹)</label>
                <input type="number" step="0.01" name="reversal_amount" id="cbAmount" class="form-input text-rose-600 font-bold border-rose-200 focus:border-rose-500 focus:ring-rose-500" required>
            </div>
            <div>
                <label class="form-label required-lbl">Reversal Date</label>
                <input type="date" name="reversal_date" class="form-input" value="<?= date('Y-m-d') ?>" required>
            </div>
            <div>
                <label class="form-label required-lbl">Reason</label>
                <textarea name="reason" class="form-input resize-none h-20" placeholder="e.g. Loan cancelled by customer..." required></textarea>
            </div>
            
            <div class="modal-footer pt-4 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onclick="closeClawbackModal()" class="btn btn-secondary px-6">Cancel</button>
                <button type="submit" class="btn bg-rose-600 hover:bg-rose-700 text-white px-8">Process Clawback</button>
            </div>
        </form>
    </div>
</div>

<script>
$(document).ready(function(){
    initTable('#commTable',{columnDefs:[{orderable:false,targets:9}]});
    
    // Auto Calculators
    const fGross = document.getElementById('fGross');
    const fTds = document.getElementById('fTds');
    const fGst = document.getElementById('fGst');
    const fNet = document.getElementById('fNet');
    const fChannelPaid = document.getElementById('fChannelPaid');
    const fBalance = document.getElementById('fBalance');
    
    // User typed in Gross Amount -> Auto calculate TDS(5%) and GST(18%)
    fGross.addEventListener('input', function() {
        const gross = parseFloat(this.value) || 0;
        
        // Only auto-calc if user hasn't manually overridden TDS/GST 
        // (For simplicity we just overwrite them on every gross change, they can adjust after)
        const tds = Math.round(gross * 0.05); // usually TDS is rounded
        const gst = parseFloat((gross * 0.18).toFixed(2));
        
        fTds.value = tds;
        fGst.value = gst;
        
        reCalcNet();
    });
    
    // Recalculate net and balance when tax or channel amounts change
    function reCalcNet() {
        const gross = parseFloat(fGross.value) || 0;
        const tds = parseFloat(fTds.value) || 0;
        const gst = parseFloat(fGst.value) || 0;
        const channelPaid = parseFloat(fChannelPaid.value) || 0;
        
        const net = parseFloat((gross - tds - gst).toFixed(2));
        fNet.value = net;
        
        const balance = parseFloat((net - channelPaid).toFixed(2));
        fBalance.value = balance;
    }
    
    fTds.addEventListener('input', reCalcNet);
    fGst.addEventListener('input', reCalcNet);
    fChannelPaid.addEventListener('input', reCalcNet);
});

function updateLoanAmount() {
    const leadSelect = document.getElementById('fLead');
    const opt = leadSelect.options[leadSelect.selectedIndex];
    if(opt && opt.dataset.loan) {
        document.getElementById('dispLoan').value = parseFloat(opt.dataset.loan).toLocaleString('en-IN');
    } else {
        document.getElementById('dispLoan').value = '0';
    }
}

function editComm(c){
    document.getElementById('modalTitle').innerHTML = '<svg class="w-5 h-5 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg> Edit Payout Details';
    document.getElementById('editId').value = c.id;
    document.getElementById('fLead').value = c.lead_db_id || c.lead_id || '';
    updateLoanAmount();
    
    document.getElementById('fMonth').value = c.payout_month || '';
    document.getElementById('fAgent').value = c.agent_id || '';
    document.getElementById('fIrr').value = c.irr_percentage || '';
    document.getElementById('fPayoutPct').value = c.payout_percentage || '';
    
    document.getElementById('fGross').value = c.gross_payout || 0;
    document.getElementById('fTds').value = c.tds_amount || 0;
    document.getElementById('fGst').value = c.gst_amount || 0;
    document.getElementById('fNet').value = c.net_payout || 0;
    document.getElementById('fChannelPaid').value = c.channel_paid_amount || 0;
    document.getElementById('fChannelDate').value = c.channel_payment_date || '';
    document.getElementById('fBalance').value = c.balance_payout || 0;
    
    document.getElementById('fNotes').value = c.notes || '';
    
    // Legacy mapping just in case
    document.getElementById('fP90Status').value = c.payout_90_status || 'pending';
    document.getElementById('fP10Status').value = c.payout_10_status || 'pending';
    document.getElementById('fP90Date').value = c.payout_90_date || '';
    document.getElementById('fP10Date').value = c.payout_10_date || '';
    document.getElementById('fP90Mode').value = c.payout_90_mode || '';
    document.getElementById('fP10Mode').value = c.payout_10_mode || '';
    document.getElementById('fAddPayout').value = c.additional_payout || 0;
    
    openModal('addModal');
}

function closeCommModal(){
    closeModal('addModal');
    document.getElementById('editId').value = '0';
    document.getElementById('modalTitle').innerHTML = '<svg class="w-5 h-5 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg> Payout Calculator';
    
    document.getElementById('fLead').value = '';
    document.getElementById('dispLoan').value = '0';
    document.getElementById('fMonth').value = '';
    document.getElementById('fAgent').value = '';
    document.getElementById('fIrr').value = '';
    document.getElementById('fPayoutPct').value = '';
    
    document.getElementById('fGross').value = '0';
    document.getElementById('fTds').value = '0';
    document.getElementById('fGst').value = '0';
    document.getElementById('fNet').value = '0';
    document.getElementById('fChannelPaid').value = '0';
    document.getElementById('fChannelDate').value = '';
    document.getElementById('fBalance').value = '0';
    document.getElementById('fNotes').value = '';
}

function openClawbackModal(commId, customerName, maxBalance) {
    document.getElementById('cbCommId').value = commId;
    document.getElementById('cbCustomer').innerText = customerName;
    document.getElementById('cbBalance').innerText = '₹' + maxBalance.toLocaleString('en-IN');
    document.getElementById('cbAmount').value = maxBalance;
    document.getElementById('cbAmount').max = maxBalance;
    openModal('clawbackModal');
}

function closeClawbackModal() {
    closeModal('clawbackModal');
    document.getElementById('cbCommId').value = '';
}
</script>
<?php require_once __DIR__ . '/../includes/footer.php'; ?>
