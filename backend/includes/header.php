<?php
// includes/header.php
require_once __DIR__ . '/auth.php';
require_login();
$user = current_user();
$currentFile = basename($_SERVER['PHP_SELF']);
$currentDir  = basename(dirname($_SERVER['PHP_SELF']));

function nav_active(string $dir, string $file = ''): string {
    global $currentDir, $currentFile;
    if ($dir === $currentDir) {
        if ($file !== '' && $file !== $currentFile) {
            return 'sidebar-nav-inactive';
        }
        return 'sidebar-nav-active';
    } elseif ($dir === 'root' && $currentFile === $file) {
        return 'sidebar-nav-active';
    }
    return 'sidebar-nav-inactive';
}

// Global App Settings
$APP_NAME = get_setting('app_name', 'LeadFlow Pro');
$APP_COMPANY = get_setting('company_name', 'DSA Finance Panel');
?>
<!DOCTYPE html>
<html lang="en" id="htmlRoot">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= e($pageTitle ?? 'Dashboard') ?> — <?= e($APP_NAME) ?></title>
    <meta name="description" content="Vehicle Finance DSA Management System — manage leads, agents, payouts and follow-ups.">
    <meta name="theme-color" content="#4f46e5">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="LeadFlow">
    <meta name="application-name" content="LeadFlow Pro">

    <!-- Favicon & App Icons -->
    <link rel="icon" type="image/png" href="<?php echo BASE_URL; ?>/uploads/AppLogo.png">
    <link rel="shortcut icon" type="image/png" href="<?php echo BASE_URL; ?>/uploads/AppLogo.png">
    <link rel="apple-touch-icon" href="<?php echo BASE_URL; ?>/uploads/AppLogo.png">
    <link rel="apple-touch-icon" sizes="152x152" href="<?php echo BASE_URL; ?>/uploads/AppLogo.png">
    <link rel="apple-touch-icon" sizes="180x180" href="<?php echo BASE_URL; ?>/uploads/AppLogo.png">
    <link rel="apple-touch-icon" sizes="167x167" href="<?php echo BASE_URL; ?>/uploads/AppLogo.png">

    <!-- PWA Web App Manifest (dynamic — path auto-detected for localhost vs live) -->
    <link rel="manifest" href="<?php echo BASE_URL; ?>/manifest.php">

    <!-- Tailwind CSS (compiled) -->
    <link href="<?php echo BASE_URL; ?>/assets/css/tailwind.css?v=<?= filemtime(__DIR__ . '/../assets/css/tailwind.css') ?>" rel="stylesheet">

    <!-- Google Fonts: Plus Jakarta Sans -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">

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

    <!-- HTMX & NProgress for SPA feel -->
    <script src="https://unpkg.com/htmx.org@1.9.10"></script>
    <script src="https://unpkg.com/nprogress@0.2.0/nprogress.js"></script>
    <link rel="stylesheet" href="https://unpkg.com/nprogress@0.2.0/nprogress.css" />
    <style>
        /* NProgress bar */
        #nprogress .bar { background: #4f46e5 !important; height: 2px !important; }
        #nprogress .peg { box-shadow: 0 0 8px #4f46e5, 0 0 4px #4f46e5 !important; }
        #nprogress .spinner-icon { border-top-color: #4f46e5 !important; border-left-color: #4f46e5 !important; }

        /* Premium Toast CSS */
        #toast-container {
            perspective: 800px;
        }
        .toast-notification {
            display: flex;
            align-items: start;
            gap: 10px;
            padding: 12px 14px;
            border-radius: 10px;
            border: 1px solid rgba(255, 255, 255, 0.08);
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            transition: all 0.2s ease;
            font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .toast-success {
            background-color: rgba(6, 78, 59, 0.9);
            border-color: rgba(16, 185, 129, 0.2);
            color: #ecfdf5;
        }
        .toast-error {
            background-color: rgba(127, 29, 29, 0.9);
            border-color: rgba(239, 68, 68, 0.2);
            color: #fef2f2;
        }
        .toast-warning {
            background-color: rgba(120, 53, 4, 0.9);
            border-color: rgba(245, 158, 11, 0.2);
            color: #fffbeb;
        }
        .toast-info {
            background-color: rgba(15, 23, 42, 0.92);
            border-color: rgba(99, 102, 241, 0.2);
            color: #e0e7ff;
        }
        .toast-animate-in {
            animation: toast-slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .toast-animate-out {
            animation: toast-slide-out 0.25s ease-in forwards;
        }
        @keyframes toast-slide-in {
            from { opacity: 0; transform: translateY(16px) scale(0.97); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes toast-slide-out {
            from { opacity: 1; transform: translateY(0) scale(1); }
            to   { opacity: 0; transform: translateY(-10px) scale(0.97); }
        }

        /* Collapsible Sidebar Styles for Desktop */
        @media (min-width: 1024px) {
            #sidebar {
                transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1), transform 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
            }
            .sidebar-collapsed #sidebar {
                width: 68px !important;
            }
            .sidebar-collapsed #sidebar .sidebar-text,
            .sidebar-collapsed #sidebar .sidebar-subheading {
                display: none !important;
            }
            .sidebar-collapsed #sidebar .sidebar-nav a {
                justify-content: center !important;
                padding-left: 0 !important;
                padding-right: 0 !important;
                width: 40px;
                height: 40px;
                margin-left: auto;
                margin-right: auto;
            }
            .sidebar-collapsed #sidebar .sidebar-nav a span {
                display: none !important;
            }
            .sidebar-collapsed #sidebar .px-5 {
                padding-left: 0.75rem !important;
                padding-right: 0.75rem !important;
                justify-content: center !important;
            }
            .sidebar-collapsed #sidebar .sidebar-logo-text {
                display: none !important;
            }
            .sidebar-collapsed #sidebar .sidebar-user-info {
                display: none !important;
            }
        }
    </style>
    <script>
        // Silence browser extension warnings
        window.addEventListener('unhandledrejection', function(event) {
            const reason = event.reason;
            if (reason && reason.message) {
                const msg = reason.message;
                if (msg.includes('Could not establish connection') || 
                    msg.includes('message channel closed') || 
                    msg.includes('Receiving end does not exist')) {
                    event.preventDefault();
                }
            }
        });

        // Global Toast Notification System
        function showToast(message, type = 'info') {
            let container = document.getElementById('toast-container');
            if (!container) {
                container = document.createElement('div');
                container.id = 'toast-container';
                container.className = 'fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full px-4 sm:px-0';
                document.body.appendChild(container);
            }

            const toast = document.createElement('div');
            toast.className = 'toast-notification toast-animate-in toast-' + type;

            const icons = {
                success: `<svg class="w-4.5 h-4.5 flex-shrink-0" style="color: #34d399;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
                error: `<svg class="w-4.5 h-4.5 flex-shrink-0" style="color: #f87171;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
                warning: `<svg class="w-4.5 h-4.5 flex-shrink-0" style="color: #fbbf24;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`,
                info: `<svg class="w-4.5 h-4.5 flex-shrink-0" style="color: #818cf8;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`
            };

            toast.innerHTML = `
                ${icons[type] || icons.info}
                <div class="flex-1 text-xs font-medium leading-relaxed">${message}</div>
                <button class="opacity-50 hover:opacity-100 transition-opacity flex-shrink-0 focus:outline-none" style="background:none; border:none; padding:0; cursor:pointer;" onclick="closeToast(this.parentElement)">
                    <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            `;

            container.appendChild(toast);
            setTimeout(() => closeToast(toast), 4500);
        }

        function closeToast(toastElement) {
            if (!toastElement) return;
            toastElement.classList.remove('toast-animate-in');
            toastElement.classList.add('toast-animate-out');
            setTimeout(() => toastElement.remove(), 250);
        }

        // HTMX Events
        document.addEventListener('htmx:beforeRequest', () => NProgress.start());
        document.addEventListener('htmx:afterOnLoad', () => NProgress.done());
        document.addEventListener('htmx:responseError', function(evt) {
            NProgress.done();
            showToast(`Request failed (${evt.detail.xhr.status})`, 'error');
        });
        document.addEventListener('htmx:sendError', function() {
            NProgress.done();
            showToast("Connection issue. Check your network.", "warning");
        });
        document.addEventListener('htmx:beforeSwap', function(evt) {
            if (evt.detail.xhr && evt.detail.xhr.status === 0) {
                evt.detail.shouldSwap = false;
                return;
            }
            if (window.jQuery && $.fn.dataTable) {
                $('.dataTable').each(function() {
                    if ($.fn.DataTable.isDataTable(this)) {
                        $(this).DataTable().destroy();
                    }
                });
            }
        });
        document.addEventListener('click', function(e) {
            const searchContainer = document.getElementById('search-results');
            if (searchContainer && !e.target.closest('.relative.z-50')) {
                searchContainer.classList.add('hidden');
            }
        });
    </script>

    <!-- Restore visual preferences before paint -->
    <script>
    (function(){
        const t = localStorage.getItem('theme');
        if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
        }
        if (localStorage.getItem('sidebar-collapsed') === 'true') {
            document.documentElement.classList.add('sidebar-collapsed');
        }
    })();
    </script>

    <script>
    // DataTable initializer
    function initTable(selector, opts = {}) {
        const defaults = {
            responsive: true,
            pageLength: 25,
            dom: '<"flex flex-wrap items-center justify-between gap-2 mb-3 px-5"Bf>rt<"flex flex-wrap items-center justify-between mt-3 px-5 pb-3"ip>',
            buttons: [
                { extend: 'excelHtml5', className: 'btn-export', text: '⬇ Excel' },
                { extend: 'pdfHtml5',   className: 'btn-export', text: '⬇ PDF'   },
                { extend: 'print',      className: 'btn-export', text: '🖨 Print' },
            ],
            language: {
                search: '',
                searchPlaceholder: 'Filter records…',
                lengthMenu: 'Show _MENU_',
            }
        };
        return $(selector).DataTable({ ...defaults, ...opts });
    }
    </script>
