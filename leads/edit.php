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
$executives = db_fetch_all($conn, "SELECT id, name FROM executives WHERE is_active=1 ORDER BY name");

$errors = [];
$data   = $lead; // Pre-fill with existing

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verify_csrf()) die('Invalid CSRF token');

    $data = [
        'lead_date'           => $_POST['lead_date'] ?? $lead['lead_date'],
        'customer_name'       => trim($_POST['customer_name'] ?? ''),
        'customer_mobile'     => trim($_POST['customer_mobile'] ?? ''),
        'customer_mobile2'    => trim($_POST['customer_mobile2'] ?? ''),
        'customer_address'    => trim($_POST['customer_address'] ?? ''),
        'vehicle_make_model'  => trim($_POST['vehicle_make_model'] ?? ''),
        'year_of_manufacture' => trim($_POST['year_of_manufacture'] ?? ''),
        'registration_number' => trim($_POST['registration_number'] ?? ''),
        'loan_amount'         => trim($_POST['loan_amount'] ?? ''),
        'referred_by'         => trim($_POST['referred_by'] ?? ''),
        'customer_bank_name'  => trim($_POST['customer_bank_name'] ?? ''),
        'customer_account_number' => trim($_POST['customer_account_number'] ?? ''),
        'customer_ifsc_code'  => trim($_POST['customer_ifsc_code'] ?? ''),
        'agent_id'            => (int)($_POST['agent_id'] ?? 0) ?: null,
        'financer_id'         => (int)($_POST['financer_id'] ?? 0) ?: null,
        'dealer_id'           => (int)($_POST['dealer_id'] ?? 0) ?: null,
        'executive_id'        => (int)($_POST['executive_id'] ?? 0) ?: null,
        'status'              => $_POST['status'] ?? $lead['status'],
        'status_date'         => $_POST['status_date'] ?? null,
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

    if (!$errors) {
        $stmt = $conn->prepare("
            UPDATE leads SET
                lead_date=?, customer_name=?, customer_mobile=?, customer_mobile2=?,
                customer_address=?, vehicle_make_model=?, year_of_manufacture=?,
                registration_number=?, loan_amount=?, referred_by=?,
                customer_bank_name=?, customer_account_number=?, customer_ifsc_code=?,
                agent_id=?, financer_id=?, dealer_id=?, executive_id=?,
                status=?, status_date=?, query_notes=?,
                rc_status=?, rc_number=?, insurance_status=?, insurance_number=?, rto_status=?,
                payout_amount=?, payout_status=?
            WHERE id=?
        ");
        $loanAmt = $data['loan_amount'] !== '' ? (float)$data['loan_amount'] : null;
        $payAmt  = $data['payout_amount'] !== '' ? (float)$data['payout_amount'] : null;
        $stmt->bind_param('ssssssisdssssiiiisssssssdsi',
            $data['lead_date'], $data['customer_name'], $data['customer_mobile'],
            $data['customer_mobile2'], $data['customer_address'], $data['vehicle_make_model'],
            $data['year_of_manufacture'], $data['registration_number'], $loanAmt,
            $data['referred_by'], $data['customer_bank_name'], $data['customer_account_number'], $data['customer_ifsc_code'],
            $data['agent_id'], $data['financer_id'],
            $data['dealer_id'], $data['executive_id'],
            $data['status'], $data['status_date'], $data['query_notes'],
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
            <div>
                <label class="form-label">Lead Date</label>
                <input type="date" name="lead_date" class="form-input" value="<?= e($data['lead_date']) ?>">
            </div>
            <div>
                <label class="form-label">Status</label>
                <select name="status" class="form-select">
                    <?php foreach (['new','pending','approved','disbursed','rejected','on_hold'] as $s): ?>
                    <option value="<?= $s ?>" <?= ($data['status'] === $s) ? 'selected' : '' ?>><?= ucfirst(str_replace('_',' ',$s)) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div>
                <label class="form-label">Status Date</label>
                <input type="date" name="status_date" class="form-input" value="<?= e($data['status_date'] ?? '') ?>">
            </div>
        </div>
    </div>

    <div class="card">
        <div class="card-header">
            <h2>👤 Customer Details</h2>
        </div>
        <div class="card-body grid grid-cols-1 md:grid-cols-3 gap-5">
            <div class="md:col-span-2">
                <label class="form-label required-lbl">Customer Name</label>
                <input type="text" name="customer_name" class="form-input" value="<?= e($data['customer_name']) ?>" required>
            </div>
            <div>
                <label class="form-label required-lbl">Mobile</label>
                <input type="tel" name="customer_mobile" class="form-input" value="<?= e($data['customer_mobile']) ?>" required>
            </div>
            <div>
                <label class="form-label">Alternate Mobile</label>
                <input type="tel" name="customer_mobile2" class="form-input" value="<?= e($data['customer_mobile2'] ?? '') ?>">
            </div>
            <div class="md:col-span-2">
                <label class="form-label">Address</label>
                <input type="text" name="customer_address" class="form-input" value="<?= e($data['customer_address'] ?? '') ?>">
            </div>
        </div>
    </div>

    <div class="card">
        <div class="card-header">
            <h2>🚛 Vehicle & Loan</h2>
        </div>
        <div class="card-body grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
                <label class="form-label">Vehicle</label>
                <input type="text" name="vehicle_make_model" class="form-input" value="<?= e($data['vehicle_make_model'] ?? '') ?>">
            </div>
            <div>
                <label class="form-label">Year of Manufacture</label>
                <input type="number" name="year_of_manufacture" class="form-input" value="<?= e($data['year_of_manufacture'] ?? '') ?>" min="1990" max="<?= date('Y') ?>">
            </div>
            <div>
                <label class="form-label">Reg. Number</label>
                <input type="text" name="registration_number" class="form-input" value="<?= e($data['registration_number'] ?? '') ?>">
            </div>
            <div>
                <label class="form-label">Loan Amount (₹)</label>
                <input type="number" name="loan_amount" class="form-input" value="<?= e($data['loan_amount'] ?? '') ?>" step="1000">
            </div>
            <div>
                <label class="form-label">Referred By</label>
                <input type="text" name="referred_by" class="form-input" value="<?= e($data['referred_by'] ?? '') ?>">
            </div>
        </div>
    </div>

    <div class="card">
        <div class="card-header">
            <h2>🏦 Client Bank Details</h2>
        </div>
        <div class="card-body grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
                <label class="form-label">Bank Name</label>
                <input type="text" name="customer_bank_name" class="form-input" value="<?= e($data['customer_bank_name'] ?? '') ?>" placeholder="e.g. HDFC Bank">
            </div>
            <div>
                <label class="form-label">Account Number</label>
                <input type="text" name="customer_account_number" class="form-input" value="<?= e($data['customer_account_number'] ?? '') ?>" placeholder="e.g. 50100...">
            </div>
            <div>
                <label class="form-label">IFSC Code</label>
                <input type="text" name="customer_ifsc_code" class="form-input" value="<?= e($data['customer_ifsc_code'] ?? '') ?>" placeholder="e.g. HDFC0001234">
            </div>
        </div>
    </div>

    <div class="card">
        <div class="card-header">
            <h2>🔗 Assignment</h2>
        </div>
        <div class="card-body grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div>
                <label class="form-label">Agent / DSA</label>
                <select name="agent_id" class="form-select">
                    <option value="">— Select —</option>
                    <?php foreach ($agents as $a): ?>
                    <option value="<?= $a['id'] ?>" <?= ($data['agent_id'] == $a['id']) ? 'selected' : '' ?>><?= e($a['name']) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div>
                <label class="form-label">Financer</label>
                <select name="financer_id" class="form-select">
                    <option value="">— Select —</option>
                    <?php foreach ($financers as $f): ?>
                    <option value="<?= $f['id'] ?>" <?= ($data['financer_id'] == $f['id']) ? 'selected' : '' ?>><?= e($f['name']) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div>
                <label class="form-label">Dealer</label>
                <select name="dealer_id" class="form-select">
                    <option value="">— Select —</option>
                    <?php foreach ($dealers as $d): ?>
                    <option value="<?= $d['id'] ?>" <?= ($data['dealer_id'] == $d['id']) ? 'selected' : '' ?>><?= e($d['name']) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div>
                <label class="form-label">SFE / Executive</label>
                <select name="executive_id" class="form-select">
                    <option value="">— Select —</option>
                    <?php foreach ($executives as $ex): ?>
                    <option value="<?= $ex['id'] ?>" <?= ($data['executive_id'] == $ex['id']) ? 'selected' : '' ?>><?= e($ex['name']) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
        </div>
    </div>

    <div class="card">
        <div class="card-header">
            <h2>📄 Documents & Payout</h2>
        </div>
        <div class="card-body grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div class="flex gap-3">
                <div class="flex-1">
                    <label class="form-label">RC Status</label>
                    <select name="rc_status" class="form-select">
                        <option value="pending" <?= ($data['rc_status']=='pending') ? 'selected' : '' ?>>Pending</option>
                        <option value="received" <?= ($data['rc_status']=='received') ? 'selected' : '' ?>>Received</option>
                        <option value="not_applicable" <?= ($data['rc_status']=='not_applicable') ? 'selected' : '' ?>>N/A</option>
                    </select>
                </div>
                <div class="flex-1">
                    <label class="form-label">RC Number</label>
                    <input type="text" name="rc_number" class="form-input" value="<?= e($data['rc_number'] ?? '') ?>">
                </div>
            </div>
            <div class="flex gap-3">
                <div class="flex-1">
                    <label class="form-label">Insurance Status</label>
                    <select name="insurance_status" class="form-select">
                        <option value="pending" <?= ($data['insurance_status']=='pending') ? 'selected' : '' ?>>Pending</option>
                        <option value="received" <?= ($data['insurance_status']=='received') ? 'selected' : '' ?>>Received</option>
                        <option value="not_applicable" <?= ($data['insurance_status']=='not_applicable') ? 'selected' : '' ?>>N/A</option>
                    </select>
                </div>
                <div class="flex-1">
                    <label class="form-label">Insurance No.</label>
                    <input type="text" name="insurance_number" class="form-input" value="<?= e($data['insurance_number'] ?? '') ?>">
                </div>
            </div>
            <div>
                <label class="form-label">RTO Status</label>
                <select name="rto_status" class="form-select">
                    <option value="pending" <?= ($data['rto_status']=='pending') ? 'selected' : '' ?>>Pending</option>
                    <option value="done" <?= ($data['rto_status']=='done') ? 'selected' : '' ?>>Done</option>
                    <option value="not_applicable" <?= ($data['rto_status']=='not_applicable') ? 'selected' : '' ?>>N/A</option>
                </select>
            </div>
            <div>
                <label class="form-label">Payout Amount (₹)</label>
                <input type="number" name="payout_amount" class="form-input" step="100" value="<?= e($data['payout_amount'] ?? '') ?>">
            </div>
            <div>
                <label class="form-label">Payout Status</label>
                <select name="payout_status" class="form-select">
                    <option value="pending" <?= ($data['payout_status']=='pending') ? 'selected' : '' ?>>Pending</option>
                    <option value="partial" <?= ($data['payout_status']=='partial') ? 'selected' : '' ?>>Partial</option>
                    <option value="paid" <?= ($data['payout_status']=='paid') ? 'selected' : '' ?>>Paid</option>
                </select>
            </div>
        </div>
    </div>

    <div class="card">
        <div class="card-header">
            <h2>📝 Query / Notes</h2>
        </div>
        <div class="card-body">
            <textarea name="query_notes" class="form-input resize-none" rows="3"><?= e($data['query_notes'] ?? '') ?></textarea>
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

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
