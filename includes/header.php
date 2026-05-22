<?php
// includes/header.php
require_once __DIR__ . '/auth.php';
require_login();
$user = current_user();
$currentFile = basename($_SERVER['PHP_SELF']);
$currentDir  = basename(dirname($_SERVER['PHP_SELF']));

function nav_active(string $dir, string $file = ''): string {
    global $currentDir, $currentFile;
    if ($dir === $currentDir || ($dir === 'root' && $currentFile === $file)) {
        return 'sidebar-nav-active';
    }
    return 'sidebar-nav-inactive';
}
?>
<!DOCTYPE html>
<html lang="en" id="htmlRoot">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= e($pageTitle ?? 'DSA Lead System') ?> — DSA Finance Manager</title>
    <meta name="description" content="Vehicle Finance DSA Management System — manage leads, agents, payouts and follow-ups.">
    <meta name="theme-color" content="#0f172a">

    <!-- Tailwind CSS (compiled) -->
    <link href="/lead-follow-up/assets/css/tailwind.css?v=<?= filemtime(__DIR__ . '/../assets/css/tailwind.css') ?>" rel="stylesheet">

    <!-- Google Fonts: Inter -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">

    <!-- DataTables CSS -->
    <link rel="stylesheet" href="https://cdn.datatables.net/1.13.7/css/jquery.dataTables.min.css">
    <link rel="stylesheet" href="https://cdn.datatables.net/buttons/2.4.2/css/buttons.dataTables.min.css">
    <link rel="stylesheet" href="https://cdn.datatables.net/responsive/2.5.0/css/responsive.dataTables.min.css">

    <!-- jQuery + DataTables + Extensions -->
    <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
    <script src="https://cdn.datatables.net/1.13.7/js/jquery.dataTables.min.js"></script>
    <script src="https://cdn.datatables.net/buttons/2.4.2/js/dataTables.buttons.min.js"></script>
    <script src="https://cdn.datatables.net/responsive/2.5.0/js/dataTables.responsive.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/pdfmake.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/vfs_fonts.js"></script>
    <script src="https://cdn.datatables.net/buttons/2.4.2/js/buttons.html5.min.js"></script>
    <script src="https://cdn.datatables.net/buttons/2.4.2/js/buttons.print.min.js"></script>

    <!-- Chart.js (single instance) -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>

    <!-- Dark mode: restore preference before render to prevent flash -->
    <script>
    (function(){
        const t = localStorage.getItem('theme');
        if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
        }
    })();
    </script>

    <script>
    // DataTable initializer with responsive + export buttons
    function initTable(selector, opts = {}) {
        const defaults = {
            responsive: true,
            pageLength: 25,
            dom: '<"flex flex-wrap items-center justify-between gap-2 mb-3"Bf>rt<"flex items-center justify-between mt-3"ip>',
            buttons: [
                { extend: 'excelHtml5', className: 'btn-export', text: '⬇ Excel' },
                { extend: 'pdfHtml5',   className: 'btn-export', text: '⬇ PDF'   },
                { extend: 'print',      className: 'btn-export', text: '🖨 Print' },
            ],
            language: {
                search: '',
                searchPlaceholder: 'Search…',
                lengthMenu: 'Show _MENU_',
            }
        };
        return $(selector).DataTable({ ...defaults, ...opts });
    }
    </script>
</head>
<body class="min-h-screen flex text-gray-800 relative">

<!-- Mobile Sidebar Overlay -->
<div id="sidebarOverlay" class="sidebar-overlay hidden lg:hidden" onclick="toggleSidebar()"></div>

