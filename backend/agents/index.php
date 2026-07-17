<?php
// Channels/index.php — Channel Management
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';
require_role('admin', 'staff');
$pageTitle      = 'Channels';
$pageBreadcrumb = 'Channel Management';

// Handle POST requests
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verify_csrf()) die('Invalid CSRF');
    
    // Handle delete POST
    if (isset($_POST['delete_id'])) {
        if (!is_admin()) {
            flash('error', 'Only administrators can delete Channels.');
        } else {
            $deleteId = (int)$_POST['delete_id'];
            db_query($conn, "DELETE FROM agents WHERE id = ?", 'i', [$deleteId]);
            flash('success', 'Channel deleted.');
        }
        header('Location: ' . BASE_URL . '/agents/index.php');
        exit;
    }

    // Handle add/edit POST
    $financer_id = (int)($_POST['financer_id'] ?? 0) ?: null;
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
                "UPDATE agents SET financer_id=?, name=?,mobile=?,email=?,pan_number=?,bank_account=?,ifsc_code=? WHERE id=?",
                'issssssi', [$financer_id, $name,$mobile,$email,$pan,$bank,$ifsc,$editId]
            );
            flash('success', 'Channel updated.');
        } else {
            db_query($conn,
                "INSERT INTO agents (financer_id, name,mobile,email,pan_number,bank_account,ifsc_code) VALUES (?,?,?,?,?,?,?)",
                'issssss', [$financer_id, $name,$mobile,$email,$pan,$bank,$ifsc]
            );
            flash('success', 'Channel added.');
        }
    }
    header('Location: ' . BASE_URL . '/agents/index.php');
    exit;
}

// Toggle active
if (isset($_GET['toggle'])) {
    $aid = (int)$_GET['toggle'];
    db_query($conn, "UPDATE agents SET is_active = 1-is_active WHERE id=?", 'i', [$aid]);
    header('Location: ' . BASE_URL . '/Channels/index.php');
    exit;
}

