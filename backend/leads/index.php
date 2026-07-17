<?php
// leads/index.php — Lead List
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';

// Status filter
$filterStatus = isset($_GET['status']) ? $_GET['status'] : '';
$filterAssigned = isset($_GET['assigned']) ? $_GET['assigned'] : '';

if ($filterAssigned === '1') {
    $pageTitle = 'Assigned Leads';
    $pageBreadcrumb = 'Assigned Leads';
} elseif ($filterAssigned === '0') {
    $pageTitle = 'Pending to Assign';
    $pageBreadcrumb = 'Pending to Assign';
} elseif ($filterStatus === 'disbursed') {
    $pageTitle = 'Disbursed Leads';
    $pageBreadcrumb = 'Disbursed Leads';
} else {
    $pageTitle = 'Leads';
    $pageBreadcrumb = 'Leads';
}
if (!isset($_GET['status'])) $filterStatus = '';

// Role-based filter: agents see only their leads
$where = '1=1';
$params = [];
$types  = '';
if (is_channel_agent()) {
    $cheRow = db_fetch_one($conn, "SELECT id FROM channel_executives WHERE user_id = ?", 'i', [current_user_id()]);
    if ($cheRow) {
        $where  .= ' AND (l.created_by = ? OR l.channel_executive_id = ?)';
        $params[] = current_user_id();
        $params[] = $cheRow['id'];
        $types   .= 'ii';
    }
} elseif (is_agent()) {
    $agentRow = db_fetch_one($conn, "SELECT id FROM agents WHERE user_id = ?", 'i', [current_user_id()]);
    if ($agentRow) {
        $where  .= ' AND (l.created_by = ? OR l.agent_id = ?)';
        $params[] = current_user_id();
        $params[] = $agentRow['id'];
        $types   .= 'ii';
    }
}
if (is_executive()) {
    $execRow = db_fetch_one($conn,
        "SELECT id FROM executives WHERE user_id = ?", 'i', [current_user_id()]);
    if ($execRow) {
        $where  .= ' AND l.executive_id = ?';
        $params[] = $execRow['id'];
        $types   .= 'i';
    }
}

// Other filters
$filterRc     = $_GET['rc_status'] ?? '';
$filterIns    = $_GET['insurance_status'] ?? '';
$filterRto    = $_GET['rto_status'] ?? '';

$filterLoanType = $_GET['loan_type'] ?? '';

if ($filterStatus) {
    $where   .= ' AND l.status = ?';
    $params[] = $filterStatus;
    $types   .= 's';
}
if ($filterLoanType) {
    $where   .= ' AND l.loan_type = ?';
    $params[] = $filterLoanType;
    $types   .= 's';
}
if ($filterRc) {
    $where   .= ' AND l.rc_status = ?';
    $params[] = $filterRc;
    $types   .= 's';
}
if ($filterIns) {
    $where   .= ' AND l.insurance_status = ?';
    $params[] = $filterIns;
    $types   .= 's';
}
if ($filterRto) {
    $where   .= ' AND l.rto_status = ?';
    $params[] = $filterRto;
    $types   .= 's';
}

$filterAgent     = $_GET['agent_id'] ?? '';
$filterDealer    = $_GET['dealer_id'] ?? '';
$filterFinancer  = $_GET['financer_id'] ?? '';
$filterExecutive = $_GET['executive_id'] ?? '';

if ($filterAgent) {
    $where   .= ' AND l.agent_id = ?';
    $params[] = $filterAgent;
    $types   .= 'i';
}
if ($filterDealer) {
    $where   .= ' AND l.dealer_id = ?';
    $params[] = $filterDealer;
    $types   .= 'i';
}
if ($filterFinancer) {
    $where   .= ' AND l.financer_id = ?';
    $params[] = $filterFinancer;
    $types   .= 'i';
}
if ($filterExecutive) {
    $where   .= ' AND l.executive_id = ?';
    $params[] = $filterExecutive;
    $types   .= 'i';
}
if ($filterAssigned === '1') {
    $where .= ' AND l.executive_id IS NOT NULL AND l.status NOT IN ("disbursed", "approved")';
} elseif ($filterAssigned === '0') {
    $where .= ' AND l.executive_id IS NULL AND l.status != "disbursed"';
} else {
    if ($filterStatus !== 'disbursed') {
        $where .= ' AND l.executive_id IS NULL AND l.status != "disbursed"';
    }
}