</head>
<body class="min-h-screen flex text-slate-700 dark:text-slate-300 relative" hx-boost="true">

<!-- Mobile Sidebar Overlay -->
<div id="sidebarOverlay" class="sidebar-overlay hidden lg:hidden" onclick="toggleSidebar()"></div>

<!-- ═══════════════════════════════════════════
     SIDEBAR — CRM Command Center
     ═══════════════════════════════════════════ -->
<aside id="sidebar"
       class="fixed lg:sticky top-0 left-0 w-[250px] h-screen lg:h-screen glass-sidebar flex-shrink-0 flex flex-col z-40 print:hidden overflow-hidden
              -translate-x-full lg:translate-x-0 transition-transform duration-250 ease-in-out">

    <!-- Logo -->
    <div class="px-5 py-4 border-b border-slate-800/60 flex items-center justify-between">
        <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 bg-white/10 backdrop-blur">
                <img src="<?= BASE_URL ?>/uploads/AppLogo.png" alt="App Logo" class="w-full h-full object-contain p-0.5">
            </div>
            <div class="sidebar-logo-text">
                <div class="text-white font-bold text-sm leading-tight"><?= e($APP_NAME) ?></div>
                <div class="text-slate-500 text-[9px] font-medium uppercase tracking-wider"><?= e($APP_COMPANY) ?></div>
            </div>
        </div>
        <!-- Close Button (Mobile Only) -->
        <button onclick="toggleSidebar()" class="lg:hidden p-1 rounded-md text-slate-500 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer" aria-label="Close sidebar">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
        </button>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 px-3 py-4 space-y-0.5 sidebar-nav overflow-y-auto scrollbar-none">
        <div class="sidebar-subheading text-slate-600 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 mb-1">Overview</div>

        <a href="<?php echo BASE_URL; ?>/dashboard.php"
           class="flex items-center gap-2.5 px-2.5 py-2 text-[13px] <?= nav_active('root','dashboard.php') ?>">
            <svg class="w-4 h-4 opacity-70 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z"/>
            </svg>
            <span>Dashboard</span>
        </a>

        <div class="sidebar-subheading text-slate-600 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 mt-5 mb-1">Leads</div>

        <?php 
        $isAssignedUrl = isset($_GET['assigned']) && $_GET['assigned'] == '1'; 
        $isDisbursedUrl = isset($_GET['status']) && $_GET['status'] === 'disbursed';
        ?>
        <a href="<?php echo BASE_URL; ?>/leads/index.php"
           class="flex items-center gap-2.5 px-2.5 py-2 text-[13px] <?= (nav_active('leads') === 'sidebar-nav-active' && !$isAssignedUrl && !$isDisbursedUrl && $currentFile !== 'assign.php') ? 'sidebar-nav-active' : 'sidebar-nav-inactive' ?>">
            <svg class="w-4 h-4 opacity-70 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
            <span>All Leads</span>
        </a>

        <a href="<?php echo BASE_URL; ?>/leads/index.php?assigned=1"
           class="flex items-center gap-2.5 px-2.5 py-2 text-[13px] <?= ($isAssignedUrl || $currentFile === 'assign.php') ? 'sidebar-nav-active' : 'sidebar-nav-inactive' ?>">
            <svg class="w-4 h-4 opacity-70 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            <span>Assigned</span>
        </a>

        <a href="<?php echo BASE_URL; ?>/followups/index.php"
           class="flex items-center gap-2.5 px-2.5 py-2 text-[13px] <?= nav_active('followups') ?>">
            <svg class="w-4 h-4 opacity-70 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            <span>Follow-ups</span>
        </a>

        <a href="<?php echo BASE_URL; ?>/leads/index.php?status=disbursed"
           class="flex items-center gap-2.5 px-2.5 py-2 text-[13px] <?= ($isDisbursedUrl) ? 'sidebar-nav-active' : 'sidebar-nav-inactive' ?>">
            <svg class="w-4 h-4 opacity-70 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span>Disbursed</span>
        </a>

        <?php if (!is_executive() && !is_rto_desk() && !is_insurance_desk()): ?>
        <div class="sidebar-subheading text-slate-600 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 mt-5 mb-1">Network</div>

        <a href="<?php echo BASE_URL; ?>/financers/index.php"
           class="flex items-center gap-2.5 px-2.5 py-2 text-[13px] <?= nav_active('financers') ?>">
            <svg class="w-4 h-4 opacity-70 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
            </svg>
            <span>Finance/Banks</span>
        </a>

        <a href="<?php echo BASE_URL; ?>/executives/index.php"
           class="flex items-center gap-2.5 px-2.5 py-2 text-[13px] <?= nav_active('executives') ?>">
            <svg class="w-4 h-4 opacity-70 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            <span>Agents/SFEs</span>
        </a>
        <?php endif; ?>

        <?php if (!is_executive()): ?>
        <div class="sidebar-subheading text-slate-600 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 mt-5 mb-1">Finance</div>

        <a href="<?php echo BASE_URL; ?>/banking/index.php"
           class="flex items-center gap-2.5 px-2.5 py-2 text-[13px] <?= nav_active('banking', 'index.php') ?>">
            <svg class="w-4 h-4 opacity-70 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span>Banking</span>
        </a>

        <a href="<?php echo BASE_URL; ?>/banking/ledger.php"
           class="flex items-center gap-2.5 px-2.5 py-2 text-[13px] <?= nav_active('banking', 'ledger.php') ?>">
            <svg class="w-4 h-4 opacity-70 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
            </svg>
            <span>Ledger</span>
        </a>

        <a href="<?php echo BASE_URL; ?>/commissions/index.php"
           class="flex items-center gap-2.5 px-2.5 py-2 text-[13px] <?= nav_active('commissions') ?>">
            <svg class="w-4 h-4 opacity-70 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span>Payouts</span>
        </a>
        <?php endif; ?>

        <div class="sidebar-subheading text-slate-600 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 mt-5 mb-1">System</div>

        <?php if (!is_executive()): ?>
        <a href="<?php echo BASE_URL; ?>/reports/index.php"
           class="flex items-center gap-2.5 px-2.5 py-2 text-[13px] <?= nav_active('reports') ?>">
            <svg class="w-4 h-4 opacity-70 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
            <span>Reports</span>
        </a>
        <?php endif; ?>

        <?php if (is_admin()): ?>
        <a href="<?php echo BASE_URL; ?>/users/index.php"
           class="flex items-center gap-2.5 px-2.5 py-2 text-[13px] <?= nav_active('users') ?>">
            <svg class="w-4 h-4 opacity-70 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span>Users</span>
        </a>
        <?php endif; ?>
        
        <a href="<?php echo BASE_URL; ?>/settings.php" class="flex items-center gap-2.5 px-2.5 py-2 text-[13px] <?= nav_active('settings') ?>">
            <svg class="w-4 h-4 opacity-70 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            <span>Settings</span>
        </a>
    </nav>

    <!-- Sidebar Footer: User -->
    <div class="px-3 py-3 border-t border-slate-800/60">
        <div class="flex items-center gap-2.5 px-2">
            <div class="w-7 h-7 rounded-md bg-brand-600 flex items-center justify-center text-white font-bold text-[11px] flex-shrink-0">
                <?= strtoupper(substr($user['name'] ?? 'U', 0, 1)) ?>
            </div>
            <div class="sidebar-user-info min-w-0 flex-1">
                <div class="text-[12px] font-semibold text-slate-200 truncate"><?= e($user['name'] ?? 'User') ?></div>
                <div class="text-[10px] text-slate-500 capitalize"><?= e($user['role'] ?? '') ?></div>
            </div>
            <a href="<?php echo BASE_URL; ?>/logout.php" hx-boost="false" class="text-slate-600 hover:text-red-400 p-1 transition-colors" title="Logout">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            </a>
        </div>
    </div>
