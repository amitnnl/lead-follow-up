<?php
// leads/edit.php — Edit Lead
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';
require_role('admin', 'staff');

$leadIdParam = $_GET['id'] ?? '';
$lead = db_fetch_one($conn, "SELECT * FROM leads WHERE lead_id=?", 's', [$leadIdParam]);
if (!$lead) {
    flash('error', 'Lead not found.');
    header('Location: ' . BASE_URL . '/leads/index.php');
    exit;
}

$pageTitle      = 'Edit Lead: ' . $lead['lead_id'];
$pageBreadcrumb = 'Leads / Edit';

$agents     = db_fetch_all($conn, "SELECT id, name FROM agents WHERE is_active=1 ORDER BY name");
$financers  = db_fetch_all($conn, "SELECT id, name FROM financers WHERE is_active=1 ORDER BY name");
$dealers    = db_fetch_all($conn, "SELECT id, name FROM dealers WHERE is_active=1 ORDER BY name");
$executives = db_fetch_all($conn, "SELECT id, name, financer_id FROM executives WHERE is_active=1 ORDER BY name");

$selectedAgentName = '';
if (!empty($data['agent_id'])) {
    foreach ($agents as $a) {
        if ($a['id'] == $data['agent_id']) {
            $selectedAgentName = $a['name'];
            break;
        }
    }
}

