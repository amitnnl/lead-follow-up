<?php
// banking/index.php — Banking & Accounting Dashboard
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';
require_role('admin', 'staff');

$pageTitle      = 'Banking & Accounts';
$pageBreadcrumb = 'Finance / Banking';

// Fetch all disbursed leads and their banking info
$sql = "
    SELECT 
        l.id, l.lead_id, l.lead_date, l.customer_name, l.vehicle_make_model, l.loan_amount,
        f.name as financer_name,
        b.received_amount, b.received_date, 
        (SELECT SUM(amount) FROM lead_deductions WHERE lead_id = l.id) as total_deductions,
        (SELECT SUM(amount) FROM lead_transactions WHERE lead_id = l.id) as total_paid,
        (SELECT MAX(payment_date) FROM lead_transactions WHERE lead_id = l.id) as last_payment_date
    FROM leads l
    LEFT JOIN financers f ON l.financer_id = f.id
    LEFT JOIN lead_banking b ON l.id = b.lead_id
    WHERE l.status = 'disbursed'
    ORDER BY l.updated_at DESC
";
$records = db_fetch_all($conn, $sql);

require_once __DIR__ . '/../includes/header.php';
?>

<?php
// Group by Financer
$grouped = [];
foreach ($records as $row) {
    $client = $row['financer_name'] ?: 'Unassigned Financer';
    if (!isset($grouped[$client])) {
        $grouped[$client] = [
            'records' => [],
            'stats' => [
                'loan' => 0,
                'received' => 0,
                'deductions' => 0,
                'payable' => 0,
                'paid' => 0,
                'balance' => 0
            ]
        ];
    }
    
    $received = (float)($row['received_amount'] ?? 0);
    $deductions = (float)($row['total_deductions'] ?? 0);
    $payable = $received - $deductions;
    $paid = (float)($row['total_paid'] ?? 0);
    $balance = $payable - $paid;

    $grouped[$client]['records'][] = $row;
    $grouped[$client]['stats']['loan'] += (float)($row['loan_amount'] ?? 0);
    $grouped[$client]['stats']['received'] += $received;
    $grouped[$client]['stats']['deductions'] += $deductions;
    $grouped[$client]['stats']['payable'] += $payable;
    $grouped[$client]['stats']['paid'] += $paid;
    $grouped[$client]['stats']['balance'] += $balance;
}
?>

<div class="mb-6">
    <h2 class="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
        <svg class="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        Disbursed Leads Accounts (Client Wise)
    </h2>
    <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage amounts received from financers and payouts to clients.</p>
</div>

<?php if (empty($grouped)): ?>
    <div class="card p-10 text-center text-slate-500">
        No disbursed leads found.
    </div>
<?php else: ?>
    <div class="space-y-8">
        <?php foreach ($grouped as $client => $data): ?>
        <div class="card overflow-hidden border border-slate-200 dark:border-slate-800">
            <!-- Client Header & Stats -->
            <div class="bg-slate-50 dark:bg-slate-900/50 p-6 border-b border-slate-200 dark:border-slate-800">
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h3 class="text-lg font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <span class="w-2.5 h-2.5 rounded-full bg-brand-500"></span>
                        <?= e($client) ?>
                        <span class="text-xs font-bold text-slate-500 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full ml-2"><?= count($data['records']) ?> Leads</span>
                    </h3>
                    
                    <div class="flex flex-wrap items-center gap-3 md:gap-6 text-sm">
                        <div class="flex flex-col">
                            <span class="text-[10px] font-bold text-slate-500 uppercase">Total Received</span>
                            <span class="font-black text-emerald-600 dark:text-emerald-400"><?= format_currency($data['stats']['received']) ?></span>
                        </div>
                        <div class="flex flex-col">
                            <span class="text-[10px] font-bold text-slate-500 uppercase">Deductions</span>
                            <span class="font-bold text-rose-500"><?= format_currency($data['stats']['deductions']) ?></span>
                        </div>
                        <div class="flex flex-col">
                            <span class="text-[10px] font-bold text-slate-500 uppercase">Net Payable</span>
                            <span class="font-black text-slate-700 dark:text-slate-300"><?= format_currency($data['stats']['payable']) ?></span>
                        </div>
                        <div class="flex flex-col border-l border-slate-200 dark:border-slate-700 pl-3 md:pl-6">
                            <span class="text-[10px] font-bold text-slate-500 uppercase">Balance Due</span>
                            <span class="font-black <?= $data['stats']['balance'] > 0 ? 'text-amber-500' : 'text-emerald-500' ?>"><?= format_currency($data['stats']['balance']) ?></span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Client Table -->
            <div class="overflow-x-auto">
                <table class="dataTable w-full text-left text-sm whitespace-nowrap">
                    <thead>
                        <tr>
                            <th>Lead ID</th>
                            <th>Customer Name</th>
                            <th>Loan Amount</th>
                            <th>Received Amount</th>
                            <th>Deductions</th>
                            <th>Payable to Client</th>
                            <th>Total Paid</th>
                            <th>Balance</th>
                            <th class="text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($data['records'] as $row): 
                            $received = (float)($row['received_amount'] ?? 0);
                            $deductions = (float)($row['total_deductions'] ?? 0);
                            $payable = $received - $deductions;
                            $paid = (float)($row['total_paid'] ?? 0);
                            $balance = $payable - $paid;
                        ?>
                        <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td>
                                <a href="<?= BASE_URL ?>/leads/view.php?id=<?= e($row['lead_id']) ?>&tab=banking" class="text-brand-600 font-bold hover:underline">
                                    <?= e($row['lead_id']) ?>
                                </a>
                            </td>
                            <td>
                                <div class="font-medium text-slate-800 dark:text-white"><?= e($row['customer_name']) ?></div>
                                <div class="text-[10px] text-slate-500"><?= e($row['vehicle_make_model'] ?? 'N/A') ?></div>
                            </td>
                            <td><?= format_currency($row['loan_amount'] ?? 0) ?></td>
                            <td class="font-semibold text-emerald-600 dark:text-emerald-400">
                                <?= format_currency($received) ?>
                            </td>
                            <td class="text-rose-500 text-xs font-semibold">
                                -<?= format_currency($deductions) ?>
                            </td>
                            <td class="font-bold text-slate-700 dark:text-slate-200">
                                <?= format_currency($payable) ?>
                            </td>
                            <td class="text-brand-600 dark:text-brand-400 font-semibold">
                                <?= format_currency($paid) ?>
                            </td>
                            <td>
                                <?php if ($balance > 0): ?>
                                    <span class="badge badge-yellow"><?= format_currency($balance) ?></span>
                                <?php elseif ($balance < 0): ?>
                                    <span class="badge badge-red"><?= format_currency($balance) ?></span>
                                <?php else: ?>
                                    <span class="badge badge-green">Cleared</span>
                                <?php endif; ?>
                            </td>
                            <td class="text-right">
                                <a href="<?= BASE_URL ?>/leads/view.php?id=<?= e($row['lead_id']) ?>&tab=banking" class="btn btn-secondary btn-sm">
                                    Manage
                                </a>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>
        <?php endforeach; ?>
    </div>
<?php endif; ?>

<script>
$(document).ready(function() {
    $('.dataTable').DataTable({
        pageLength: 25,
        dom: 'rt<"flex flex-wrap justify-between items-center mt-4 px-6 pb-4"ip>',
        language: { search: '', searchPlaceholder: 'Filter leads...' }
    });
});
</script>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
