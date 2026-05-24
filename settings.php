<?php
// settings.php — User Profile & Settings
require_once __DIR__ . '/includes/db.php';
require_once __DIR__ . '/includes/auth.php';

require_login();

$pageTitle = 'Settings';
$pageBreadcrumb = 'System / Settings';

$user = current_user();
$userId = current_user_id();

$errors = [];
$success = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verify_csrf()) {
        die('Invalid CSRF token');
    }

    $name = trim($_POST['name'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $current_password = $_POST['current_password'] ?? '';
    $new_password = $_POST['new_password'] ?? '';
    $confirm_password = $_POST['confirm_password'] ?? '';

    if (empty($name)) {
        $errors[] = 'Name is required.';
    }
    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errors[] = 'Valid email is required.';
    }

    // Check email uniqueness
    if (empty($errors)) {
        $check = db_fetch_one($conn, "SELECT id FROM users WHERE email=? AND id!=?", 'si', [$email, $userId]);
        if ($check) {
            $errors[] = 'Email is already in use by another account.';
        }
    }

    // Handle password change if requested
    if (empty($errors) && (!empty($current_password) || !empty($new_password))) {
        if (empty($current_password)) {
            $errors[] = 'Current password is required to set a new password.';
        } elseif (empty($new_password)) {
            $errors[] = 'New password cannot be empty.';
        } elseif ($new_password !== $confirm_password) {
            $errors[] = 'New password and confirmation do not match.';
        } else {
            // Verify current password
            $dbUser = db_fetch_one($conn, "SELECT password FROM users WHERE id=?", 'i', [$userId]);
            if (!password_verify($current_password, $dbUser['password'])) {
                $errors[] = 'Current password is incorrect.';
            }
        }
    }

    if (empty($errors)) {
        if (!empty($new_password)) {
            $hashed = password_hash($new_password, PASSWORD_DEFAULT);
            $stmt = $conn->prepare("UPDATE users SET name=?, email=?, password=? WHERE id=?");
            $stmt->bind_param('sssi', $name, $email, $hashed, $userId);
        } else {
            $stmt = $conn->prepare("UPDATE users SET name=?, email=? WHERE id=?");
            $stmt->bind_param('ssi', $name, $email, $userId);
        }

        if ($stmt->execute()) {
            $success = 'Settings updated successfully.';
            // Update session data
            $_SESSION['user']['name'] = $name;
            $_SESSION['user']['email'] = $email;
            $user['name'] = $name;
            $user['email'] = $email;
            
            flash('success', $success);
            header("Location: " . BASE_URL . "/settings.php");
            exit;
        } else {
            $errors[] = 'Database error: ' . $conn->error;
        }
    }
}

require_once __DIR__ . '/includes/header.php';
?>

<div class="max-w-3xl mx-auto">
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
                <h2>👤 Profile Information</h2>
            </div>
            <div class="card-body space-y-5">
                <div class="form-floating">
                    <input type="text" name="name" id="name" value="<?= e($user['name']) ?>" required placeholder=" ">
                    <label for="name" class="required-lbl">Full Name</label>
                </div>
                
                <div class="form-floating">
                    <input type="email" name="email" id="email" value="<?= e($user['email']) ?>" required placeholder=" ">
                    <label for="email" class="required-lbl">Email Address</label>
                </div>
                
                <div class="form-floating">
                    <input type="text" value="<?= ucfirst(e($user['role'])) ?>" disabled placeholder=" " class="bg-gray-50 dark:bg-gray-800/50 cursor-not-allowed">
                    <label>Account Role</label>
                </div>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <h2>🔒 Change Password</h2>
            </div>
            <div class="card-body space-y-5">
                <p class="text-sm text-gray-500 mb-4">Leave these fields blank if you do not wish to change your password.</p>
                
                <div class="form-floating">
                    <input type="password" name="current_password" id="current_password" placeholder=" " autocomplete="current-password">
                    <label for="current_password">Current Password</label>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div class="form-floating">
                        <input type="password" name="new_password" id="new_password" placeholder=" " autocomplete="new-password">
                        <label for="new_password">New Password</label>
                    </div>
                    <div class="form-floating">
                        <input type="password" name="confirm_password" id="confirm_password" placeholder=" " autocomplete="new-password">
                        <label for="confirm_password">Confirm New Password</label>
                    </div>
                </div>
            </div>
        </div>

        <div class="flex items-center justify-end gap-3">
            <a href="<?= BASE_URL ?>/dashboard.php" class="btn btn-secondary">Cancel</a>
            <button type="submit" class="btn btn-primary">Save Changes</button>
        </div>
    </form>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
