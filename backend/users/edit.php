<?php
// users/edit.php
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';
require_role('admin');

$id = (int)($_GET['id'] ?? 0);
$user = db_fetch_one($conn, "SELECT id, name, email, role, is_active FROM users WHERE id=?", 'i', [$id]);
$financers = db_fetch_all($conn, "SELECT id, name FROM financers WHERE is_active=1 ORDER BY name");
$executive = db_fetch_one($conn, "SELECT id, financer_id FROM executives WHERE user_id=?", 'i', [$id]);
$currentFinancerId = $executive ? $executive['financer_id'] : '';
if (!$user) {
    flash('error', 'User not found.');
    header("Location: index.php");
    exit;
}

$pageTitle = 'Edit User';
$pageBreadcrumb = 'System / Users / Edit';
$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verify_csrf()) die('Invalid CSRF');

    $name = trim($_POST['name'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $role = $_POST['role'] ?? 'staff';
    $password = $_POST['password'] ?? ''; // Optional
    $is_active = isset($_POST['is_active']) ? 1 : 0;

    // Protection: Cannot change own role or deactivate self
    if ($id === current_user_id()) {
        $role = $user['role'];
        $is_active = 1;
    }

    if (!$name || !$email) {
        $errors[] = 'Name and email are required.';
    }
    if (!in_array($role, ['admin', 'staff', 'executive', 'finance_manager', 'rto_desk', 'insurance_desk'])) {
        $errors[] = 'Invalid role selected.';
    }

    if (empty($errors)) {
        $check = db_fetch_one($conn, "SELECT id FROM users WHERE email=? AND id!=?", 'si', [$email, $id]);
        if ($check) $errors[] = 'Email is already in use by another account.';
    }

    if (empty($errors)) {
        $conn->begin_transaction();
        try {
            if ($password) {
                $hashed = password_hash($password, PASSWORD_DEFAULT);
                db_query($conn, "UPDATE users SET name=?, email=?, role=?, is_active=?, password=? WHERE id=?", 'ssiisi', [$name, $email, $role, $is_active, $hashed, $id]);
            } else {
                db_query($conn, "UPDATE users SET name=?, email=?, role=?, is_active=? WHERE id=?", 'ssiii', [$name, $email, $role, $is_active, $id]);
            }

            // Sync with executive table if role is executive or was executive
            if ($role === 'executive') {
                $financer_id = !empty($_POST['financer_id']) ? (int)$_POST['financer_id'] : null;
                $execCheck = db_fetch_one($conn, "SELECT id FROM executives WHERE user_id=?", 'i', [$id]);
                if ($execCheck) {
                    db_query($conn, "UPDATE executives SET name=?, email=?, financer_id=?, is_active=? WHERE user_id=?", 'ssiii', [$name, $email, $financer_id, $is_active, $id]);
                } else {
                    db_query($conn, "INSERT INTO executives (name, email, user_id, mobile, financer_id, is_active) VALUES (?, ?, ?, '', ?, ?)", 'ssiii', [$name, $email, $id, $financer_id, $is_active]);
                }
            } else {
                // If they are changed from Executive to Staff/Admin, deactivate them in the executives table so they stop receiving leads
                db_query($conn, "UPDATE executives SET is_active=0 WHERE user_id=?", 'i', [$id]);
            }

            $conn->commit();
            flash('success', 'User updated successfully.');
            header("Location: index.php");
            exit;
        } catch (Exception $e) {
            $conn->rollback();
            $errors[] = 'Failed to update user: ' . $e->getMessage();
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
        <div>
            <h1 class="text-2xl font-black text-slate-800 dark:text-white">Edit User</h1>
            <p class="text-sm text-slate-500 font-mono mt-0.5">ID: <?= $user['id'] ?></p>
        </div>
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
                <input type="text" name="name" id="name" value="<?= e($_POST['name'] ?? $user['name']) ?>" required placeholder=" ">
                <label for="name" class="required-lbl">Full Name</label>
            </div>
            
            <div class="form-floating">
                <input type="email" name="email" id="email" value="<?= e($_POST['email'] ?? $user['email']) ?>" required placeholder=" ">
                <label for="email" class="required-lbl">Email Address</label>
            </div>

            <div class="form-floating">
                <input type="text" name="password" id="password" placeholder=" ">
                <label for="password">Reset Password</label>
                <div class="text-xs text-slate-400 mt-1">Leave blank to keep the current password.</div>
            </div>

            <div class="form-floating">
                <select name="role" id="role" class="form-select border-none px-0" style="padding-top:1.5rem; padding-bottom:0.625rem; padding-left:1rem; background-color:transparent; width:100%;" <?= $id === current_user_id() ? 'disabled' : '' ?>>
                    <?php $r = $_POST['role'] ?? $user['role']; ?>
                    <option value="admin" <?= $r === 'admin' ? 'selected' : '' ?>>Admin (Full Access)</option>
                    <option value="staff" <?= $r === 'staff' ? 'selected' : '' ?>>Staff (Backoffice / Operations)</option>
                    <option value="executive" <?= $r === 'executive' ? 'selected' : '' ?>>Executive (Field Sales / SFE)</option>
                    <option value="finance_manager" <?= $r === 'finance_manager' ? 'selected' : '' ?>>Finance Manager</option>
                    <option value="rto_desk" <?= $r === 'rto_desk' ? 'selected' : '' ?>>RTO Desk</option>
                    <option value="insurance_desk" <?= $r === 'insurance_desk' ? 'selected' : '' ?>>Insurance Desk</option>
                </select>
                <label for="role" class="required-lbl">System Role</label>
                <?php if ($id === current_user_id()): ?>
                <div class="text-xs text-amber-500 mt-1">You cannot change your own role.</div>
                <?php endif; ?>
            </div>

            <div id="executiveFields" class="<?= ($_POST['role'] ?? $user['role']) === 'executive' ? '' : 'hidden' ?> space-y-4 pt-2">
                <div class="form-floating">
                    <select name="financer_id" id="financer_id" class="form-select border-none px-0" style="padding-top:1.5rem; padding-bottom:0.625rem; padding-left:1rem; background-color:transparent; width:100%;">
                        <option value="">— Unassigned (No Specific Unit) —</option>
                        <?php foreach ($financers as $f): ?>
                        <option value="<?= $f['id'] ?>" <?= ($_POST['financer_id'] ?? $currentFinancerId) == $f['id'] ? 'selected' : '' ?>><?= e($f['name']) ?></option>
                        <?php endforeach; ?>
                    </select>
                    <label for="financer_id">Assigned Financer (Unit)</label>
                </div>
            </div>

            <label class="flex items-center gap-3 p-3 border border-slate-200/60 dark:border-slate-700/60 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors <?= $id === current_user_id() ? 'opacity-50 cursor-not-allowed' : '' ?>">
                <input type="checkbox" name="is_active" value="1" class="w-4 h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500" <?= ($_POST['is_active'] ?? $user['is_active']) ? 'checked' : '' ?> <?= $id === current_user_id() ? 'disabled' : '' ?>>
                <div>
                    <div class="text-sm font-bold text-slate-800 dark:text-slate-200">Account Active</div>
                    <div class="text-[11px] text-slate-500">Uncheck to revoke login access and hide this user.</div>
                </div>
            </label>
        </div>
        <div class="card-footer flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-900/30">
            <a href="index.php" class="btn btn-secondary">Cancel</a>
            <button type="submit" class="btn btn-primary">Save Changes</button>
        </div>
    </form>
</div>

<script>
document.getElementById('role').addEventListener('change', function() {
    const isExec = this.value === 'executive';
    const execFields = document.getElementById('executiveFields');
    if (execFields) execFields.classList.toggle('hidden', !isExec);
});
</script>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
