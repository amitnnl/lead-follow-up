<?php
// dealers/index.php
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';
require_role('admin', 'staff');
$pageTitle = 'Dealers';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verify_csrf()) die('Invalid CSRF');
    
    // Handle delete POST
    if (isset($_POST['delete_id'])) {
        if (!is_admin()) {
            flash('error', 'Only administrators can delete dealers.');
        } else {
            $deleteId = (int)$_POST['delete_id'];
            db_query($conn, "DELETE FROM dealers WHERE id = ?", 'i', [$deleteId]);
            flash('success', 'Dealer deleted.');
        }
        header('Location: ' . BASE_URL . '/dealers/index.php');
        exit;
    }

    // Handle add/edit POST
    $name    = trim($_POST['name'] ?? '');
    $contact = trim($_POST['contact_person'] ?? '');
    $mobile  = trim($_POST['mobile'] ?? '');
    $address = trim($_POST['address'] ?? '');
    $editId  = (int)($_POST['edit_id'] ?? 0);
    if ($name) {
        if ($editId) {
            db_query($conn,"UPDATE dealers SET name=?,contact_person=?,mobile=?,address=? WHERE id=?","sssssi",[$name,$contact,$mobile,$address,$editId]);
            flash('success','Dealer updated.');
        } else {
            db_query($conn,"INSERT INTO dealers (name,contact_person,mobile,address) VALUES (?,?,?,?)","ssss",[$name,$contact,$mobile,$address]);
            flash('success','Dealer added.');
        }
    }
    header('Location: ' . BASE_URL . '/dealers/index.php'); exit;
}
if (isset($_GET['toggle'])) {
    db_query($conn,"UPDATE dealers SET is_active=1-is_active WHERE id=?",'i',[(int)$_GET['toggle']]);
    header('Location: ' . BASE_URL . '/dealers/index.php'); exit;
}

