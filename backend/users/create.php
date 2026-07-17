<?php
// users/create.php
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';
require_role('admin');

$pageTitle = 'Add User';
$pageBreadcrumb = 'System / Users / Add';
$errors = [];
$financers = db_fetch_all($conn, "SELECT id, name FROM financers WHERE is_active=1 ORDER BY name");

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verify_csrf()) die('Invalid CSRF');

    $name = trim($_POST['name'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';
    $role = $_POST['role'] ?? 'staff';

    if (!$name || !$email || !$password) {
        $errors[] = 'Name, email, and password are required.';
    }
    if (!in_array($role, ['admin', 'staff', 'executive', 'finance_manager', 'rto_desk', 'insurance_desk'])) {
        $errors[] = 'Invalid role selected.';
    }

    if (empty($errors)) {
        $check = db_fetch_one($conn, "SELECT id FROM users WHERE email=?", 's', [$email]);
        if ($check) $errors[] = 'Email is already in use.';
    }

    if (empty($errors)) {
        $conn->begin_transaction();
        try {
            $hashed = password_hash($password, PASSWORD_DEFAULT);
            db_query($conn, "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)", 'ssss', [$name, $email, $hashed, $role]);
            $newUserId = $conn->insert_id;

            if ($role === 'executive') {
                $financer_id = !empty($_POST['financer_id']) ? (int)$_POST['financer_id'] : null;
                db_query($conn, "INSERT INTO executives (name, email, user_id, mobile, financer_id, is_active) VALUES (?, ?, ?, '', ?, 1)", 'ssii', [$name, $email, $newUserId, $financer_id]);
            }

            $conn->commit();
            flash('success', 'User created successfully.');
            header("Location: index.php");
            exit;
        } catch (Exception $e) {
            $conn->rollback();
            $errors[] = 'Failed to create user: ' . $e->getMessage();
        }
    }
}
require_once __DIR__ . '/../includes/header.php';
?>

<div class="max-w-2xl mx-auto">
    <div class="flex items-center gap-3 mb-6 animate-fade-up">
        <a href="index.php" class="p-2 bg-white dark:bg-slate-800 text-slate-500 hover:text-brand-600 rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-700/50 transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
        </a>
        <h1 class="text-2xl font-black text-slate-800 dark:text-white">Add New User</h1>
    </div>

    <?php if ($errors): ?>
    <div class="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl px-5 py-4 mb-6 text-sm">
        <strong class="font-bold">Please fix the following errors:</strong>
        <ul class="mt-2 list-disc list-inside space-y-1">
            <?php foreach ($errors as $e): ?><li><?= e($e) ?></li><?php endforeach; ?>
        </ul>
    </div>
    <?php endif; ?>

    <form method="POST" action="" class="card animate-fade-up" style="animation-delay: 100ms">
        <?= csrf_field() ?>
        <div class="card-body space-y-5">
            <div class="form-floating">
                <input type="text" name="name" id="name" value="<?= e($_POST['name'] ?? '') ?>" required placeholder=" ">
                <label for="name" class="required-lbl">Full Name</label>
            </div>
            
            <div class="form-floating">
                <input type="email" name="email" id="email" value="<?= e($_POST['email'] ?? '') ?>" required placeholder=" ">
                <label for="email" class="required-lbl">Email Address</label>
            </div>

            <div class="form-floating">
                <input type="text" name="password" id="password" required placeholder=" " value="<?= substr(md5(rand()), 0, 8) ?>">
                <label for="password" class="required-lbl">Temporary Password</label>
                <div class="text-xs text-slate-400 mt-1">A secure temporary password has been auto-generated. You can change it.</div>
            </div>

            <div class="form-floating">
                <select name="role" id="role" required class="form-select border-none px-0" style="padding-top:1.5rem; padding-bottom:0.625rem; padding-left:1rem; background-color:transparent; width:100%;">
                    <option value="admin" <?= ($_POST['role'] ?? '') === 'admin' ? 'selected' : '' ?>>Admin (Full Access)</option>
                    <option value="staff" <?= ($_POST['role'] ?? 'staff') === 'staff' ? 'selected' : '' ?>>Staff (Backoffice / Operations)</option>
                    <option value="executive" <?= ($_POST['role'] ?? '') === 'executive' ? 'selected' : '' ?>>Executive (Field Sales / SFE)</option>
                    <option value="finance_manager" <?= ($_POST['role'] ?? '') === 'finance_manager' ? 'selected' : '' ?>>Finance Manager</option>
                    <option value="rto_desk" <?= ($_POST['role'] ?? '') === 'rto_desk' ? 'selected' : '' ?>>RTO Desk</option>
                    <option value="insurance_desk" <?= ($_POST['role'] ?? '') === 'insurance_desk' ? 'selected' : '' ?>>Insurance Desk</option>
                </select>
                <label for="role" class="required-lbl">System Role</label>
            </div>
            
            <div id="executiveFields" class="<?= ($_POST['role'] ?? '') === 'executive' ? '' : 'hidden' ?> space-y-4 pt-2">
                <div class="form-floating">
                    <select name="financer_id" id="financer_id" class="form-select border-none px-0" style="padding-top:1.5rem; padding-bottom:0.625rem; padding-left:1rem; background-color:transparent; width:100%;">
                        <option value="">— Unassigned (No Specific Unit) —</option>
                        <?php foreach ($financers as $f): ?>
                        <option value="<?= $f['id'] ?>" <?= ($_POST['financer_id'] ?? '') == $f['id'] ? 'selected' : '' ?>><?= e($f['name']) ?></option>
                        <?php endforeach; ?>
                    </select>
                    <label for="financer_id">Assigned Financer (Unit)</label>
                </div>
            </div>

            <div id="execWarning" class="hidden text-xs text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                <strong>Note:</strong> Selecting Executive will also automatically create a profile in the Executives list so leads can be assigned to them.
            </div>
        </div>
        <div class="card-footer flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-900/30">
            <a href="index.php" class="btn btn-secondary">Cancel</a>
            <button type="submit" class="btn btn-primary">Create User</button>
        </div>
    </form>
</div>

<script>
document.getElementById('role').addEventListener('change', function() {
    const isExec = this.value === 'executive';
    document.getElementById('execWarning').classList.toggle('hidden', !isExec);
    const execFields = document.getElementById('executiveFields');
    if (execFields) execFields.classList.toggle('hidden', !isExec);
});
if(document.getElementById('role').value === 'executive') {
    document.getElementById('execWarning').classList.remove('hidden');
    const execFields = document.getElementById('executiveFields');
    if (execFields) execFields.classList.remove('hidden');
}
</script>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
