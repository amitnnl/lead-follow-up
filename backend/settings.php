<?php
// settings.php — Project Customization & Profile Settings
require_once __DIR__ . '/includes/db.php';
require_once __DIR__ . '/includes/auth.php';

require_login();

$pageTitle = 'Settings & Customization';
$pageBreadcrumb = 'System / Settings';

$user = current_user();
$userId = current_user_id();

$errors = [];
$success = '';

// Load existing system settings
$sys_settings = get_all_settings();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verify_csrf()) {
        die('Invalid CSRF token');
    }

    $action = $_POST['action'] ?? 'profile';

    if ($action === 'profile') {
        if (is_staff()) {
            // Staff can ONLY change password, not user id or user name
            $name = $user['name'];
            $email = $user['email'];
        } else {
            $name = trim($_POST['name'] ?? '');
            $email = trim($_POST['email'] ?? '');
        }
        $current_password = $_POST['current_password'] ?? '';
        $new_password = $_POST['new_password'] ?? '';
        $confirm_password = $_POST['confirm_password'] ?? '';

        if (empty($name)) $errors[] = 'Name is required.';
        if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = 'Valid email is required.';

        if (empty($errors)) {
            $check = db_fetch_one($conn, "SELECT id FROM users WHERE email=? AND id!=?", 'si', [$email, $userId]);
            if ($check) $errors[] = 'Email is already in use.';
        }

        if (empty($errors) && (!empty($current_password) || !empty($new_password))) {
            if (empty($current_password)) $errors[] = 'Current password required.';
            elseif (empty($new_password)) $errors[] = 'New password cannot be empty.';
            elseif ($new_password !== $confirm_password) $errors[] = 'Passwords do not match.';
            else {
                $dbUser = db_fetch_one($conn, "SELECT password FROM users WHERE id=?", 'i', [$userId]);
                if (!password_verify($current_password, $dbUser['password'])) {
                    $errors[] = 'Current password incorrect.';
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
                $_SESSION['user']['name'] = $name;
                $_SESSION['user']['email'] = $email;
                flash('success', 'Profile updated successfully.');
                header("Location: " . BASE_URL . "/settings.php?tab=profile");
                exit;
            } else {
                $errors[] = 'Database error: ' . $conn->error;
            }
        }
    } 
    elseif (is_admin()) {
        $keys = [];
        $tabRedirect = 'system';
        $msg = 'Settings updated successfully.';

        if ($action === 'system') {
            $keys = ['app_name', 'company_name', 'support_email', 'default_currency', 'theme_color', 'system_timezone', 'session_timeout', 'maintenance_mode'];
            $tabRedirect = 'system';
            $msg = 'System branding and security settings updated.';
        } elseif ($action === 'financial') {
            $keys = ['default_tds_rate', 'default_processing_fee'];
            $tabRedirect = 'financial';
            $msg = 'Financial defaults updated.';
        } elseif ($action === 'workflow') {
            $keys = ['default_lead_status', 'followup_sla_days'];
            $tabRedirect = 'workflow';
            $msg = 'Workflow rules updated.';
        } elseif ($action === 'smtp') {
            $keys = ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass'];
            $tabRedirect = 'smtp';
            $msg = 'SMTP configuration updated.';
        }

        if (!empty($keys)) {
            foreach ($keys as $key) {
                if (isset($_POST[$key])) {
                    set_setting($key, trim($_POST[$key]));
                }
            }
            flash('success', $msg);
            header("Location: " . BASE_URL . "/settings.php?tab=" . $tabRedirect);
            exit;
        }
    }
}

$activeTab = $_GET['tab'] ?? 'profile';
$allowedTabs = ['profile', 'system', 'financial', 'workflow', 'smtp'];
if (!in_array($activeTab, $allowedTabs)) $activeTab = 'profile';

if ($activeTab !== 'profile' && !is_admin()) {
    $activeTab = 'profile'; // fallback if non-admin tries to access
}

require_once __DIR__ . '/includes/header.php';
?>

