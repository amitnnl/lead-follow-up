<?php
// executives/index.php
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';
require_role('admin', 'staff');
$pageTitle = 'Finance Executives (SFE)';

// Add columns if they don't exist (silently fail if they do)
try {
    $conn->query("ALTER TABLE executives ADD COLUMN bank_account VARCHAR(100) NULL");
    $conn->query("ALTER TABLE executives ADD COLUMN ifsc VARCHAR(50) NULL");
    $conn->query("ALTER TABLE executives ADD COLUMN pan_number VARCHAR(50) NULL");
} catch (Exception $e) {
    // Ignore error if columns already exist
}


if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verify_csrf()) die('Invalid CSRF');
    
    // Handle delete POST
    if (isset($_POST['delete_id'])) {
        if (!is_admin()) {
            flash('error', 'Only administrators can delete executives.');
        } else {
            $deleteId = (int)$_POST['delete_id'];
            db_query($conn, "DELETE FROM executives WHERE id = ?", 'i', [$deleteId]);
            flash('success', 'Executive deleted.');
        }
        header('Location: ' . BASE_URL . '/executives/index.php');
        exit;
    }

    // Handle add/edit POST
    $name       = trim($_POST['name'] ?? '');
    $phone      = trim($_POST['phone'] ?? '');
    $email      = trim($_POST['email'] ?? '');
    $financer_id= (int)($_POST['financer_id'] ?? 0) ?: null;
    $bank_account = trim($_POST['bank_account'] ?? '');
    $ifsc         = trim($_POST['ifsc'] ?? '');
    $pan_number   = trim($_POST['pan_number'] ?? '');
    $editId     = (int)($_POST['edit_id'] ?? 0);

    if ($name) {
        if ($editId) {
            db_query($conn, "UPDATE executives SET name=?, mobile=?, email=?, financer_id=?, bank_account=?, ifsc=?, pan_number=? WHERE id=?", "sssisssi", [$name, $phone, $email, $financer_id, $bank_account, $ifsc, $pan_number, $editId]);
            flash('success', 'Executive updated.');
        } else {
            db_query($conn, "INSERT INTO executives (name, mobile, email, financer_id, bank_account, ifsc, pan_number) VALUES (?, ?, ?, ?, ?, ?, ?)", "sssisss", [$name, $phone, $email, $financer_id, $bank_account, $ifsc, $pan_number]);
            flash('success', 'Executive added.');
        }
    }
    header('Location: ' . BASE_URL . '/executives/index.php'); exit;
}
if (isset($_GET['toggle'])) {
    db_query($conn, "UPDATE executives SET is_active=1-is_active WHERE id=?", 'i', [(int)$_GET['toggle']]);
    header('Location: ' . BASE_URL . '/executives/index.php'); exit;
}

