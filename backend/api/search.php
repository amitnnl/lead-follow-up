<?php
// api/search.php — HTMX Global Search Endpoint
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';
require_login();

$q = trim($_GET['q'] ?? '');
if (strlen($q) < 2) {
    echo '';
    exit;
}

$qStr = '%' . $q . '%';
$html = '';

// 1. Search Leads with strict role scoping
$whereParts = ["(lead_id LIKE ? OR customer_name LIKE ? OR rc_number LIKE ? OR customer_mobile LIKE ?)"];
$params = [$qStr, $qStr, $qStr, $qStr];
$types = "ssss";

if (is_executive()) {
    $execRow = db_fetch_one($conn, "SELECT id FROM executives WHERE user_id = ?", 'i', [current_user_id()]);
    $whereParts[] = "executive_id = ?";
    $params[] = $execRow['id'] ?? 0;
    $types .= "i";
} elseif (is_channel_agent()) {
    $cheRow = db_fetch_one($conn, "SELECT id FROM channel_executives WHERE user_id = ?", 'i', [current_user_id()]);
    $whereParts[] = "(created_by = ? OR channel_executive_id = ?)";
    $params[] = current_user_id();
    $params[] = $cheRow['id'] ?? 0;
    $types .= "ii";
} elseif (is_agent()) {
    $agRow = db_fetch_one($conn, "SELECT id FROM agents WHERE user_id = ?", 'i', [current_user_id()]);
    $whereParts[] = "(created_by = ? OR agent_id = ?)";
    $params[] = current_user_id();
    $params[] = $agRow['id'] ?? 0;
    $types .= "ii";
}

$whereSql = implode(' AND ', $whereParts);
$l_res = db_fetch_all($conn, "
    SELECT id, lead_id, customer_name, rc_number, customer_mobile, status 
    FROM leads 
    WHERE $whereSql
    LIMIT 3
", $types, $params);

if (!empty($l_res)) {
    $html .= '<div class="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 dark:bg-slate-800/50">Leads</div>';
    foreach ($l_res as $l) {
        $url = BASE_URL . '/leads/view.php?id=' . urlencode($l['lead_id']);
        $html .= '<a href="'.$url.'" class="block px-4 py-2.5 hover:bg-brand-50 dark:hover:bg-brand-900/20 border-b border-slate-50 dark:border-slate-800 last:border-0 transition-colors">';
        $html .= '<div class="font-medium text-slate-800 dark:text-slate-200">' . e($l['customer_name']) . ' <span class="text-xs text-brand-600 dark:text-brand-400 ml-1">(' . e($l['lead_id']) . ')</span></div>';
        $html .= '<div class="text-xs text-slate-500 mt-0.5">' . e($l['customer_mobile'] ?: 'No Phone') . ' &bull; ' . e($l['rc_number'] ?: 'No RC') . '</div>';
        $html .= '</a>';
    }
}

// 2. Search Agents (Only for Admin, Staff, Manager)
if (is_admin() || is_staff() || is_manager()) {
    $a_res = db_fetch_all($conn, "
        SELECT id, name, mobile, city 
        FROM agents 
        WHERE name LIKE ? OR mobile LIKE ?
        LIMIT 3
    ", 'ss', [$qStr, $qStr]);

    if (!empty($a_res)) {
        $html .= '<div class="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 dark:bg-slate-800/50 mt-1 border-t border-slate-100 dark:border-slate-800">Channels</div>';
        foreach ($a_res as $a) {
            $url = BASE_URL . '/agents/view.php?id=' . $a['id'];
            $html .= '<a href="'.$url.'" class="block px-4 py-2 hover:bg-brand-50 dark:hover:bg-brand-900/20">';
            $html .= '<div class="font-medium text-slate-800 dark:text-slate-200">' . e($a['name']) . '</div>';
            $html .= '<div class="text-xs text-slate-500 mt-0.5">' . e($a['mobile'] ?: 'No Phone') . ' &bull; ' . e($a['city'] ?: 'No City') . '</div>';
            $html .= '</a>';
        }
    }
}

if (empty($html)) {
    echo '<div class="p-4 text-center text-sm text-slate-500">No results found for "' . e($q) . '"</div>';
} else {
    echo $html;
}
