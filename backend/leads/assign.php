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
$executives = db_fetch_all($conn, "SELECT id, name, financer_id FROM executives WHERE is_active=1 ORDER BY name");

$selectedAgentName = '';
if (isset($_GET['select_agent'])) {
    $selId = (int)$_GET['select_agent'];
    foreach ($agents as $a) {
        if ($a['id'] == $selId) {
            $selectedAgentName = $a['name'];
            break;
        }
    }
} elseif (!empty($lead['agent_id'])) {
    foreach ($agents as $a) {
        if ($a['id'] == $lead['agent_id']) {
            $selectedAgentName = $a['name'];
            break;
        }
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verify_csrf()) { die('Invalid CSRF token'); }

    // Handle Quick Add requests on-the-fly
    if (isset($_POST['quick_add'])) {
        $type = $_POST['quick_add'];
        if ($type === 'agent') {
            $financer_id = (int)($_POST['financer_id'] ?? 0) ?: null;
            $name   = trim($_POST['name'] ?? '');
            $mobile = trim($_POST['mobile'] ?? '');
            $email  = trim($_POST['email'] ?? '');
            $pan    = trim($_POST['pan_number'] ?? '');
            if ($name && $mobile) {
                db_query($conn, "INSERT INTO agents (financer_id, name, mobile, email, pan_number) VALUES (?, ?, ?, ?, ?)", 'issss', [$financer_id, $name, $mobile, $email, $pan]);
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
        } elseif ($type === 'executive') {
            $name   = trim($_POST['name'] ?? '');
            $mobile = trim($_POST['mobile'] ?? '');
            if ($name && $mobile) {
                db_query($conn, "INSERT INTO executives (name, mobile) VALUES (?, ?)", 'ss', [$name, $mobile]);
                $newId = $conn->insert_id;
                flash('success', 'Quick Added Executive: ' . $name);
                header('Location: ' . BASE_URL . '/leads/assign.php?id=' . urlencode($lead['lead_id']) . '&select_executive=' . $newId);
                exit;
            }
        }
        flash('error', 'Required fields are missing for quick addition.');
        header('Location: ' . BASE_URL . '/leads/assign.php?id=' . urlencode($lead['lead_id']));
        exit;
    }

    $financer_id  = (int)($_POST['financer_id'] ?? 0) ?: null;
    $financer_lead_number = trim($_POST['financer_lead_number'] ?? '') ?: null;
    $executive_id = (int)($_POST['executive_id'] ?? 0) ?: null;
    $assigned_date = $_POST['assigned_date'] ?: null;
    
    $newStatus = $lead['status'];
    $statusChanged = false;
    
    // Automatically set status to 'initiated' when assigning an executive for the first time
    if ($executive_id && empty($lead['executive_id']) && in_array($lead['status'], ['new', 'pending'])) {
        $newStatus = 'initiated';
        $statusChanged = true;
    }

    $statusSql = $statusChanged ? ", status_date=CURDATE()" : "";
    $stmt = $conn->prepare("UPDATE leads SET financer_id=?, financer_lead_number=?, executive_id=?, assigned_date=?, status=? {$statusSql} WHERE id=?");
    $stmt->bind_param('isissi', $financer_id, $financer_lead_number, $executive_id, $assigned_date, $newStatus, $lead['id']);
    
    if ($stmt->execute()) {
        log_lead_action($conn, $lead['id'], 'Lead Assigned', 'Assignment updated by ' . current_user()['name'], current_user_id());
        
        if ($statusChanged) {
            log_lead_action($conn, $lead['id'], 'Status Changed', "From {$lead['status']} to {$newStatus} (Auto-assigned)", current_user_id());
        }

        // Notify the new executive if it changed
        if ($executive_id && $executive_id != $lead['executive_id']) {
            $execUser = db_fetch_one($conn, "SELECT user_id FROM executives WHERE id = ?", 'i', [$executive_id]);
            if ($execUser && $execUser['user_id']) {
                add_notification($conn, $execUser['user_id'], "You have been assigned a new lead: " . $lead['lead_id'], BASE_URL . "/leads/view.php?id=" . $lead['lead_id']);
            }
        }

        flash('success', 'Lead assigned successfully!');
        header('Location: ' . BASE_URL . '/leads/view.php?id=' . urlencode($lead['lead_id']) . '&tab=followups');
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

<div class="max-w-5xl mx-auto animate-fade-up">
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
            
            <div class="space-y-8">
                
                <div class="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        
                        <!-- 1. Assigned Date -->
                        <div>
                            <label class="form-label mb-2" id="lbl_assigned_date">1. Assigned Date</label>
                            <input type="date" name="assigned_date" class="form-input bg-slate-50 dark:bg-slate-950" value="<?= !empty($lead['assigned_date']) ? e($lead['assigned_date']) : date('Y-m-d') ?>">
                        </div>

                        <!-- 2. Financer -->
                        <div>
                            <div class="flex items-center justify-between mb-2">
                                <label class="form-label mb-0" id="lbl_financer_id">2. Target Financer / Bank</label>
                                <button type="button" onclick="openModal('quickAddFinancerModal')" class="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 transition-colors cursor-pointer focus:outline-none">
                                    + Quick Add
                                </button>
                            </div>
                            <select name="financer_id" id="financerSelect" class="form-select bg-slate-50 dark:bg-slate-950">
                                <option value="">— Unassigned —</option>
                                <?php foreach ($financers as $f): ?>
                                <option value="<?= $f['id'] ?>" <?= ((isset($_GET['select_financer']) && $_GET['select_financer'] == $f['id']) || (!isset($_GET['select_financer']) && $lead['financer_id'] == $f['id'])) ? 'selected' : '' ?>>
                                    <?= e($f['name']) ?>
                                </option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        
                        <!-- 3. Financer Lead Number -->
                        <div>
                            <label class="form-label mb-2" id="lbl_financer_lead_number">3. Financer Lead/App No.</label>
                            <input type="text" name="financer_lead_number" class="form-input bg-slate-50 dark:bg-slate-950" placeholder="e.g. APP-00123" value="<?= e($lead['financer_lead_number'] ?? '') ?>">
                        </div>

                        <!-- 4. SFE -->
                        <div>
                            <div class="flex items-center justify-between mb-2">
                                <label class="form-label mb-0 text-brand-800 dark:text-brand-200" id="lbl_executive_id">4. Assign to Executive (SFE)</label>
                                <button type="button" onclick="openModal('quickAddExecutiveModal')" class="text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-800 transition-colors cursor-pointer focus:outline-none">
                                    + Quick Add
                                </button>
                            </div>
                            <select name="executive_id" id="executiveSelect" class="form-select border-brand-200/60 dark:border-brand-900/40 bg-slate-50 dark:bg-slate-950 focus:bg-white transition-all duration-300 shadow-sm">
                                <option value="">— Unassigned (Remains in Queue) —</option>
                                <?php foreach ($executives as $ex): ?>
                                <option value="<?= $ex['id'] ?>" data-financer="<?= $ex['financer_id'] ?? '' ?>" <?= ((isset($_GET['select_executive']) && $_GET['select_executive'] == $ex['id']) || (!isset($_GET['select_executive']) && $lead['executive_id'] == $ex['id'])) ? 'selected' : '' ?>>
                                    <?= e($ex['name']) ?>
                                </option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        
                    </div>
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




<!-- Quick Add Channel Modal -->
<div id="quickAddAgentModal" class="modal-backdrop hidden" onclick="if(event.target===this)closeModal('quickAddAgentModal')">
    <div class="modal-panel max-w-md w-full">
        <div class="modal-header">
            <h3 class="font-bold text-slate-700 dark:text-white uppercase tracking-wider text-xs">Quick Add Channel</h3>
            <button onclick="closeModal('quickAddAgentModal')" class="text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 text-2xl cursor-pointer">×</button>
        </div>
        <form method="POST" action="" class="modal-body space-y-4">
            <?= csrf_field() ?>
            <input type="hidden" name="quick_add" value="agent">
            <div>
                <label class="form-label">Channel (Financer)</label>
                <select name="financer_id" class="form-select">
                    <option value="">— Direct / No Financer —</option>
                    <?php foreach ($financers as $f): ?>
                    <option value="<?= $f['id'] ?>"><?= e($f['name']) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div>
                <label class="form-label required-lbl">Full Name</label>
                <input type="text" name="name" class="form-input" required placeholder="Channel Name">
            </div>
            <div>
                <label class="form-label required-lbl">Mobile</label>
                <input type="tel" name="mobile" class="form-input" required placeholder="10-digit mobile">
            </div>
            <div>
                <label class="form-label">Email</label>
                <input type="email" name="email" class="form-input" placeholder="channel@email.com">
            </div>
            <div>
                <label class="form-label">PAN Number</label>
                <input type="text" name="pan_number" class="form-input" placeholder="ABCDE1234F">
            </div>
            <div class="modal-footer pt-4 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onclick="closeModal('quickAddAgentModal')" class="btn btn-secondary text-xs">Cancel</button>
                <button type="submit" class="btn btn-primary text-xs">Add Channel</button>
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


<!-- Quick Add Executive Modal -->
<div id="quickAddExecutiveModal" class="modal-backdrop hidden" onclick="if(event.target===this)closeModal('quickAddExecutiveModal')">
    <div class="modal-panel max-w-md w-full">
        <div class="modal-header">
            <h3 class="font-bold text-slate-700 dark:text-white uppercase tracking-wider text-xs">Quick Add Executive</h3>
            <button onclick="closeModal('quickAddExecutiveModal')" class="text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 text-2xl cursor-pointer">×</button>
        </div>
        <form method="POST" action="" class="modal-body space-y-4">
            <?= csrf_field() ?>
            <input type="hidden" name="quick_add" value="executive">
            <div>
                <label class="form-label required-lbl">Executive Name</label>
                <input type="text" name="name" class="form-input" required placeholder="Executive Name">
            </div>
            <div>
                <label class="form-label required-lbl">Mobile</label>
                <input type="tel" name="mobile" class="form-input" required placeholder="10-digit mobile">
            </div>
            <div class="modal-footer pt-4 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onclick="closeModal('quickAddExecutiveModal')" class="btn btn-secondary text-xs">Cancel</button>
                <button type="submit" class="btn btn-primary text-xs">Add Executive</button>
    }
}

$headerActions = '<a href="' . BASE_URL . '/leads/view.php?id=' . e($lead['lead_id']) . '"
    class="btn btn-secondary btn-sm shadow-sm">
    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg> Back to Lead
</a>';

require_once __DIR__ . '/../includes/header.php';
?>

<div class="max-w-5xl mx-auto animate-fade-up">
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
            
            <div class="space-y-8">
                
                <div class="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        
                        <!-- 1. Assigned Date -->
                        <div>
                            <label class="form-label mb-2" id="lbl_assigned_date">1. Assigned Date</label>
                            <input type="date" name="assigned_date" class="form-input bg-slate-50 dark:bg-slate-950" value="<?= !empty($lead['assigned_date']) ? e($lead['assigned_date']) : date('Y-m-d') ?>">
                        </div>

                        <!-- 2. Financer -->
                        <div>
                            <div class="flex items-center justify-between mb-2">
                                <label class="form-label mb-0" id="lbl_financer_id">2. Target Financer / Bank</label>
                                <button type="button" onclick="openModal('quickAddFinancerModal')" class="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 transition-colors cursor-pointer focus:outline-none">
                                    + Quick Add
                                </button>
                            </div>
                            <select name="financer_id" id="financerSelect" class="form-select bg-slate-50 dark:bg-slate-950">
                                <option value="">— Unassigned —</option>
                                <?php foreach ($financers as $f): ?>
                                <option value="<?= $f['id'] ?>" <?= ((isset($_GET['select_financer']) && $_GET['select_financer'] == $f['id']) || (!isset($_GET['select_financer']) && $lead['financer_id'] == $f['id'])) ? 'selected' : '' ?>>
                                    <?= e($f['name']) ?>
                                </option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        
                        <!-- 3. SFE -->
                        <div>
                            <div class="flex items-center justify-between mb-2">
                                <label class="form-label mb-0 text-brand-800 dark:text-brand-200" id="lbl_executive_id">3. Assign to Executive (SFE)</label>
                                <button type="button" onclick="openModal('quickAddExecutiveModal')" class="text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-800 transition-colors cursor-pointer focus:outline-none">
                                    + Quick Add
                                </button>
                            </div>
                            <select name="executive_id" id="executiveSelect" class="form-select border-brand-200/60 dark:border-brand-900/40 bg-slate-50 dark:bg-slate-950 focus:bg-white transition-all duration-300 shadow-sm">
                                <option value="">— Unassigned (Remains in Queue) —</option>
                                <?php foreach ($executives as $ex): ?>
                                <option value="<?= $ex['id'] ?>" data-financer="<?= $ex['financer_id'] ?? '' ?>" <?= ((isset($_GET['select_executive']) && $_GET['select_executive'] == $ex['id']) || (!isset($_GET['select_executive']) && $lead['executive_id'] == $ex['id'])) ? 'selected' : '' ?>>
                                    <?= e($ex['name']) ?>
                                </option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        
                    </div>
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




<!-- Quick Add Channel Modal -->
<div id="quickAddAgentModal" class="modal-backdrop hidden" onclick="if(event.target===this)closeModal('quickAddAgentModal')">
    <div class="modal-panel max-w-md w-full">
        <div class="modal-header">
            <h3 class="font-bold text-slate-700 dark:text-white uppercase tracking-wider text-xs">Quick Add Channel</h3>
            <button onclick="closeModal('quickAddAgentModal')" class="text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 text-2xl cursor-pointer">×</button>
        </div>
        <form method="POST" action="" class="modal-body space-y-4">
            <?= csrf_field() ?>
            <input type="hidden" name="quick_add" value="agent">
            <div>
                <label class="form-label">Channel (Financer)</label>
                <select name="financer_id" class="form-select">
                    <option value="">— Direct / No Financer —</option>
                    <?php foreach ($financers as $f): ?>
                    <option value="<?= $f['id'] ?>"><?= e($f['name']) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div>
                <label class="form-label required-lbl">Full Name</label>
                <input type="text" name="name" class="form-input" required placeholder="Channel Name">
            </div>
            <div>
                <label class="form-label required-lbl">Mobile</label>
                <input type="tel" name="mobile" class="form-input" required placeholder="10-digit mobile">
            </div>
            <div>
                <label class="form-label">Email</label>
                <input type="email" name="email" class="form-input" placeholder="channel@email.com">
            </div>
            <div>
                <label class="form-label">PAN Number</label>
                <input type="text" name="pan_number" class="form-input" placeholder="ABCDE1234F">
            </div>
            <div class="modal-footer pt-4 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onclick="closeModal('quickAddAgentModal')" class="btn btn-secondary text-xs">Cancel</button>
                <button type="submit" class="btn btn-primary text-xs">Add Channel</button>
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


<!-- Quick Add Executive Modal -->
<div id="quickAddExecutiveModal" class="modal-backdrop hidden" onclick="if(event.target===this)closeModal('quickAddExecutiveModal')">
    <div class="modal-panel max-w-md w-full">
        <div class="modal-header">
            <h3 class="font-bold text-slate-700 dark:text-white uppercase tracking-wider text-xs">Quick Add Executive</h3>
            <button onclick="closeModal('quickAddExecutiveModal')" class="text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 text-2xl cursor-pointer">×</button>
        </div>
        <form method="POST" action="" class="modal-body space-y-4">
            <?= csrf_field() ?>
            <input type="hidden" name="quick_add" value="executive">
            <div>
                <label class="form-label required-lbl">Executive Name</label>
                <input type="text" name="name" class="form-input" required placeholder="Executive Name">
            </div>
            <div>
                <label class="form-label required-lbl">Mobile</label>
                <input type="tel" name="mobile" class="form-input" required placeholder="10-digit mobile">
            </div>
            <div class="modal-footer pt-4 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onclick="closeModal('quickAddExecutiveModal')" class="btn btn-secondary text-xs">Cancel</button>
                <button type="submit" class="btn btn-primary text-xs">Add Executive</button>
            </div>
        </form>
    </div>
</div>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>

<script>
(function() {
    function initFinancerExecutiveCascade() {
        const financerSelect = document.getElementById('financerSelect');
        const executiveSelect = document.getElementById('executiveSelect');
        
        if (!financerSelect || !executiveSelect) return;

        function filterExecutives() {
            const selectedFinancer = financerSelect.value;
            let firstVisible = null;
            
            Array.from(executiveSelect.options).forEach((opt, index) => {
                if (index === 0) return; // Skip "Unassigned"
                
                const execFinancer = opt.getAttribute('data-financer');
                
                if (selectedFinancer && execFinancer === selectedFinancer) {
                    opt.style.display = '';
                    opt.disabled = false;
                    opt.hidden = false;
                    if (!firstVisible && !opt.selected) firstVisible = opt;
                } else {
                    opt.style.display = 'none';
                    opt.disabled = true;
                    opt.hidden = true;
                    if (opt.selected) {
                        executiveSelect.value = '';
                    }
                }
            });
        }

        // Always remove old listener to avoid duplicates if HTMX re-evaluates
        financerSelect.removeEventListener('change', filterExecutives);
        financerSelect.addEventListener('change', filterExecutives);
        filterExecutives();
    }

    // Run immediately since script is at the bottom of the DOM
    initFinancerExecutiveCascade();
})();
</script>
