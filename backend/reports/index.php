<?php
// reports/index.php — MIS Reports & Analytics
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';
require_role('admin', 'staff');
$pageTitle      = 'MIS Reports';
$pageBreadcrumb = 'Reports & Analytics';

// Date range & deep filters
$fromDate = $_GET['from'] ?? date('Y-m-01'); // First of current month
$toDate   = $_GET['to']   ?? date('Y-m-d');
$agentFilter = (int)($_GET['agent_id'] ?? 0);
$execFilter  = (int)($_GET['executive_id'] ?? 0);
$finFilter   = (int)($_GET['financer_id'] ?? 0);

// Build dynamic WHERE clauses for the leads table joins
$leadConditions = "l.lead_date BETWEEN ? AND ?";
$params = [$fromDate, $toDate];
$types = "ss";

if ($agentFilter) {
    $leadConditions .= " AND l.agent_id = ?";
    $params[] = $agentFilter;
    $types .= "i";
}
if ($execFilter) {
    $leadConditions .= " AND l.executive_id = ?";
    $params[] = $execFilter;
    $types .= "i";
}
if ($finFilter) {
    $leadConditions .= " AND l.financer_id = ?";
    $params[] = $finFilter;
    $types .= "i";
}

// Fetch lists for filter dropdowns
$agentsList    = db_fetch_all($conn, "SELECT id, name FROM agents WHERE is_active=1 ORDER BY name");
$executivesList = db_fetch_all($conn, "SELECT id, name FROM executives WHERE is_active=1 ORDER BY name");
$financersList  = db_fetch_all($conn, "SELECT id, name FROM financers WHERE is_active=1 ORDER BY name");

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
           SUM((SELECT lb.received_amount - COALESCE((SELECT SUM(amount) FROM lead_deductions WHERE lead_id = l.id), 0) FROM lead_banking lb WHERE lb.lead_id = l.id)) as total_payout
    FROM agents a
    LEFT JOIN leads l ON l.agent_id=a.id AND $leadConditions
    GROUP BY a.id
    ORDER BY disbursed_leads DESC
", $types, $params);

