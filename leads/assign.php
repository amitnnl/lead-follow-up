<?php
// leads/assign.php — Assign Lead
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';

// Only Admin or Staff should assign leads
if (!is_admin() && !is_staff()) {
    flash('error', 'You do not have permission to assign leads.');
    header('Location: ' . BASE_URL . '/leads/index.php');
    exit;
}

$leadIdParam = $_GET['id'] ?? '';
$lead = db_fetch_one($conn, "SELECT * FROM leads WHERE lead_id = ?", 's', [$leadIdParam]);

if (!$lead) {
    flash('error', 'Lead not found.');
    header('Location: ' . BASE_URL . '/leads/index.php');
    exit;
}

$pageTitle      = 'Assign Lead: ' . $lead['lead_id'];
$pageBreadcrumb = 'Leads / ' . $lead['lead_id'] . ' / Assign';

$agents     = db_fetch_all($conn, "SELECT id, name FROM agents WHERE is_active=1 ORDER BY name");
$financers  = db_fetch_all($conn, "SELECT id, name FROM financers WHERE is_active=1 ORDER BY name");
$dealers    = db_fetch_all($conn, "SELECT id, name FROM dealers WHERE is_active=1 ORDER BY name");
$executives = db_fetch_all($conn, "SELECT id, name FROM executives WHERE is_active=1 ORDER BY name");

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verify_csrf()) { die('Invalid CSRF token'); }

    $agent_id     = (int)($_POST['agent_id'] ?? 0) ?: null;
    $financer_id  = (int)($_POST['financer_id'] ?? 0) ?: null;
    $dealer_id    = (int)($_POST['dealer_id'] ?? 0) ?: null;
    $executive_id = (int)($_POST['executive_id'] ?? 0) ?: null;
    


    $stmt = $conn->prepare("UPDATE leads SET agent_id=?, financer_id=?, dealer_id=?, executive_id=? WHERE id=?");
    $stmt->bind_param('iiiii', $agent_id, $financer_id, $dealer_id, $executive_id, $lead['id']);
    
    if ($stmt->execute()) {
        log_lead_action($conn, $lead['id'], 'Lead Assigned', 'Assignment updated by ' . current_user()['name'], current_user_id());
        flash('success', 'Lead assigned successfully!');
        header('Location: ' . BASE_URL . '/leads/view.php?id=' . urlencode($lead['lead_id']));
        exit;
    } else {
        flash('error', 'Database error: ' . $conn->error);
    }
}

$headerActions = '<a href="' . BASE_URL . '/leads/view.php?id=' . e($lead['lead_id']) . '"
    class="btn btn-secondary btn-sm shadow-sm">
    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg> Back to Lead
</a>';

require_once __DIR__ . '/../includes/header.php';
?>

<div class="max-w-3xl mx-auto animate-fade-up">
    <div class="card mb-6">
        <div class="card-header">
            <h2>Assign Lead Details</h2>
        </div>
        
        <div class="p-6 bg-brand-50/20 dark:bg-brand-950/10 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
            <div>
                <div class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Customer</div>
                <div class="font-bold text-slate-900 dark:text-white text-lg tracking-tight"><?= e($lead['customer_name']) ?></div>
            </div>
            <div class="text-right">
                <div class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Vehicle</div>
                <div class="font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-sec-600 dark:from-brand-400 dark:to-sec-400 text-lg tracking-tight"><?= e($lead['vehicle_make_model'] ?: 'N/A') ?></div>
            </div>
        </div>

        <form method="POST" action="" class="p-6 space-y-6">
            <?= csrf_field() ?>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Agent -->
                <div>
                    <label class="form-label" id="lbl_agent_id">Agent / DSA</label>
                    <select name="agent_id" class="form-select">
                        <option value="">— Unassigned —</option>
                        <?php foreach ($agents as $a): ?>
                        <option value="<?= $a['id'] ?>" <?= ($lead['agent_id'] == $a['id']) ? 'selected' : '' ?>>
                            <?= e($a['name']) ?>
                        </option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <!-- Financer -->
                <div>
                    <label class="form-label" id="lbl_financer_id">Financer / Bank</label>
                    <select name="financer_id" class="form-select">
                        <option value="">— Unassigned —</option>
                        <?php foreach ($financers as $f): ?>
                        <option value="<?= $f['id'] ?>" <?= ($lead['financer_id'] == $f['id']) ? 'selected' : '' ?>>
                            <?= e($f['name']) ?>
                        </option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <!-- Dealer -->
                <div>
                    <label class="form-label" id="lbl_dealer_id">Dealer</label>
                    <select name="dealer_id" class="form-select">
                        <option value="">— Unassigned —</option>
                        <?php foreach ($dealers as $d): ?>
                        <option value="<?= $d['id'] ?>" <?= ($lead['dealer_id'] == $d['id']) ? 'selected' : '' ?>>
                            <?= e($d['name']) ?>
                        </option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <!-- SFE -->
                <div>
                    <label class="form-label" id="lbl_executive_id">SFE / Executive</label>
                    <select name="executive_id" class="form-select border-brand-200/60 dark:border-brand-900/40 bg-brand-50/30 dark:bg-brand-950/20 focus:bg-white dark:focus:bg-slate-900 transition-all duration-300">
                        <option value="">— Unassigned —</option>
                        <?php foreach ($executives as $ex): ?>
                        <option value="<?= $ex['id'] ?>" <?= ($lead['executive_id'] == $ex['id']) ? 'selected' : '' ?>>
                            <?= e($ex['name']) ?>
                        </option>
                        <?php endforeach; ?>
                    </select>
                    <p class="text-xs text-slate-400 mt-2 font-medium">The executive will be responsible for follow-ups.</p>
                </div>
            </div>



            <div class="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <a href="<?php echo BASE_URL; ?>/leads/view.php?id=<?= urlencode($lead['lead_id']) ?>" 
                   class="btn btn-secondary py-2.5">Cancel</a>
                <button type="submit" 
                        class="btn-primary py-2.5 shadow-md hover-glow">
                    Save Assignment
                </button>
            </div>
        </form>
    </div>
</div>




<?php require_once __DIR__ . '/../includes/footer.php'; ?>