</aside>


<!-- ═══════════════════════════════════════════
     MAIN CONTENT AREA
     ═══════════════════════════════════════════ -->
<div class="flex-1 flex flex-col min-w-0 print:block print:min-h-0">
    <!-- Top Bar -->
    <header class="glass-panel border-b border-slate-200/60 dark:border-slate-800/60 px-4 sm:px-5 py-2.5 flex items-center justify-between flex-shrink-0 z-10 sticky top-0 print:hidden">
        <!-- Left: Hamburger + Breadcrumb + Search -->
        <div class="flex items-center gap-3">
            <!-- Toggle Hamburger -->
            <button onclick="toggleSidebar()" class="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer" aria-label="Toggle sidebar">
                <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>
            </button>
            
            <!-- Page Title + Breadcrumb -->
            <div>
                <h1 class="text-sm font-semibold text-slate-800 dark:text-white leading-tight"><?= e($pageTitle ?? 'Dashboard') ?></h1>
                <?php if (!empty($pageBreadcrumb)): ?>
                <div class="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5"><?= $pageBreadcrumb ?></div>
                <?php endif; ?>
            </div>
            
            <!-- Global Search -->
            <div class="hidden lg:flex items-center bg-slate-100/80 dark:bg-slate-800/50 rounded-lg px-2.5 py-1.5 ml-3 relative z-50 border border-slate-200/50 dark:border-slate-700/50">
                <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                <input type="text" 
                       name="q"
                       placeholder="Search leads, RC, mobile, agents..." 
                       class="bg-transparent border-none outline-none text-sm ml-2 w-56 dark:text-white placeholder-slate-400 focus:ring-0"
                       hx-get="<?= BASE_URL ?>/api/search.php" 
                       hx-trigger="keyup changed delay:300ms, search" 
                       hx-target="#search-results" 
                       hx-indicator=".search-indicator"
                       autocomplete="off"
                       onclick="document.getElementById('search-results').classList.remove('hidden')">
                <svg class="search-indicator htmx-indicator w-3.5 h-3.5 text-brand-500 animate-spin ml-2 absolute right-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <div id="search-results" class="absolute top-full left-0 mt-1.5 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl hidden max-h-[60vh] overflow-y-auto z-50"></div>
                <script>
                    document.addEventListener('click', function(event) {
                        const searchContainer = document.getElementById('search-results').parentElement;
                        if (!searchContainer.contains(event.target)) {
                            document.getElementById('search-results').classList.add('hidden');
                        }
                    });
                </script>
            </div>
        </div>

        <!-- Right: Actions + Controls -->
        <div class="flex items-center gap-1.5">
            <?php if (!empty($headerActions)): ?>
                <?= $headerActions ?>
            <?php else: ?>
                <?php if (!is_executive()): ?>
                <a href="<?= BASE_URL ?>/leads/create.php" class="hidden sm:inline-flex btn-primary py-1.5 px-3 text-xs rounded-md gap-1 items-center">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
                    New Lead
                </a>
                <?php endif; ?>
            <?php endif; ?>

            <!-- Notifications -->
            <div class="relative" id="notificationDropdownContainer">
                <button onclick="toggleNotifications()" class="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative focus:outline-none">
                    <span id="notifBadge" class="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full hidden"></span>
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                </button>
                <div id="notifPanel" class="absolute right-0 mt-1.5 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl hidden z-50 overflow-hidden">
                    <div class="p-2.5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                        <h3 class="font-semibold text-slate-800 dark:text-white text-xs">Notifications</h3>
                        <button onclick="markAllNotificationsRead()" class="text-[10px] font-semibold text-brand-600 hover:text-brand-800 dark:text-brand-400">Mark all read</button>
                    </div>
                    <div id="notifList" class="max-h-72 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800/50">
                    </div>
                </div>
            </div>

            <!-- Dark Mode Toggle -->
            <button onclick="toggleDarkMode()" class="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" aria-label="Toggle dark mode">
                <svg class="w-4 h-4 hidden dark:block" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
                </svg>
                <svg class="w-4 h-4 block dark:hidden" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
                </svg>
            </button>
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

    <!-- Notification Logic -->
    <script>
        function toggleNotifications() {
            const panel = document.getElementById('notifPanel');
            panel.classList.toggle('hidden');
            if (!panel.classList.contains('hidden')) {
                fetchNotifications();
            }
        }
        
        function fetchNotifications() {
            fetch('<?= BASE_URL ?>/api/notifications.php?action=fetch')
                .then(r => r.json())
                .then(data => {
                    if (data.success) {
                        const badge = document.getElementById('notifBadge');
                        badge.classList.toggle('hidden', data.unread_count <= 0);
                        
                        const list = document.getElementById('notifList');
                        list.innerHTML = '';
                        if (data.notifications.length === 0) {
                            list.innerHTML = '<div class="p-5 text-center text-xs text-slate-400">No notifications.</div>';
                            return;
                        }
                        
                        data.notifications.forEach(n => {
                            const isReadClass = n.is_read == 1 ? 'opacity-50' : 'bg-brand-50/20 dark:bg-brand-900/10';
                            const linkTag = n.link ? `<a href="${n.link}" class="block p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${isReadClass}" onclick="markNotificationRead(${n.id})">` : `<div class="p-2.5 ${isReadClass}">`;
                            const closeTag = n.link ? '</a>' : '</div>';
                            const dateObj = new Date(n.created_at);
                            const timeStr = dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                            
                            list.innerHTML += `
                                ${linkTag}
                                    <div class="text-xs text-slate-700 dark:text-slate-200">${n.message}</div>
                                    <div class="text-[10px] text-slate-400 mt-0.5">${timeStr}</div>
                                ${closeTag}
                            `;
                        });
                    }
                });
        }
        
        function markNotificationRead(id) {
            const fd = new FormData();
            fd.append('action', 'mark_read');
            fd.append('id', id);
            fetch('<?= BASE_URL ?>/api/notifications.php', { method: 'POST', body: fd });
        }
        
        function markAllNotificationsRead() {
            const fd = new FormData();
            fd.append('action', 'mark_read');
            fetch('<?= BASE_URL ?>/api/notifications.php', { method: 'POST', body: fd }).then(() => fetchNotifications());
        }
        
        setInterval(fetchNotifications, 60000);
        document.addEventListener('DOMContentLoaded', fetchNotifications);
        
        document.addEventListener('click', function(e) {
            const container = document.getElementById('notificationDropdownContainer');
            if (container && !container.contains(e.target)) {
                document.getElementById('notifPanel').classList.add('hidden');
            }
        });
    </script>

    <!-- Page Content Wrapper -->
    <main class="flex-1 p-4 sm:p-5 print:p-0">
