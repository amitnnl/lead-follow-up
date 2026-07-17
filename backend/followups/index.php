<?php
// followups/index.php — All Follow-ups
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';
$pageTitle      = 'Follow-ups';
$pageBreadcrumb = 'All Follow-ups';

$filter = isset($_GET['filter']) ? $_GET['filter'] : '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'delete_followup') {
    if (!verify_csrf()) die('Invalid CSRF');
    if (!is_admin() && !is_staff()) die('Unauthorized');
    
    $fuId = (int)$_POST['followup_id'];
    db_query($conn, "DELETE FROM lead_followups WHERE id=?", 'i', [$fuId]);
    flash('success', 'Follow-up deleted successfully.');
    
    $redirectUrl = isset($_POST['redirect_to']) ? $_POST['redirect_to'] : BASE_URL . '/followups/index.php';
    header('Location: ' . $redirectUrl);
    exit;
}

$where = 'l.status NOT IN ("disbursed", "rejected")';
$params = [];
$types  = '';

if ($filter === 'today') {
    $where .= ' AND lf.next_followup_date = CURDATE()';
} elseif ($filter === 'overdue') {
    $where .= ' AND lf.next_followup_date < CURDATE()';
} elseif ($filter === 'upcoming') {
    $where .= ' AND lf.next_followup_date > CURDATE()';
}

// For agents and channel agents: only their leads
if (is_channel_agent()) {
    $cheRow = db_fetch_one($conn, "SELECT id FROM channel_executives WHERE user_id=?", 'i', [current_user_id()]);
    if ($cheRow) {
        $where   .= ' AND (l.created_by = ? OR l.channel_executive_id = ?)';
        $params[] = current_user_id();
        $params[] = $cheRow['id'];
        $types   .= 'ii';
    }
} elseif (is_agent()) {
    $agentRow = db_fetch_one($conn, "SELECT id FROM agents WHERE user_id=?", 'i', [current_user_id()]);
    if ($agentRow) {
        $where   .= ' AND (l.created_by = ? OR l.agent_id = ?)';
        $params[] = current_user_id();
        $params[] = $agentRow['id'];
        $types   .= 'ii';
    }
}