// Executive Performance
$execPerf = db_fetch_all($conn, "
    SELECT ex.name as exec_name,
           COUNT(l.id) as total_leads,
           SUM(CASE WHEN l.status='disbursed' THEN 1 ELSE 0 END) as disbursed,
           SUM(CASE WHEN l.status='rejected' THEN 1 ELSE 0 END) as rejected,
           SUM(l.loan_amount) as loan_value
    FROM executives ex
    LEFT JOIN leads l ON l.executive_id=ex.id AND $leadConditions
    GROUP BY ex.id 
    ORDER BY disbursed DESC
", $types, $params);

// Financer Summary
$financerSummary = db_fetch_all($conn, "
    SELECT f.name as financer_name,
           COUNT(l.id) as total_leads,
           SUM(CASE WHEN l.status='disbursed' THEN 1 ELSE 0 END) as disbursed,
           SUM(l.loan_amount) as loan_value
    FROM financers f
    LEFT JOIN leads l ON l.financer_id=f.id AND $leadConditions
    GROUP BY f.id 
    ORDER BY loan_value DESC
", $types, $params);

// Daily MIS — last 30 days
$dailyMIS = db_fetch_all($conn, "
    SELECT l.lead_date,
           COUNT(*) as total,
           SUM(CASE WHEN l.status='approved' OR l.status='disbursed' THEN 1 ELSE 0 END) as approved,
           SUM(l.loan_amount) as loan_value
    FROM leads l
    WHERE $leadConditions
    GROUP BY l.lead_date 
    ORDER BY l.lead_date DESC
", $types, $params);

$activeTab = $_GET['tab'] ?? 'agent';
require_once __DIR__ . '/../includes/header.php';
?>

<!-- Date & Deep Filters Form -->
<form method="GET" class="card mb-8 animate-fade-up">
    <div class="card-body">
    <input type="hidden" name="tab" value="<?= e($activeTab) ?>">
    
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6 items-end">
        <div>
            <label class="form-label text-xs font-bold uppercase text-slate-400">From Date</label>
            <input type="date" name="from" class="form-input w-full py-2 text-sm" value="<?= e($fromDate) ?>">
        </div>
        <div>
            <label class="form-label text-xs font-bold uppercase text-slate-400">To Date</label>
            <input type="date" name="to" class="form-input w-full py-2 text-sm" value="<?= e($toDate) ?>">
        </div>
        <div>
            <label class="form-label text-xs font-bold uppercase text-slate-400">Channel</label>
            <select name="agent_id" class="form-select w-full py-2 text-sm">
                <option value="">— All Channels —</option>
                <?php foreach ($agentsList as $a): ?>
                <option value="<?= $a['id'] ?>" <?= $agentFilter === (int)$a['id'] ? 'selected' : '' ?>><?= e($a['name']) ?></option>
                <?php endforeach; ?>
            </select>
        </div>
        <div>
            <label class="form-label text-xs font-bold uppercase text-slate-400">SFE / Executive</label>
            <select name="executive_id" class="form-select w-full py-2 text-sm">
                <option value="">— All SFEs —</option>
                <?php foreach ($executivesList as $ex): ?>
                <option value="<?= $ex['id'] ?>" <?= $execFilter === (int)$ex['id'] ? 'selected' : '' ?>><?= e($ex['name']) ?></option>
                <?php endforeach; ?>
            </select>
        </div>
        <div>
            <label class="form-label text-xs font-bold uppercase text-slate-400">Financer / Bank</label>
            <select name="financer_id" class="form-select w-full py-2 text-sm">
                <option value="">— All Banks —</option>
                <?php foreach ($financersList as $f): ?>
                <option value="<?= $f['id'] ?>" <?= $finFilter === (int)$f['id'] ? 'selected' : '' ?>><?= e($f['name']) ?></option>
                <?php endforeach; ?>
            </select>
        </div>
    </div>
    
    <div class="mt-4 flex flex-wrap justify-between items-center gap-4 border-t border-slate-100 dark:border-slate-800/40 pt-4">
    <div class="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
        <div class="flex gap-2">
            <button type="submit" class="btn btn-primary btn-sm flex items-center gap-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
                Apply Filters
            </button>
            <?php if ($agentFilter || $execFilter || $finFilter): ?>
            <a href="?from=<?= $fromDate ?>&to=<?= $toDate ?>&tab=<?= e($activeTab) ?>" class="btn btn-secondary btn-sm">Clear</a>
            <?php endif; ?>
            <a href="export.php?from=<?= $fromDate ?>&to=<?= $toDate ?>&agent_id=<?= $agentFilter ?>&executive_id=<?= $execFilter ?>&financer_id=<?= $finFilter ?>&tab=<?= e($activeTab) ?>"
               class="btn bg-emerald-500 hover:bg-emerald-600 text-white btn-sm flex items-center gap-1 shadow-sm">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                Export CSV
            </a>
            <button type="button" onclick="window.print()" class="btn btn-secondary btn-sm flex items-center gap-1 shadow-sm ml-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                Print / Save as PDF
            </button>
        </div>
        <div class="flex flex-wrap gap-2">
            <a href="?from=<?= date('Y-m-01') ?>&to=<?= date('Y-m-d') ?>&agent_id=<?= $agentFilter ?>&executive_id=<?= $execFilter ?>&financer_id=<?= $finFilter ?>&tab=<?= e($activeTab) ?>"
               class="btn btn-secondary btn-sm animate-pulse-once">This Month</a>
            <a href="?from=<?= date('Y-01-01') ?>&to=<?= date('Y-m-d') ?>&agent_id=<?= $agentFilter ?>&executive_id=<?= $execFilter ?>&financer_id=<?= $finFilter ?>&tab=<?= e($activeTab) ?>"
               class="btn btn-secondary btn-sm">This Year</a>
        </div>
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
    foreach ($tabs as $key => $label):
        $active = ($activeTab === $key) 
            ? 'bg-white dark:bg-slate-800 shadow-md text-brand-600 dark:text-brand-400 font-bold border border-slate-200/30 dark:border-slate-700/30' 
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 font-semibold hover:bg-white/40 dark:hover:bg-slate-800/30';
    ?>
    <a href="?from=<?= $fromDate ?>&to=<?= $toDate ?>&agent_id=<?= $agentFilter ?>&executive_id=<?= $execFilter ?>&financer_id=<?= $finFilter ?>&tab=<?= $key ?>"
       class="px-4.5 py-2.5 rounded-xl text-sm transition-all duration-300 <?= $active ?>">
        <?= $label ?>
    </a>
    <?php endforeach; ?>
</div>

<!-- Agent Performance Tab -->
<?php if ($activeTab === 'agent'): ?>
<!-- Agent Chart -->
<?php if (!empty($agentPerf)): ?>
<div class="card mb-6 animate-fade-up">
    <div class="card-header">
        <h2 class="text-slate-800 dark:text-white">Lead Conversion by Agent</h2>
    </div>
    <div class="p-4">
        <canvas id="agentChart" style="max-height: 300px; width: 100%;"></canvas>
    </div>
</div>
<script>
    const agentData = <?= json_encode($agentPerf) ?>;
    const agentLabels = agentData.map(a => a.agent_name);
    const agentTotal = agentData.map(a => a.total_leads);
    const agentDisbursed = agentData.map(a => a.disbursed_leads);
</script>
<?php endif; ?>

<div class="card animate-fade-up" style="animation-delay: 0.1s;">
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
<!-- Daily Chart -->
<?php if (!empty($dailyMIS)): ?>
<div class="card mb-6 animate-fade-up">
    <div class="card-header">
        <h2 class="text-slate-800 dark:text-white">Daily Revenue Trend</h2>
    </div>
    <div class="p-4">
        <canvas id="dailyChart" style="max-height: 300px; width: 100%;"></canvas>
    </div>
</div>
<script>
    const dailyData = <?= json_encode($dailyMIS) ?>;
    const dailyLabels = dailyData.map(d => d.lead_date);
    const dailyRevenue = dailyData.map(d => d.loan_value || 0);
</script>
<?php endif; ?>

<div class="card animate-fade-up" style="animation-delay: 0.1s;">
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

    if (document.getElementById('agentChart')) {
        new Chart(document.getElementById('agentChart'), {
            type: 'bar',
            data: {
                labels: agentLabels,
                datasets: [
                    { label: 'Total Leads', data: agentTotal, backgroundColor: '#cbd5e1', borderRadius: 4 },
                    { label: 'Disbursed', data: agentDisbursed, backgroundColor: '#10b981', borderRadius: 4 }
                ]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } }
            }
        });
    }

    if (document.getElementById('dailyChart')) {
        new Chart(document.getElementById('dailyChart'), {
            type: 'line',
            data: {
                labels: dailyLabels,
                datasets: [{
                    label: 'Loan Value Disbursed (₹)',
                    data: dailyRevenue,
                    borderColor: '#4f46e5',
                    backgroundColor: 'rgba(79, 70, 229, 0.15)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#4f46e5'
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } },
                scales: { y: { beginAtZero: true } }
            }
        });
    }
});
</script>
<?php require_once __DIR__ . '/../includes/footer.php'; ?>