$executives = db_fetch_all($conn, "
    SELECT e.*, f.name as financer_name,
           COUNT(l.id) as leads_count,
           SUM(CASE WHEN l.status='disbursed' THEN 1 ELSE 0 END) as disbursed_count
    FROM executives e
    LEFT JOIN financers f ON e.financer_id = f.id
    LEFT JOIN leads l ON l.executive_id = e.id
    GROUP BY e.id
    ORDER BY e.is_active DESC, e.name
");

$allFinancers = db_fetch_all($conn, "SELECT id, name FROM financers WHERE is_active=1 ORDER BY name");

$headerActions = '<button onclick="openModal(\'addModal\')" class="btn btn-primary btn-sm">
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
    Add Executive
</button>';
require_once __DIR__ . '/../includes/header.php';
?>

<div class="card">
    <div class="overflow-x-auto">
        <table id="execTable" class="w-full text-sm">
            <thead>
                <tr>
                    <th class="w-12">#</th>
                    <th>Executive Name</th>
                    <th>Mobile</th>
                    <th>Email</th>
                    <th>Finance Unit (Bank)</th>
                    <th class="text-center">Assigned Leads</th>
                    <th class="text-center">Disbursed</th>
                    <th>Linked Login</th>
                    <th>Status</th>
                    <th class="text-center">Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($executives as $i => $e_row): ?>
                <tr>
                    <td class="text-slate-400 font-mono text-xs"><?= $i+1 ?></td>
                    <td class="font-extrabold text-slate-800 dark:text-slate-200"><?= e($e_row['name']) ?></td>
                    <td class="text-xs">
                        <a href="tel:<?= e($e_row['mobile'] ?? '') ?>" class="hover:text-brand-500 font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1">
                            <svg class="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                            <?= e($e_row['mobile'] ?? '—') ?>
                        </a>
                    </td>
                    <td class="text-slate-600 dark:text-slate-400 text-xs"><?= e($e_row['email'] ?? '—') ?></td>
                    <td class="font-semibold text-brand-600 dark:text-brand-400 text-xs"><?= e($e_row['financer_name'] ?? 'Unassigned') ?></td>
                    <td class="text-center font-extrabold text-slate-800 dark:text-slate-200"><?= $e_row['leads_count'] ?></td>
                    <td class="text-center font-extrabold text-emerald-600 dark:text-emerald-400"><?= $e_row['disbursed_count'] ?></td>
                    <td>
                        <?php if ($e_row['user_id']): ?>
                            <span class="badge badge-indigo text-[10px]">Yes (<?= $e_row['user_id'] ?>)</span>
                        <?php else: ?>
                            <span class="badge badge-gray text-[10px]">No</span>
                        <?php endif; ?>
                    </td>
                    <td>
                        <span class="badge <?= $e_row['is_active'] ? 'badge-green' : 'badge-gray' ?>">
                            <?= $e_row['is_active'] ? 'Active' : 'Inactive' ?>
                        </span>
                    </td>
                    <td>
                        <div class="flex items-center justify-center gap-1.5">
                            <button onclick='editRow(<?= htmlspecialchars(json_encode($e_row)) ?>)'
                                    class="p-2 text-brand-600 hover:text-brand-900 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/40 dark:hover:bg-brand-950/80 rounded-xl transition-all duration-300 shadow-sm cursor-pointer" title="Edit">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                            </button>
                            <a href="?toggle=<?= $e_row['id'] ?>"
                               class="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-all duration-300 shadow-sm"
                               title="<?= $e_row['is_active'] ? 'Disable' : 'Enable' ?>">
                               <?php if ($e_row['is_active']): ?>
                                   <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                               <?php else: ?>
                                   <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"/></svg>
                               <?php endif; ?>
                            </a>
                            <?php if (is_admin()): ?>
                            <form method="POST" action="" class="inline-block" onsubmit="return confirm('<?= $e_row['leads_count'] > 0 ? 'WARNING: This executive is assigned to ' . $e_row['leads_count'] . ' leads. Deleting them will unassign those leads. Are you sure you want to delete ' . e(addslashes($e_row['name'])) . '?' : 'Are you sure you want to delete ' . e(addslashes($e_row['name'])) . '?' ?>');">
                                <?= csrf_field() ?>
                                <input type="hidden" name="delete_id" value="<?= $e_row['id'] ?>">
                                <button type="submit" class="p-2 text-rose-600 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/80 rounded-xl transition-all duration-300 shadow-sm cursor-pointer" title="Delete">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                </button>
                            </form>
                            <?php endif; ?>
                        </div>
                    </td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>

<div id="addModal" class="modal-backdrop hidden" onclick="if(event.target===this)closeExecModal()">
    <div class="modal-panel">
        <div class="modal-header">
            <h3 id="modalTitle" class="font-bold text-slate-700 dark:text-white uppercase tracking-wider">Add Executive</h3>
            <button onclick="closeExecModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 text-2xl cursor-pointer">×</button>
        </div>
        <form method="POST" class="modal-body space-y-4">
            <?= csrf_field() ?>
            <input type="hidden" name="edit_id" id="editId" value="0">
            <div>
                <label class="form-label required-lbl">Executive Name</label>
                <input name="name" id="eName" class="form-input" required placeholder="Full Name">
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="form-label">Mobile</label>
                    <input name="phone" id="ePhone" class="form-input" placeholder="10-digit mobile">
                </div>
                <div>
                    <label class="form-label">Email</label>
                    <input name="email" id="eEmail" type="email" class="form-input" placeholder="Email Address">
                </div>
            </div>
            <div>
                <label class="form-label">Finance Unit (Bank)</label>
                <select name="financer_id" id="eFinancer" class="form-input">
                    <option value="">— Unassigned —</option>
                    <?php foreach ($allFinancers as $f): ?>
                    <option value="<?= $f['id'] ?>"><?= e($f['name']) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="form-label">Bank Account</label>
                    <input name="bank_account" id="eBankAccount" class="form-input" placeholder="Account Number">
                </div>
                <div>
                    <label class="form-label">IFSC Code</label>
                    <input name="ifsc" id="eIfsc" class="form-input" placeholder="IFSC Code">
                </div>
            </div>
            <div>
                <label class="form-label">PAN Number</label>
                <input name="pan_number" id="ePanNumber" class="form-input" placeholder="PAN Number">
            </div>
            <div class="modal-footer">
                <button type="button" onclick="closeExecModal()" class="btn btn-secondary">Cancel</button>
                <button type="submit" class="btn btn-primary">Save</button>
            </div>
        </form>
    </div>
</div>

<script>
$(document).ready(function(){initTable('#execTable',{columnDefs:[{orderable:false,targets:9}]})});
function editRow(r){
    document.getElementById('modalTitle').textContent='Edit Executive';
    document.getElementById('editId').value=r.id;
    document.getElementById('eName').value=r.name||'';
    document.getElementById('ePhone').value=r.mobile||'';
    document.getElementById('eEmail').value=r.email||'';
    document.getElementById('eFinancer').value=r.financer_id||'';
    document.getElementById('eBankAccount').value=r.bank_account||'';
    document.getElementById('eIfsc').value=r.ifsc||'';
    document.getElementById('ePanNumber').value=r.pan_number||'';
    openModal('addModal');
}
function closeExecModal(){
    closeModal('addModal');
    document.getElementById('editId').value='0';
    document.getElementById('modalTitle').textContent='Add Executive';
    document.getElementById('eBankAccount').value='';
    document.getElementById('eIfsc').value='';
    document.getElementById('ePanNumber').value='';
}
</script>
<?php require_once __DIR__ . '/../includes/footer.php'; ?>
