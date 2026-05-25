<?php
// commissions/index.php — Payout & Commission Tracking
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';
require_role('admin', 'staff');
$pageTitle      = 'Commissions & Payouts';
$pageBreadcrumb = 'Commission Tracking';

// Handle add commission POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verify_csrf()) die('Invalid CSRF');
    $leadDbId  = (int)($_POST['lead_db_id'] ?? 0);
    $agentId   = (int)($_POST['agent_id'] ?? 0) ?: null;
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
    $editId    = (int)($_POST['edit_id'] ?? 0);

    // Sanitize dates/modes
    $payout90Date = $payout90Date ?: null;
    $payout90Mode = $payout90Mode ?: null;
    $payout10Date = $payout10Date ?: null;
    $payout10Mode = $payout10Mode ?: null;

    // Auto-calculate total paid_amount
    $paidAmt = ($payout90Status === 'paid' ? $commAmt * 0.90 : 0.0) + ($payout10Status === 'paid' ? $commAmt * 0.10 : 0.0) + $additionalPayout;

    // Map backwards-compatible fields for simple reports
    $payDate = null;
    $payMode = null;
    if ($payout10Status === 'paid') {
        $payDate = $payout10Date;
        $payMode = $payout10Mode;
    } elseif ($payout90Status === 'paid') {
        $payDate = $payout90Date;
        $payMode = $payout90Mode;
    }

    if ($leadDbId) {
        if ($editId) {
            $stmt = $conn->prepare("
                UPDATE commissions 
                SET agent_id=?, commission_amount=?, paid_amount=?, payment_date=?, payment_mode=?, notes=?,
                    payout_90_status=?, payout_90_date=?, payout_90_mode=?,
                    payout_10_status=?, payout_10_date=?, payout_10_mode=?,
                    additional_payout=?
                WHERE id=?
            ");
            $stmt->bind_param(
                'iddsssssssssdi',
                $agentId, $commAmt, $paidAmt, $payDate, $payMode, $notes,
                $payout90Status, $payout90Date, $payout90Mode,
                $payout10Status, $payout10Date, $payout10Mode,
                $additionalPayout, $editId
            );
            $stmt->execute();
            log_lead_action($conn, $leadDbId, 'Commission Updated', "Commission updated: Total ₹" . number_format($commAmt) . ", Paid ₹" . number_format($paidAmt), current_user_id());
            flash('success', 'Commission details updated.');
        } else {
            $stmt = $conn->prepare("
                INSERT INTO commissions (
                    lead_id, agent_id, commission_amount, paid_amount, payment_date, payment_mode, notes,
                    payout_90_status, payout_90_date, payout_90_mode,
                    payout_10_status, payout_10_date, payout_10_mode,
                    additional_payout
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->bind_param(
                'iiddsssssssssd',
                $leadDbId, $agentId, $commAmt, $paidAmt, $payDate, $payMode, $notes,
                $payout90Status, $payout90Date, $payout90Mode,
                $payout10Status, $payout10Date, $payout10Mode,
                $additionalPayout
            );
            $stmt->execute();
            log_lead_action($conn, $leadDbId, 'Commission Recorded', "Commission recorded: Total ₹" . number_format($commAmt) . ", Paid ₹" . number_format($paidAmt), current_user_id());
            flash('success', 'Commission details recorded.');
        }
    }
    header('Location: ' . BASE_URL . '/commissions/index.php'); exit;
}

// Summary stats
$totalComm = db_fetch_one($conn,"SELECT SUM(commission_amount) as t FROM commissions")['t'] ?? 0;
$totalPaid = db_fetch_one($conn,"SELECT SUM(paid_amount) as t FROM commissions")['t'] ?? 0;
$totalDue  = $totalComm - $totalPaid;

$commissions = db_fetch_all($conn,"
    SELECT c.*, c.lead_id as lead_db_id, l.lead_id as lead_str_id, l.customer_name, l.loan_amount, l.status as lead_status,
           l.rc_status, l.insurance_status, l.rto_status,
           a.name as agent_name
    FROM commissions c
    JOIN leads l ON c.lead_id=l.id
    LEFT JOIN agents a ON c.agent_id=a.id
    ORDER BY c.created_at DESC
");

$leads  = db_fetch_all($conn,"SELECT id, lead_id, customer_name FROM leads WHERE status IN('approved','disbursed') ORDER BY lead_id");
$agents = db_fetch_all($conn,"SELECT id, name FROM agents WHERE is_active=1 ORDER BY name");

$headerActions = '<button onclick="openModal(\'addModal\')" class="btn btn-primary btn-sm flex items-center gap-1.5 cursor-pointer">
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
    Record Commission
</button>';
require_once __DIR__ . '/../includes/header.php';
?>

<!-- Summary Cards -->
<div class="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
    <div class="kpi-panel">
        <div class="kpi-icon-container bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </div>
        <div>
            <div class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Commission</div>
            <div class="text-2xl font-extrabold text-slate-800 dark:text-white mt-1 font-mono"><?= format_currency((float)$totalComm) ?></div>
        </div>
    </div>
    <div class="kpi-panel">
        <div class="kpi-icon-container bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </div>
        <div>
            <div class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Net Paid Amount</div>
            <div class="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 font-mono"><?= format_currency((float)$totalPaid) ?></div>
        </div>
    </div>
    <div class="kpi-panel">
        <div class="kpi-icon-container bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </div>
        <div>
            <div class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Pending Balances</div>
            <div class="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1 font-mono"><?= format_currency((float)$totalDue) ?></div>
        </div>
    </div>
</div>

<div class="card">
    <div class="overflow-x-auto">
        <table id="commTable" class="w-full text-sm">
            <thead>
                <tr>
                    <th>Lead ID</th>
                    <th>Customer</th>
                    <th>Loan Amt</th>
                    <th>Agent</th>
                    <th>Total Comm</th>
                    <th>90% Initial</th>
                    <th>10% Retention</th>
                    <th>Additional</th>
                    <th>Net Paid</th>
                    <th>Balance Due</th>
                    <th class="text-center">Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($commissions as $c):
                    $due = (float)$c['commission_amount'] - (float)$c['paid_amount'];
                    
                    // Check retention release eligibility
                    $isEligible = ($c['rc_status'] === 'received' && $c['insurance_status'] === 'received' && $c['rto_status'] === 'done');
                ?>
                <tr>
                    <td>
                        <a href="<?php echo BASE_URL; ?>/leads/view.php?id=<?= e($c['lead_str_id']) ?>" class="text-brand-600 dark:text-brand-400 hover:underline font-mono text-xs font-black">
                            <?= e($c['lead_str_id']) ?>
                        </a>
                    </td>
                    <td class="font-bold text-slate-800 dark:text-slate-200"><?= e($c['customer_name']) ?></td>
                    <td class="text-xs font-mono text-slate-600 dark:text-slate-400"><?= $c['loan_amount'] ? format_currency((float)$c['loan_amount']) : '—' ?></td>
                    <td class="text-slate-600 dark:text-slate-400 text-xs font-medium"><?= e($c['agent_name'] ?? '—') ?></td>
                    <td class="font-bold text-slate-850 dark:text-slate-200 font-mono"><?= format_currency((float)$c['commission_amount']) ?></td>
                    
                    <!-- 90% Initial -->
                    <td>
                        <div class="flex flex-col gap-0.5">
                            <?php if (($c['payout_90_status'] ?? 'pending') === 'paid'): ?>
                                <span class="badge badge-emerald self-start">✓ Paid</span>
                                <?php if ($c['payout_90_date'] ?? null): ?>
                                    <span class="text-[10px] text-slate-400 font-mono"><?= date('d M y', strtotime($c['payout_90_date'])) ?> (<?= ucfirst(str_replace('_',' ',$c['payout_90_mode'] ?? '')) ?>)</span>
                                <?php endif; ?>
                            <?php else: ?>
                                <span class="badge badge-yellow self-start">⚡ Pending</span>
                                <span class="text-[10px] text-slate-400 font-mono">₹<?= number_format(($c['commission_amount'] ?? 0) * 0.90, 2) ?></span>
                            <?php endif; ?>
                        </div>
                    </td>
                    
                    <!-- 10% Retention -->
                    <td>
                        <div class="flex flex-col gap-0.5">
                            <?php if (($c['payout_10_status'] ?? 'pending') === 'paid'): ?>
                                <span class="badge badge-emerald self-start">✓ Paid</span>
                                <?php if ($c['payout_10_date'] ?? null): ?>
                                    <span class="text-[10px] text-slate-400 font-mono"><?= date('d M y', strtotime($c['payout_10_date'])) ?> (<?= ucfirst(str_replace('_',' ',$c['payout_10_mode'] ?? '')) ?>)</span>
                                <?php endif; ?>
                            <?php else: ?>
                                <span class="badge badge-gray self-start">⚡ Pending</span>
                                <span class="text-[10px] text-slate-400 font-mono">₹<?= number_format(($c['commission_amount'] ?? 0) * 0.10, 2) ?></span>
                                <?php if ($isEligible): ?>
                                    <span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">✓ Eligible</span>
                                <?php else: ?>
                                    <span class="text-[10px] text-amber-500 dark:text-amber-400 font-medium">⚠️ Held (Docs)</span>
                                <?php endif; ?>
                            <?php endif; ?>
                        </div>
                    </td>
                    
                    <!-- Additional Payout -->
                    <td class="font-mono text-xs text-slate-600 dark:text-slate-400"><?= ($c['additional_payout'] ?? 0) > 0 ? format_currency((float)($c['additional_payout'] ?? 0)) : '—' ?></td>
                    
                    <!-- Net Paid -->
                    <td class="font-bold text-emerald-600 dark:text-emerald-400 font-mono"><?= format_currency((float)$c['paid_amount']) ?></td>
                    
                    <!-- Balance Due -->
                    <td class="font-bold font-mono <?= $due > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-300 dark:text-slate-700' ?>"><?= format_currency($due) ?></td>
                    
                    <td>
                        <div class="flex items-center justify-center">
                            <button onclick='editComm(<?= json_encode($c) ?>)'
                                    class="p-2 text-brand-600 hover:text-brand-900 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/40 dark:hover:bg-brand-950/80 rounded-xl transition-all duration-300 shadow-sm cursor-pointer" title="Edit">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
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
<div id="addModal" class="modal-backdrop hidden" onclick="if(event.target===this)closeCommModal()">
    <div class="modal-panel" style="max-width:36rem">
        <div class="modal-header">
            <h3 id="modalTitle" class="font-bold text-slate-700 dark:text-white uppercase tracking-wider">Record Commission</h3>
            <button onclick="closeCommModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 text-2xl cursor-pointer">×</button>
        </div>
        <form method="POST" class="modal-body space-y-4">
            <?= csrf_field() ?>
            <input type="hidden" name="edit_id" id="editId" value="0">
            
            <div class="grid grid-cols-2 gap-4">
                <div class="col-span-2">
                    <label class="form-label required-lbl">Lead</label>
                    <select name="lead_db_id" id="fLead" class="form-select" required>
                        <option value="">— Select Lead —</option>
                        <?php foreach ($leads as $l): ?>
                        <option value="<?= $l['id'] ?>"><?= e($l['lead_id']) ?> — <?= e($l['customer_name']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                
                <div>
                    <label class="form-label">Agent</label>
                    <select name="agent_id" id="fAgent" class="form-select">
                        <option value="">— Select —</option>
                        <?php foreach ($agents as $a): ?>
                        <option value="<?= $a['id'] ?>"><?= e($a['name']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                
                <div>
                    <label class="form-label">Total Commission Amount (₹)</label>
                    <input type="number" name="commission_amount" id="fComm" class="form-input font-mono font-bold text-slate-800" step="100" value="0" required>
                    <div id="splitCalculator" class="text-[11px] text-brand-600 dark:text-brand-400 mt-1 font-semibold flex justify-between">
                        <span>90% = ₹0.00</span>
                        <span>10% = ₹0.00</span>
                    </div>
                </div>
                
                <!-- 90% Initial Split Card -->
                <div class="col-span-2 md:col-span-1 border border-slate-100 dark:border-slate-800/60 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-900/30">
                    <h4 class="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-3 flex justify-between items-center">
                        <span>90% Initial Payout</span>
                        <span id="label90" class="text-brand-600 dark:text-brand-400 font-mono">₹0.00</span>
                    </h4>
                    <div class="space-y-3">
                        <div>
                            <label class="form-label text-xs">Status</label>
                            <select name="payout_90_status" id="fP90Status" class="form-select text-sm py-1.5">
                                <option value="pending">Pending</option>
                                <option value="paid">Paid</option>
                            </select>
                        </div>
                        <div>
                            <label class="form-label text-xs">Payment Date</label>
                            <input type="date" name="payout_90_date" id="fP90Date" class="form-input text-sm py-1.5">
                        </div>
                        <div>
                            <label class="form-label text-xs">Payment Mode</label>
                            <select name="payout_90_mode" id="fP90Mode" class="form-select text-sm py-1.5">
                                <option value="">— Select —</option>
                                <option value="bank_transfer">Bank Transfer</option>
                                <option value="cash">Cash</option>
                                <option value="cheque">Cheque</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <!-- 10% Retention Split Card -->
                <div class="col-span-2 md:col-span-1 border border-slate-100 dark:border-slate-800/60 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-900/30">
                    <h4 class="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-3 flex justify-between items-center">
                        <span>10% Retention Payout</span>
                        <span id="label10" class="text-brand-600 dark:text-brand-400 font-mono">₹0.00</span>
                    </h4>
                    <div class="space-y-3">
                        <div>
                            <label class="form-label text-xs">Status</label>
                            <select name="payout_10_status" id="fP10Status" class="form-select text-sm py-1.5">
                                <option value="pending">Pending</option>
                                <option value="paid">Paid</option>
                            </select>
                        </div>
                        <div>
                            <label class="form-label text-xs">Payment Date</label>
                            <input type="date" name="payout_10_date" id="fP10Date" class="form-input text-sm py-1.5">
                        </div>
                        <div>
                            <label class="form-label text-xs">Payment Mode</label>
                            <select name="payout_10_mode" id="fP10Mode" class="form-select text-sm py-1.5">
                                <option value="">— Select —</option>
                                <option value="bank_transfer">Bank Transfer</option>
                                <option value="cash">Cash</option>
                                <option value="cheque">Cheque</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <div class="col-span-2 grid grid-cols-2 gap-4">
                    <div>
                        <label class="form-label">Additional Payout (₹)</label>
                        <input type="number" name="additional_payout" id="fAddPayout" class="form-input font-mono" step="100" value="0">
                    </div>
                    <div>
                        <label class="form-label">Net Received (Paid Calc)</label>
                        <input type="text" id="fPaidCalc" class="form-input font-mono bg-slate-50 text-slate-500 border-slate-200" readonly value="₹0.00">
                    </div>
                </div>
                
                <div class="col-span-2">
                    <label class="form-label">Notes</label>
                    <input type="text" name="notes" id="fNotes" class="form-input" placeholder="Transaction details, transaction ID, bank reference...">
                </div>
            </div>
            
            <div class="modal-footer">
                <button type="button" onclick="closeCommModal()" class="btn btn-secondary">Cancel</button>
                <button type="submit" class="btn btn-primary">Save Details</button>
            </div>
        </form>
    </div>
</div>

<script>
$(document).ready(function(){
    initTable('#commTable',{columnDefs:[{orderable:false,targets:10}]});
    
    // Dynamic Modal Calculators
    const commInput = document.getElementById('fComm');
    const p90Status = document.getElementById('fP90Status');
    const p10Status = document.getElementById('fP10Status');
    const addInput = document.getElementById('fAddPayout');
    
    function reCalc() {
        const val = parseFloat(commInput.value) || 0;
        const add = parseFloat(addInput.value) || 0;
        
        const part90 = (val * 0.90).toFixed(2);
        const part10 = (val * 0.10).toFixed(2);
        
        document.getElementById('splitCalculator').innerHTML = `
            <span>90% = ₹${parseFloat(part90).toLocaleString('en-IN', {minimumFractionDigits:2})}</span>
            <span>10% = ₹${parseFloat(part10).toLocaleString('en-IN', {minimumFractionDigits:2})}</span>
        `;
        document.getElementById('label90').textContent = `₹${parseFloat(part90).toLocaleString('en-IN', {minimumFractionDigits:2})}`;
        document.getElementById('label10').textContent = `₹${parseFloat(part10).toLocaleString('en-IN', {minimumFractionDigits:2})}`;
        
        // Paid calculation
        let paid = 0;
        if (p90Status.value === 'paid') paid += val * 0.90;
        if (p10Status.value === 'paid') paid += val * 0.10;
        paid += add;
        
        document.getElementById('fPaidCalc').value = `₹${paid.toLocaleString('en-IN', {minimumFractionDigits:2})}`;
        
        // Toggle date/mode requirement based on status
        document.getElementById('fP90Date').required = (p90Status.value === 'paid');
        document.getElementById('fP90Mode').required = (p90Status.value === 'paid');
        document.getElementById('fP10Date').required = (p10Status.value === 'paid');
        document.getElementById('fP10Mode').required = (p10Status.value === 'paid');
    }
    
    commInput.addEventListener('input', reCalc);
    p90Status.addEventListener('change', reCalc);
    p10Status.addEventListener('change', reCalc);
    addInput.addEventListener('input', reCalc);
    
    window.reCalcCommissions = reCalc;
});

function editComm(c){
    document.getElementById('modalTitle').textContent='Edit Commission';
    document.getElementById('editId').value=c.id;
    document.getElementById('fLead').value=c.lead_db_id||c.lead_id||'';
    document.getElementById('fAgent').value=c.agent_id||'';
    document.getElementById('fComm').value=c.commission_amount||0;
    
    document.getElementById('fP90Status').value=c.payout_90_status||'pending';
    document.getElementById('fP90Date').value=c.payout_90_date||'';
    document.getElementById('fP90Mode').value=c.payout_90_mode||'';
    
    document.getElementById('fP10Status').value=c.payout_10_status||'pending';
    document.getElementById('fP10Date').value=c.payout_10_date||'';
    document.getElementById('fP10Mode').value=c.payout_10_mode||'';
    
    document.getElementById('fAddPayout').value=c.additional_payout||0;
    document.getElementById('fNotes').value=c.notes||'';
    
    if (window.reCalcCommissions) window.reCalcCommissions();
    openModal('addModal');
}

function closeCommModal(){
    closeModal('addModal');
    document.getElementById('editId').value='0';
    document.getElementById('modalTitle').textContent='Record Commission';
    document.getElementById('fLead').value='';
    document.getElementById('fAgent').value='';
    document.getElementById('fComm').value='0';
    document.getElementById('fP90Status').value='pending';
    document.getElementById('fP90Date').value='';
    document.getElementById('fP90Mode').value='';
    document.getElementById('fP10Status').value='pending';
    document.getElementById('fP10Date').value='';
    document.getElementById('fP10Mode').value='';
    document.getElementById('fAddPayout').value='0';
    document.getElementById('fNotes').value='';
    if (window.reCalcCommissions) window.reCalcCommissions();
}
</script>
<?php require_once __DIR__ . '/../includes/footer.php'; ?>
