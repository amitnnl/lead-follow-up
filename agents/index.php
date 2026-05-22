<?php
// agents/index.php — Agent Management
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';
require_role('admin', 'staff');
$pageTitle      = 'Agents';
$pageBreadcrumb = 'Agent Management';

// Handle add/edit POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verify_csrf()) die('Invalid CSRF');
    $name = trim($_POST['name'] ?? '');
    $mobile = trim($_POST['mobile'] ?? '');
    $email  = trim($_POST['email'] ?? '');
    $pan    = trim($_POST['pan_number'] ?? '');
    $bank   = trim($_POST['bank_account'] ?? '');
    $ifsc   = trim($_POST['ifsc_code'] ?? '');
    $editId = (int)($_POST['edit_id'] ?? 0);

    if ($name && $mobile) {
        if ($editId) {
            db_query($conn,
                "UPDATE agents SET name=?,mobile=?,email=?,pan_number=?,bank_account=?,ifsc_code=? WHERE id=?",
                'ssssssi', [$name,$mobile,$email,$pan,$bank,$ifsc,$editId]
            );
            flash('success', 'Agent updated.');
        } else {
            db_query($conn,
                "INSERT INTO agents (name,mobile,email,pan_number,bank_account,ifsc_code) VALUES (?,?,?,?,?,?)",
                'ssssss', [$name,$mobile,$email,$pan,$bank,$ifsc]
            );
            flash('success', 'Agent added.');
        }
    }
    header('Location: /lead-follow-up/agents/index.php');
    exit;
}

// Toggle active
if (isset($_GET['toggle'])) {
    $aid = (int)$_GET['toggle'];
    db_query($conn, "UPDATE agents SET is_active = 1-is_active WHERE id=?", 'i', [$aid]);
    header('Location: /lead-follow-up/agents/index.php');
    exit;
}