// Fetch lists for filter dropdowns
$allAgents     = db_fetch_all($conn, "SELECT id, name FROM agents WHERE is_active=1 ORDER BY name");
$allDealers    = db_fetch_all($conn, "SELECT id, name FROM dealers WHERE is_active=1 ORDER BY name");
$allFinancers  = db_fetch_all($conn, "SELECT id, name FROM financers WHERE is_active=1 ORDER BY name");
$allExecutives = db_fetch_all($conn, "SELECT id, name FROM executives WHERE is_active=1 ORDER BY name");

// Calculate base counts honoring role-based restrictions and active filter dropdowns
$whereCountsBase = '1=1';
$countsParams = [];
$countsTypes = '';

if (is_channel_agent()) {
    $cheRow = db_fetch_one($conn, "SELECT id FROM channel_executives WHERE user_id = ?", 'i', [current_user_id()]);
    if ($cheRow) {
        $whereCountsBase  .= ' AND (created_by = ? OR channel_executive_id = ?)';
        $countsParams[] = current_user_id();
        $countsParams[] = $cheRow['id'];
        $countsTypes   .= 'ii';
    }
} elseif (is_agent()) {
    $agentRow = db_fetch_one($conn, "SELECT id FROM agents WHERE user_id = ?", 'i', [current_user_id()]);
    if ($agentRow) {
        $whereCountsBase  .= ' AND (created_by = ? OR agent_id = ?)';
        $countsParams[] = current_user_id();
        $countsParams[] = $agentRow['id'];
        $countsTypes   .= 'ii';
    }
}

if (is_executive()) {
    $execRow = db_fetch_one($conn, "SELECT id FROM executives WHERE user_id = ?", 'i', [current_user_id()]);
    if ($execRow) {
        $whereCountsBase  .= ' AND executive_id = ?';
        $countsParams[] = $execRow['id'];
        $countsTypes   .= 'i';
    }
}

if ($filterAgent) {
    $whereCountsBase  .= ' AND agent_id = ?';
    $countsParams[] = $filterAgent;
    $countsTypes   .= 'i';
}
if ($filterDealer) {
    $whereCountsBase  .= ' AND dealer_id = ?';
    $countsParams[] = $filterDealer;
    $countsTypes   .= 'i';
}
if ($filterFinancer) {
    $whereCountsBase  .= ' AND financer_id = ?';
    $countsParams[] = $filterFinancer;
    $countsTypes   .= 'i';
}
if ($filterExecutive) {
    $whereCountsBase  .= ' AND executive_id = ?';
    $countsParams[] = $filterExecutive;
    $countsTypes   .= 'i';
}
if ($filterLoanType) {
    $whereCountsBase  .= ' AND loan_type = ?';
    $countsParams[] = $filterLoanType;
    $countsTypes   .= 's';
}

$totalLeadsCount = db_fetch_one($conn, "SELECT COUNT(*) as cnt FROM leads WHERE $whereCountsBase", $countsTypes, $countsParams)['cnt'] ?? 0;
$pendingToAssignCount = db_fetch_one($conn, "SELECT COUNT(*) as cnt FROM leads WHERE $whereCountsBase AND executive_id IS NULL AND status != 'disbursed'", $countsTypes, $countsParams)['cnt'] ?? 0;
$assignedCount = db_fetch_one($conn, "SELECT COUNT(*) as cnt FROM leads WHERE $whereCountsBase AND executive_id IS NOT NULL AND status NOT IN ('disbursed', 'approved')", $countsTypes, $countsParams)['cnt'] ?? 0;

if ($filterAssigned === '1') {
    $statusCountsQuery = db_fetch_all($conn, "SELECT status, COUNT(*) as cnt FROM leads WHERE $whereCountsBase AND executive_id IS NOT NULL GROUP BY status", $countsTypes, $countsParams);
} else {
    $statusCountsQuery = db_fetch_all($conn, "SELECT status, COUNT(*) as cnt FROM leads WHERE $whereCountsBase GROUP BY status", $countsTypes, $countsParams);
}
$statusCounts = array_column($statusCountsQuery, 'cnt', 'status');

