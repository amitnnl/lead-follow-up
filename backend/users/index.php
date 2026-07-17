<?php
// users/index.php - Staff & User Management
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';
require_role('admin');

$pageTitle = 'Staff & Users';
$pageBreadcrumb = 'System / Users';

// Handle Activate/Deactivate/Delete
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && isset($_POST['user_id'])) {
    if (!verify_csrf()) die('Invalid CSRF');
    $uid = (int)$_POST['user_id'];
    // Prevent modifying yourself
    if ($uid !== current_user_id()) {
        if ($_POST['action'] === 'deactivate') {
            db_query($conn, "UPDATE users SET is_active=0 WHERE id=?", 'i', [$uid]);
            flash('success', 'User deactivated successfully.');
        } elseif ($_POST['action'] === 'activate') {
            db_query($conn, "UPDATE users SET is_active=1 WHERE id=?", 'i', [$uid]);
            flash('success', 'User activated successfully.');
        } elseif ($_POST['action'] === 'delete') {
            // Deactivate their linked executive or agent profiles first
            db_query($conn, "UPDATE executives SET is_active=0 WHERE user_id=?", 'i', [$uid]);
            db_query($conn, "UPDATE agents SET is_active=0 WHERE user_id=?", 'i', [$uid]);
            // Delete the user
            db_query($conn, "DELETE FROM users WHERE id=?", 'i', [$uid]);
            flash('success', 'User permanently deleted successfully.');
        }
    } else {
        flash('error', 'You cannot perform this action on your own account.');
    }
    header("Location: index.php");
    exit;
}

// Fetch all users
$users = db_fetch_all($conn, "SELECT id, name, email, role, is_active, created_at FROM users ORDER BY role ASC, name ASC");

require_once __DIR__ . '/../includes/header.php';
?>

<div class="flex items-center justify-between mb-6 animate-fade-up">
    <div>
        <h1 class="text-2xl font-black tracking-tight text-slate-800 dark:text-white">Staff & Users</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage system administrators, staff, and field executives.</p>
    </div>
    <a href="create.php" class="btn btn-primary flex items-center gap-2 shadow-sm shadow-brand-500/20">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        Add User
    </a>
</div>

<div class="card animate-fade-up" style="animation-delay: 100ms">
    <div class="overflow-x-auto">
        <table id="usersTable" class="w-full text-sm text-left">
            <thead>
                <tr class="bg-slate-50/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    <th class="px-5 py-4">Name</th>
                    <th class="px-5 py-4">Email</th>
                    <th class="px-5 py-4">Role</th>
                    <th class="px-5 py-4">Status</th>
                    <th class="px-5 py-4 text-right">Actions</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800/50">
                <?php foreach ($users as $u): ?>
                <tr class="hover:bg-slate-50/40 dark:hover:bg-slate-800/30 transition-colors">
                    <td class="px-5 py-4">
                        <div class="font-bold text-slate-800 dark:text-slate-200"><?= e($u['name']) ?></div>
                        <div class="text-[11px] text-slate-400">Added <?= date('M d, Y', strtotime($u['created_at'])) ?></div>
                    </td>
                    <td class="px-5 py-4 text-slate-600 dark:text-slate-400 font-mono text-xs">
                        <?= e($u['email']) ?>
                    </td>
                    <td class="px-5 py-4">
                        <?php if ($u['role'] === 'admin'): ?>
                            <span class="badge badge-purple">Admin</span>
                        <?php elseif ($u['role'] === 'staff'): ?>
                            <span class="badge badge-indigo">Staff</span>
                        <?php elseif ($u['role'] === 'executive'): ?>
                            <span class="badge badge-amber">Executive</span>
                        <?php elseif ($u['role'] === 'finance_manager'): ?>
                            <span class="badge badge-emerald">Finance</span>
                        <?php elseif ($u['role'] === 'rto_desk'): ?>
                            <span class="badge badge-blue">RTO</span>
                        <?php elseif ($u['role'] === 'insurance_desk'): ?>
                            <span class="badge badge-rose">Insurance</span>
                        <?php elseif ($u['role'] === 'agent'): ?>
                            <span class="badge badge-gray">Agent</span>
                        <?php else: ?>
                            <span class="badge badge-gray"><?= ucfirst(e($u['role'])) ?></span>
                        <?php endif; ?>
                    </td>
                    <td class="px-5 py-4">
                        <?php if ($u['is_active']): ?>
                            <span class="badge badge-emerald">Active</span>
                        <?php else: ?>
                            <span class="badge badge-gray">Inactive</span>
                        <?php endif; ?>
                    </td>
                    <td class="px-5 py-4 text-right">
                        <div class="flex items-center justify-end gap-2">
                            <a href="edit.php?id=<?= $u['id'] ?>" class="p-1.5 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10 rounded transition-colors" title="Edit">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                            </a>
                            
                            <?php if ($u['id'] !== current_user_id()): ?>
                            <form method="POST" action="" class="inline" onsubmit="return confirm('Are you sure you want to change this user\'s status?');">
                                <?= csrf_field() ?>
                                <input type="hidden" name="user_id" value="<?= $u['id'] ?>">
                                <?php if ($u['is_active']): ?>
                                    <input type="hidden" name="action" value="deactivate">
                                    <button type="submit" class="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded transition-colors" title="Deactivate">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>
                                    </button>
                                <?php else: ?>
                                    <input type="hidden" name="action" value="activate">
                                    <button type="submit" class="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded transition-colors" title="Activate">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                    </button>
                                <?php endif; ?>
                            </form>
                            
                            <form method="POST" action="" class="inline" onsubmit="return confirm('Are you sure you want to permanently delete this user? This action cannot be undone.');">
                                <?= csrf_field() ?>
                                <input type="hidden" name="user_id" value="<?= $u['id'] ?>">
                                <input type="hidden" name="action" value="delete">
                                <button type="submit" class="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded transition-colors" title="Delete">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                </button>
                            </form>
                            <?php endif; ?>
                        </div>
                    </td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>

<script>
$(document).ready(function() {
    initTable('#usersTable', { order: [] });
});
</script>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
