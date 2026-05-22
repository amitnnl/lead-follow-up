<?php
// reports/index.php — MIS Reports & Analytics
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';
$pageTitle      = 'MIS Reports';
$pageBreadcrumb = 'Reports & Analytics';

// Date range filter
$fromDate = $_GET['from'] ?? date('Y-m-01'); // First of current month
$toDate   = $_GET['to']   ?? date('Y-m-d');

// Agent Performance Report
$agentPerf = db_fetch_all($conn, "
    SELECT a.name as agent_name,
           COUNT(l.id) as total_leads,
           SUM(CASE WHEN l.status='new' THEN 1 ELSE 0 END) as new_leads,
           SUM(CASE WHEN l.status='pending' THEN 1 ELSE 0 END) as pending_leads,
           SUM(CASE WHEN l.status='approved' THEN 1 ELSE 0 END) as approved_leads,
           SUM(CASE WHEN l.status='disbursed' THEN 1 ELSE 0 END) as disbursed_leads,
           SUM(CASE WHEN l.status='rejected' THEN 1 ELSE 0 END) as rejected_leads,
           SUM(l.loan_amount) as total_loan_value,
           SUM(l.payout_amount) as total_payout
    FROM agents a
    LEFT JOIN leads l ON l.agent_id=a.id AND l.lead_date BETWEEN ? AND ?
    GROUP BY a.id
    ORDER BY disbursed_leads DESC
", 'ss', [$fromDate, $toDate]);

// Executive Performance
$execPerf = db_fetch_all($conn, "
    SELECT ex.name as exec_name,
           COUNT(l.id) as total_leads,
           SUM(CASE WHEN l.status='disbursed' THEN 1 ELSE 0 END) as disbursed,
           SUM(CASE WHEN l.status='rejected' THEN 1 ELSE 0 END) as rejected,
           SUM(l.loan_amount) as loan_value
    FROM executives ex
    LEFT JOIN leads l ON l.executive_id=ex.id AND l.lead_date BETWEEN ? AND ?
    GROUP BY ex.id ORDER BY disbursed DESC
", 'ss', [$fromDate, $toDate]);

// Financer Summary
$financerSummary = db_fetch_all($conn, "
    SELECT f.name as financer_name,
           COUNT(l.id) as total_leads,
           SUM(CASE WHEN l.status='disbursed' THEN 1 ELSE 0 END) as disbursed,
           SUM(l.loan_amount) as loan_value
    FROM financers f
    LEFT JOIN leads l ON l.financer_id=f.id AND l.lead_date BETWEEN ? AND ?
    GROUP BY f.id ORDER BY loan_value DESC
", 'ss', [$fromDate, $toDate]);

// Daily MIS — last 30 days
$dailyMIS = db_fetch_all($conn, "
    SELECT lead_date,
           COUNT(*) as total,
           SUM(CASE WHEN status='approved' OR status='disbursed' THEN 1 ELSE 0 END) as approved,
           SUM(loan_amount) as loan_value
    FROM leads
    WHERE lead_date BETWEEN ? AND ?
    GROUP BY lead_date ORDER BY lead_date DESC
", 'ss', [$fromDate, $toDate]);

require_once __DIR__ . '/../includes/header.php';
?>

<!-- Date Filter -->
<form method="GET" class="card p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 items-end animate-fade-up">
    <input type="hidden" name="tab" value="<?= e($activeTab) ?>">
    <div>
        <label class="form-label">From Date</label>
        <input type="date" name="from" class="form-input w-full" value="<?= e($fromDate) ?>">
    </div>
    <div>
        <label class="form-label">To Date</label>
        <input type="date" name="to" class="form-input w-full" value="<?= e($toDate) ?>">
    </div>
    <div class="md:col-span-2 flex flex-wrap gap-2.5">
        <button type="submit" class="btn-primary btn-sm px-5 py-2.5 shadow-md hover-glow">Apply Filter</button>
        <a href="?from=<?= date('Y-m-01') ?>&to=<?= date('Y-m-d') ?>&tab=<?= e($activeTab) ?>"
           class="btn btn-secondary btn-sm px-4 py-2.5 shadow-sm">This Month</a>
        <a href="?from=<?= date('Y-01-01') ?>&to=<?= date('Y-m-d') ?>&tab=<?= e($activeTab) ?>"
           class="btn btn-secondary btn-sm px-4 py-2.5 shadow-sm">This Year</a>
    </div>
</form>

<!-- Tabs -->
<div class="flex flex-wrap gap-1.5 mb-6 bg-slate-100 dark:bg-slate-900/60 border border-slate-200/40 dark:border-slate-800/40 p-1.5 rounded-2xl w-fit shadow-inner animate-fade-up">
    <?php
    $tabs = [
        'agent'   => '👤 Agent Performance',
        'exec'    => '🏆 Executive Performance',
        'financer'=> '🏦 Financer Summary',
        'daily'   => '📅 Daily MIS'
    ];
    $activeTab = $_GET['tab'] ?? 'agent';
    foreach ($tabs as $key => $label):
        $active = ($activeTab === $key) 
            ? 'bg-white dark:bg-slate-800 shadow-md text-brand-600 dark:text-brand-400 font-bold border border-slate-200/30 dark:border-slate-700/30' 
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 font-semibold hover:bg-white/40 dark:hover:bg-slate-800/30';
    ?>
    <a href="?from=<?= $fromDate ?>&to=<?= $toDate ?>&tab=<?= $key ?>"
       class="px-4.5 py-2.5 rounded-xl text-sm transition-all duration-300 <?= $active ?>">
        <?= $label ?>
    </a>
    <?php endforeach; ?>
</div>

<!-- Agent Performance Tab -->
<?php if ($activeTab === 'agent'): ?>
<div class="card animate-fade-up">
    <div class="card-header">
        <h2 class="text-slate-800 dark:text-white">Agent Performance Report</h2>
        <span class="badge badge-indigo text-[10px] font-bold"><?= date('d M Y', strtotime($fromDate)) ?> – <?= date('d M Y', strtotime($toDate)) ?></span>
    </div>
    <div class="overflow-x-auto font-sans">
        <table id="agentTable" class="w-full text-sm">
            <thead><tr>
                <th>Agent</th><th>Total Leads</th><th>New</th><th>Pending</th>
                <th>Approved</th><th>Disbursed</th><th>Rejected</th>
                <th>Loan Value</th><th>Payout</th><th>Conversion %</th>
            </tr></thead>
            <tbody>
                <?php foreach ($agentPerf as $r):
                    $conversion = $r['total_leads'] > 0
                        ? round(($r['disbursed_leads'] / $r['total_leads']) * 100, 1)
                        : 0;
                ?>
                <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-850/40">
                    <td class="px-4 py-3.5 font-bold text-slate-800 dark:text-slate-200"><?= e($r['agent_name']) ?></td>
                    <td class="px-4 py-3.5 text-center font-extrabold text-slate-750 dark:text-slate-350 font-mono"><?= $r['total_leads'] ?></td>
                    <td class="px-4 py-3.5 text-center text-indigo-600 dark:text-indigo-400 font-bold font-mono"><?= $r['new_leads'] ?></td>
                    <td class="px-4 py-3.5 text-center text-amber-600 dark:text-amber-400 font-bold font-mono"><?= $r['pending_leads'] ?></td>
                    <td class="px-4 py-3.5 text-center text-emerald-600 dark:text-emerald-400 font-bold font-mono"><?= $r['approved_leads'] ?></td>
                    <td class="px-4 py-3.5 text-center text-emerald-700 dark:text-emerald-300 font-extrabold font-mono"><?= $r['disbursed_leads'] ?></td>
                    <td class="px-4 py-3.5 text-center text-rose-500 dark:text-rose-400 font-semibold font-mono"><?= $r['rejected_leads'] ?></td>
                    <td class="px-4 py-3.5 text-slate-700 dark:text-slate-300 font-bold font-mono"><?= $r['total_loan_value'] ? format_currency((float)$r['total_loan_value']) : '—' ?></td>
                    <td class="px-4 py-3.5 text-slate-600 dark:text-slate-400 font-semibold font-mono"><?= $r['total_payout'] ? format_currency((float)$r['total_payout']) : '—' ?></td>
                    <td class="px-4 py-3.5">
                        <div class="flex items-center gap-2.5">
                            <div class="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden shadow-inner border border-slate-200/10">
                                <div class="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-500" style="width:<?= min(100,$conversion) ?>%"></div>
                            </div>
                            <span class="text-xs font-bold text-slate-600 dark:text-slate-400 w-12 text-right tracking-tight font-mono"><?= $conversion ?>%</span>
                        </div>
                    </td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>

<!-- Executive Tab -->
<?php elseif ($activeTab === 'exec'): ?>
<div class="card animate-fade-up">
    <div class="card-header">
        <h2 class="text-slate-800 dark:text-white">Executive Performance Report</h2>
        <span class="badge badge-indigo text-[10px] font-bold"><?= date('d M Y', strtotime($fromDate)) ?> – <?= date('d M Y', strtotime($toDate)) ?></span>
    </div>
    <div class="overflow-x-auto font-sans">
        <table id="execTable" class="w-full text-sm">
            <thead><tr><th>Executive</th><th>Total Leads</th><th>Disbursed</th><th>Rejected</th><th>Total Loan Value</th><th>Conversion %</th></tr></thead>
            <tbody>
                <?php foreach ($execPerf as $r):
                    $conv = $r['total_leads'] > 0 ? round($r['disbursed']/$r['total_leads']*100,1) : 0;
                ?>
                <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-850/40">
                    <td class="px-4 py-3.5 font-bold text-slate-800 dark:text-slate-200"><?= e($r['exec_name']) ?></td>
                    <td class="px-4 py-3.5 text-center font-extrabold text-slate-750 dark:text-slate-350 font-mono"><?= $r['total_leads'] ?></td>
                    <td class="px-4 py-3.5 text-center text-emerald-600 dark:text-emerald-400 font-extrabold font-mono"><?= $r['disbursed'] ?></td>
                    <td class="px-4 py-3.5 text-center text-rose-500 dark:text-rose-400 font-semibold font-mono"><?= $r['rejected'] ?></td>
                    <td class="px-4 py-3.5 text-slate-700 dark:text-slate-300 font-bold font-mono"><?= $r['loan_value'] ? format_currency((float)$r['loan_value']) : '—' ?></td>
                    <td class="px-4 py-3.5">
                        <div class="flex items-center gap-2.5">
                            <div class="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden shadow-inner border border-slate-200/10">
                                <div class="bg-gradient-to-r from-brand-500 to-sec-500 h-full rounded-full transition-all duration-500" style="width:<?= min(100,$conv) ?>%"></div>
                            </div>
                            <span class="text-xs font-bold text-slate-600 dark:text-slate-400 w-12 text-right tracking-tight font-mono"><?= $conv ?>%</span>
                        </div>
                    </td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>
<?php elseif ($activeTab === 'financer'): ?>
<div class="card animate-fade-up">
    <div class="card-header">
        <h2 class="text-slate-800 dark:text-white">Financer Summary Report</h2>
        <span class="badge badge-indigo text-[10px] font-bold"><?= date('d M Y', strtotime($fromDate)) ?> – <?= date('d M Y', strtotime($toDate)) ?></span>
    </div>
    <div class="overflow-x-auto font-sans">
        <table id="finTable" class="w-full text-sm">
            <thead><tr><th>Financer</th><th>Total Leads</th><th>Disbursed</th><th>Total Loan Value</th></tr></thead>
            <tbody>
                <?php foreach ($financerSummary as $r): ?>
                <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-850/40">
                    <td class="px-4 py-3.5 font-bold text-slate-800 dark:text-slate-200"><?= e($r['financer_name']) ?></td>
                    <td class="px-4 py-3.5 text-center font-extrabold text-slate-750 dark:text-slate-350 font-mono"><?= $r['total_leads'] ?></td>
                    <td class="px-4 py-3.5 text-center text-emerald-600 dark:text-emerald-400 font-extrabold font-mono"><?= $r['disbursed'] ?></td>
                    <td class="px-4 py-3.5 text-slate-700 dark:text-slate-300 font-bold font-mono"><?= $r['loan_value'] ? format_currency((float)$r['loan_value']) : '—' ?></td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>
<?php elseif ($activeTab === 'daily'): ?>
<div class="card animate-fade-up">
    <div class="card-header">
        <h2 class="text-slate-800 dark:text-white">Daily MIS Report</h2>
        <span class="badge badge-indigo text-[10px] font-bold"><?= date('d M Y', strtotime($fromDate)) ?> – <?= date('d M Y', strtotime($toDate)) ?></span>
    </div>
    <div class="overflow-x-auto font-sans">
        <table id="dailyTable" class="w-full text-sm">
            <thead><tr><th>Date</th><th>Total Leads</th><th>Approved/Disbursed</th><th>Loan Value</th></tr></thead>
            <tbody>
                <?php foreach ($dailyMIS as $r): ?>
                <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-850/40">
                    <td class="px-4 py-3.5 font-bold text-slate-800 dark:text-slate-200 font-mono"><?= date('D, d M Y', strtotime($r['lead_date'])) ?></td>
                    <td class="px-4 py-3.5 text-center font-extrabold text-slate-750 dark:text-slate-350 font-mono"><?= $r['total'] ?></td>
                    <td class="px-4 py-3.5 text-center text-emerald-600 dark:text-emerald-400 font-extrabold font-mono"><?= $r['approved'] ?></td>
                    <td class="px-4 py-3.5 text-slate-700 dark:text-slate-300 font-bold font-mono"><?= $r['loan_value'] ? format_currency((float)$r['loan_value']) : '—' ?></td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>
<?php endif; ?>


<script>
$(document).ready(function(){
    ['#agentTable','#execTable','#finTable','#dailyTable'].forEach(function(sel){
        if($(sel).length) initTable(sel, {order:[[1,'desc']]});
    });
});
</script>
<?php require_once __DIR__ . '/../includes/footer.php'; ?>