$agents = db_fetch_all($conn, "
    SELECT a.*, COUNT(l.id) as total_leads,
           SUM(CASE WHEN l.status='disbursed' THEN 1 ELSE 0 END) as disbursed_leads,
           SUM(CASE WHEN l.status='disbursed' THEN l.loan_amount ELSE 0 END) as total_loan_value
    FROM agents a
    LEFT JOIN leads l ON l.agent_id = a.id
    GROUP BY a.id
    ORDER BY a.is_active DESC, total_leads DESC
");

$headerActions = '<button onclick="openModal(\'addModal\')" class="btn btn-primary btn-sm">
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
    Add Agent
</button>';

require_once __DIR__ . '/../includes/header.php';
?>

<div class="card">
    <div class="overflow-x-auto">
        <table id="agentsTable" class="w-full text-sm">
            <thead>
                <tr>
                    <th class="w-12">#</th>
                    <th>Name</th>
                    <th>Mobile</th>
                    <th>Email</th>
                    <th>PAN</th>
                    <th>Bank Account</th>
                    <th>IFSC</th>
                    <th class="text-center">Leads</th>
                    <th class="text-center">Disbursed</th>
                    <th>Loan Value</th>
                    <th>Status</th>
                    <th class="text-center">Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($agents as $i => $agent): ?>
                <tr>
                    <td class="text-slate-400 font-mono text-xs"><?= $i+1 ?></td>
                    <td class="font-extrabold text-slate-800 dark:text-slate-200"><?= e($agent['name']) ?></td>
                    <td class="text-xs">
                        <a href="tel:<?= e($agent['mobile']) ?>" class="hover:text-brand-500 font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1">
                            <svg class="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                            <?= e($agent['mobile']) ?>
                        </a>
                    </td>
                    <td class="text-slate-500 dark:text-slate-400 text-xs"><?= e($agent['email'] ?? '—') ?></td>
                    <td class="text-slate-500 dark:text-slate-400 text-xs font-mono"><?= e($agent['pan_number'] ?? '—') ?></td>
                    <td class="text-slate-500 dark:text-slate-400 text-xs font-mono"><?= e($agent['bank_account'] ?? '—') ?></td>
                    <td class="text-slate-500 dark:text-slate-400 text-xs font-mono"><?= e($agent['ifsc_code'] ?? '—') ?></td>
                    <td class="text-center font-extrabold text-slate-800 dark:text-slate-200"><?= $agent['total_leads'] ?></td>
                    <td class="text-center font-extrabold text-emerald-600 dark:text-emerald-400"><?= $agent['disbursed_leads'] ?></td>
                    <td class="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono whitespace-nowrap">
                        <?= $agent['total_loan_value'] ? format_currency((float)$agent['total_loan_value']) : '—' ?>
                    </td>
                    <td>
                        <span class="badge <?= $agent['is_active'] ? 'badge-green' : 'badge-gray' ?>">
                            <?= $agent['is_active'] ? 'Active' : 'Inactive' ?>
                        </span>
                    </td>
                    <td>
                        <div class="flex items-center justify-center gap-1.5">
                            <button onclick="editAgent(<?= htmlspecialchars(json_encode($agent)) ?>)"
                                    class="p-2 text-brand-600 hover:text-brand-900 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/40 dark:hover:bg-brand-950/80 rounded-xl transition-all duration-300 shadow-sm cursor-pointer" title="Edit">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                            </button>
                            <a href="?toggle=<?= $agent['id'] ?>"
                               class="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-all duration-300 shadow-sm"
                               title="<?= $agent['is_active'] ? 'Disable' : 'Enable' ?>">
                               <?php if ($agent['is_active']): ?>
                                   <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                               <?php else: ?>
                                   <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"/></svg>
                               <?php endif; ?>
                            </a>
                        </div>
                    </td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>

<!-- Add/Edit Modal -->
<div id="addModal" class="modal-backdrop hidden" onclick="if(event.target===this)closeAgentModal()">
    <div class="modal-panel">
        <div class="modal-header">
            <h3 id="modalTitle" class="font-bold text-slate-700 dark:text-white uppercase tracking-wider">Add Agent</h3>
            <button onclick="closeAgentModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 text-2xl leading-none cursor-pointer">×</button>
        </div>
        <form method="POST" action="" class="modal-body space-y-4">
            <?= csrf_field() ?>
            <input type="hidden" name="edit_id" id="editId" value="0">
            <div class="grid grid-cols-2 gap-4">
                <div class="col-span-2">
                    <label class="form-label required-lbl">Full Name</label>
                    <input type="text" name="name" id="fName" class="form-input" required placeholder="Agent Name">
                </div>
                <div>
                    <label class="form-label required-lbl">Mobile</label>
                    <input type="tel" name="mobile" id="fMobile" class="form-input" required placeholder="10-digit mobile">
                </div>
                <div>
                    <label class="form-label">Email</label>
                    <input type="email" name="email" id="fEmail" class="form-input" placeholder="agent@email.com">
                </div>
                <div>
                    <label class="form-label">PAN Number</label>
                    <input type="text" name="pan_number" id="fPan" class="form-input" placeholder="ABCDE1234F">
                </div>
                <div>
                    <label class="form-label">Bank Account</label>
                    <input type="text" name="bank_account" id="fBank" class="form-input" placeholder="Account Number">
                </div>
                <div class="col-span-2">
                    <label class="form-label">IFSC Code</label>
                    <input type="text" name="ifsc_code" id="fIfsc" class="form-input" placeholder="SBIN0001234">
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" onclick="closeAgentModal()" class="btn btn-secondary">Cancel</button>
                <button type="submit" class="btn btn-primary">Save</button>
            </div>
        </form>
    </div>
</div>

<script>
$(document).ready(function() { initTable('#agentsTable', { columnDefs: [{ orderable: false, targets: 11 }] }); });

function editAgent(agent) {
    document.getElementById('modalTitle').textContent = 'Edit Agent';
    document.getElementById('editId').value  = agent.id;
    document.getElementById('fName').value   = agent.name || '';
    document.getElementById('fMobile').value = agent.mobile || '';
    document.getElementById('fEmail').value  = agent.email || '';
    document.getElementById('fPan').value    = agent.pan_number || '';
    document.getElementById('fBank').value   = agent.bank_account || '';
    document.getElementById('fIfsc').value   = agent.ifsc_code || '';
    openModal('addModal');
}
function closeAgentModal() {
    closeModal('addModal');
    document.getElementById('editId').value = '0';
    document.getElementById('modalTitle').textContent = 'Add Agent';
}
</script>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