$Channels = db_fetch_all($conn, "
    SELECT a.*, f.name as financer_name, COUNT(l.id) as total_leads,
           SUM(CASE WHEN l.status='disbursed' THEN 1 ELSE 0 END) as disbursed_leads,
           SUM(CASE WHEN l.status='disbursed' THEN l.loan_amount ELSE 0 END) as total_loan_value
    FROM agents a
    LEFT JOIN financers f ON a.financer_id = f.id
    LEFT JOIN leads l ON l.agent_id = a.id
    GROUP BY a.id
    ORDER BY a.is_active DESC, total_leads DESC
");

$allFinancers = db_fetch_all($conn, "SELECT id, name FROM financers WHERE is_active=1 ORDER BY name");

$headerActions = '<button onclick="openAddChannelModal()" class="btn btn-primary btn-sm">
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
    Add Channel
</button>';

require_once __DIR__ . '/../includes/header.php';
?>

<div class="card">
    <div class="overflow-x-auto">
        <table id="ChannelsTable" class="w-full text-sm">
            <thead>
                <tr>
                    <th class="w-12">#</th>
                    <th>Name</th>
                    <th>Channel (Financer)</th>
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
                <?php foreach ($Channels as $i => $Channel): ?>
                <tr>
                    <td class="text-slate-400 font-mono text-xs"><?= $i+1 ?></td>
                    <td class="font-extrabold text-slate-800 dark:text-slate-200"><?= e($Channel['name']) ?></td>
                    <td class="text-xs font-semibold text-brand-600 dark:text-brand-400"><?= e($Channel['financer_name'] ?? 'Direct/None') ?></td>
                    <td class="text-xs">
                        <a href="tel:<?= e($Channel['mobile']) ?>" class="hover:text-brand-500 font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1">
                            <svg class="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                            <?= e($Channel['mobile']) ?>
                        </a>
                        <a href="<?= whatsapp_link($Channel['mobile'], 'Hello ' . trim(explode(' ', $Channel['name'])[0]) . ', ') ?>" target="_blank" class="hover:text-emerald-500 text-slate-400 flex items-center gap-1 mt-1 font-bold transition-colors">
                            <svg class="w-3.5 h-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.717-1.458L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.03-5.115-2.903-6.99C16.26 1.876 13.784.843 11.15.842 5.712.842 1.29 5.26 1.285 10.7c-.002 1.716.446 3.393 1.3 4.89l-.995 3.636 3.73-.978c1.477.806 3.011 1.233 4.73 1.233z"/></svg>
                            WhatsApp
                        </a>
                    </td>
                    <td class="text-slate-500 dark:text-slate-400 text-xs"><?= e($Channel['email'] ?? '—') ?></td>
                    <td class="text-slate-500 dark:text-slate-400 text-xs font-mono"><?= e($Channel['pan_number'] ?? '—') ?></td>
                    <td class="text-slate-500 dark:text-slate-400 text-xs font-mono"><?= e($Channel['bank_account'] ?? '—') ?></td>
                    <td class="text-slate-500 dark:text-slate-400 text-xs font-mono"><?= e($Channel['ifsc_code'] ?? '—') ?></td>
                    <td class="text-center font-extrabold text-slate-800 dark:text-slate-200"><?= $Channel['total_leads'] ?></td>
                    <td class="text-center font-extrabold text-emerald-600 dark:text-emerald-400"><?= $Channel['disbursed_leads'] ?></td>
                    <td class="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono whitespace-nowrap">
                        <?= $Channel['total_loan_value'] ? format_currency((float)$Channel['total_loan_value']) : '—' ?>
                    </td>
                    <td>
                        <span class="badge <?= $Channel['is_active'] ? 'badge-green' : 'badge-gray' ?>">
                            <?= $Channel['is_active'] ? 'Active' : 'Inactive' ?>
                        </span>
                    </td>
                    <td>
                        <div class="flex items-center justify-center gap-1.5">
                            <button onclick="editChannel(<?= htmlspecialchars(json_encode($Channel)) ?>)"
                                    class="p-2 text-brand-600 hover:text-brand-900 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/40 dark:hover:bg-brand-950/80 rounded-xl transition-all duration-300 shadow-sm cursor-pointer" title="Edit">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                            </button>
                            <a href="?toggle=<?= $Channel['id'] ?>"
                               class="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-all duration-300 shadow-sm"
                               title="<?= $Channel['is_active'] ? 'Disable' : 'Enable' ?>">
                               <?php if ($Channel['is_active']): ?>
                                   <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                               <?php else: ?>
                                   <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"/></svg>
                               <?php endif; ?>
                            </a>
                            <?php if (is_admin()): ?>
                            <form method="POST" action="" class="inline-block" onsubmit="return confirm('<?= $Channel['total_leads'] > 0 ? 'WARNING: This Channel has ' . $Channel['total_leads'] . ' associated leads. Deleting this Channel will set their leads to None. Are you sure you want to delete ' . e(addslashes($Channel['name'])) . '?' : 'Are you sure you want to delete Channel ' . e(addslashes($Channel['name'])) . '?' ?>');">
                                <?= csrf_field() ?>
                                <input type="hidden" name="delete_id" value="<?= $Channel['id'] ?>">
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

<!-- Add/Edit Modal -->
<div id="addModal" class="modal-backdrop hidden" onclick="if(event.target===this)closeChannelModal()">
    <div class="modal-panel">
        <div class="modal-header">
            <h3 id="modalTitle" class="font-bold text-slate-700 dark:text-white uppercase tracking-wider">Add Channel</h3>
            <button onclick="closeChannelModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 text-2xl leading-none cursor-pointer">×</button>
        </div>
        <form method="POST" action="" class="modal-body space-y-4">
            <?= csrf_field() ?>
            <input type="hidden" name="edit_id" id="editId" value="0">
            <div class="grid grid-cols-2 gap-4">
                <div class="col-span-2">
                    <label class="form-label">Channel (Financer)</label>
                    <select name="financer_id" id="fFinancer" class="form-select">
                        <option value="">— Direct / No Financer —</option>
                        <?php foreach ($allFinancers as $f): ?>
                        <option value="<?= $f['id'] ?>"><?= e($f['name']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="col-span-2">
                    <label class="form-label required-lbl">Full Name</label>
                    <input type="text" name="name" id="fName" class="form-input" required placeholder="Channel Name">
                </div>
                <div>
                    <label class="form-label required-lbl">Mobile</label>
                    <input type="tel" name="mobile" id="fMobile" class="form-input" required placeholder="10-digit mobile">
                </div>
                <div>
                    <label class="form-label">Email</label>
                    <input type="email" name="email" id="fEmail" class="form-input" placeholder="Channel@email.com">
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
                <button type="button" onclick="closeChannelModal()" class="btn btn-secondary">Cancel</button>
                <button type="submit" class="btn btn-primary">Save</button>
            </div>
        </form>
    </div>
</div>

<script>
$(document).ready(function() { initTable('#ChannelsTable', { columnDefs: [{ orderable: false, targets: 11 }] }); });

function editChannel(Channel) {
    document.getElementById('modalTitle').textContent = 'Edit Channel';
    document.getElementById('editId').value  = Channel.id;
    document.getElementById('fFinancer').value = Channel.financer_id || '';
    document.getElementById('fName').value   = Channel.name || '';
    document.getElementById('fMobile').value = Channel.mobile || '';
    document.getElementById('fEmail').value  = Channel.email || '';
    document.getElementById('fPan').value    = Channel.pan_number || '';
    document.getElementById('fBank').value   = Channel.bank_account || '';
    document.getElementById('fIfsc').value   = Channel.ifsc_code || '';
    openModal('addModal');
}
function openAddChannelModal() {
    document.getElementById('modalTitle').textContent = 'Add Channel';
    document.getElementById('editId').value  = '0';
    document.getElementById('fFinancer').value = '';
    document.getElementById('fName').value   = '';
    document.getElementById('fMobile').value = '';
    document.getElementById('fEmail').value  = '';
    document.getElementById('fPan').value    = '';
    document.getElementById('fBank').value   = '';
    document.getElementById('fIfsc').value   = '';
    openModal('addModal');
}
function closeChannelModal() {
    closeModal('addModal');
    document.getElementById('editId').value = '0';
    document.getElementById('modalTitle').textContent = 'Add Channel';
    document.getElementById('fFinancer').value = '';
    document.getElementById('fName').value   = '';
    document.getElementById('fMobile').value = '';
    document.getElementById('fEmail').value  = '';
    document.getElementById('fPan').value    = '';
    document.getElementById('fBank').value   = '';
    document.getElementById('fIfsc').value   = '';
}
</script>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
