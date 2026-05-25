<?php
// leads/create.php — New Lead Form
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';
$pageTitle      = 'New Lead';
$pageBreadcrumb = 'Leads / Create';

// (Assignment fields are now handled in assign.php)
$errors = [];
$data   = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verify_csrf()) { die('Invalid CSRF token'); }

    $data = [
        'lead_date'           => $_POST['lead_date'] ?? date('Y-m-d'),
        'customer_name'       => trim($_POST['customer_name'] ?? ''),
        'customer_mobile'     => trim($_POST['customer_mobile'] ?? ''),
        'customer_mobile2'    => trim($_POST['customer_mobile2'] ?? ''),
        'customer_address'    => trim($_POST['customer_address'] ?? ''),
        'vehicle_make_model'  => trim($_POST['vehicle_make_model'] ?? ''),
        'year_of_manufacture' => trim($_POST['year_of_manufacture'] ?? ''),
        'registration_number' => trim($_POST['registration_number'] ?? ''),
        'loan_amount'         => trim($_POST['loan_amount'] ?? ''),
        'loan_type'           => $_POST['loan_type'] ?? 'new_loan',
        'referred_by'         => trim($_POST['referred_by'] ?? ''),
        'agent_id'            => null,
        'financer_id'         => null,
        'dealer_id'           => null,
        'executive_id'        => null,
        'status'              => $_POST['status'] ?? 'new',
        'status_date'         => $_POST['status_date'] ?? null,
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

    if (!$errors) {
        $leadId = generate_lead_id($conn);

        $stmt = $conn->prepare("
            INSERT INTO leads
            (lead_id, lead_date, customer_name, customer_mobile, customer_mobile2,
             customer_address, vehicle_make_model, year_of_manufacture, registration_number,
             loan_amount, loan_type, referred_by, agent_id, financer_id, dealer_id, executive_id,
             status, status_date, query_notes, rc_status, insurance_status, rto_status,
             payout_amount, payout_status, created_by)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ");
        $payout_amt = $data['payout_amount'] !== '' ? (float)$data['payout_amount'] : null;
        $curr_user_id = current_user_id();

        $stmt->bind_param('sssssssissssiiiiisssssdsi',
            $leadId,
            $data['lead_date'],
            $data['customer_name'],
            $data['customer_mobile'],
            $data['customer_mobile2'],
            $data['customer_address'],
            $data['vehicle_make_model'],
            $data['year_of_manufacture'],
            $data['registration_number'],
            $data['loan_amount'],
            $data['loan_type'],
            $data['referred_by'],
            $data['agent_id'],
            $data['financer_id'],
            $data['dealer_id'],
            $data['executive_id'],
            $data['status'],
            $data['status_date'],
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
            log_lead_action($conn, $newId, 'Created', 'Lead created with ID ' . $leadId, current_user_id());
            flash('success', 'Lead ' . $leadId . ' created successfully!');
            header('Location: ' . BASE_URL . '/leads/view.php?id=' . $leadId);
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

<form method="POST" action="" class="space-y-6">
    <?= csrf_field() ?>

    <!-- Section: Lead Info -->
    <div class="card">
        <div class="card-header">
            <h2>📋 Lead Information</h2>
        </div>
        <div class="card-body grid grid-cols-1 md:grid-cols-3 gap-5">
            <div class="form-floating">
                <input type="date" name="lead_date" id="lead_date" value="<?= e($data['lead_date'] ?? date('Y-m-d')) ?>" required placeholder=" ">
                <label for="lead_date" class="required-lbl">Lead Date</label>
            </div>
            <div class="form-floating">
                <select name="status" id="status" class="form-select border-none px-0" style="padding-top:1.5rem; padding-bottom:0.625rem; padding-left:1rem; background-color:transparent; width:100%;" onchange="this.setAttribute('data-val', this.value);">
                    <?php foreach (['new','pending','approved','disbursed','rejected','on_hold'] as $s): ?>
                    <option value="<?= $s ?>" <?= (($data['status'] ?? 'new') === $s) ? 'selected' : '' ?>>
                        <?= ucfirst(str_replace('_',' ',$s)) ?>
                    </option>
                    <?php endforeach; ?>
                </select>
                <label for="status">Lead Status</label>
            </div>
            <div class="form-floating">
                <input type="date" name="status_date" id="status_date" value="<?= e($data['status_date'] ?? '') ?>" placeholder=" ">
                <label for="status_date">Status Date</label>
            </div>
        </div>
    </div>

    <!-- Section: Customer Details -->
    <div class="card">
        <div class="card-header">
            <h2>👤 Customer Details</h2>
        </div>
        <div class="card-body grid grid-cols-1 md:grid-cols-3 gap-5">
            <div class="md:col-span-2 form-floating">
                <input type="text" name="customer_name" id="customer_name" value="<?= e($data['customer_name'] ?? '') ?>" required placeholder=" ">
                <label for="customer_name" class="required-lbl">Customer Name (e.g. Harpal Singh S/o Matu Singh)</label>
            </div>
            <div class="form-floating">
                <input type="tel" name="customer_mobile" id="customer_mobile" value="<?= e($data['customer_mobile'] ?? '') ?>" required placeholder=" ">
                <label for="customer_mobile" class="required-lbl">Mobile (10-digit)</label>
            </div>
            <div class="form-floating">
                <input type="tel" name="customer_mobile2" id="customer_mobile2" value="<?= e($data['customer_mobile2'] ?? '') ?>" placeholder=" ">
                <label for="customer_mobile2">Alternate Mobile</label>
            </div>
            <div class="md:col-span-2 form-floating">
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
        <div class="card-body grid grid-cols-1 md:grid-cols-3 gap-5">
            <div class="form-floating">
                <input type="text" name="vehicle_make_model" id="vehicle_make_model" value="<?= e($data['vehicle_make_model'] ?? '') ?>" placeholder=" ">
                <label for="vehicle_make_model">Vehicle (Make & Model e.g. TATA 1512)</label>
            </div>
            <div class="form-floating">
                <input type="number" name="year_of_manufacture" id="year_of_manufacture" min="1990" max="<?= date('Y') ?>" value="<?= e($data['year_of_manufacture'] ?? '') ?>" placeholder=" ">
                <label for="year_of_manufacture">Year of Manufacture</label>
            </div>
            <div class="form-floating">
                <input type="text" name="registration_number" id="registration_number" value="<?= e($data['registration_number'] ?? '') ?>" placeholder=" ">
                <label for="registration_number">Registration Number</label>
            </div>
            <div class="form-floating">
                <input type="number" name="loan_amount" id="loan_amount" step="1000" value="<?= e($data['loan_amount'] ?? '') ?>" placeholder=" ">
                <label for="loan_amount">Loan Amount (₹)</label>
            </div>
            <div class="form-floating">
                <select name="loan_type" id="loan_type" class="form-select border-none px-0" style="padding-top:1.5rem; padding-bottom:0.625rem; padding-left:1rem; background-color:transparent; width:100%;">
                    <option value="new_loan" <?= (($data['loan_type'] ?? 'new_loan') === 'new_loan') ? 'selected' : '' ?>>New Loan</option>
                    <option value="refinance" <?= (($data['loan_type'] ?? '') === 'refinance') ? 'selected' : '' ?>>Refinance</option>
                </select>
                <label for="loan_type">Loan Type</label>
            </div>
            <div class="form-floating">
                <input type="text" name="referred_by" id="referred_by" value="<?= e($data['referred_by'] ?? '') ?>" placeholder=" ">
                <label for="referred_by">Referred By</label>
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

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
