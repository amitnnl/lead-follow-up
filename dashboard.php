<?php
// dashboard.php
require_once __DIR__ . '/includes/db.php';
require_once __DIR__ . '/includes/auth.php';
$pageTitle = 'Dashboard';

// KPI Queries
$totalLeads     = db_fetch_one($conn, "SELECT COUNT(*) as cnt FROM leads")['cnt'] ?? 0;
$approved       = db_fetch_one($conn, "SELECT COUNT(*) as cnt FROM leads WHERE status='approved'")['cnt'] ?? 0;
$disbursed      = db_fetch_one($conn, "SELECT COUNT(*) as cnt FROM leads WHERE status='disbursed'")['cnt'] ?? 0;
$pending        = db_fetch_one($conn, "SELECT COUNT(*) as cnt FROM leads WHERE status='pending'")['cnt'] ?? 0;
$rejected       = db_fetch_one($conn, "SELECT COUNT(*) as cnt FROM leads WHERE status='rejected'")['cnt'] ?? 0;
$totalLoanAmt   = db_fetch_one($conn, "SELECT SUM(loan_amount) as s FROM leads WHERE status IN('approved','disbursed')")['s'] ?? 0;
$totalPayout    = db_fetch_one($conn, "SELECT SUM(payout_amount) as s FROM leads WHERE payout_amount IS NOT NULL")['s'] ?? 0;
$totalCommPaid  = db_fetch_one($conn, "SELECT SUM(paid_amount) as s FROM commissions")['s'] ?? 0;


