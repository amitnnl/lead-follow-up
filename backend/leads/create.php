<?php
// leads/create.php — New Lead Form
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';
$pageTitle      = 'New Lead';
$pageBreadcrumb = 'Leads / Create';

// (Assignment fields are now handled in assign.php)
$errors = [];
$data   = [];

$agents     = db_fetch_all($conn, "SELECT id, name FROM agents WHERE is_active=1 ORDER BY name");
$financers  = db_fetch_all($conn, "SELECT id, name FROM financers WHERE is_active=1 ORDER BY name");
$dealers    = db_fetch_all($conn, "SELECT id, name FROM dealers WHERE is_active=1 ORDER BY name");

$selectedAgentName = '';
if (isset($_GET['select_agent'])) {
    $selId = (int)$_GET['select_agent'];
    foreach ($agents as $a) {
        if ($a['id'] == $selId) {
            $selectedAgentName = $a['name'];
            break;
        }
    }
} elseif (!empty($data['agent_id'])) {
    foreach ($agents as $a) {
        if ($a['id'] == $data['agent_id']) {
            $selectedAgentName = $a['name'];
            break;
        }
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verify_csrf()) { die('Invalid CSRF token'); }

    // Handle Quick Add Agent
    if (isset($_POST['quick_add']) && $_POST['quick_add'] === 'agent') {
        $financer_id = (int)($_POST['financer_id'] ?? 0) ?: null;
        $name   = trim($_POST['name'] ?? '');
        $mobile = trim($_POST['mobile'] ?? '');
        $email  = trim($_POST['email'] ?? '');
        $pan    = trim($_POST['pan_number'] ?? '');
        if ($name && $mobile) {
            db_query($conn, "INSERT INTO agents (financer_id, name, mobile, email, pan_number) VALUES (?, ?, ?, ?, ?)", 'issss', [$financer_id, $name, $mobile, $email, $pan]);
            $newId = $conn->insert_id;
            flash('success', 'Quick Added Agent: ' . $name);
            header('Location: ' . BASE_URL . '/leads/create.php?select_agent=' . $newId);
            exit;
        } else {
            flash('error', 'Agent Name and Mobile are required.');
            header('Location: ' . BASE_URL . '/leads/create.php');
            exit;
        }
    }

    $data = [
        'lead_date'           => $_POST['lead_date'] ?? date('Y-m-d'),
        'customer_name'       => trim($_POST['customer_name'] ?? ''),
        'customer_mobile'     => trim($_POST['customer_mobile'] ?? ''),
        'customer_mobile2'    => trim($_POST['customer_mobile2'] ?? ''),
        'customer_address'    => trim($_POST['customer_address'] ?? ''),
        'vehicle_make_model'  => trim($_POST['vehicle_make_model'] ?? ''),
        'year_of_manufacture' => trim($_POST['year_of_manufacture'] ?? ''),
        'registration_number' => trim($_POST['registration_number'] ?? ''),
        'insurance_company'   => trim($_POST['insurance_company'] ?? ''),
        'policy_number'       => trim($_POST['policy_number'] ?? ''),
        'insurance_expiry_date' => !empty($_POST['insurance_expiry_date']) ? $_POST['insurance_expiry_date'] : null,
        'loan_amount'         => trim($_POST['loan_amount'] ?? ''),
        'loan_type'           => $_POST['loan_type'] ?? 'new_loan',
        'agent_id'            => get_or_create_agent_by_name($conn, $_POST['channel_name'] ?? ''),
        'financer_id'         => null,
        'dealer_id'           => !empty($_POST['dealer_id']) ? (int)$_POST['dealer_id'] : null,
        'executive_id'        => null,
        'status'              => 'pending',
        'vehicle_condition'   => $_POST['vehicle_condition'] ?? '',
        'query_notes'         => trim($_POST['query_notes'] ?? ''),
        'rc_status'           => 'pending',
        'insurance_status'    => 'pending',
        'rto_status'          => 'pending',
        'payout_amount'       => '',
        'payout_status'       => 'pending',
    ];

    if (empty($data['customer_name']))   $errors[] = 'Customer name is required.';
    if (empty($data['customer_mobile'])) $errors[] = 'Customer mobile is required.';
    if (empty($data['lead_date']))       $errors[] = 'Lead date is required.';
    if (empty($data['vehicle_condition'])) $errors[] = 'Vehicle Condition (New/Old) is required.';
    if ($data['vehicle_condition'] === 'old' && empty($data['registration_number'])) {
        $errors[] = 'Registration Number is mandatory for old vehicles.';
    }

    if (!$errors) {
        $leadId = generate_lead_id($conn);

        $stmt = $conn->prepare("
            INSERT INTO leads
            (lead_id, lead_date, customer_name, customer_mobile, customer_mobile2,
             customer_address, vehicle_make_model, vehicle_condition, year_of_manufacture, registration_number,
             insurance_company, policy_number, insurance_expiry_date,
             loan_amount, loan_type, agent_id, financer_id, dealer_id, executive_id,
             status, query_notes, rc_status, insurance_status, rto_status,
             payout_amount, payout_status, created_by)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ");
        $year = $data['year_of_manufacture'] !== '' ? (int)$data['year_of_manufacture'] : null;
        $loanAmt = $data['loan_amount'] !== '' ? (float)$data['loan_amount'] : null;
        $payout_amt = $data['payout_amount'] !== '' ? (float)$data['payout_amount'] : null;
        $curr_user_id = current_user_id();

        $stmt->bind_param('ssssssssisssdsiiiisssssdsi',
            $leadId,
            $data['lead_date'],
            $data['customer_name'],
            $data['customer_mobile'],
            $data['customer_mobile2'],
            $data['customer_address'],
            $data['vehicle_make_model'],
            $data['vehicle_condition'],
            $year,
            $data['registration_number'],
            $data['insurance_company'],
            $data['policy_number'],
            $data['insurance_expiry_date'],
            $loanAmt,
            $data['loan_type'],
            $data['agent_id'],
            $data['financer_id'],
            $data['dealer_id'],
            $data['executive_id'],
            $data['status'],
            $data['query_notes'],
            $data['rc_status'],
            $data['insurance_status'],
            $data['rto_status'],
            $payout_amt,
            $data['payout_status'],
            $curr_user_id
        );

        if ($stmt->execute()) {
            $newId = $conn->insert_id;
            db_query($conn, "INSERT INTO lead_logs (lead_id, action, details, performed_by) VALUES (?, ?, ?, ?)", 'issi', [$newId, 'Created', 'Lead created in system', current_user_id()]);
            
            flash('success', "Lead $leadId created successfully. Please assign it now.");
            header('Location: ' . BASE_URL . '/leads/assign.php?id=' . $leadId);
            exit;
        } else {
            $errors[] = 'Database error: ' . $conn->error;
        }
    }
}

$headerActions = '<a href="' . BASE_URL . '/leads/index.php" class="btn btn-secondary btn-sm">
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
    Back to Leads
</a>';

require_once __DIR__ . '/../includes/header.php';
?>

<?php if ($errors): ?>
<div class="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl px-5 py-4 mb-6 text-sm">
    <strong class="font-bold">Please fix the following errors:</strong>
    <ul class="mt-2 list-disc list-inside space-y-1">
        <?php foreach ($errors as $e): ?><li><?= e($e) ?></li><?php endforeach; ?>
    </ul>
</div>
<?php endif; ?>

<form method="POST" action="" class="space-y-8">
    <?= csrf_field() ?>

    <!-- Section: Lead Info -->
    <div class="card">
        <div class="card-header">
            <h2>📋 Lead Information</h2>
        </div>
        <div class="card-body grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="form-floating">
                <input type="date" name="lead_date" id="lead_date" value="<?= e($data['lead_date'] ?? date('Y-m-d')) ?>" required placeholder=" ">
                <label for="lead_date" class="required-lbl">Lead Date</label>
            </div>
            <div class="form-floating md:col-span-2">
                <select name="vehicle_condition" id="vehicle_condition" class="form-select border-none px-0" style="padding-top:1.5rem; padding-bottom:0.625rem; padding-left:1rem; background-color:transparent; width:100%;" onchange="toggleRegNoRequirement();" required>
                    <option value="" disabled <?= empty($data['vehicle_condition']) ? 'selected' : '' ?>>— Select Condition —</option>
                    <option value="new" <?= (($data['vehicle_condition'] ?? '') === 'new') ? 'selected' : '' ?>>New</option>
                    <option value="old" <?= (($data['vehicle_condition'] ?? '') === 'old') ? 'selected' : '' ?>>Old</option>
                </select>
                <label for="vehicle_condition" class="required-lbl">Vehicle Condition (New/Used)</label>
            </div>
        </div>
    </div>

    <!-- Section: Customer Details -->
    <div class="card">
        <div class="card-header">
            <h2>👤 Customer Details</h2>
        </div>
        <div class="card-body grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="md:col-span-2 form-floating">
                <input type="text" name="customer_name" id="customer_name" value="<?= e($data['customer_name'] ?? '') ?>" required placeholder=" ">
                <label for="customer_name" class="required-lbl">Customer Name (e.g. Harpal Singh S/o Matu Singh)</label>
            </div>
            <div class="form-floating">
                <input type="tel" name="customer_mobile" id="customer_mobile" value="<?= e($data['customer_mobile'] ?? '') ?>" required maxlength="10" pattern="[0-9]{10}" oninput="this.value = this.value.replace(/[^0-9]/g, '').slice(0, 10);" placeholder=" ">
                <label for="customer_mobile" class="required-lbl">Mobile (10-digit)</label>
            </div>
            <div class="md:col-span-3 form-floating">
                <input type="text" name="customer_address" id="customer_address" value="<?= e($data['customer_address'] ?? '') ?>" placeholder=" ">
                <label for="customer_address">Address (Village / City)</label>
            </div>
        </div>
    </div>

    <!-- Section: Vehicle & Loan -->
    <div class="card">
        <div class="card-header">
            <h2>🚛 Vehicle & Loan Details</h2>
        </div>
        <div class="card-body grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="form-floating md:col-span-2">
                <input type="text" name="vehicle_make_model" id="vehicle_make_model" value="<?= e($data['vehicle_make_model'] ?? '') ?>" placeholder=" ">
                <label for="vehicle_make_model">Vehicle (Make & Model e.g. TATA 1512)</label>
            </div>
            <div class="form-floating" id="year_manufacture_container">
                <input type="number" name="year_of_manufacture" id="year_of_manufacture" min="1990" max="<?= date('Y') ?>" value="<?= e($data['year_of_manufacture'] ?? '') ?>" placeholder=" ">
                <label for="year_of_manufacture">Year of Manufacture</label>
            </div>
            <div class="form-floating" id="reg_no_container">
                <input type="text" name="registration_number" id="registration_number" value="<?= e($data['registration_number'] ?? '') ?>" placeholder=" ">
                <label for="registration_number">Registration Number</label>
            </div>
            <div class="form-floating md:col-span-2" id="ins_details_container">
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                    <input type="text" name="insurance_company" id="insurance_company" class="form-input text-xs" value="<?= e($data['insurance_company'] ?? '') ?>" placeholder="Insurance Company">
                    <input type="text" name="policy_number" id="policy_number" class="form-input text-xs font-mono" value="<?= e($data['policy_number'] ?? '') ?>" placeholder="Policy Number">
                    <input type="date" name="insurance_expiry_date" id="insurance_expiry_date" class="form-input text-xs" value="<?= e($data['insurance_expiry_date'] ?? '') ?>">
                </div>
            </div>
            <div class="form-floating">
                <input type="number" name="loan_amount" id="loan_amount" step="1000" value="<?= e($data['loan_amount'] ?? '') ?>" placeholder=" ">
                <label for="loan_amount">Loan Amount (₹)</label>
            </div>
            <div class="form-floating" id="loan_type_container">
                <select name="loan_type" id="loan_type" class="form-select border-none px-0" style="padding-top:1.5rem; padding-bottom:0.625rem; padding-left:1rem; background-color:transparent; width:100%;">
                    <option value="new_loan" <?= (($data['loan_type'] ?? 'new_loan') === 'new_loan') ? 'selected' : '' ?>>New Loan</option>
                    <option value="refinance" <?= (($data['loan_type'] ?? '') === 'refinance') ? 'selected' : '' ?>>Refinance</option>
                    <option value="repurchase" <?= (($data['loan_type'] ?? '') === 'repurchase') ? 'selected' : '' ?>>Repurchase</option>
                    <option value="bt" <?= (($data['loan_type'] ?? '') === 'bt') ? 'selected' : '' ?>>BT (Balance Transfer)</option>
                </select>
                <label for="loan_type">Loan Type</label>
            </div>


        </div>
    </div>

    <!-- Section: Notes -->
    <div class="card">
        <div class="card-header">
            <h2>📝 Query / Notes</h2>
        </div>
        <div class="card-body form-floating">
            <textarea name="query_notes" id="query_notes" class="h-24 resize-none" placeholder=" "><?= e($data['query_notes'] ?? '') ?></textarea>
            <label for="query_notes">Any queries, remarks, or special notes...</label>
        </div>
    </div>

    <!-- Submit -->
    <div class="flex items-center gap-3 justify-end">
        <a href="<?php echo BASE_URL; ?>/leads/index.php" class="btn btn-secondary">
            Cancel
        </a>
        <button type="submit" class="btn btn-primary">
            Create Lead
        </button>
    </div>
</form>

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

<script>
function toggleRegNoRequirement() {
    const conditionSelect = document.getElementById('vehicle_condition');
    const regNoInput = document.getElementById('registration_number');
    const regNoLabel = document.querySelector('label[for="registration_number"]');
    const regNoContainer = document.getElementById('reg_no_container');
    const yearContainer = document.getElementById('year_manufacture_container');
    const loanTypeContainer = document.getElementById('loan_type_container');
    
    if (conditionSelect) {
        const isOld = conditionSelect.value === 'old';
        
        if (regNoContainer && regNoInput && regNoLabel) {
            if (isOld) {
                regNoContainer.style.display = '';
                regNoInput.setAttribute('required', 'required');
                regNoLabel.classList.add('required-lbl');
            } else {
                regNoContainer.style.display = 'none';
                regNoInput.removeAttribute('required');
                regNoLabel.classList.remove('required-lbl');
                regNoInput.value = '';
            }
        }
        
        if (yearContainer) {
            yearContainer.style.display = isOld ? '' : 'none';
            if (!isOld) {
                const yearInput = document.getElementById('year_of_manufacture');
                if (yearInput) yearInput.value = '';
            }
        }
        
        const insContainer = document.getElementById('ins_details_container');
        if (insContainer) {
            insContainer.style.display = isOld ? '' : 'none';
        }
        
        if (loanTypeContainer) {
            loanTypeContainer.style.display = isOld ? '' : 'none';
            if (!isOld) {
                const loanTypeSelect = document.getElementById('loan_type');
                if (loanTypeSelect) loanTypeSelect.value = 'new_loan';
            }
        }
    }
}
document.addEventListener('DOMContentLoaded', toggleRegNoRequirement);
</script>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
