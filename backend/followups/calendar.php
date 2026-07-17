<?php
// followups/calendar.php — Calendar View
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';
$pageTitle      = 'Follow-ups Calendar';
$pageBreadcrumb = 'Visual schedule of all follow-ups';

$headerActions = '<a href="' . BASE_URL . '/followups/index.php" class="btn btn-secondary btn-sm">
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
    List View
</a>';

require_once __DIR__ . '/../includes/header.php';
?>

<!-- FullCalendar Dependencies -->
<script src="https://cdn.jsdelivr.net/npm/fullcalendar@6.1.15/index.global.min.js"></script>

<style>
/* Modern styling for the calendar */
.fc-theme-standard td, .fc-theme-standard th, .fc-theme-standard .fc-scrollgrid {
    border-color: #e2e8f0;
}
.dark .fc-theme-standard td, .dark .fc-theme-standard th, .dark .fc-theme-standard .fc-scrollgrid {
    border-color: #1e293b;
}
.fc .fc-toolbar-title {
    font-size: 1.25rem;
    font-weight: 800;
    color: #1e293b;
}
.dark .fc .fc-toolbar-title { color: #f8fafc; }
.fc .fc-button-primary {
    background-color: #4f46e5;
    border-color: #4f46e5;
    border-radius: 0.5rem;
    font-weight: 600;
    text-transform: capitalize;
}
.fc .fc-button-primary:hover {
    background-color: #4338ca;
    border-color: #4338ca;
}
.fc .fc-button-primary:not(:disabled).fc-button-active, .fc .fc-button-primary:not(:disabled):active {
    background-color: #3730a3;
    border-color: #3730a3;
}
.fc-event {
    cursor: pointer;
    border: none !important;
    border-radius: 4px;
    padding: 2px 4px;
    font-size: 0.75rem;
    font-weight: 700;
    transition: transform 0.1s ease;
}
.fc-event:hover {
    transform: scale(1.02);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}
.fc-day-today {
    background-color: #f8fafc !important;
}
.dark .fc-day-today {
    background-color: #0f172a !important;
}
.fc-daygrid-day-number {
    font-weight: 700;
    color: #64748b;
}
</style>

<div class="card p-4 sm:p-6 mb-6">
    <div id="calendar"></div>
</div>

<script>
document.addEventListener('DOMContentLoaded', function() {
    var calendarEl = document.getElementById('calendar');
    var calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: window.innerWidth < 768 ? 'listWeek' : 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,listWeek'
        },
        height: 'auto',
        events: '<?= BASE_URL ?>/api/calendar_events.php',
        eventClick: function(info) {
            // Native redirection when event is clicked
            // The URL is already set in the event object
        },
        eventDidMount: function(info) {
            // Add a tooltip showing remarks
            if (info.event.extendedProps.remarks) {
                info.el.title = info.event.extendedProps.remarks;
            }
        }
    });
    calendar.render();
});
</script>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