// Top executives
$execRows = db_fetch_all($conn, "
    SELECT ex.name, COUNT(l.id) as total,
           SUM(CASE WHEN l.status='disbursed' THEN 1 ELSE 0 END) as disbursed
    FROM leads l
    JOIN executives ex ON l.executive_id = ex.id
    GROUP BY ex.id ORDER BY total DESC LIMIT 5
");

// Top financers
$financerRows = db_fetch_all($conn, "
    SELECT f.name, COUNT(l.id) as total,
           SUM(CASE WHEN l.status='disbursed' THEN 1 ELSE 0 END) as disbursed
    FROM leads l
    JOIN financers f ON l.financer_id = f.id
    GROUP BY f.id ORDER BY total DESC LIMIT 5
");

// Recent leads
$recentLeads = db_fetch_all($conn, "
    SELECT l.lead_id, l.customer_name, l.vehicle_make_model, l.loan_amount, l.status, l.lead_date,
           ex.name as executive_name, f.name as financer_name
    FROM leads l
    LEFT JOIN executives ex ON l.executive_id = ex.id
    LEFT JOIN financers f ON l.financer_id = f.id
    ORDER BY l.created_at DESC LIMIT 8
");

// Follow-ups due today or overdue
$dueFollowups = db_fetch_all($conn, "
    SELECT lf.next_followup_date, lf.remarks, l.lead_id, l.customer_name, l.customer_mobile
    FROM lead_followups lf
    JOIN leads l ON lf.lead_id = l.id
    WHERE lf.next_followup_date <= CURDATE()
      AND l.status NOT IN ('disbursed','rejected')
    ORDER BY lf.next_followup_date ASC LIMIT 5
");

require_once __DIR__ . '/includes/header.php';
?>

<!-- KPI Cards -->
<div class="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
    <?php
    $kpis = [
        ['Total Leads',    $totalLeads,                  'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 dark:bg-indigo-500/15', '📋'],
        ['Approved',       $approved,                    'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-500/15', '✅'],
        ['Disbursed',      $disbursed,                   'bg-teal-500/10 text-teal-600 dark:text-teal-400 dark:bg-teal-500/15', '💰'],
        ['Pending',        $pending,                     'bg-amber-500/10 text-amber-600 dark:text-amber-400 dark:bg-amber-500/15', '⏳'],
        ['Rejected',       $rejected,                    'bg-rose-500/10 text-rose-600 dark:text-rose-400 dark:bg-rose-500/15', '❌'],
        ['Loan Value',     format_currency($totalLoanAmt),'bg-violet-500/10 text-violet-600 dark:text-violet-400 dark:bg-violet-500/15', '🏦'],
        ['Total Payout',   format_currency($totalPayout), 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 dark:bg-cyan-500/15', '📤'],
        ['Commission Paid',format_currency($totalCommPaid),'bg-orange-500/10 text-orange-600 dark:text-orange-400 dark:bg-orange-500/15', '💼'],
    ];
    foreach ($kpis as [$label, $val, $color, $icon]): ?>
    <div class="kpi-panel" style="animation-delay: <?= rand(100, 300) ?>ms">
        <div class="w-12 h-12 <?= $color ?> rounded-2xl flex items-center justify-center text-xl flex-shrink-0 font-bold border border-current/10 shadow-sm">
            <?= $icon ?>
        </div>
        <div>
            <div class="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider"><?= $label ?></div>
            <div class="text-lg font-extrabold text-slate-800 dark:text-white mt-1 tracking-tight"><?= $val ?></div>
        </div>
    </div>
    <?php endforeach; ?>
</div>


<!-- Bottom Row -->
<div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
    <!-- Recent Leads Table -->
    <div class="lg:col-span-2 card overflow-hidden hover-lift animate-fade-up" style="animation-delay: 450ms">
        <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300">Recent Leads</h3>
            <a href="<?php echo BASE_URL; ?>/leads/index.php" class="text-xs text-blue-600 hover:text-blue-800 font-medium">View All →</a>
        </div>
        <div class="overflow-x-auto">
            <table class="w-full text-sm">
                <thead>
                    <tr class="bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        <th class="text-left px-5 py-3 font-semibold">Lead ID</th>
                        <th class="text-left px-5 py-3 font-semibold">Customer</th>
                        <th class="text-left px-5 py-3 font-semibold">Vehicle</th>
                        <th class="text-left px-5 py-3 font-semibold">Amount</th>
                        <th class="text-left px-5 py-3 font-semibold">Status</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-50 dark:divide-gray-800">
                    <?php foreach ($recentLeads as $lead): ?>
                    <tr class="hover:bg-blue-50/30 dark:hover:bg-gray-800/50 transition-colors">
                        <td class="px-5 py-3">
                            <a href="<?php echo BASE_URL; ?>/leads/view.php?id=<?= $lead['lead_id'] ?>"
                               class="text-blue-600 hover:text-blue-800 font-mono text-xs font-semibold">
                                <?= e($lead['lead_id']) ?>
                            </a>
                        </td>
                        <td class="px-5 py-3 text-gray-800 dark:text-gray-200 font-medium"><?= e($lead['customer_name']) ?></td>
                        <td class="px-5 py-3 text-gray-500 dark:text-gray-400 text-xs"><?= e($lead['vehicle_make_model'] ?? '—') ?></td>
                        <td class="px-5 py-3 text-gray-700 dark:text-gray-300 font-medium text-xs">
                            <?= $lead['loan_amount'] ? format_currency((float)$lead['loan_amount']) : '—' ?>
                        </td>
                        <td class="px-5 py-3"><?= status_badge($lead['status']) ?></td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>

    <!-- Right Panel -->
    <div class="space-y-5">
        <!-- Follow-ups Due -->
        <div class="card hover-lift animate-fade-up" style="animation-delay: 500ms">
            <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300">⚡ Follow-ups Due</h3>
                <a href="<?php echo BASE_URL; ?>/followups/index.php" class="text-xs text-blue-600 hover:text-blue-800">View All →</a>
            </div>
            <div class="divide-y divide-gray-50 dark:divide-gray-800">
                <?php if ($dueFollowups): ?>
                    <?php foreach ($dueFollowups as $fu): ?>
                    <div class="px-5 py-3">
                        <div class="flex items-start justify-between gap-2">
                            <div>
                                <div class="text-xs font-semibold text-gray-800 dark:text-gray-200"><?= e($fu['customer_name']) ?></div>
                                <div class="text-xs text-gray-400 font-mono"><?= e($fu['lead_id']) ?></div>
                                <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-[160px]"><?= e($fu['remarks']) ?></div>
                            </div>
                            <span class="text-xs text-red-500 font-semibold flex-shrink-0 mt-0.5">
                                <?= $fu['next_followup_date'] ?>
                            </span>
                        </div>
                    </div>
                    <?php endforeach; ?>
                <?php else: ?>
                    <div class="px-5 py-6 text-center text-gray-400 text-sm">No pending follow-ups 🎉</div>
                <?php endif; ?>
            </div>
        </div>

        <!-- Top Executives -->
        <div class="card hover-lift animate-fade-up" style="animation-delay: 550ms">
            <div class="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300">🏆 Top Executives</h3>
            </div>
            <div class="p-4 space-y-3">
                <?php foreach ($execRows as $i => $ex): ?>
                <div class="flex items-center gap-3">
                    <span class="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center flex-shrink-0">
                        <?= $i + 1 ?>
                    </span>
                    <div class="flex-1 min-w-0">
                        <div class="text-xs font-semibold text-gray-800 dark:text-gray-200"><?= e($ex['name']) ?></div>
                        <div class="text-xs text-gray-400"><?= $ex['total'] ?> leads · <?= $ex['disbursed'] ?> disbursed</div>
                    </div>
                    <div class="text-right">
                        <div class="w-20 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                            <div class="bg-blue-500 h-1.5 rounded-full"
                                 style="width:<?= $ex['total'] > 0 ? min(100, round($ex['disbursed']/$ex['total']*100)) : 0 ?>%"></div>
                        </div>
                    </div>
                </div>
                <?php endforeach; ?>
            </div>
        </div>

        <!-- Top Financers -->
        <div class="card hover-lift animate-fade-up" style="animation-delay: 600ms">
            <div class="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300">🏦 Top Financers</h3>
            </div>
            <div class="p-4 space-y-3">
                <?php foreach ($financerRows as $i => $fn): ?>
                <div class="flex items-center gap-3">
                    <span class="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-center flex-shrink-0">
                        <?= $i + 1 ?>
                    </span>
                    <div class="flex-1 min-w-0">
                        <div class="text-xs font-semibold text-gray-800 dark:text-gray-200"><?= e($fn['name']) ?></div>
                        <div class="text-xs text-gray-400"><?= $fn['total'] ?> leads · <?= $fn['disbursed'] ?> disbursed</div>
                    </div>
                    <div class="text-right">
                        <div class="w-20 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                            <div class="bg-emerald-500 h-1.5 rounded-full"
                                 style="width:<?= $fn['total'] > 0 ? min(100, round($fn['disbursed']/$fn['total']*100)) : 0 ?>%"></div>
                        </div>
                    </div>
                </div>
                <?php endforeach; ?>
            </div>
        </div>
    </div>
</div>

<!-- Quick Action FAB -->
<a href="<?php echo BASE_URL; ?>/leads/create.php"
   class="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl transition-all hover:scale-110 z-50"
   title="Add New Lead">
    +
</a>



<?php require_once __DIR__ . '/includes/footer.php'; ?>