$errors = [];
$data   = $lead; // Pre-fill with existing

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verify_csrf()) die('Invalid CSRF token');

    $data = [
        'lead_date'           => $_POST['lead_date'] ?? $lead['lead_date'],
        'customer_name'       => trim($_POST['customer_name'] ?? ''),
        'customer_mobile'     => trim($_POST['customer_mobile'] ?? ''),
        'customer_mobile2'    => trim($_POST['customer_mobile2'] ?? $lead['customer_mobile2']),
        'customer_address'    => trim($_POST['customer_address'] ?? ''),
        'vehicle_make_model'  => trim($_POST['vehicle_make_model'] ?? ''),
        'vehicle_condition'   => $_POST['vehicle_condition'] ?? ($lead['vehicle_condition'] ?? 'new'),
        'year_of_manufacture' => trim($_POST['year_of_manufacture'] ?? ''),
        'registration_number' => trim($_POST['registration_number'] ?? ''),
        'insurance_company'   => trim($_POST['insurance_company'] ?? ($lead['insurance_company'] ?? '')),
        'policy_number'       => trim($_POST['policy_number'] ?? ($lead['policy_number'] ?? '')),
        'insurance_expiry_date' => !empty($_POST['insurance_expiry_date']) ? $_POST['insurance_expiry_date'] : ($lead['insurance_expiry_date'] ?? null),
        'loan_amount'         => trim($_POST['loan_amount'] ?? ''),
        'loan_type'           => $_POST['loan_type'] ?? 'new_loan',
        'customer_bank_name'  => trim($_POST['customer_bank_name'] ?? ''),
        'customer_account_number' => trim($_POST['customer_account_number'] ?? ''),
        'customer_ifsc_code'  => trim($_POST['customer_ifsc_code'] ?? ''),
        'agent_id'            => get_or_create_agent_by_name($conn, $_POST['channel_name'] ?? ''),
        'financer_id'         => (int)($_POST['financer_id'] ?? 0) ?: null,
        'financer_lead_number'=> trim($_POST['financer_lead_number'] ?? ''),
        'dealer_id'           => (int)($_POST['dealer_id'] ?? 0) ?: null,
        'executive_id'        => (int)($_POST['executive_id'] ?? 0) ?: null,
        'status'              => $_POST['status'] ?? $lead['status'],
        'query_notes'         => trim($_POST['query_notes'] ?? ''),
        'rc_status'           => $_POST['rc_status'] ?? 'pending',
        'rc_number'           => trim($_POST['rc_number'] ?? ''),
        'insurance_status'    => $_POST['insurance_status'] ?? 'pending',
        'insurance_number'    => trim($_POST['insurance_number'] ?? ''),
        'rto_status'          => $_POST['rto_status'] ?? 'pending',
        'payout_amount'       => trim($_POST['payout_amount'] ?? ''),
        'payout_status'       => $_POST['payout_status'] ?? 'pending',
    ];

    if (empty($data['customer_name']))   $errors[] = 'Customer name is required.';
    if (empty($data['customer_mobile'])) $errors[] = 'Customer mobile is required.';
    if ($data['vehicle_condition'] === 'old' && empty($data['registration_number'])) {
        $errors[] = 'Registration Number is mandatory for old vehicles.';
    }

    if ($data['status'] === 'disbursed') {
        // Build a temporary lead array mimicking the database structure to pass to the helper
        $temp_lead = array_merge($lead, $data);
        $eligibility = can_disburse_lead($conn, $temp_lead);
        if ($eligibility !== true) {
            $errors[] = $eligibility;
        }
    }

    if (!$errors) {
        $stmt = $conn->prepare("
            UPDATE leads SET
                lead_date=?, customer_name=?, customer_mobile=?, customer_mobile2=?,
                customer_address=?, vehicle_make_model=?, vehicle_condition=?, year_of_manufacture=?,
                registration_number=?, insurance_company=?, policy_number=?, insurance_expiry_date=?, loan_amount=?, loan_type=?,
                customer_bank_name=?, customer_account_number=?, customer_ifsc_code=?,
                agent_id=?, financer_id=?, financer_lead_number=?, dealer_id=?, executive_id=?,
                status=?, query_notes=?,
                rc_status=?, rc_number=?, insurance_status=?, insurance_number=?, rto_status=?,
                payout_amount=?, payout_status=?
            WHERE id=?
        ");
        if (!$stmt) die("Prepare failed: " . $conn->error);
        $year = $data['year_of_manufacture'] !== '' ? (int)$data['year_of_manufacture'] : null;
        $loanAmt = $data['loan_amount'] !== '' ? (float)$data['loan_amount'] : null;
        $payAmt  = $data['payout_amount'] !== '' ? (float)$data['payout_amount'] : null;
        $stmt->bind_param('sssssssissssdsiiisisiisssssssdsi',
            $data['lead_date'], $data['customer_name'], $data['customer_mobile'],
            $data['customer_mobile2'], $data['customer_address'], $data['vehicle_make_model'], $data['vehicle_condition'],
            $year, $data['registration_number'], $data['insurance_company'], $data['policy_number'], $data['insurance_expiry_date'], $loanAmt,
            $data['loan_type'],
            $data['customer_bank_name'], $data['customer_account_number'], $data['customer_ifsc_code'],
            $data['agent_id'], $data['financer_id'], $data['financer_lead_number'],
            $data['dealer_id'], $data['executive_id'],
            $data['status'], $data['query_notes'],
            $data['rc_status'], $data['rc_number'], $data['insurance_status'], $data['insurance_number'], $data['rto_status'],
            $payAmt, $data['payout_status'], $lead['id']
        );
        if ($stmt->execute()) {
            log_lead_action($conn, $lead['id'], 'Updated', 'Lead details updated.', current_user_id());
            flash('success', 'Lead ' . $lead['lead_id'] . ' updated successfully!');
            header('Location: ' . BASE_URL . '/leads/view.php?id=' . $lead['lead_id']);
            exit;
        } else {
            $errors[] = 'Database error: ' . $conn->error;
        }
    }
}

$headerActions = '<a href="' . BASE_URL . '/leads/view.php?id=' . e($lead['lead_id']) . '" class="btn btn-secondary btn-sm">
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
    Back to Lead
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

