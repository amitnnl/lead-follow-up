<?php
// banking/ledger.php — Global Bank Ledger / Statement
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';
require_role('admin', 'finance_manager');

$pageTitle = 'Global Bank Ledger';
$pageBreadcrumb = 'Finance / Bank Statement';

// Handle POST request (Add Entry)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'add_entry') {
    if (!verify_csrf()) die('Invalid CSRF');
    
    $post_date = $_POST['post_date'] ?: date('Y-m-d');
    $customer_name = trim($_POST['customer_name'] ?? '');
    $reg_no = trim($_POST['reg_no'] ?? '');
    $credit_amount = (float)($_POST['credit_amount'] ?? 0);
    $deduction_info = (float)($_POST['deduction_info'] ?? 0);
    $status = $_POST['status'] ?? 'Clear';
    $account_desc = trim($_POST['account_description'] ?? '');
    $debit_amount = (float)($_POST['debit_amount'] ?? 0);
    $uid = current_user_id();

    $stmt = $conn->prepare("INSERT INTO company_ledger (post_date, customer_name, reg_no, credit_amount, deduction_info, status, account_description, debit_amount, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param('sssddssdi', $post_date, $customer_name, $reg_no, $credit_amount, $deduction_info, $status, $account_desc, $debit_amount, $uid);
    $stmt->execute();
    
    flash('success', 'Ledger entry added successfully.');
    header("Location: " . BASE_URL . "/banking/ledger.php");
    exit;
}

// Fetch all ledger entries, ordered by date ascending for running balance calculation
$sql = "SELECT * FROM company_ledger ORDER BY post_date ASC, id ASC";
$entries = db_fetch_all($conn, $sql);

// Calculate running balance
$running_balance = 0;
foreach ($entries as &$entry) {
    $running_balance += $entry['credit_amount'];
    $running_balance -= $entry['debit_amount'];
    $entry['running_balance'] = $running_balance;
}
unset($entry); // break reference

// Reverse the array so latest is on top for viewing
$entries = array_reverse($entries);

require_once __DIR__ . '/../includes/header.php';
?>

<div class="card">
    <div class="card-header flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h2 class="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <svg class="w-6 h-6 text-brand-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                Bank Ledger / Statement
            </h2>
            <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Global view of all company inflows, outflows, and running balance.</p>
        </div>
        <div class="flex items-center gap-4">
            <div class="text-right bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-xl">
                <div class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Current Balance</div>
                <div class="text-xl font-black <?= $running_balance >= 0 ? 'text-emerald-600' : 'text-rose-600' ?>">
                    <?= format_currency($running_balance) ?>
                </div>
            </div>
            <button onclick="openModal('addEntryModal')" class="btn btn-primary flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                Add Entry
            </button>
        </div>
    </div>

    <div class="overflow-x-auto p-4 sm:p-6 pt-0 sm:pt-0">
        <table id="ledgerTable" class="dataTable w-full text-left text-sm whitespace-nowrap">
            <thead>
                <tr class="bg-slate-100 dark:bg-slate-800">
                    <th class="py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500">Post Date</th>
                    <th class="py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500">Customer Name</th>
                    <th class="py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500">Reg. No.</th>
                    <th class="py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Loan Amt. (In)</th>
                    <th class="py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Deduction</th>
                    <th class="py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-center">Status</th>
                    <th class="py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500">Account Description</th>
                    <th class="py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Debit (Out)</th>
                    <th class="py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Balance</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($entries as $row): ?>
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800/60">
                    <td class="py-3 px-4 font-medium"><?= date('d/m/Y', strtotime($row['post_date'])) ?></td>
                    <td class="py-3 px-4 font-bold text-slate-800 dark:text-slate-200"><?= e($row['customer_name']) ?></td>
                    <td class="py-3 px-4 text-slate-500 font-mono"><?= e($row['reg_no']) ?></td>
                    <td class="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        <?= $row['credit_amount'] > 0 ? format_currency($row['credit_amount']) : '-' ?>
                    </td>
                    <td class="py-3 px-4 text-right text-rose-500 font-semibold text-xs">
                        <?= $row['deduction_info'] > 0 ? '₹' . number_format($row['deduction_info'], 0) : '-' ?>
                    </td>
                    <td class="py-3 px-4 text-center">
                        <span class="badge <?= $row['status'] === 'Clear' ? 'badge-green' : 'badge-yellow' ?>">
                            <?= e($row['status']) ?>
                        </span>
                    </td>
                    <td class="py-3 px-4 text-slate-600 dark:text-slate-400 text-xs max-w-xs truncate" title="<?= e($row['account_description']) ?>">
                        <?= e($row['account_description']) ?>
                    </td>
                    <td class="py-3 px-4 text-right font-bold text-rose-600 dark:text-rose-400">
                        <?= $row['debit_amount'] > 0 ? format_currency($row['debit_amount']) : '-' ?>
                    </td>
                    <td class="py-3 px-4 text-right font-black text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-900/30">
                        <?= format_currency($row['running_balance']) ?>
                    </td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>

