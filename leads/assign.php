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

    // Handle Quick Add requests on-the-fly
    if (isset($_POST['quick_add'])) {
        $type = $_POST['quick_add'];
        if ($type === 'agent') {
            $name   = trim($_POST['name'] ?? '');
            $mobile = trim($_POST['mobile'] ?? '');
            $email  = trim($_POST['email'] ?? '');
            $pan    = trim($_POST['pan_number'] ?? '');
            if ($name && $mobile) {
                db_query($conn, "INSERT INTO agents (name, mobile, email, pan_number) VALUES (?, ?, ?, ?)", 'ssss', [$name, $mobile, $email, $pan]);
                $newId = $conn->insert_id;
                flash('success', 'Quick Added Agent: ' . $name);
                header('Location: ' . BASE_URL . '/leads/assign.php?id=' . urlencode($lead['lead_id']) . '&select_agent=' . $newId);
                exit;
            }
        } elseif ($type === 'financer') {
            $name    = trim($_POST['name'] ?? '');
            $contact = trim($_POST['contact_person'] ?? '');
            $mobile  = trim($_POST['mobile'] ?? '');
            if ($name) {
                db_query($conn, "INSERT INTO financers (name, contact_person, mobile) VALUES (?, ?, ?)", 'sss', [$name, $contact, $mobile]);
                $newId = $conn->insert_id;
                flash('success', 'Quick Added Financer: ' . $name);
                header('Location: ' . BASE_URL . '/leads/assign.php?id=' . urlencode($lead['lead_id']) . '&select_financer=' . $newId);
                exit;
            }
        } elseif ($type === 'dealer') {
            $name    = trim($_POST['name'] ?? '');
            $contact = trim($_POST['contact_person'] ?? '');
            $mobile  = trim($_POST['mobile'] ?? '');
            if ($name) {
                db_query($conn, "INSERT INTO dealers (name, contact_person, mobile) VALUES (?, ?, ?)", 'sss', [$name, $contact, $mobile]);
                $newId = $conn->insert_id;
                flash('success', 'Quick Added Dealer: ' . $name);
                header('Location: ' . BASE_URL . '/leads/assign.php?id=' . urlencode($lead['lead_id']) . '&select_dealer=' . $newId);
                exit;
            }
        }
        flash('error', 'Required fields are missing for quick addition.');
        header('Location: ' . BASE_URL . '/leads/assign.php?id=' . urlencode($lead['lead_id']));
        exit;
    }

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
                    <div class="flex items-center justify-between mb-2">
                        <label class="form-label mb-0" id="lbl_agent_id">Agent / DSA</label>
                        <button type="button" onclick="openModal('quickAddAgentModal')" class="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 transition-colors cursor-pointer focus:outline-none">
                            + Quick Add
                        </button>
                    </div>
                    <select name="agent_id" class="form-select">
                        <option value="">— Unassigned —</option>
                        <?php foreach ($agents as $a): ?>
                        <option value="<?= $a['id'] ?>" <?= ((isset($_GET['select_agent']) && $_GET['select_agent'] == $a['id']) || (!isset($_GET['select_agent']) && $lead['agent_id'] == $a['id'])) ? 'selected' : '' ?>>
                            <?= e($a['name']) ?>
                        </option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <!-- Financer -->
                <div>
                    <div class="flex items-center justify-between mb-2">
                        <label class="form-label mb-0" id="lbl_financer_id">Financer / Bank</label>
                        <button type="button" onclick="openModal('quickAddFinancerModal')" class="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 transition-colors cursor-pointer focus:outline-none">
                            + Quick Add
                        </button>
                    </div>
                    <select name="financer_id" class="form-select">
                        <option value="">— Unassigned —</option>
                        <?php foreach ($financers as $f): ?>
                        <option value="<?= $f['id'] ?>" <?= ((isset($_GET['select_financer']) && $_GET['select_financer'] == $f['id']) || (!isset($_GET['select_financer']) && $lead['financer_id'] == $f['id'])) ? 'selected' : '' ?>>
                            <?= e($f['name']) ?>
                        </option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <!-- Dealer -->
                <div>
                    <div class="flex items-center justify-between mb-2">
                        <label class="form-label mb-0" id="lbl_dealer_id">Dealer</label>
                        <button type="button" onclick="openModal('quickAddDealerModal')" class="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 transition-colors cursor-pointer focus:outline-none">
                            + Quick Add
                        </button>
                    </div>
                    <select name="dealer_id" class="form-select">
                        <option value="">— Unassigned —</option>
                        <?php foreach ($dealers as $d): ?>
                        <option value="<?= $d['id'] ?>" <?= ((isset($_GET['select_dealer']) && $_GET['select_dealer'] == $d['id']) || (!isset($_GET['select_dealer']) && $lead['dealer_id'] == $d['id'])) ? 'selected' : '' ?>>
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




