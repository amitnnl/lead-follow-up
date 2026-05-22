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
    $paidAmt   = (float)($_POST['paid_amount'] ?? 0);
    $payDate   = $_POST['payment_date'] ?? null;
    $payMode   = $_POST['payment_mode'] ?? null;
    $notes     = trim($_POST['notes'] ?? '');
    $editId    = (int)($_POST['edit_id'] ?? 0);

    if ($leadDbId) {
        if ($editId) {
            $stmt = $conn->prepare("UPDATE commissions SET agent_id=?,commission_amount=?,paid_amount=?,payment_date=?,payment_mode=?,notes=? WHERE id=?");
            $stmt->bind_param('iddsssi',$agentId,$commAmt,$paidAmt,$payDate,$payMode,$notes,$editId);
            $stmt->execute();
            flash('success','Commission updated.');
        } else {
            $stmt = $conn->prepare("INSERT INTO commissions (lead_id,agent_id,commission_amount,paid_amount,payment_date,payment_mode,notes) VALUES (?,?,?,?,?,?,?)");
            $stmt->bind_param('iiddsss',$leadDbId,$agentId,$commAmt,$paidAmt,$payDate,$payMode,$notes);
            $stmt->execute();
            flash('success','Commission added.');
        }
    }
    header('Location: ' . BASE_URL . '/commissions/index.php'); exit;
}

// Summary stats
$totalComm = db_fetch_one($conn,"SELECT SUM(commission_amount) as t FROM commissions")['t'] ?? 0;
$totalPaid = db_fetch_one($conn,"SELECT SUM(paid_amount) as t FROM commissions")['t'] ?? 0;
$totalDue  = $totalComm - $totalPaid;

$commissions = db_fetch_all($conn,"
    SELECT c.*, l.lead_id, l.customer_name, l.loan_amount, l.status as lead_status,
           a.name as agent_name
    FROM commissions c
    JOIN leads l ON c.lead_id=l.id
    LEFT JOIN agents a ON c.agent_id=a.id
    ORDER BY c.created_at DESC
");

$leads  = db_fetch_all($conn,"SELECT id, lead_id, customer_name FROM leads WHERE status IN('approved','disbursed') ORDER BY lead_id");
$agents = db_fetch_all($conn,"SELECT id, name FROM agents WHERE is_active=1 ORDER BY name");

$headerActions = '<button onclick="openModal(\'addModal\')" class="btn btn-primary btn-sm">
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
            <div class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Paid</div>
            <div class="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 font-mono"><?= format_currency((float)$totalPaid) ?></div>
        </div>
    </div>
    <div class="kpi-panel">
        <div class="kpi-icon-container bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </div>
        <div>
            <div class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Due / Pending</div>
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
                    <th>Lead Status</th>
                    <th>Agent</th>
                    <th>Commission</th>
                    <th>Paid</th>
                    <th>Due</th>
                    <th>Payment Date</th>
                    <th>Mode</th>
                    <th>Notes</th>
                    <th class="text-center">Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($commissions as $c):
                    $due = (float)$c['commission_amount'] - (float)$c['paid_amount'];
                ?>
                <tr>
                    <td>
                        <a href="<?= BASE_URL ?>/leads/view.php?id=<?= e($c['lead_id']) ?>" class="text-brand-600 dark:text-brand-400 hover:underline font-mono text-xs font-black">
                            <?= e($c['lead_id']) ?>
                        </a>
                    </td>
                    <td class="font-bold text-slate-800 dark:text-slate-200"><?= e($c['customer_name']) ?></td>
                    <td class="text-xs font-mono text-slate-600 dark:text-slate-400"><?= $c['loan_amount'] ? format_currency((float)$c['loan_amount']) : '—' ?></td>
                    <td><?= status_badge($c['lead_status']) ?></td>
                    <td class="text-slate-600 dark:text-slate-400 text-xs font-medium"><?= e($c['agent_name'] ?? '—') ?></td>
                    <td class="font-bold text-slate-850 dark:text-slate-200 font-mono"><?= format_currency((float)$c['commission_amount']) ?></td>
                    <td class="font-bold text-emerald-600 dark:text-emerald-400 font-mono"><?= format_currency((float)$c['paid_amount']) ?></td>
                    <td class="font-bold font-mono <?= $due > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400' ?>"><?= format_currency($due) ?></td>
                    <td class="text-slate-500 dark:text-slate-400 text-xs font-mono"><?= $c['payment_date'] ?? '—' ?></td>
                    <td>
                        <?php if ($c['payment_mode']): ?>
                        <span class="badge badge-blue">
                            <?= ucfirst(str_replace('_',' ',$c['payment_mode'])) ?>
                        </span>
                        <?php else: ?>—<?php endif; ?>
                    </td>
                    <td class="text-slate-500 dark:text-slate-400 text-xs font-medium max-w-xs truncate"><?= e($c['notes'] ?? '—') ?></td>
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
    <div class="modal-panel" style="max-width:32rem">
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
                    <label class="form-label">Commission Amount (₹)</label>
                    <input type="number" name="commission_amount" id="fComm" class="form-input" step="100" value="0">
                </div>
                <div>
                    <label class="form-label">Paid Amount (₹)</label>
                    <input type="number" name="paid_amount" id="fPaid" class="form-input" step="100" value="0">
                </div>
                <div>
                    <label class="form-label">Payment Date</label>
                    <input type="date" name="payment_date" id="fDate" class="form-input">
                </div>
                <div>
                    <label class="form-label">Payment Mode</label>
                    <select name="payment_mode" id="fMode" class="form-select">
                        <option value="">— Select —</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="cash">Cash</option>
                        <option value="cheque">Cheque</option>
                    </select>
                </div>
                <div class="col-span-2">
                    <label class="form-label">Notes</label>
                    <input type="text" name="notes" id="fNotes" class="form-input" placeholder="Transaction ref, details...">
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" onclick="closeCommModal()" class="btn btn-secondary">Cancel</button>
                <button type="submit" class="btn btn-primary">Save</button>
            </div>
        </form>
    </div>
</div>

<script>
$(document).ready(function(){initTable('#commTable',{columnDefs:[{orderable:false,targets:11}]})});
function editComm(c){
    document.getElementById('modalTitle').textContent='Edit Commission';
    document.getElementById('editId').value=c.id;
    document.getElementById('fLead').value=c.lead_id_db||c.lead_db_id||'';
    document.getElementById('fAgent').value=c.agent_id||'';
    document.getElementById('fComm').value=c.commission_amount||0;
    document.getElementById('fPaid').value=c.paid_amount||0;
    document.getElementById('fDate').value=c.payment_date||'';
    document.getElementById('fMode').value=c.payment_mode||'';
    document.getElementById('fNotes').value=c.notes||'';
    openModal('addModal');
}
function closeCommModal(){
    closeModal('addModal');
    document.getElementById('editId').value='0';
    document.getElementById('modalTitle').textContent='Record Commission';
}
</script>
<?php require_once __DIR__ . '/../includes/footer.php'; ?>