<form method="POST" action="" class="space-y-6">
    <?= csrf_field() ?>

    <div class="card">
        <div class="card-header">
            <h2>📋 Lead Information — <span class="font-mono text-brand-600 dark:text-brand-400"><?= e($lead['lead_id']) ?></span></h2>
        </div>
        <div class="card-body grid grid-cols-1 md:grid-cols-3 gap-5">
            <div class="form-floating">
                <input type="date" name="lead_date" id="lead_date" value="<?= e($data['lead_date']) ?>" placeholder=" ">
                <label for="lead_date">Lead Date</label>
            </div>
            <div class="form-floating md:col-span-2">
                <select name="status" id="status" class="form-select border-none px-0" style="padding-top:1.5rem; padding-bottom:0.625rem; padding-left:1rem; background-color:transparent; width:100%;">
                    <?php foreach (['pending','approved','disbursed','rejected','on_hold'] as $s): ?>
                    <option value="<?= $s ?>" <?= ($data['status'] === $s) ? 'selected' : '' ?>><?= ucfirst(str_replace('_',' ',$s)) ?></option>
                    <?php endforeach; ?>
                </select>
                <label for="status">Status</label>
            </div>
        </div>
    </div>

    <div class="card">
        <div class="card-header">
            <h2>👤 Customer Details</h2>
        </div>
        <div class="card-body grid grid-cols-1 md:grid-cols-3 gap-5">
            <div class="md:col-span-2 form-floating">
                <input type="text" name="customer_name" id="customer_name" value="<?= e($data['customer_name']) ?>" required placeholder=" ">
                <label for="customer_name" class="required-lbl">Customer Name</label>
            </div>
            <div class="form-floating">
                <input type="tel" name="customer_mobile" id="customer_mobile" value="<?= e($data['customer_mobile']) ?>" required maxlength="10" pattern="[0-9]{10}" oninput="this.value = this.value.replace(/[^0-9]/g, '').slice(0, 10);" placeholder=" ">
                <label for="customer_mobile" class="required-lbl">Mobile</label>
            </div>
            <div class="md:col-span-3 form-floating">
                <input type="text" name="customer_address" id="customer_address" value="<?= e($data['customer_address'] ?? '') ?>" placeholder=" ">
                <label for="customer_address">Address</label>
            </div>
        </div>
    </div>

    <div class="card">
        <div class="card-header">
            <h2>🚛 Vehicle & Loan</h2>
        </div>
        <div class="card-body grid grid-cols-1 md:grid-cols-3 gap-5">
            <div class="form-floating">
                <input type="text" name="vehicle_make_model" id="vehicle_make_model" value="<?= e($data['vehicle_make_model'] ?? '') ?>" placeholder=" ">
                <label for="vehicle_make_model">Vehicle</label>
            </div>
            <div class="form-floating">
                <select name="vehicle_condition" id="vehicle_condition" class="form-select border-none px-0" style="padding-top:1.5rem; padding-bottom:0.625rem; padding-left:1rem; background-color:transparent; width:100%;" onchange="toggleRegNoRequirement();">
                    <option value="new" <?= (($data['vehicle_condition'] ?? 'new') === 'new') ? 'selected' : '' ?>>New</option>
                    <option value="old" <?= (($data['vehicle_condition'] ?? '') === 'old') ? 'selected' : '' ?>>Old</option>
                </select>
                <label for="vehicle_condition">Vehicle Condition</label>
            </div>
            <div class="form-floating" id="year_manufacture_container">
                <input type="number" name="year_of_manufacture" id="year_of_manufacture" value="<?= e($data['year_of_manufacture'] ?? '') ?>" min="1990" max="<?= date('Y') ?>" placeholder=" ">
                <label for="year_of_manufacture">Year of Manufacture</label>
            </div>
            <div class="form-floating" id="reg_no_container">
                <input type="text" name="registration_number" id="registration_number" value="<?= e($data['registration_number'] ?? '') ?>" placeholder=" ">
                <label for="registration_number">Reg. Number</label>
            </div>
            <div class="form-floating md:col-span-2" id="ins_details_container">
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                    <input type="text" name="insurance_company" id="insurance_company" class="form-input text-xs" value="<?= e($data['insurance_company'] ?? '') ?>" placeholder="Insurance Company">
                    <input type="text" name="policy_number" id="policy_number" class="form-input text-xs font-mono" value="<?= e($data['policy_number'] ?? '') ?>" placeholder="Policy Number">
                    <input type="date" name="insurance_expiry_date" id="insurance_expiry_date" class="form-input text-xs" value="<?= e($data['insurance_expiry_date'] ?? '') ?>">
                </div>
            </div>
            <div class="form-floating">
                <input type="number" name="loan_amount" id="loan_amount" value="<?= e($data['loan_amount'] ?? '') ?>" step="1000" placeholder=" ">
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

    <div class="card">
        <div class="card-header">
            <h2>🏦 Client Bank Details</h2>
        </div>
        <div class="card-body grid grid-cols-1 md:grid-cols-3 gap-5">
            <div class="form-floating">
                <input type="text" name="customer_bank_name" id="customer_bank_name" value="<?= e($data['customer_bank_name'] ?? '') ?>" placeholder=" ">
                <label for="customer_bank_name">Bank Name (e.g. HDFC Bank)</label>
            </div>
            <div class="form-floating">
                <input type="text" name="customer_account_number" id="customer_account_number" value="<?= e($data['customer_account_number'] ?? '') ?>" placeholder=" ">
                <label for="customer_account_number">Account Number</label>
            </div>
            <div class="form-floating">
                <input type="text" name="customer_ifsc_code" id="customer_ifsc_code" value="<?= e($data['customer_ifsc_code'] ?? '') ?>" placeholder=" ">
                <label for="customer_ifsc_code">IFSC Code</label>
            </div>
        </div>
    </div>

    <div class="card">
        <div class="card-header">
            <h2>🔗 Assignment</h2>
        </div>
        <div class="card-body grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div class="form-floating">
                <input type="text" name="channel_name" id="channel_name" value="<?= e($selectedAgentName) ?>" list="channel_list" placeholder=" " autocomplete="off">
                <label for="channel_name">Channel</label>
                <datalist id="channel_list">
                    <?php foreach ($agents as $a): ?>
                    <option value="<?= e($a['name']) ?>"></option>
                    <?php endforeach; ?>
                </datalist>
            </div>
            <div class="form-floating">
                <select name="financer_id" id="financer_id" class="form-select border-none px-0" style="padding-top:1.5rem; padding-bottom:0.625rem; padding-left:1rem; background-color:transparent; width:100%;">
                    <option value="">— Select —</option>
                    <?php foreach ($financers as $f): ?>
                    <option value="<?= $f['id'] ?>" <?= ($data['financer_id'] == $f['id']) ? 'selected' : '' ?>><?= e($f['name']) ?></option>
                    <?php endforeach; ?>
                </select>
                <label for="financer_id">Financer</label>
            </div>
            <div class="form-floating">
                <input type="text" name="financer_lead_number" id="financer_lead_number" value="<?= e($data['financer_lead_number'] ?? '') ?>" placeholder=" ">
                <label for="financer_lead_number">Financer Lead/App No.</label>
            </div>
            <div class="form-floating">
                <select name="dealer_id" id="dealer_id" class="form-select border-none px-0" style="padding-top:1.5rem; padding-bottom:0.625rem; padding-left:1rem; background-color:transparent; width:100%;">
                    <option value="">— Select —</option>
                    <?php foreach ($dealers as $d): ?>
                    <option value="<?= $d['id'] ?>" <?= ($data['dealer_id'] == $d['id']) ? 'selected' : '' ?>><?= e($d['name']) ?></option>
                    <?php endforeach; ?>
                </select>
                <label for="dealer_id">Dealer</label>
            </div>
            <div class="form-floating">
                <select name="executive_id" id="executive_id" class="form-select border-none px-0" style="padding-top:1.5rem; padding-bottom:0.625rem; padding-left:1rem; background-color:transparent; width:100%;">
                    <option value="">— Select —</option>
                    <?php foreach ($executives as $ex): ?>
                    <option value="<?= $ex['id'] ?>" data-financer="<?= $ex['financer_id'] ?? '' ?>" <?= ($data['executive_id'] == $ex['id']) ? 'selected' : '' ?>><?= e($ex['name']) ?></option>
                    <?php endforeach; ?>
                </select>
                <label for="executive_id">SFE / Executive</label>
            </div>
        </div>
    </div>

    <div class="card">
        <div class="card-header">
            <h2>📄 Documents & Payout</h2>
        </div>
        <div class="card-body grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div class="flex gap-3">
                <div class="flex-1 form-floating">
                    <select name="rc_status" id="rc_status" class="form-select border-none px-0" style="padding-top:1.5rem; padding-bottom:0.625rem; padding-left:1rem; background-color:transparent; width:100%;">
                        <option value="pending" <?= ($data['rc_status']=='pending') ? 'selected' : '' ?>>Pending</option>
                        <option value="received" <?= ($data['rc_status']=='received') ? 'selected' : '' ?>>Received</option>
                        <option value="not_applicable" <?= ($data['rc_status']=='not_applicable') ? 'selected' : '' ?>>N/A</option>
                    </select>
                    <label for="rc_status">RC Status</label>
                </div>
                <div class="flex-1 form-floating">
                    <input type="text" name="rc_number" id="rc_number" value="<?= e($data['rc_number'] ?? '') ?>" placeholder=" ">
                    <label for="rc_number">RC Number</label>
                </div>
            </div>
            <div class="flex gap-3">
                <div class="flex-1 form-floating">
                    <select name="insurance_status" id="insurance_status" class="form-select border-none px-0" style="padding-top:1.5rem; padding-bottom:0.625rem; padding-left:1rem; background-color:transparent; width:100%;">
                        <option value="pending" <?= ($data['insurance_status']=='pending') ? 'selected' : '' ?>>Pending</option>
                        <option value="received" <?= ($data['insurance_status']=='received') ? 'selected' : '' ?>>Received</option>
                        <option value="not_applicable" <?= ($data['insurance_status']=='not_applicable') ? 'selected' : '' ?>>N/A</option>
                    </select>
                    <label for="insurance_status">Insurance Status</label>
                </div>
                <div class="flex-1 form-floating">
                    <input type="text" name="insurance_number" id="insurance_number" value="<?= e($data['insurance_number'] ?? '') ?>" placeholder=" ">
                    <label for="insurance_number">Insurance No.</label>
                </div>
            </div>
            <div class="form-floating">
                <select name="rto_status" id="rto_status" class="form-select border-none px-0" style="padding-top:1.5rem; padding-bottom:0.625rem; padding-left:1rem; background-color:transparent; width:100%;">
                    <option value="pending" <?= ($data['rto_status']=='pending') ? 'selected' : '' ?>>Pending</option>
                    <option value="done" <?= ($data['rto_status']=='done') ? 'selected' : '' ?>>Done</option>
                    <option value="not_applicable" <?= ($data['rto_status']=='not_applicable') ? 'selected' : '' ?>>N/A</option>
                </select>
                <label for="rto_status">RTO Status</label>
            </div>
            <div class="form-floating">
                <input type="number" name="payout_amount" id="payout_amount" step="100" value="<?= e($data['payout_amount'] ?? '') ?>" placeholder=" ">
                <label for="payout_amount">Payout Amount (₹)</label>
            </div>
            <div class="form-floating">
                <select name="payout_status" id="payout_status" class="form-select border-none px-0" style="padding-top:1.5rem; padding-bottom:0.625rem; padding-left:1rem; background-color:transparent; width:100%;">
                    <option value="pending" <?= ($data['payout_status']=='pending') ? 'selected' : '' ?>>Pending</option>
                    <option value="partial" <?= ($data['payout_status']=='partial') ? 'selected' : '' ?>>Partial</option>
                    <option value="paid" <?= ($data['payout_status']=='paid') ? 'selected' : '' ?>>Paid</option>
                </select>
                <label for="payout_status">Payout Status</label>
            </div>
        </div>
    </div>

    <div class="card">
        <div class="card-header">
            <h2>📝 Query / Notes</h2>
        </div>
        <div class="card-body form-floating">
            <textarea name="query_notes" id="query_notes" class="resize-none h-24" placeholder=" "><?= e($data['query_notes'] ?? '') ?></textarea>
            <label for="query_notes">Query / Notes</label>
        </div>
    </div>

    <div class="flex items-center gap-3 justify-end">
        <a href="<?php echo BASE_URL; ?>/leads/view.php?id=<?= e($lead['lead_id']) ?>" class="btn btn-secondary">
            Cancel
        </a>
        <button type="submit" class="btn btn-primary">
            Update Lead
        </button>
    </div>
</form>


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

(function() {
    // Run toggle requirements
    toggleRegNoRequirement();

    function initFinancerExecutiveCascade() {
        const financerSelect = document.getElementById('financer_id');
        const executiveSelect = document.getElementById('executive_id');
        
        if (!financerSelect || !executiveSelect) return;

        function filterExecutives() {
            const selectedFinancer = financerSelect.value;
            let firstVisible = null;
            
            Array.from(executiveSelect.options).forEach((opt, index) => {
                if (index === 0) return; // Skip "Select"
                
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

        financerSelect.removeEventListener('change', filterExecutives);
        financerSelect.addEventListener('change', filterExecutives);
        filterExecutives();
    }

    initFinancerExecutiveCascade();
})();
</script>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