<!-- Quick Add Agent Modal -->
<div id="quickAddAgentModal" class="modal-backdrop hidden" onclick="if(event.target===this)closeModal('quickAddAgentModal')">
    <div class="modal-panel max-w-md w-full">
        <div class="modal-header">
            <h3 class="font-bold text-slate-700 dark:text-white uppercase tracking-wider text-xs">Quick Add Agent</h3>
            <button onclick="closeModal('quickAddAgentModal')" class="text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 text-2xl cursor-pointer">×</button>
        </div>
        <form method="POST" action="" class="modal-body space-y-4">
            <?= csrf_field() ?>
            <input type="hidden" name="quick_add" value="agent">
            <div>
                <label class="form-label required-lbl">Full Name</label>
                <input type="text" name="name" class="form-input" required placeholder="Agent Name">
            </div>
            <div>
                <label class="form-label required-lbl">Mobile</label>
                <input type="tel" name="mobile" class="form-input" required placeholder="10-digit mobile">
            </div>
            <div>
                <label class="form-label">Email</label>
                <input type="email" name="email" class="form-input" placeholder="agent@email.com">
            </div>
            <div>
                <label class="form-label">PAN Number</label>
                <input type="text" name="pan_number" class="form-input" placeholder="ABCDE1234F">
            </div>
            <div class="modal-footer pt-4 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onclick="closeModal('quickAddAgentModal')" class="btn btn-secondary text-xs">Cancel</button>
                <button type="submit" class="btn btn-primary text-xs">Add Agent</button>
            </div>
        </form>
    </div>
</div>

<!-- Quick Add Financer Modal -->
<div id="quickAddFinancerModal" class="modal-backdrop hidden" onclick="if(event.target===this)closeModal('quickAddFinancerModal')">
    <div class="modal-panel max-w-md w-full">
        <div class="modal-header">
            <h3 class="font-bold text-slate-700 dark:text-white uppercase tracking-wider text-xs">Quick Add Financer</h3>
            <button onclick="closeModal('quickAddFinancerModal')" class="text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 text-2xl cursor-pointer">×</button>
        </div>
        <form method="POST" action="" class="modal-body space-y-4">
            <?= csrf_field() ?>
            <input type="hidden" name="quick_add" value="financer">
            <div>
                <label class="form-label required-lbl">Financer Name</label>
                <input type="text" name="name" class="form-input" required placeholder="Financer business name">
            </div>
            <div>
                <label class="form-label">Contact Person</label>
                <input type="text" name="contact_person" class="form-input" placeholder="e.g. Bank Manager">
            </div>
            <div>
                <label class="form-label">Mobile</label>
                <input type="tel" name="mobile" class="form-input" placeholder="Contact number">
            </div>
            <div class="modal-footer pt-4 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onclick="closeModal('quickAddFinancerModal')" class="btn btn-secondary text-xs">Cancel</button>
                <button type="submit" class="btn btn-primary text-xs">Add Financer</button>
            </div>
        </form>
    </div>
</div>

<!-- Quick Add Dealer Modal -->
<div id="quickAddDealerModal" class="modal-backdrop hidden" onclick="if(event.target===this)closeModal('quickAddDealerModal')">
    <div class="modal-panel max-w-md w-full">
        <div class="modal-header">
            <h3 class="font-bold text-slate-700 dark:text-white uppercase tracking-wider text-xs">Quick Add Dealer</h3>
            <button onclick="closeModal('quickAddDealerModal')" class="text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 text-2xl cursor-pointer">×</button>
        </div>
        <form method="POST" action="" class="modal-body space-y-4">
            <?= csrf_field() ?>
            <input type="hidden" name="quick_add" value="dealer">
            <div>
                <label class="form-label required-lbl">Dealer Name</label>
                <input type="text" name="name" class="form-input" required placeholder="Dealer business name">
            </div>
            <div>
                <label class="form-label">Contact Person</label>
                <input type="text" name="contact_person" class="form-input" placeholder="e.g. Sales Executive">
            </div>
            <div>
                <label class="form-label">Mobile</label>
                <input type="tel" name="mobile" class="form-input" placeholder="Contact number">
            </div>
            <div class="modal-footer pt-4 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onclick="closeModal('quickAddDealerModal')" class="btn btn-secondary text-xs">Cancel</button>
                <button type="submit" class="btn btn-primary text-xs">Add Dealer</button>
            </div>
        </form>
    </div>
</div>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
