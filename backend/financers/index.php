<?php
// financers/index.php
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';
require_role('admin', 'staff');
$pageTitle = 'Finance';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verify_csrf()) die('Invalid CSRF');
    
    // Handle delete POST
    if (isset($_POST['delete_id'])) {
        if (!is_admin()) {
            flash('error', 'Only administrators can delete finance units.');
        } else {
            $deleteId = (int)$_POST['delete_id'];
            db_query($conn, "DELETE FROM financers WHERE id = ?", 'i', [$deleteId]);
            flash('success', 'Finance unit deleted.');
        }
        header('Location: ' . BASE_URL . '/financers/index.php');
        exit;
    }

    // Handle add/edit POST
    $name    = trim($_POST['name'] ?? '');
    $dsaCode = trim($_POST['dsa_code'] ?? '');
    $contact = trim($_POST['contact_person'] ?? '');
    $mobile  = trim($_POST['mobile'] ?? '');
    $email   = trim($_POST['email'] ?? '');
    $notes   = trim($_POST['notes'] ?? '');
    $editId  = (int)($_POST['edit_id'] ?? 0);
    if ($name) {
        if ($editId) {
            db_query($conn,"UPDATE financers SET name=?,dsa_code=?,contact_person=?,mobile=?,email=?,notes=? WHERE id=?","ssssssi",[$name,$dsaCode,$contact,$mobile,$email,$notes,$editId]);
            flash('success','Finance unit updated.');
        } else {
            db_query($conn,"INSERT INTO financers (name,dsa_code,contact_person,mobile,email,notes) VALUES (?,?,?,?,?,?)","ssssss",[$name,$dsaCode,$contact,$mobile,$email,$notes]);
            flash('success','Finance unit added.');
        }
    }
    header('Location: ' . BASE_URL . '/financers/index.php'); exit;
}
if (isset($_GET['toggle'])) {
    db_query($conn,"UPDATE financers SET is_active=1-is_active WHERE id=?",'i',[(int)$_GET['toggle']]);
    header('Location: ' . BASE_URL . '/financers/index.php'); exit;
}