$dealers = db_fetch_all($conn,"
    SELECT d.*, COUNT(l.id) as leads_count
    FROM dealers d LEFT JOIN leads l ON l.dealer_id=d.id
    GROUP BY d.id ORDER BY d.is_active DESC, d.name
");

$headerActions = '<button onclick="openModal(\'addModal\')" class="btn btn-primary btn-sm">
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
    Add Dealer
</button>';
require_once __DIR__ . '/../includes/header.php';
?>

<div class="card">
    <div class="overflow-x-auto">
        <table id="dealersTable" class="w-full text-sm">
            <thead>
                <tr>
                    <th class="w-12">#</th>
                    <th>Name</th>
                    <th>Contact Person</th>
                    <th>Mobile</th>
                    <th>Address</th>
                    <th class="text-center">Leads</th>
                    <th>Status</th>
                    <th class="text-center">Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($dealers as $i => $d): ?>
                <tr>
                    <td class="text-slate-400 font-mono text-xs"><?= $i+1 ?></td>
                    <td class="font-extrabold text-slate-800 dark:text-slate-200"><?= e($d['name']) ?></td>
                    <td class="text-slate-600 dark:text-slate-400 text-sm"><?= e($d['contact_person'] ?? '—') ?></td>
                    <td class="text-xs">
                        <a href="tel:<?= e($d['mobile']??'') ?>" class="hover:text-brand-500 font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1">
                            <svg class="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                            <?= e($d['mobile'] ?? '—') ?>
                        </a>
                        <?php if ($d['mobile']): ?>
                        <a href="<?= whatsapp_link($d['mobile'], 'Hello ' . trim(explode(' ', $d['name'])[0]) . ', ') ?>" target="_blank" class="hover:text-emerald-500 text-slate-400 flex items-center gap-1 mt-1 font-bold transition-colors">
                            <svg class="w-3.5 h-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.717-1.458L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.03-5.115-2.903-6.99C16.26 1.876 13.784.843 11.15.842 5.712.842 1.29 5.26 1.285 10.7c-.002 1.716.446 3.393 1.3 4.89l-.995 3.636 3.73-.978c1.477.806 3.011 1.233 4.73 1.233z"/></svg>
                            WhatsApp
                        </a>
                        <?php endif; ?>
                    </td>
                    <td class="text-slate-500 dark:text-slate-400 text-xs"><?= e($d['address'] ?? '—') ?></td>
                    <td class="text-center font-extrabold text-slate-800 dark:text-slate-200"><?= $d['leads_count'] ?></td>
                    <td>
                        <span class="badge <?= $d['is_active'] ? 'badge-green' : 'badge-gray' ?>">
                            <?= $d['is_active'] ? 'Active' : 'Inactive' ?>
                        </span>
                    </td>
                    <td>
                        <div class="flex items-center justify-center gap-1.5">
                            <button onclick='editRow(<?= json_encode($d) ?>)'
                                    class="p-2 text-brand-600 hover:text-brand-900 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/40 dark:hover:bg-brand-950/80 rounded-xl transition-all duration-300 shadow-sm cursor-pointer" title="Edit">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                            </button>
                            <a href="?toggle=<?= $d['id'] ?>"
                               class="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-all duration-300 shadow-sm"
                               title="<?= $d['is_active'] ? 'Disable' : 'Enable' ?>">
                               <?php if ($d['is_active']): ?>
                                   <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                               <?php else: ?>
                                   <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"/></svg>
                               <?php endif; ?>
                            </a>
                            <?php if (is_admin()): ?>
                            <form method="POST" action="" class="inline-block" onsubmit="return confirm('<?= $d['leads_count'] > 0 ? 'WARNING: This dealer has ' . $d['leads_count'] . ' associated leads. Deleting this dealer will set their leads to None. Are you sure you want to delete ' . e(addslashes($d['name'])) . '?' : 'Are you sure you want to delete dealer ' . e(addslashes($d['name'])) . '?' ?>');">
                                <?= csrf_field() ?>
                                <input type="hidden" name="delete_id" value="<?= $d['id'] ?>">
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

<div id="addModal" class="modal-backdrop hidden" onclick="if(event.target===this)closeDealerModal()">
    <div class="modal-panel">
        <div class="modal-header">
            <h3 id="modalTitle" class="font-bold text-slate-700 dark:text-white uppercase tracking-wider">Add Dealer</h3>
            <button onclick="closeDealerModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 text-2xl cursor-pointer">×</button>
        </div>
        <form method="POST" class="modal-body space-y-4">
            <?= csrf_field() ?>
            <input type="hidden" name="edit_id" id="editId" value="0">
            <div>
                <label class="form-label required-lbl">Dealer Name</label>
                <input name="name" id="fName" class="form-input" required placeholder="Dealer business name">
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="form-label">Contact Person</label>
                    <input name="contact_person" id="fContact" class="form-input" placeholder="e.g. Amit Kumar">
                </div>
                <div>
                    <label class="form-label">Mobile</label>
                    <input name="mobile" id="fMobile" class="form-input" placeholder="10-digit mobile">
                </div>
            </div>
            <div>
                <label class="form-label">Address</label>
                <input name="address" id="fAddress" class="form-input" placeholder="Dealer location">
            </div>
            <div class="modal-footer">
                <button type="button" onclick="closeDealerModal()" class="btn btn-secondary">Cancel</button>
                <button type="submit" class="btn btn-primary">Save</button>
            </div>
        </form>
    </div>
</div>

<script>
$(document).ready(function(){initTable('#dealersTable',{columnDefs:[{orderable:false,targets:7}]})});
function editRow(r){
    document.getElementById('modalTitle').textContent='Edit Dealer';
    document.getElementById('editId').value=r.id;
    document.getElementById('fName').value=r.name||'';
    document.getElementById('fContact').value=r.contact_person||'';
    document.getElementById('fMobile').value=r.mobile||'';
    document.getElementById('fAddress').value=r.address||'';
    openModal('addModal');
}
function closeDealerModal(){
    closeModal('addModal');
    document.getElementById('editId').value='0';
    document.getElementById('modalTitle').textContent='Add Dealer';
}
</script>
<?php require_once __DIR__ . '/../includes/footer.php'; ?>
