<?php
// leads/index.php — Lead List
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';
$pageTitle      = 'Leads';
$pageBreadcrumb = 'All Leads';

// Role-based filter: agents see only their leads
$where = '1=1';
$params = [];
$types  = '';
if (is_agent()) {
    $agentRow = db_fetch_one($conn,
        "SELECT id FROM agents WHERE user_id = ?", 'i', [current_user_id()]);
    if ($agentRow) {
        $where  .= ' AND l.agent_id = ?';
        $params[] = $agentRow['id'];
        $types   .= 'i';
    }
}

// Status filter
$filterStatus = $_GET['status'] ?? '';
$filterRc     = $_GET['rc_status'] ?? '';
$filterIns    = $_GET['insurance_status'] ?? '';
$filterRto    = $_GET['rto_status'] ?? '';

if ($filterStatus) {
    $where   .= ' AND l.status = ?';
    $params[] = $filterStatus;
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
$filterFinancer  = $_GET['financer_id'] ?? '';
$filterExecutive = $_GET['executive_id'] ?? '';

if ($filterAgent) {
    $where   .= ' AND l.agent_id = ?';
    $params[] = $filterAgent;
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

// Fetch lists for filter dropdowns
$allAgents     = db_fetch_all($conn, "SELECT id, name FROM agents WHERE is_active=1 ORDER BY name");
$allFinancers  = db_fetch_all($conn, "SELECT id, name FROM financers WHERE is_active=1 ORDER BY name");
$allExecutives = db_fetch_all($conn, "SELECT id, name FROM executives WHERE is_active=1 ORDER BY name");

$leads = db_fetch_all($conn, "
    SELECT l.id, l.lead_id, l.lead_date, l.customer_name, l.customer_mobile,
           l.vehicle_make_model, l.registration_number, l.loan_amount,
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

$headerActions = '<a href="/lead-follow-up/leads/create.php"
    class="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl shadow-sm transition-colors">
    <span class="text-lg leading-none">+</span> New Lead
</a>';

require_once __DIR__ . '/../includes/header.php';
?>

<!-- Filter Bar -->
<form method="GET" class="card p-6 mb-6">
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 items-end">
        <div>
            <label class="form-label">Lead Status</label>
            <select name="status" class="form-select">
                <option value="">All Statuses</option>
                <?php
                $statuses = ['new','pending','approved','disbursed','rejected','on_hold'];
                foreach ($statuses as $s): ?>
                    <option value="<?= $s ?>" <?= $filterStatus === $s ? 'selected' : '' ?>><?= ucfirst(str_replace('_',' ',$s)) ?></option>
                <?php endforeach; ?>
            </select>
        </div>
        <div>
            <label class="form-label">RC Status</label>
            <select name="rc_status" class="form-select">
                <option value="">All</option>
                <option value="pending" <?= $filterRc === 'pending' ? 'selected' : '' ?>>Pending</option>
                <option value="received" <?= $filterRc === 'received' ? 'selected' : '' ?>>Received</option>
                <option value="not_applicable" <?= $filterRc === 'not_applicable' ? 'selected' : '' ?>>N/A</option>
            </select>
        </div>
        <div>
            <label class="form-label">Insurance Status</label>
            <select name="insurance_status" class="form-select">
                <option value="">All</option>
                <option value="pending" <?= $filterIns === 'pending' ? 'selected' : '' ?>>Pending</option>
                <option value="received" <?= $filterIns === 'received' ? 'selected' : '' ?>>Received</option>
                <option value="not_applicable" <?= $filterIns === 'not_applicable' ? 'selected' : '' ?>>N/A</option>
            </select>
        </div>
        <div>
            <label class="form-label">RTO Status</label>
            <select name="rto_status" class="form-select">
                <option value="">All</option>
                <option value="pending" <?= $filterRto === 'pending' ? 'selected' : '' ?>>Pending</option>
                <option value="done" <?= $filterRto === 'done' ? 'selected' : '' ?>>Done</option>
                <option value="not_applicable" <?= $filterRto === 'not_applicable' ? 'selected' : '' ?>>N/A</option>
            </select>
        </div>
        <div>
            <label class="form-label">Agent / DSA</label>
            <select name="agent_id" class="form-select">
                <option value="">All</option>
                <?php foreach ($allAgents as $a): ?>
                    <option value="<?= $a['id'] ?>" <?= $filterAgent == $a['id'] ? 'selected' : '' ?>><?= e($a['name']) ?></option>
                <?php endforeach; ?>
            </select>
        </div>
        <div>
            <label class="form-label">Financer</label>
            <select name="financer_id" class="form-select">
                <option value="">All</option>
                <?php foreach ($allFinancers as $f): ?>
                    <option value="<?= $f['id'] ?>" <?= $filterFinancer == $f['id'] ? 'selected' : '' ?>><?= e($f['name']) ?></option>
                <?php endforeach; ?>
            </select>
        </div>
        <div>
            <label class="form-label">Executive</label>
            <select name="executive_id" class="form-select">
                <option value="">All</option>
                <?php foreach ($allExecutives as $ex): ?>
                    <option value="<?= $ex['id'] ?>" <?= $filterExecutive == $ex['id'] ? 'selected' : '' ?>><?= e($ex['name']) ?></option>
                <?php endforeach; ?>
            </select>
        </div>
        <div class="flex items-center gap-2">
            <button type="submit" class="btn btn-primary btn-sm flex-1">
                Filter
            </button>
            <?php if ($filterStatus || $filterRc || $filterIns || $filterRto || $filterAgent || $filterFinancer || $filterExecutive): ?>
                <a href="/lead-follow-up/leads/index.php" class="btn btn-secondary btn-sm">Clear</a>
            <?php endif; ?>
        </div>
    </div>
</form>

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
                    <th>Loan Amt</th>
                    <th>Agent/Ref</th>
                    <th>Financer</th>
                    <th>SFE</th>
                    <th>Status</th>
                    <th>RC</th>
                    <th>Ins.</th>
                    <th>RTO</th>
                    <th>Payout</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($leads as $lead): ?>
                <tr>
                    <td class="px-4 py-3">
                        <a href="/lead-follow-up/leads/view.php?id=<?= e($lead['lead_id']) ?>"
                           class="text-blue-600 hover:underline font-mono text-xs font-bold">
                            <?= e($lead['lead_id']) ?>
                        </a>
                    </td>
                    <td class="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        <?= date('d/m/Y', strtotime($lead['lead_date'])) ?>
                    </td>
                    <td class="px-4 py-3 font-medium text-gray-800"><?= e($lead['customer_name']) ?></td>
                    <td class="px-4 py-3 text-gray-500 text-xs">
                        <a href="tel:<?= e($lead['customer_mobile']) ?>" class="hover:text-blue-600">
                            <?= e($lead['customer_mobile']) ?>
                        </a>
                    </td>
                    <td class="px-4 py-3 text-gray-600 text-xs"><?= e($lead['vehicle_make_model'] ?? '—') ?></td>
                    <td class="px-4 py-3 text-gray-500 text-xs font-mono"><?= e($lead['registration_number'] ?? '—') ?></td>
                    <td class="px-4 py-3 text-gray-700 text-xs font-medium whitespace-nowrap">
                        <?= $lead['loan_amount'] ? format_currency((float)$lead['loan_amount']) : '—' ?>
                    </td>
                    <td class="px-4 py-3 text-gray-500 text-xs"><?= e($lead['agent_name'] ?? '—') ?></td>
                    <td class="px-4 py-3 text-gray-500 text-xs"><?= e($lead['financer_name'] ?? '—') ?></td>
                    <td class="px-4 py-3 text-gray-500 text-xs"><?= e($lead['executive_name'] ?? '—') ?></td>
                    <td class="px-4 py-3"><?= status_badge($lead['status']) ?></td>
                    <td class="px-4 py-3">
                        <?php
                        $rcClass = match($lead['rc_status']) {
                            'received' => 'badge badge-green',
                            'not_applicable' => 'badge badge-gray',
                            default    => 'badge badge-yellow'
                        };
                        ?>
                        <span class="<?= $rcClass ?>"><?= ucfirst(str_replace('_',' ',$lead['rc_status'])) ?></span>
                    </td>
                    <td class="px-4 py-3">
                        <?php
                        $insClass = match($lead['insurance_status']) {
                            'received' => 'badge badge-green',
                            'not_applicable' => 'badge badge-gray',
                            default    => 'badge badge-yellow'
                        };
                        ?>
                        <span class="<?= $insClass ?>"><?= ucfirst(str_replace('_',' ',$lead['insurance_status'])) ?></span>
                    </td>
                    <td class="px-4 py-3">
                        <?php
                        $rtoClass = match($lead['rto_status']) {
                            'done' => 'badge badge-green',
                            'not_applicable' => 'badge badge-gray',
                            default => 'badge badge-yellow'
                        };
                        ?>
                        <span class="<?= $rtoClass ?>"><?= ucfirst(str_replace('_',' ',$lead['rto_status'])) ?></span>
                    </td>
                    <td class="px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        <?= $lead['payout_amount'] ? format_currency((float)$lead['payout_amount']) : '—' ?>
                    </td>
                    <td class="px-4 py-3">
                        <div class="flex items-center gap-1.5">
                            <a href="/lead-follow-up/leads/view.php?id=<?= e($lead['lead_id']) ?>"
                               class="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg" title="View Detail">
                                <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                </svg>
                            </a>
                            <?php if (is_admin() || is_staff()): ?>
                            <a href="/lead-follow-up/leads/edit.php?id=<?= e($lead['lead_id']) ?>"
                               class="p-1.5 text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg" title="Edit Lead">
                                <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                                </svg>
                            </a>
                            <?php endif; ?>
                            <?php if (is_admin()): ?>
                            <form action="/lead-follow-up/leads/delete.php" method="POST" class="inline" onsubmit="return confirm('Are you sure you want to completely delete this lead? This cannot be undone.');">
                                <?= csrf_field() ?>
                                <input type="hidden" name="id" value="<?= e($lead['lead_id']) ?>">
                                <button type="submit" class="p-1.5 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer" title="Delete Lead">
                                    <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                    </svg>
                                </button>
                            </form>
                            <?php endif; ?>
                            <a href="https://wa.me/91<?= preg_replace('/\D/','',$lead['customer_mobile']) ?>" target="_blank"
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
        columnDefs: [{ orderable: false, targets: 15 }],
        scrollX: true,
    });
});
</script>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