$financers = db_fetch_all($conn,"
    SELECT f.*, 
           (SELECT COUNT(*) FROM agents WHERE financer_id = f.id) as agents_count,
           COUNT(l.id) as leads_count,
           SUM(l.loan_amount) as total_loan,
           SUM(CASE WHEN l.status='disbursed' THEN 1 ELSE 0 END) as disbursed
    FROM financers f LEFT JOIN leads l ON l.financer_id=f.id
    GROUP BY f.id ORDER BY f.is_active DESC, f.name
");

$headerActions = '<button onclick="openModal(\'addModal\')" class="btn btn-primary btn-sm">
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
    Add Finance Unit
</button>';
require_once __DIR__ . '/../includes/header.php';
?>

<div class="card">
    <div class="overflow-x-auto">
        <table id="financersTable" class="w-full text-sm">
            <thead>
                <tr>
                    <th class="w-12">#</th>
                    <th>Finance Unit</th>
                    <th>DSA Code</th>
                    <th>Contact Person</th>
                    <th>Contact Info</th>
                    <th class="text-center">Agents</th>
                    <th class="text-center">Leads</th>
                    <th class="text-center">Disbursed</th>
                    <th>Total Loan Value</th>
                    <th>Notes</th>
                    <th>Status</th>
                    <th class="text-center">Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($financers as $i => $f): ?>
                <tr>
                    <td class="text-slate-400 font-mono text-xs"><?= $i+1 ?></td>
                    <td class="font-extrabold text-slate-800 dark:text-slate-200"><?= e($f['name']) ?></td>
                    <td class="text-slate-600 dark:text-slate-400 font-mono text-sm"><?= e($f['dsa_code'] ?? '—') ?></td>
                    <td class="text-slate-600 dark:text-slate-400 text-sm"><?= e($f['contact_person'] ?? '—') ?></td>
                    <td class="text-xs">
                        <?php if(!empty($f['mobile'])): ?>
                        <a href="tel:<?= e($f['mobile']) ?>" class="hover:text-brand-500 font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1 mb-1">
                            <svg class="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                            <?= e($f['mobile']) ?>
                        </a>
                        <?php endif; ?>
                        <?php if(!empty($f['email'])): ?>
                        <a href="mailto:<?= e($f['email']) ?>" class="hover:text-brand-500 font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <svg class="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                            <?= e($f['email']) ?>
                        </a>
                        <?php endif; ?>
                        <?php if(empty($f['mobile']) && empty($f['email'])) echo '—'; ?>
                    </td>
                    <td class="text-center font-extrabold text-brand-600 dark:text-brand-400"><?= $f['agents_count'] ?></td>
                    <td class="text-center font-extrabold text-slate-800 dark:text-slate-200"><?= $f['leads_count'] ?></td>
                    <td class="text-center font-extrabold text-emerald-600 dark:text-emerald-400"><?= $f['disbursed'] ?></td>
                    <td class="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono whitespace-nowrap">
                        <?= $f['total_loan'] ? format_currency((float)$f['total_loan']) : '—' ?>
                    </td>
                    <td class="text-slate-500 dark:text-slate-400 text-xs max-w-xs truncate"><?= e($f['notes'] ?? '—') ?></td>
                    <td>
                        <span class="badge <?= $f['is_active'] ? 'badge-green' : 'badge-gray' ?>">
                            <?= $f['is_active'] ? 'Active' : 'Inactive' ?>
                        </span>
                    </td>
                    <td>
                        <div class="flex items-center justify-center gap-1.5">
                            <button onclick='editRow(<?= json_encode($f) ?>)'
                                    class="p-2 text-brand-600 hover:text-brand-900 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/40 dark:hover:bg-brand-950/80 rounded-xl transition-all duration-300 shadow-sm cursor-pointer" title="Edit">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                            </button>
                            <a href="?toggle=<?= $f['id'] ?>"
                               class="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-all duration-300 shadow-sm"
                               title="<?= $f['is_active'] ? 'Disable' : 'Enable' ?>">
                               <?php if ($f['is_active']): ?>
                                   <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                               <?php else: ?>
                                   <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"/></svg>
                               <?php endif; ?>
                            </a>
                            <?php if (is_admin()): ?>
                            <form method="POST" action="" class="inline-block" onsubmit="return confirm('<?= $f['leads_count'] > 0 ? 'WARNING: This financer has ' . $f['leads_count'] . ' associated leads. Deleting this financer will set their leads to None. Are you sure you want to delete ' . e(addslashes($f['name'])) . '?' : 'Are you sure you want to delete financer ' . e(addslashes($f['name'])) . '?' ?>');">
                                <?= csrf_field() ?>
                                <input type="hidden" name="delete_id" value="<?= $f['id'] ?>">
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

<div id="addModal" class="modal-backdrop hidden" onclick="if(event.target===this)closeFinModal()">
    <div class="modal-panel">
        <div class="modal-header">
            <h3 id="modalTitle" class="font-bold text-slate-700 dark:text-white uppercase tracking-wider">Add Finance Unit</h3>
            <button onclick="closeFinModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 text-2xl cursor-pointer">×</button>
        </div>
        <form method="POST" class="modal-body space-y-4">
            <?= csrf_field() ?>
            <input type="hidden" name="edit_id" id="editId" value="0">
            <div>
                <label class="form-label required-lbl">Finance Unit Name</label>
                <input name="name" id="fName" class="form-input" required placeholder="Financer business name">
            </div>
            <div>
                <label class="form-label">DSA Code</label>
                <input name="dsa_code" id="fDsaCode" class="form-input" placeholder="e.g. HDFC-1234">
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label class="form-label">Contact Person</label>
                    <input name="contact_person" id="fContact" class="form-input" placeholder="e.g. Sales Exec">
                </div>
                <div>
                    <label class="form-label">Mobile</label>
                    <input name="mobile" id="fMobile" class="form-input" placeholder="10-digit mobile">
                </div>
                <div>
                    <label class="form-label">Email Address</label>
                    <input type="email" name="email" id="fEmail" class="form-input" placeholder="Email">
                </div>
            </div>
            <div>
                <label class="form-label">Notes</label>
                <textarea name="notes" id="fNotes" class="form-input resize-none" rows="2" placeholder="Financing rates, conditions, contact details..."></textarea>
            </div>
            <div class="modal-footer">
                <button type="button" onclick="closeFinModal()" class="btn btn-secondary">Cancel</button>
                <button type="submit" class="btn btn-primary">Save</button>
            </div>
        </form>
    </div>
</div>

<script>
$(document).ready(function(){initTable('#financersTable',{columnDefs:[{orderable:false,targets:9}]})});
function editRow(r){
    document.getElementById('modalTitle').textContent='Edit Finance Unit';
    document.getElementById('editId').value=r.id;
    document.getElementById('fName').value=r.name||'';
    document.getElementById('fDsaCode').value=r.dsa_code||'';
    document.getElementById('fContact').value=r.contact_person||'';
    document.getElementById('fMobile').value=r.mobile||'';
    document.getElementById('fEmail').value=r.email||'';
    document.getElementById('fNotes').value=r.notes||'';
    openModal('addModal');
}
function closeFinModal(){
    closeModal('addModal');
    document.getElementById('editId').value='0';
    document.getElementById('modalTitle').textContent='Add Finance Unit';
}
</script>
<?php require_once __DIR__ . '/../includes/footer.php'; ?>