<div class="max-w-6xl mx-auto mb-10 animate-fade-up">
    <!-- Unified Settings Container -->
    <div class="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl shadow-slate-200/50 dark:shadow-slate-950/50 border border-slate-200/60 dark:border-slate-800 flex flex-col md:flex-row overflow-hidden min-h-[650px]">
        
        <!-- Sidebar Navigation -->
        <div class="w-full md:w-72 bg-slate-50/80 dark:bg-slate-800/30 border-r border-slate-200/60 dark:border-slate-800 p-6 flex flex-col gap-1 relative z-10 backdrop-blur-xl">
            <h3 class="text-[10px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase mb-4 ml-3 mt-2">Personal</h3>
            <nav class="space-y-1.5 mb-6">
                <a href="?tab=profile" class="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-300 <?= $activeTab === 'profile' ? 'bg-white dark:bg-slate-800 shadow-sm border border-slate-200/60 dark:border-slate-700 text-brand-600 dark:text-brand-400' : 'text-slate-600 hover:bg-slate-200/50 dark:text-slate-400 dark:hover:bg-slate-800/50 border border-transparent' ?>">
                    <svg class="w-[18px] h-[18px] <?= $activeTab === 'profile' ? 'opacity-100' : 'opacity-70' ?>" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                    My Profile
                </a>
            </nav>
            
            <?php if (is_admin()): ?>
            <h3 class="text-[10px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase mb-4 ml-3 mt-2">Global Project</h3>
            <nav class="space-y-1.5">
                <a href="?tab=system" class="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-300 <?= $activeTab === 'system' ? 'bg-white dark:bg-slate-800 shadow-sm border border-slate-200/60 dark:border-slate-700 text-brand-600 dark:text-brand-400' : 'text-slate-600 hover:bg-slate-200/50 dark:text-slate-400 dark:hover:bg-slate-800/50 border border-transparent' ?>">
                    <svg class="w-[18px] h-[18px] <?= $activeTab === 'system' ? 'opacity-100' : 'opacity-70' ?>" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    System & Identity
                </a>
                
                <a href="?tab=financial" class="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-300 <?= $activeTab === 'financial' ? 'bg-white dark:bg-slate-800 shadow-sm border border-slate-200/60 dark:border-slate-700 text-brand-600 dark:text-brand-400' : 'text-slate-600 hover:bg-slate-200/50 dark:text-slate-400 dark:hover:bg-slate-800/50 border border-transparent' ?>">
                    <svg class="w-[18px] h-[18px] <?= $activeTab === 'financial' ? 'opacity-100' : 'opacity-70' ?>" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    Financial Defaults
                </a>

                <a href="?tab=workflow" class="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-300 <?= $activeTab === 'workflow' ? 'bg-white dark:bg-slate-800 shadow-sm border border-slate-200/60 dark:border-slate-700 text-brand-600 dark:text-brand-400' : 'text-slate-600 hover:bg-slate-200/50 dark:text-slate-400 dark:hover:bg-slate-800/50 border border-transparent' ?>">
                    <svg class="w-[18px] h-[18px] <?= $activeTab === 'workflow' ? 'opacity-100' : 'opacity-70' ?>" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                    Lead Workflow
                </a>

                <a href="?tab=smtp" class="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-300 <?= $activeTab === 'smtp' ? 'bg-white dark:bg-slate-800 shadow-sm border border-slate-200/60 dark:border-slate-700 text-brand-600 dark:text-brand-400' : 'text-slate-600 hover:bg-slate-200/50 dark:text-slate-400 dark:hover:bg-slate-800/50 border border-transparent' ?>">
                    <svg class="w-[18px] h-[18px] <?= $activeTab === 'smtp' ? 'opacity-100' : 'opacity-70' ?>" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                    SMTP Server
                </a>
            </nav>
            <?php endif; ?>
        </div>

        <!-- Main Content -->
        <div class="flex-1 p-6 md:p-10 lg:p-12">
            <?php if ($errors): ?>
            <div class="bg-rose-50/80 backdrop-blur-xl border border-rose-200/50 text-rose-700 rounded-2xl px-5 py-4 mb-8 text-sm shadow-sm">
                <strong class="font-bold flex items-center gap-2"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg> Please fix the following errors:</strong>
                <ul class="mt-2 list-disc list-inside space-y-1 ml-1 text-rose-600/90">
                    <?php foreach ($errors as $e): ?><li><?= e($e) ?></li><?php endforeach; ?>
                </ul>
            </div>
            <?php endif; ?>

            <?php if ($activeTab === 'profile'): ?>
            <!-- Profile Settings Tab -->
            <form method="POST" action="" class="space-y-10 animate-fade-in-up">
                <?= csrf_field() ?>
                <input type="hidden" name="action" value="profile">

                <div class="space-y-6">
                    <div class="border-b border-slate-200/60 dark:border-slate-800 pb-4">
                        <h2 class="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
                            👤 Profile Information
                        </h2>
                        <p class="text-sm text-slate-500 mt-1">Update your account's profile information and email address.</p>
                    </div>
                    
                    <div class="space-y-6 max-w-xl">
                        <div class="form-floating">
                            <input type="text" name="name" id="name" value="<?= e($user['name']) ?>" required placeholder=" " <?= is_staff() ? 'readonly class="bg-slate-50/50 dark:bg-slate-800/20 cursor-not-allowed"' : '' ?>>
                            <label for="name" class="required-lbl">Full Name <?= is_staff() ? '(Locked for Staff)' : '' ?></label>
                        </div>
                        
                        <div class="form-floating">
                            <input type="email" name="email" id="email" value="<?= e($user['email']) ?>" required placeholder=" " <?= is_staff() ? 'readonly class="bg-slate-50/50 dark:bg-slate-800/20 cursor-not-allowed"' : '' ?>>
                            <label for="email" class="required-lbl">Email Address / Username <?= is_staff() ? '(Locked for Staff)' : '' ?></label>
                        </div>
                        
                        <div class="form-floating">
                            <input type="text" value="<?= ucfirst(e($user['role'])) ?>" disabled placeholder=" " class="bg-slate-50/50 dark:bg-slate-800/20 cursor-not-allowed">
                            <label>Account Role</label>
                        </div>
                    </div>
                </div>

                <div class="space-y-6 pt-4">
                    <div class="border-b border-slate-200/60 dark:border-slate-800 pb-4">
                        <h2 class="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
                            🔒 Change Password
                        </h2>
                        <p class="text-sm text-slate-500 mt-1">Ensure your account is using a long, random password to stay secure.</p>
                    </div>
                    
                    <div class="space-y-6 max-w-xl">
                        <div class="form-floating">
                            <input type="password" name="current_password" id="current_password" placeholder=" " autocomplete="current-password">
                            <label for="current_password">Current Password</label>
                        </div>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="form-floating">
                                <input type="password" name="new_password" id="new_password" placeholder=" " autocomplete="new-password">
                                <label for="new_password">New Password</label>
                            </div>
                            <div class="form-floating">
                                <input type="password" name="confirm_password" id="confirm_password" placeholder=" " autocomplete="new-password">
                                <label for="confirm_password">Confirm Password</label>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="flex justify-start gap-3 pt-6 border-t border-slate-200/60 dark:border-slate-800 max-w-xl">
                    <button type="submit" class="btn btn-primary shadow-lg shadow-brand-500/20 px-8">Save Profile</button>
                </div>
            </form>
            <?php endif; ?>

            <?php if ($activeTab === 'system' && is_admin()): ?>
            <!-- System Settings Tab -->
            <form method="POST" action="" class="space-y-10 animate-fade-in-up">
                <?= csrf_field() ?>
                <input type="hidden" name="action" value="system">

                <div class="space-y-6">
                    <div class="border-b border-slate-200/60 dark:border-slate-800 pb-4">
                        <h2 class="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
                            🏢 Global Branding & System Security
                        </h2>
                        <p class="text-sm text-slate-500 mt-1">Configure brand identity, regional formatting, and base security.</p>
                    </div>
                    
                    <div class="space-y-6 max-w-2xl">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="form-floating">
                                <input type="text" name="app_name" id="app_name" value="<?= e($sys_settings['app_name'] ?? '') ?>" required placeholder=" ">
                                <label for="app_name" class="required-lbl">Application Name</label>
                            </div>
                            <div class="form-floating">
                                <input type="text" name="company_name" id="company_name" value="<?= e($sys_settings['company_name'] ?? '') ?>" required placeholder=" ">
                                <label for="company_name" class="required-lbl">Company Name</label>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="form-floating">
                                <input type="email" name="support_email" id="support_email" value="<?= e($sys_settings['support_email'] ?? '') ?>" required placeholder=" ">
                                <label for="support_email" class="required-lbl">Support Email</label>
                            </div>
                            <div class="form-floating">
                                <input type="text" name="default_currency" id="default_currency" value="<?= e($sys_settings['default_currency'] ?? 'INR') ?>" required placeholder=" ">
                                <label for="default_currency" class="required-lbl">Default Currency</label>
                            </div>
                        </div>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="form-floating">
                                <select name="system_timezone" id="system_timezone" class="form-select bg-slate-50/50 dark:bg-slate-800/20">
                                    <?php
                                    $tzs = ['Asia/Kolkata', 'America/New_York', 'Europe/London', 'Australia/Sydney', 'UTC'];
                                    $curr_tz = $sys_settings['system_timezone'] ?? 'Asia/Kolkata';
                                    foreach($tzs as $tz) {
                                        $sel = ($curr_tz === $tz) ? 'selected' : '';
                                        echo "<option value=\"$tz\" $sel>$tz</option>";
                                    }
                                    ?>
                                </select>
                                <label for="system_timezone">System Timezone</label>
                            </div>
                            <div class="form-floating">
                                <select name="theme_color" id="theme_color" class="form-select bg-slate-50/50 dark:bg-slate-800/20">
                                    <option value="blue" <?= ($sys_settings['theme_color'] ?? '') === 'blue' ? 'selected' : '' ?>>Indigo (Default)</option>
                                    <option value="emerald" <?= ($sys_settings['theme_color'] ?? '') === 'emerald' ? 'selected' : '' ?>>Emerald Green</option>
                                    <option value="rose" <?= ($sys_settings['theme_color'] ?? '') === 'rose' ? 'selected' : '' ?>>Rose Red</option>
                                    <option value="slate" <?= ($sys_settings['theme_color'] ?? '') === 'slate' ? 'selected' : '' ?>>Slate Gray</option>
                                </select>
                                <label for="theme_color">Primary Theme Color</label>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="form-floating">
                                <input type="number" name="session_timeout" id="session_timeout" value="<?= e($sys_settings['session_timeout'] ?? '120') ?>" required placeholder=" ">
                                <label for="session_timeout" class="required-lbl">Session Timeout (Minutes)</label>
                            </div>
                            <div class="flex flex-col justify-center gap-2">
                                <label class="relative inline-flex items-center cursor-pointer max-w-max">
                                    <input type="hidden" name="maintenance_mode" value="0">
                                    <input type="checkbox" name="maintenance_mode" value="1" class="sr-only peer" <?= ($sys_settings['maintenance_mode'] ?? '0') === '1' ? 'checked' : '' ?>>
                                    <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-rose-500 shadow-inner"></div>
                                    <span class="ml-3 text-sm font-bold text-slate-700 dark:text-slate-300">Enable Maintenance Mode</span>
                                </label>
                                <p class="text-[10px] text-slate-500 ml-14">Locks out all non-admin users immediately.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="flex justify-start gap-3 pt-6 border-t border-slate-200/60 dark:border-slate-800 max-w-2xl">
                    <button type="submit" class="btn btn-primary shadow-lg shadow-brand-500/20 px-8">Save System Configurations</button>
                </div>
            </form>
            <?php endif; ?>

            <?php if ($activeTab === 'financial' && is_admin()): ?>
            <!-- Financial Settings Tab -->
            <form method="POST" action="" class="space-y-10 animate-fade-in-up">
                <?= csrf_field() ?>
                <input type="hidden" name="action" value="financial">

                <div class="space-y-6">
                    <div class="border-b border-slate-200/60 dark:border-slate-800 pb-4">
                        <h2 class="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
                            💰 Financial Defaults
                        </h2>
                        <p class="text-sm text-slate-500 mt-1">Configure baseline rates for commissions, TDS, and processing fees.</p>
                    </div>
                    
                    <div class="space-y-6 max-w-md">
                        <div class="form-floating relative">
                            <input type="number" step="0.01" name="default_tds_rate" id="default_tds_rate" value="<?= e($sys_settings['default_tds_rate'] ?? '5') ?>" required placeholder=" ">
                            <label for="default_tds_rate" class="required-lbl">Default TDS Rate (%)</label>
                            <span class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                        </div>
                        
                        <div class="form-floating relative">
                            <input type="number" step="0.01" name="default_processing_fee" id="default_processing_fee" value="<?= e($sys_settings['default_processing_fee'] ?? '0') ?>" required placeholder=" ">
                            <label for="default_processing_fee" class="required-lbl">Default Processing Fee</label>
                            <span class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold"><?= e($sys_settings['default_currency'] ?? '₹') ?></span>
                        </div>
                    </div>
                </div>

                <div class="flex justify-start gap-3 pt-6 border-t border-slate-200/60 dark:border-slate-800 max-w-md">
                    <button type="submit" class="btn btn-primary shadow-lg shadow-brand-500/20 px-8">Save Financial Defaults</button>
                </div>
            </form>
            <?php endif; ?>

            <?php if ($activeTab === 'workflow' && is_admin()): ?>
            <!-- Workflow Settings Tab -->
            <form method="POST" action="" class="space-y-10 animate-fade-in-up">
                <?= csrf_field() ?>
                <input type="hidden" name="action" value="workflow">

                <div class="space-y-6">
                    <div class="border-b border-slate-200/60 dark:border-slate-800 pb-4">
                        <h2 class="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
                            🎯 Lead Workflow Rules
                        </h2>
                        <p class="text-sm text-slate-500 mt-1">Set automation rules for leads and follow-ups.</p>
                    </div>
                    
                    <div class="space-y-6 max-w-md">
                        <div class="form-floating">
                            <select name="default_lead_status" id="default_lead_status" class="form-select bg-slate-50/50 dark:bg-slate-800/20">
                                <option value="New" <?= ($sys_settings['default_lead_status'] ?? 'New') === 'New' ? 'selected' : '' ?>>New</option>
                                <option value="Pending Document" <?= ($sys_settings['default_lead_status'] ?? '') === 'Pending Document' ? 'selected' : '' ?>>Pending Document</option>
                                <option value="Follow-up" <?= ($sys_settings['default_lead_status'] ?? '') === 'Follow-up' ? 'selected' : '' ?>>Follow-up</option>
                            </select>
                            <label for="default_lead_status">Default Lead Status (On Creation)</label>
                        </div>
                        
                        <div class="form-floating relative">
                            <input type="number" name="followup_sla_days" id="followup_sla_days" value="<?= e($sys_settings['followup_sla_days'] ?? '3') ?>" required placeholder=" ">
                            <label for="followup_sla_days" class="required-lbl">Follow-up SLA</label>
                            <span class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Days</span>
                        </div>
                    </div>
                </div>

                <div class="flex justify-start gap-3 pt-6 border-t border-slate-200/60 dark:border-slate-800 max-w-md">
                    <button type="submit" class="btn btn-primary shadow-lg shadow-brand-500/20 px-8">Save Workflow Rules</button>
                </div>
            </form>
            <?php endif; ?>

            <?php if ($activeTab === 'smtp' && is_admin()): ?>
            <!-- SMTP Settings Tab -->
            <form method="POST" action="" class="space-y-10 animate-fade-in-up">
                <?= csrf_field() ?>
                <input type="hidden" name="action" value="smtp">

                <div class="space-y-6">
                    <div class="border-b border-slate-200/60 dark:border-slate-800 pb-4">
                        <h2 class="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
                            📧 SMTP Server Configuration
                        </h2>
                        <p class="text-sm text-slate-500 mt-1">Credentials for sending automated emails and receipts to channels.</p>
                    </div>
                    
                    <div class="space-y-6 max-w-xl">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="form-floating">
                                <input type="text" name="smtp_host" id="smtp_host" value="<?= e($sys_settings['smtp_host'] ?? '') ?>" placeholder=" ">
                                <label for="smtp_host">SMTP Host (e.g., smtp.gmail.com)</label>
                            </div>
                            <div class="form-floating">
                                <input type="number" name="smtp_port" id="smtp_port" value="<?= e($sys_settings['smtp_port'] ?? '587') ?>" placeholder=" ">
                                <label for="smtp_port">SMTP Port (e.g., 587 or 465)</label>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="form-floating">
                                <input type="text" name="smtp_user" id="smtp_user" value="<?= e($sys_settings['smtp_user'] ?? '') ?>" placeholder=" ">
                                <label for="smtp_user">SMTP Username</label>
                            </div>
                            <div class="form-floating">
                                <input type="password" name="smtp_pass" id="smtp_pass" value="<?= e($sys_settings['smtp_pass'] ?? '') ?>" placeholder=" ">
                                <label for="smtp_pass">SMTP Password</label>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="flex justify-start gap-3 pt-6 border-t border-slate-200/60 dark:border-slate-800 max-w-xl">
                    <button type="submit" class="btn btn-primary shadow-lg shadow-brand-500/20 px-8">Save SMTP Config</button>
                </div>
            </form>
            <?php endif; ?>

        </div>
    </div>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