$leads = db_fetch_all($conn, "
    SELECT l.id, l.lead_id, l.lead_date, l.customer_name, l.customer_mobile,
           l.vehicle_make_model, l.registration_number, l.loan_amount, l.loan_type,
           l.status, l.payout_amount, l.payout_status,
           l.rc_status, l.insurance_status, l.rto_status,
           a.name as agent_name, f.name as financer_name,
           ex.name as executive_name, d.name as dealer_name
    FROM leads l
    LEFT JOIN agents a      ON l.agent_id = a.id
    LEFT JOIN financers f   ON l.financer_id = f.id
    LEFT JOIN executives ex ON l.executive_id = ex.id
    LEFT JOIN dealers d     ON l.dealer_id = d.id
    WHERE $where
    ORDER BY l.lead_date DESC
", $types, $params);

$headerActions = '<a href="' . BASE_URL . '/leads/create.php"
    class="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl shadow-sm transition-colors">
    <span class="text-lg leading-none">+</span> New Lead
</a>';

require_once __DIR__ . '/../includes/header.php';
?>

<!-- Filter Bar -->
<form method="GET" id="filterForm" class="card p-6 mb-8 animate-fade-in">
    <!-- Status Tabs section -->
    <div class="mb-4">
        <label class="form-label mb-3">Filter by Lead Status</label>
        
        <input type="hidden" name="status" id="filterStatusVal" value="<?= e($filterStatus) ?>">
        <input type="hidden" name="assigned" id="filterAssignedVal" value="<?= e($filterAssigned) ?>">
        
        <div class="flex overflow-x-auto gap-2.5 pb-2 -mb-2 scrollbar-none scroll-smooth">
            <?php if ($filterAssigned !== '1'): ?>
                <!-- Pending to Assign Tab -->
                <?php $isPendingToAssignActive = ($filterAssigned === '0' || ($filterStatus === '' && $filterAssigned === '')); ?>
                <button type="button" onclick="selectTab('', '0')"
                        class="group flex items-center shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer select-none <?= $isPendingToAssignActive ? 'bg-gradient-to-r from-brand-600 to-sec-600 text-white shadow-lg shadow-brand-500/20 scale-[1.02]' : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-brand-300 dark:hover:border-brand-700 hover:text-brand-600 dark:hover:text-brand-400 hover:-translate-y-0.5 shadow-sm' ?>">
                    <span>Pending to Assign</span>
                    <span class="<?= $isPendingToAssignActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-brand-50 dark:group-hover:bg-brand-950/40 group-hover:text-brand-600 dark:group-hover:text-brand-400' ?> ml-2 px-2 py-0.5 rounded-full text-xs font-bold transition-colors">
                        <?= $pendingToAssignCount ?>
                    </span>
                </button>

                <!-- Assigned Tab -->
                <?php $isAssignedActive = ($filterAssigned === '1'); ?>
                <button type="button" onclick="selectTab('', '1')"
                        class="group flex items-center shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer select-none <?= $isAssignedActive ? 'bg-gradient-to-r from-brand-600 to-sec-600 text-white shadow-lg shadow-brand-500/20 scale-[1.02]' : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-brand-300 dark:hover:border-brand-700 hover:text-brand-600 dark:hover:text-brand-400 hover:-translate-y-0.5 shadow-sm' ?>">
                    <span>Assigned</span>
                    <span class="<?= $isAssignedActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-brand-50 dark:group-hover:bg-brand-950/40 group-hover:text-brand-600 dark:group-hover:text-brand-400' ?> ml-2 px-2 py-0.5 rounded-full text-xs font-bold transition-colors">
                        <?= $assignedCount ?>
                    </span>
                </button>
            <?php else: ?>
                <!-- All Statuses Tab for Assigned Leads page -->
                <?php $isAllActive = ($filterStatus === ''); ?>
                <button type="button" onclick="selectTab('', '1')"
                        class="group flex items-center shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer select-none <?= $isAllActive ? 'bg-gradient-to-r from-brand-600 to-sec-600 text-white shadow-lg shadow-brand-500/20 scale-[1.02]' : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-brand-300 dark:hover:border-brand-700 hover:text-brand-600 dark:hover:text-brand-400 hover:-translate-y-0.5 shadow-sm' ?>">
                    <span>All Statuses</span>
                    <span class="<?= $isAllActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-brand-50 dark:group-hover:bg-brand-950/40 group-hover:text-brand-600 dark:group-hover:text-brand-400' ?> ml-2 px-2 py-0.5 rounded-full text-xs font-bold transition-colors">
                        <?= $assignedCount ?>
                    </span>
                </button>

                <!-- Individual Statuses for Assigned Leads page -->
                <?php
                $statuses = ['new', 'initiated', 'pending', 'rejected', 'on_hold'];
                foreach ($statuses as $s): 
                    $isActive = ($filterStatus === $s);
                    $cnt = $statusCounts[$s] ?? 0;
                    $label = ucfirst(str_replace('_', ' ', $s));
                ?>
                    <button type="button" onclick="selectTab('<?= $s ?>', '1')"
                            class="group flex items-center shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer select-none <?= $isActive ? 'bg-gradient-to-r from-brand-600 to-sec-600 text-white shadow-lg shadow-brand-500/20 scale-[1.02]' : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-brand-300 dark:hover:border-brand-700 hover:text-brand-600 dark:hover:text-brand-400 hover:-translate-y-0.5 shadow-sm' ?>">
                        <span><?= $label ?></span>
                        <span class="<?= $isActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-brand-50 dark:group-hover:bg-brand-950/40 group-hover:text-brand-600 dark:group-hover:text-brand-400' ?> ml-2 px-2 py-0.5 rounded-full text-xs font-bold transition-colors">
                            <?= $cnt ?>
                        </span>
                    </button>
                <?php endforeach; ?>
            <?php endif; ?>
        </div>
    </div>

    <!-- Dropdown Filters section -->
    <div class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/60 animate-fade-in">
        <div class="flex items-center justify-between mb-3">
            <span class="text-sm font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/>
                </svg>
                Filters
            </span>
            <?php if ($filterStatus || $filterAgent || $filterDealer || $filterFinancer || $filterExecutive || $filterLoanType): ?>
                <a href="<?= BASE_URL ?>/leads/index.php<?= $filterAssigned !== '' ? '?assigned=' . $filterAssigned : '' ?>" 
                   hx-boost="false"
                   class="inline-flex items-center gap-1.5 text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors cursor-pointer px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 rounded-xl shadow-sm">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                    Clear Filters
                </a>
            <?php endif; ?>
        </div>
        
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
                <label class="form-label text-xs mb-1 text-slate-500 dark:text-slate-400">Channel (Freehold)</label>
                <select name="agent_id" onchange="this.form.submit()" class="form-select text-sm py-2 bg-slate-50/80 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-700 cursor-pointer rounded-xl font-medium text-slate-700 dark:text-slate-300 transition-colors shadow-sm">
                    <option value="">👤 All Channels</option>
                    <?php foreach ($allAgents as $a): ?>
                        <option value="<?= $a['id'] ?>" <?= $filterAgent == $a['id'] ? 'selected' : '' ?>><?= e($a['name']) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            
            <div>
                <label class="form-label text-xs mb-1 text-slate-500 dark:text-slate-400">Dealer (Partner)</label>
                <select name="dealer_id" onchange="this.form.submit()" class="form-select text-sm py-2 bg-slate-50/80 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-700 cursor-pointer rounded-xl font-medium text-slate-700 dark:text-slate-300 transition-colors shadow-sm">
                    <option value="">🏪 All Dealers</option>
                    <?php foreach ($allDealers as $d): ?>
                        <option value="<?= $d['id'] ?>" <?= $filterDealer == $d['id'] ? 'selected' : '' ?>><?= e($d['name']) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            
            <div>
                <label class="form-label text-xs mb-1 text-slate-500 dark:text-slate-400">Financer</label>
                <select name="financer_id" onchange="this.form.submit()" class="form-select text-sm py-2 bg-slate-50/80 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-700 cursor-pointer rounded-xl font-medium text-slate-700 dark:text-slate-300 transition-colors shadow-sm">
                    <option value="">🏦 All Financers</option>
                    <?php foreach ($allFinancers as $f): ?>
                        <option value="<?= $f['id'] ?>" <?= $filterFinancer == $f['id'] ? 'selected' : '' ?>><?= e($f['name']) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            
            <div>
                <label class="form-label text-xs mb-1 text-slate-500 dark:text-slate-400">Executive</label>
                <select name="executive_id" onchange="this.form.submit()" class="form-select text-sm py-2 bg-slate-50/80 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-700 cursor-pointer rounded-xl font-medium text-slate-700 dark:text-slate-300 transition-colors shadow-sm">
                    <option value="">👔 All Executives</option>
                    <?php foreach ($allExecutives as $ex): ?>
                        <option value="<?= $ex['id'] ?>" <?= $filterExecutive == $ex['id'] ? 'selected' : '' ?>><?= e($ex['name']) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>

            <div>
                <label class="form-label text-xs mb-1 text-slate-500 dark:text-slate-400">Loan Type</label>
                <select name="loan_type" onchange="this.form.submit()" class="form-select text-sm py-2 bg-slate-50/80 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-700 cursor-pointer rounded-xl font-medium text-slate-700 dark:text-slate-300 transition-colors shadow-sm">
                    <option value="">💰 All Loan Types</option>
                    <option value="new_loan" <?= $filterLoanType === 'new_loan' ? 'selected' : '' ?>>New Loan</option>
                    <option value="refinance" <?= $filterLoanType === 'refinance' ? 'selected' : '' ?>>Refinance</option>
                </select>
            </div>
        </div>
    </div>
</form>

<script>
function selectTab(status, assigned) {
    document.getElementById('filterStatusVal').value = status;
    document.getElementById('filterAssignedVal').value = assigned;
    document.getElementById('filterForm').submit();
}
</script>

<!-- Leads Table -->
<div class="card">
    <div class="overflow-x-auto">
        <table id="leadsTable" class="w-full text-sm">
            <thead>
                <tr>
                    <th>Lead ID</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Mobile</th>
                    <th>Vehicle</th>
                    <th>Reg. No.</th>
                    <th>Type</th>
                    <th>Loan Amt</th>
                    <th>Channel</th>
                    <th>Financer</th>
                    <th>SFE</th>
                    <th>Status</th>
                    <th>Payout</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($leads as $lead): ?>
                <tr>
                    <td>
                        <a href="<?php echo BASE_URL; ?>/leads/assign.php?id=<?= e($lead['lead_id']) ?>"
                           class="text-brand-600 hover:text-brand-800 hover:underline font-mono text-xs font-bold whitespace-nowrap">
                            <?= e($lead['lead_id']) ?>
                        </a>
                    </td>
                    <td class="text-gray-500 text-xs whitespace-nowrap">
                        <?= date('d/m/Y', strtotime($lead['lead_date'])) ?>
                    </td>
                    <td class="whitespace-nowrap font-medium text-gray-800"><?= e($lead['customer_name']) ?></td>
                    <td class="text-gray-500 text-xs">
                        <a href="tel:<?= e($lead['customer_mobile']) ?>" class="hover:text-blue-600">
                            <?= e($lead['customer_mobile']) ?>
                        </a>
                    </td>
                    <td class="text-gray-600 text-xs"><?= e($lead['vehicle_make_model'] ?? '—') ?></td>
                    <td class="text-gray-500 text-xs font-mono"><?= e($lead['registration_number'] ?? '—') ?></td>
                    <td class="text-xs whitespace-nowrap"><?= loan_type_badge($lead['loan_type']) ?></td>
                    <td class="text-gray-700 text-xs font-medium whitespace-nowrap">
                        <?= $lead['loan_amount'] ? format_currency((float)$lead['loan_amount']) : '—' ?>
                    </td>
                    <td class="text-gray-500 text-xs">
                        <?= e($lead['dealer_name'] ? 'Dealer: ' . $lead['dealer_name'] : ($lead['agent_name'] ? 'Channel: ' . $lead['agent_name'] : '—')) ?>
                    </td>
                    <td class="text-gray-500 text-xs"><?= e($lead['financer_name'] ?? '—') ?></td>
                    <td class="text-gray-500 text-xs"><?= e($lead['executive_name'] ?? '—') ?></td>
                    <td>
                        <?= status_badge($lead['status']) ?>
                        <div class="mt-1">
                            <?php if (empty($lead['executive_name'])): ?>
                                <span class="inline-flex items-center text-[10px] uppercase font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 border border-amber-100/50 px-1.5 py-0.5 rounded">Pending to Assign</span>
                            <?php else: ?>
                                <span class="inline-flex items-center text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100/50 px-1.5 py-0.5 rounded">Assigned</span>
                            <?php endif; ?>
                        </div>
                    </td>

                    <td class="text-xs font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        <?= $lead['payout_amount'] ? format_currency((float)$lead['payout_amount']) : '—' ?>
                    </td>
                    <td>
                        <div class="flex items-center gap-2">
                            <a href="<?php echo BASE_URL; ?>/leads/assign.php?id=<?= e($lead['lead_id']) ?>"
                               class="p-1.5 text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg" title="Assign Lead">
                                <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
                                </svg>
                            </a>
                            <a href="<?php echo BASE_URL; ?>/leads/view.php?id=<?= e($lead['lead_id']) ?>"
                               class="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg" title="View Detail">
                                <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                </svg>
                            </a>
                            <?php if (is_admin() || is_staff()): ?>
                            <a href="<?php echo BASE_URL; ?>/leads/edit.php?id=<?= e($lead['lead_id']) ?>"
                               class="p-1.5 text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg" title="Edit Lead">
                                <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                                </svg>
                            </a>
                            <?php endif; ?>
                            <?php if (is_admin()): ?>
                            <form action="<?php echo BASE_URL; ?>/leads/delete.php" method="POST" class="inline" hx-confirm="Are you sure you want to completely delete this lead? This cannot be undone.">
                                <?= csrf_field() ?>
                                <input type="hidden" name="id" value="<?= e($lead['lead_id']) ?>">
                                <button type="submit" class="p-1.5 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer" title="Delete Lead">
                                    <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                    </svg>
                                </button>
                            </form>
                            <?php endif; ?>
                            <a href="<?= whatsapp_url($lead['customer_mobile'], $lead['customer_name'], $lead['lead_id'], $lead['status']) ?>" target="_blank"
                               class="p-1.5 text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg" title="WhatsApp Contact">
                                <svg class="w-4.5 h-4.5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.019-5.117-2.875-6.976C16.605 1.905 14.128.883 11.5.882c-5.443 0-9.87 4.422-9.873 9.869 0 1.704.469 3.372 1.358 4.845L1.92 19.34l3.963-1.04c1.46.797 3.09 1.214 4.764 1.214zM16.92 14.17c-.29-.145-1.716-.848-1.982-.945-.266-.096-.46-.145-.654.145-.193.29-.75.945-.918 1.139-.168.193-.337.218-.627.073-.29-.145-1.223-.45-2.33-1.439-.86-.767-1.44-1.716-1.609-2.006-.168-.29-.018-.446.127-.59.13-.13.29-.337.435-.507.145-.17.193-.29.29-.483.097-.193.048-.36-.024-.507-.072-.145-.654-1.576-.895-2.158-.236-.569-.475-.49-.654-.5l-.56-.007c-.193 0-.507.072-.772.361-.266.29-1.014.991-1.014 2.415 0 1.425 1.038 2.802 1.183 2.995.145.193 2.042 3.12 4.947 4.378.692.299 1.233.479 1.654.613.696.22 1.33.193 1.83.118.558-.084 1.717-.701 1.959-1.378.24-.677.24-1.257.17-1.377-.073-.12-.266-.193-.556-.339z"/>
                                </svg>
                            </a>
                        </div>
                    </td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>

<script>
$(document).ready(function() {
    initTable('#leadsTable', {
        order: [[1, 'desc']],
        columnDefs: [{ orderable: false, targets: 13 }],
        scrollX: true,
    });
});
</script>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
