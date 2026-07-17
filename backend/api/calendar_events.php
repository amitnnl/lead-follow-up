<?php
// api/calendar_events.php — Feed for FullCalendar
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';
require_login();

header('Content-Type: application/json');

$start = $_GET['start'] ?? ''; // e.g. 2026-06-01T00:00:00
$end   = $_GET['end']   ?? '';

// Minimal validation
$startDate = $start ? substr($start, 0, 10) : date('Y-m-01');
$endDate   = $end ? substr($end, 0, 10) : date('Y-m-t');

$where = 'lf.next_followup_date >= ? AND lf.next_followup_date <= ?';
$params = [$startDate, $endDate];
$types  = 'ss';

// For executives, agents, and channel agents: only their assigned leads
if (is_executive()) {
    $execRow = db_fetch_one($conn, "SELECT id FROM executives WHERE user_id=?", 'i', [current_user_id()]);
    if ($execRow) {
        $where   .= ' AND l.executive_id = ?';
        $params[] = $execRow['id'];
        $types   .= 'i';
    }
} elseif (is_channel_agent()) {
    $cheRow = db_fetch_one($conn, "SELECT id FROM channel_executives WHERE user_id=?", 'i', [current_user_id()]);
    if ($cheRow) {
        $where   .= ' AND (l.created_by = ? OR l.channel_executive_id = ?)';
        $params[] = current_user_id();
        $params[] = $cheRow['id'];
        $types   .= 'ii';
    }
} elseif (is_agent()) {
    $agentRow = db_fetch_one($conn, "SELECT id FROM agents WHERE user_id=?", 'i', [current_user_id()]);
    if ($agentRow) {
        $where   .= ' AND (l.created_by = ? OR l.agent_id = ?)';
        $params[] = current_user_id();
        $params[] = $agentRow['id'];
        $types   .= 'ii';
    }
}

$followups = db_fetch_all($conn, "
    SELECT lf.id, lf.next_followup_date, lf.remarks, 
           l.lead_id, l.customer_name, l.status
    FROM lead_followups lf
    JOIN leads l ON lf.lead_id = l.id
    WHERE $where AND l.status NOT IN ('disbursed', 'rejected')
", $types, $params);

$events = [];
$today = date('Y-m-d');

foreach ($followups as $fu) {
    $date = $fu['next_followup_date'];
    
    // Determine color based on date
    if ($date < $today) {
        $color = '#ef4444'; // Red (Overdue)
    } elseif ($date === $today) {
        $color = '#f59e0b'; // Amber (Today)
    } else {
        $color = '#3b82f6'; // Blue (Upcoming)
    }

    $events[] = [
        'id'    => $fu['id'],
        'title' => $fu['lead_id'] . ' - ' . $fu['customer_name'],
        'start' => $date,
        'allDay'=> true,
        'color' => $color,
        'url'   => BASE_URL . '/leads/view.php?id=' . urlencode($fu['lead_id']),
        'extendedProps' => [
            'remarks' => $fu['remarks'],
            'status'  => $fu['status']
        ]
    ];
}

echo json_encode($events);