<!-- Sidebar -->
<aside id="sidebar"
       class="fixed lg:sticky top-0 left-0 w-[270px] h-screen glass-sidebar flex-shrink-0 flex flex-col shadow-2xl z-40 print:hidden
              -translate-x-full lg:translate-x-0 transition-transform duration-300 ease-in-out">

    <!-- Logo -->
    <div class="px-6 py-5.5 border-b border-slate-900/60 bg-slate-950/20">
        <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-500 to-sec-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
            </div>
            <div>
                <div class="text-white font-extrabold text-sm leading-tight tracking-tight">LeadFlow Pro</div>
                <div class="text-brand-300/50 text-[9px] font-bold uppercase tracking-wider">DSA Finance Panel</div>
            </div>
        </div>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 px-3.5 py-5 space-y-1.5 sidebar-nav overflow-y-auto">
        <div class="text-slate-500 dark:text-slate-500 text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 mt-1 mb-2">Main</div>

        <a href="/lead-follow-up/dashboard.php"
           class="flex items-center gap-3 py-2.5 rounded-xl text-sm <?= nav_active('root','dashboard.php') ?>">
            <svg class="w-[18px] h-[18px] opacity-80" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z"/>
            </svg>
            Dashboard
        </a>

        <a href="/lead-follow-up/leads/index.php"
           class="flex items-center gap-3 py-2.5 rounded-xl text-sm <?= nav_active('leads') ?>">
            <svg class="w-[18px] h-[18px] opacity-80" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
            Leads
        </a>

        <a href="/lead-follow-up/followups/index.php"
           class="flex items-center gap-3 py-2.5 rounded-xl text-sm <?= nav_active('followups') ?>">
            <svg class="w-[18px] h-[18px] opacity-80" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            Follow-ups
        </a>

        <div class="text-slate-500 dark:text-slate-500 text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 mt-6 mb-2">Management</div>

        <a href="/lead-follow-up/agents/index.php"
           class="flex items-center gap-3 py-2.5 rounded-xl text-sm <?= nav_active('agents') ?>">
            <svg class="w-[18px] h-[18px] opacity-80" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            Agents
        </a>

        <a href="/lead-follow-up/dealers/index.php"
           class="flex items-center gap-3 py-2.5 rounded-xl text-sm <?= nav_active('dealers') ?>">
            <svg class="w-[18px] h-[18px] opacity-80" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
            </svg>
            Dealers
        </a>

        <a href="/lead-follow-up/financers/index.php"
           class="flex items-center gap-3 py-2.5 rounded-xl text-sm <?= nav_active('financers') ?>">
            <svg class="w-[18px] h-[18px] opacity-80" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
            </svg>
            Financers
        </a>

        <div class="text-slate-500 dark:text-slate-500 text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 mt-6 mb-2">Finance</div>

        <a href="/lead-follow-up/commissions/index.php"
           class="flex items-center gap-3 py-2.5 rounded-xl text-sm <?= nav_active('commissions') ?>">
            <svg class="w-[18px] h-[18px] opacity-80" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            Commissions
        </a>

        <div class="text-slate-500 dark:text-slate-500 text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 mt-6 mb-2">Reports</div>

        <a href="/lead-follow-up/reports/index.php"
           class="flex items-center gap-3 py-2.5 rounded-xl text-sm <?= nav_active('reports') ?>">
            <svg class="w-[18px] h-[18px] opacity-80" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
            MIS Reports
        </a>
    </nav>

    <!-- User Info -->
    <div class="px-5 py-4 border-t border-slate-900/60 bg-slate-950/40">
        <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-500 to-sec-500 flex items-center justify-center text-white font-extrabold text-sm shadow-md">
                <?= strtoupper(substr($user['name'] ?? 'U', 0, 1)) ?>
            </div>
            <div class="flex-1 min-w-0">
                <div class="text-white text-xs font-semibold truncate"><?= e($user['name'] ?? 'User') ?></div>
                <div class="text-slate-400 text-[10px] capitalize font-medium"><?= e($user['role'] ?? '') ?></div>
            </div>
            <a href="/lead-follow-up/logout.php" class="text-slate-400 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-white/5" title="Logout">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                </svg>
            </a>
        </div>
    </div>
</aside>


<!-- Main Content Area -->
<div class="flex-1 flex flex-col min-h-screen overflow-hidden print:block print:min-h-0 print:overflow-visible lg:ml-0">
    <!-- Top bar -->
    <header class="glass-panel border-b-0 px-4 sm:px-6 py-3.5 flex items-center justify-between flex-shrink-0 z-10 sticky top-0 print:hidden">
        <!-- Left: Hamburger + Title -->
        <div class="flex items-center gap-3">
            <!-- Mobile Hamburger -->
            <button onclick="toggleSidebar()" class="lg:hidden p-2 -ml-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400 transition-colors" aria-label="Toggle sidebar">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
            </button>
            <div>
                <h1 class="text-base sm:text-lg font-bold text-gray-800 dark:text-white"><?= e($pageTitle ?? 'Dashboard') ?></h1>
                <?php if (!empty($pageBreadcrumb)): ?>
                <div class="text-[11px] text-gray-400 dark:text-gray-500"><?= $pageBreadcrumb ?></div>
                <?php endif; ?>
            </div>
        </div>
        <!-- Right: Date + Dark Mode + Actions -->
        <div class="flex items-center gap-2 sm:gap-3">
            <span class="text-xs text-gray-400 dark:text-gray-500 hidden sm:inline"><?= date('D, d M Y') ?></span>

            <!-- Dark Mode Toggle -->
            <button onclick="toggleDarkMode()" class="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-500 transition-colors" aria-label="Toggle dark mode" title="Toggle theme">
                <!-- Sun icon (shown in dark mode) -->
                <svg class="w-4.5 h-4.5 hidden dark:block" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
                </svg>
                <!-- Moon icon (shown in light mode) -->
                <svg class="w-4.5 h-4.5 block dark:hidden" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
                </svg>
            </button>

            <?php if (isset($headerActions)): ?>
                <?= $headerActions ?>
            <?php endif; ?>
        </div>
    </header>

    <!-- Toast Container -->
    <div id="toastContainer" class="toast-container"></div>

    <!-- Flash → Toast bridge -->
    <?php
    $successMsg = get_flash('success');
    $errorMsg   = get_flash('error');
    if ($successMsg || $errorMsg): ?>
    <script>
    document.addEventListener('DOMContentLoaded', function() {
        <?php if ($successMsg): ?>
        showToast('<?= addslashes(e($successMsg)) ?>', 'success');
        <?php endif; ?>
        <?php if ($errorMsg): ?>
        showToast('<?= addslashes(e($errorMsg)) ?>', 'error');
        <?php endif; ?>
    });
    </script>
    <?php endif; ?>

    <!-- Page Content Wrapper -->
    <main class="flex-1 p-4 sm:p-6 overflow-y-auto print:p-0 print:overflow-visible">