$followups = db_fetch_all($conn, "
    SELECT lf.id, lf.followup_date, lf.next_followup_date, lf.remarks, lf.status_changed_to,
           l.lead_id, l.customer_name, l.customer_mobile, l.status as lead_status,
           ex.name as executive_name, u.name as done_by
    FROM lead_followups lf
    JOIN leads l ON lf.lead_id = l.id
    LEFT JOIN executives ex ON l.executive_id = ex.id
    LEFT JOIN users u ON lf.created_by = u.id
    WHERE $where
    ORDER BY lf.next_followup_date ASC
    LIMIT 200
", $types, $params);

require_once __DIR__ . '/../includes/header.php';
?>
<!-- Top Action Bar -->
<div class="flex justify-between items-center mb-6">
    <div class="flex flex-wrap gap-2.5">
        <?php
        $tabs = ['today' => '📅 Today', 'overdue' => '🔴 Overdue', 'upcoming' => '🔵 Upcoming', '' => 'All'];
        foreach ($tabs as $key => $label):
            $active = ($filter === $key) 
                ? 'bg-gradient-to-r from-brand-600 to-sec-600 text-white shadow-lg shadow-brand-500/15 border-transparent font-bold' 
                : 'bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800';
        ?>
        <a href="?filter=<?= $key ?>" class="px-5 py-2 rounded-full text-xs font-semibold transition-all duration-300 <?= $active ?>">
            <?= $label ?>
        </a>
        <?php endforeach; ?>
    </div>
    
    <a href="<?= BASE_URL ?>/followups/calendar.php" class="btn btn-primary btn-sm flex items-center gap-2">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
        Calendar View
    </a>
</div>

<?php if (is_admin()): ?>
<div class="mb-6">
    <a href="<?php echo BASE_URL; ?>/cron/reminders.php?key=dsa_cron_secret_77" 
       class="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50 rounded-xl text-sm font-bold transition-all shadow-sm border border-indigo-100 dark:border-indigo-800/50">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
        Send Daily Reminders Now
    </a>
</div>
<?php endif; ?>

<div class="card">
    <div class="overflow-x-auto">
        <table id="followupsTable" class="w-full text-sm">
            <thead>
                <tr>
                    <th>Lead ID</th>
                    <th>Customer</th>
                    <th>Mobile</th>
                    <th>Follow-up Date</th>
                    <th>Next Follow-up</th>
                    <th>Remarks</th>
                    <th>Status</th>
                    <th>Executive</th>
                    <th>Done By</th>
                    <th class="text-center">Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($followups as $fu):
                    $overdue = $fu['next_followup_date'] && $fu['next_followup_date'] < date('Y-m-d');
                    $today   = $fu['next_followup_date'] === date('Y-m-d');
                    $rowClass = $overdue 
                        ? 'bg-rose-500/5 dark:bg-rose-500/5' 
                        : ($today ? 'bg-amber-500/5 dark:bg-amber-500/5' : '');
                ?>
                <tr class="<?= $rowClass ?>">
                    <td>
                        <a href="<?php echo BASE_URL; ?>/leads/view.php?id=<?= e($fu['lead_id']) ?>&tab=followups"
                           class="text-brand-600 dark:text-brand-400 hover:underline font-mono text-xs font-black">
                            <?= e($fu['lead_id']) ?>
                        </a>
                    </td>
                    <td class="font-bold text-slate-800 dark:text-slate-200"><?= e($fu['customer_name']) ?></td>
                    <td class="text-xs">
                        <a href="tel:<?= e($fu['customer_mobile']) ?>" class="hover:text-brand-500 font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1">
                            <svg class="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                            <?= e($fu['customer_mobile']) ?>
                        </a>
                    </td>
                    <td class="text-slate-500 dark:text-slate-400 text-xs font-mono"><?= $fu['followup_date'] ?></td>
                    <td class="text-xs font-mono whitespace-nowrap">
                        <?php if ($fu['next_followup_date']): ?>
                        <span class="font-bold flex items-center gap-1.5 <?= $overdue ? 'text-rose-600 dark:text-rose-400' : ($today ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400') ?>">
                            <span class="w-1.5 h-1.5 rounded-full <?= $overdue ? 'bg-rose-500' : ($today ? 'bg-amber-500' : 'bg-slate-400') ?>"></span>
                            <?= date('d M Y', strtotime($fu['next_followup_date'])) ?>
                        </span>
                        <?php else: ?>—<?php endif; ?>
                    </td>
                    <td class="text-slate-600 dark:text-slate-400 text-xs max-w-xs truncate font-medium"><?= e($fu['remarks']) ?></td>
                    <td><?= status_badge($fu['lead_status']) ?></td>
                    <td class="text-slate-500 dark:text-slate-400 text-xs"><?= e($fu['executive_name'] ?? '—') ?></td>
                    <td class="text-slate-400 dark:text-slate-500 text-xs"><?= e($fu['done_by'] ?? '—') ?></td>
                    <td>
                        <div class="flex items-center justify-center gap-1.5">
                            <a href="<?php echo BASE_URL; ?>/leads/view.php?id=<?= e($fu['lead_id']) ?>"
                               class="p-2 text-brand-600 hover:text-brand-900 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/40 dark:hover:bg-brand-950/80 rounded-xl transition-all duration-300 shadow-sm" title="View Lead">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                            </a>
                            <a href="<?= whatsapp_url($fu['customer_mobile'], $fu['customer_name'], $fu['lead_id'], $fu['lead_status']) ?>"
                               target="_blank" class="p-2 text-emerald-600 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/80 rounded-xl transition-all duration-300 shadow-sm" title="WhatsApp">
                                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.717-1.458L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.03-5.115-2.903-6.99C16.26 1.876 13.784.843 11.15.842 5.712.842 1.29 5.26 1.285 10.7c-.002 1.716.446 3.393 1.3 4.89l-.995 3.636 3.73-.978c1.477.806 3.011 1.233 4.73 1.233z"/></svg>
                            </a>
                            <a href="tel:<?= e($fu['customer_mobile']) ?>"
                               class="p-2 text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/80 rounded-xl transition-all duration-300 shadow-sm" title="Call">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                            </a>
                            <?php if (is_admin() || is_staff()): ?>
                            <form method="POST" action="" class="inline-block m-0 p-0" onsubmit="return confirm('Are you sure you want to delete this follow-up?');">
                                <?= csrf_field() ?>
                                <input type="hidden" name="action" value="delete_followup">
                                <input type="hidden" name="followup_id" value="<?= $fu['id'] ?>">
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

<script>
$(document).ready(function() {
    initTable('#followupsTable', {
        order: [[4, 'asc']],
        columnDefs: [{ orderable: false, targets: 9 }],
    });
});
</script>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