<!-- Add Entry Modal -->
<div id="addEntryModal" class="modal">
    <div class="modal-content w-full max-w-2xl">
        <div class="modal-header">
            <h3 class="text-lg font-bold">Add Ledger Entry</h3>
            <button type="button" onclick="closeModal('addEntryModal')" class="text-slate-400 hover:text-slate-600">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
        </div>
        <form method="POST" action="">
            <?= csrf_field() ?>
            <input type="hidden" name="action" value="add_entry">
            
            <div class="modal-body space-y-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <label class="form-label">Post Date <span class="text-red-500">*</span></label>
                        <input type="date" name="post_date" required value="<?= date('Y-m-d') ?>" class="form-input">
                    </div>
                    <div>
                        <label class="form-label">Status</label>
                        <select name="status" class="form-input">
                            <option value="Clear">Clear</option>
                            <option value="Pending">Pending</option>
                        </select>
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <label class="form-label">Customer Name / Entity</label>
                        <input type="text" name="customer_name" placeholder="e.g. Mohit Kumar, Rent, Office" class="form-input">
                    </div>
                    <div>
                        <label class="form-label">Reg. No.</label>
                        <input type="text" name="reg_no" placeholder="e.g. HR26FA9560" class="form-input">
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div>
                        <label class="form-label">Loan Amt. / Credit (In) <span class="text-emerald-500 font-bold">₹</span></label>
                        <input type="number" step="0.01" name="credit_amount" placeholder="0.00" class="form-input border-emerald-200">
                    </div>
                    <div>
                        <label class="form-label">Debit (Out) <span class="text-rose-500 font-bold">₹</span></label>
                        <input type="number" step="0.01" name="debit_amount" placeholder="0.00" class="form-input border-rose-200">
                    </div>
                    <div>
                        <label class="form-label text-slate-500">Deduction (Info)</label>
                        <input type="number" step="0.01" name="deduction_info" placeholder="0.00" class="form-input border-slate-200">
                    </div>
                </div>

                <div>
                    <label class="form-label">Account Description <span class="text-red-500">*</span></label>
                    <input type="text" name="account_description" required placeholder="e.g. BY TRANSFER/RTGS CHOLAMANDALAM..." class="form-input">
                </div>
            </div>
            
            <div class="modal-footer">
                <button type="button" onclick="closeModal('addEntryModal')" class="btn btn-secondary">Cancel</button>
                <button type="submit" class="btn btn-primary">Save Entry</button>
            </div>
        </form>
    </div>
</div>

<script>
$(document).ready(function() {
    $('#ledgerTable').DataTable({
        pageLength: 50,
        dom: '<"flex flex-wrap justify-between items-center gap-4 mb-4 px-6"lf>rt<"flex flex-wrap justify-between items-center mt-4 px-6 pb-4"ip>',
        language: { search: '', searchPlaceholder: 'Search Statement...' },
        order: [], // Let server ordering dictate
        ordering: false // Disable frontend sorting to preserve running balance chronological order
    });
});
</script>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
