<!-- ═══════════════════════════════════════════════════════════════════════════
     LEADFLOW PRO — FILTER BAR IMPLEMENTATION GUIDE
     How to Use the Premium Filter Component in Your PHP Pages
     ═══════════════════════════════════════════════════════════════════════════ -->

# Filter Bar Component — Implementation Guide

## Quick Start

### 1. Include the Filter Component

```php
<?php
include 'includes/filter-bar.php';
?>
```

### 2. Define Your Filters

```php
<?php
// Define filter configuration
$filters = [
    'channel' => [
        'label'   => 'Channel',
        'icon'    => '🔗',
        'options' => ['All Channels', 'Freehold', 'Partner']
    ],
    'dealer' => [
        'label'   => 'Dealer (Partner)',
        'icon'    => '🏪',
        'options' => ['All Dealers', 'ABC Motors', 'XYZ Auto', 'Prime Vehicles']
    ],
    'financer' => [
        'label'   => 'Financer',
        'icon'    => '🏦',
        'options' => ['All Financers', 'HDFC Bank', 'ICICI Bank', 'Bajaj Finance']
    ],
    'executive' => [
        'label'   => 'Executive',
        'icon'    => '👔',
        'options' => ['All Executives', 'Rajesh Kumar', 'Priya Sharma', 'Vikram Singh']
    ],
    'loantype' => [
        'label'   => 'Loan Type',
        'icon'    => '💰',
        'options' => ['All Loan Types', 'New', 'Used', 'Commercial']
    ]
];

// Get current filter values (from URL or defaults)
$current_values = [
    'channel'    => $_GET['channel'] ?? 'All Channels',
    'dealer'     => $_GET['dealer'] ?? 'All Dealers',
    'financer'   => $_GET['financer'] ?? 'All Financers',
    'executive'  => $_GET['executive'] ?? 'All Executives',
    'loantype'   => $_GET['loantype'] ?? 'All Loan Types'
];
?>
```

### 3. Render the Filter Bar

```php
<!-- In your PHP/HTML page -->
<?php renderFilterBar($filters, $current_values); ?>
```

---

## Complete Example (PHP Page)

### leads/index.php

```php
<?php
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/filter-bar.php';

$pageTitle = 'Leads';

// Define filters
$filters = [
    'channel' => [
        'label'   => 'Channel',
        'icon'    => '🔗',
        'options' => ['All Channels', 'Freehold', 'Partner']
    ],
    'dealer' => [
        'label'   => 'Dealer',
        'icon'    => '🏪',
        'options' => ['All Dealers', 'ABC Motors', 'XYZ Auto']
    ],
    'financer' => [
        'label'   => 'Financer',
        'icon'    => '🏦',
        'options' => ['All Financers', 'HDFC Bank', 'ICICI Bank']
    ],
    'executive' => [
        'label'   => 'Executive',
        'icon'    => '👔',
        'options' => ['All Executives', 'Rajesh Kumar', 'Priya Sharma']
    ],
    'loantype' => [
        'label'   => 'Loan Type',
        'icon'    => '💰',
        'options' => ['All Loan Types', 'New', 'Used']
    ]
];

// Get current filter values
$current_values = [
    'channel'    => $_GET['channel'] ?? 'All Channels',
    'dealer'     => $_GET['dealer'] ?? 'All Dealers',
    'financer'   => $_GET['financer'] ?? 'All Financers',
    'executive'  => $_GET['executive'] ?? 'All Executives',
    'loantype'   => $_GET['loantype'] ?? 'All Loan Types'
];

// Build query based on filters
$where_conditions = [];
$params = [];
$types = '';

if ($current_values['channel'] !== 'All Channels') {
    $where_conditions[] = "channel = ?";
    $params[] = $current_values['channel'];
    $types .= 's';
}

if ($current_values['dealer'] !== 'All Dealers') {
    $where_conditions[] = "dealer = ?";
    $params[] = $current_values['dealer'];
    $types .= 's';
}

if ($current_values['financer'] !== 'All Financers') {
    $where_conditions[] = "financer = ?";
    $params[] = $current_values['financer'];
    $types .= 's';
}

if ($current_values['executive'] !== 'All Executives') {
    $where_conditions[] = "executive = ?";
    $params[] = $current_values['executive'];
    $types .= 's';
}

if ($current_values['loantype'] !== 'All Loan Types') {
    $where_conditions[] = "loan_type = ?";
    $params[] = $current_values['loantype'];
    $types .= 's';
}

// Build final query
$where = count($where_conditions) > 0 ? " WHERE " . implode(" AND ", $where_conditions) : "";
$query = "SELECT * FROM leads" . $where . " ORDER BY created_at DESC";

// Execute query
$leads = db_fetch_all($conn, $query, $types, $params);
?>

<?php include __DIR__ . '/../includes/header.php'; ?>

<div class="container-fluid py-6">
    <div class="max-w-7xl mx-auto">
        
        <!-- Page Header -->
        <div class="mb-6">
            <h1 class="heading-page mb-2">Leads Management</h1>
            <p class="text-muted">View and manage all leads</p>
        </div>

        <!-- Render Filter Bar -->
        <div class="mb-6">
            <?php renderFilterBar($filters, $current_values); ?>
        </div>

        <!-- Results Info -->
        <div class="mb-4 flex items-center justify-between">
            <p class="text-sm text-muted">
                Showing <strong><?php echo count($leads); ?></strong> leads
            </p>
            <div class="flex items-center gap-2">
                <button class="btn-ghost btn-sm">📊 Export</button>
                <a href="?channel=All Channels&dealer=All Dealers" class="btn-ghost btn-sm">
                    ✕ Clear Filters
                </a>
            </div>
        </div>

        <!-- Leads Table -->
        <div class="card">
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Lead ID</th>
                            <th>Customer</th>
                            <th>Vehicle</th>
                            <th>Amount</th>
                            <th>Channel</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($leads as $lead): ?>
                        <tr class="table-row-action">
                            <td><code class="text-xs bg-neutral-100 px-2 py-1 rounded">#<?php echo $lead['id']; ?></code></td>
                            <td>
                                <p class="font-medium"><?php echo htmlspecialchars($lead['customer_name']); ?></p>
                            </td>
                            <td><?php echo htmlspecialchars($lead['vehicle']); ?></td>
                            <td><strong><?php echo $lead['amount']; ?></strong></td>
                            <td><?php echo htmlspecialchars($lead['channel']); ?></td>
                            <td>
                                <span class="badge-<?php echo strtolower(str_replace(' ', '-', $lead['status'])); ?>">
                                    <?php echo ucfirst($lead['status']); ?>
                                </span>
                            </td>
                            <td>
                                <a href="view.php?id=<?php echo $lead['id']; ?>" class="btn-ghost btn-sm">
                                    View
                                </a>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>

    </div>
</div>

<?php include __DIR__ . '/../includes/footer.php'; ?>
```

---

## Listening to Filter Changes (JavaScript)

If you want to trigger actions when filters change:

```javascript
// Listen for filter changes
document.addEventListener('filterChanged', (e) => {
    const { filterId, value } = e.detail;
    console.log(`Filter ${filterId} changed to: ${value}`);
    
    // Redirect to new URL with filter
    // Or load data via AJAX
});
```

---

## Compact Mode (For Smaller Spaces)

Use compact mode when space is limited:

```php
<?php renderFilterBar($filters, $current_values, true); // true = compact mode ?>
```

This shows only icons and values, hiding the labels.

---

## Database Query Integration

### Example: Build Dynamic Query from Filters

```php
<?php
// Get filter values
$channel = $_GET['channel'] ?? null;
$dealer = $_GET['dealer'] ?? null;
$financer = $_GET['financer'] ?? null;
$executive = $_GET['executive'] ?? null;
$loantype = $_GET['loantype'] ?? null;

// Build query conditions
$conditions = [];
$params = [];
$types = '';

if ($channel && $channel !== 'All Channels') {
    $conditions[] = "channel = ?";
    $params[] = $channel;
    $types .= 's';
}

if ($dealer && $dealer !== 'All Dealers') {
    $conditions[] = "dealer_id = (SELECT id FROM dealers WHERE name = ?)";
    $params[] = $dealer;
    $types .= 's';
}

if ($financer && $financer !== 'All Financers') {
    $conditions[] = "financer_id = (SELECT id FROM financers WHERE name = ?)";
    $params[] = $financer;
    $types .= 's';
}

if ($executive && $executive !== 'All Executives') {
    $conditions[] = "executive_id = (SELECT id FROM executives WHERE name = ?)";
    $params[] = $executive;
    $types .= 's';
}

if ($loantype && $loantype !== 'All Loan Types') {
    $conditions[] = "loan_type = ?";
    $params[] = $loantype;
    $types .= 's';
}

// Build final query
$where = count($conditions) > 0 ? " WHERE " . implode(" AND ", $conditions) : "";
$query = "SELECT * FROM leads" . $where . " ORDER BY created_at DESC";

// Execute
$leads = db_fetch_all($conn, $query, $types, $params);
?>
```

---

## Styling & Customization

### CSS Classes Available

```css
.filter-bar              /* Main filter container */
.filter-bar-compact      /* Compact version */
.filter-item             /* Individual filter */
.filter-button           /* Dropdown button */
.filter-icon             /* Icon element */
.filter-label            /* Label text */
.filter-value            /* Current value */
.filter-arrow            /* Dropdown arrow */
.filter-dropdown         /* Dropdown menu */
.filter-dropdown-item    /* Dropdown item */
.filter-divider          /* Separator between filters */
```

### Custom Styling Example

```php
<!-- Add custom CSS class to filter bar -->
<div class="filter-bar custom-filter-bar">
    <!-- Filters -->
</div>

<!-- Add custom CSS -->
<style>
.custom-filter-bar {
    background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
    border: 2px solid #10b981;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15);
}
</style>
```

---

## Mobile Responsive

The filter bar is automatically responsive:

- **Desktop**: All filters in single row with labels
- **Tablet**: Scrollable row, labels visible
- **Mobile**: Wraps to multiple rows, auto-adjusts

No additional code needed!

---

## Accessibility Features

✅ Keyboard navigation (Tab to focus)
✅ Arrow keys to navigate dropdown
✅ Enter/Space to select
✅ Proper ARIA labels
✅ Screen reader support
✅ Focus visible states

---

## Examples

### Example 1: Dashboard with Filters

```php
<?php renderFilterBar($filters, $current_values); ?>

<!-- Shows KPI cards filtered by selections -->
<div class="kpi-grid">
    <!-- KPI cards -->
</div>
```

### Example 2: Reports with Filters

```php
<?php renderFilterBar($filters, $current_values, true); // Compact mode ?>

<!-- Shows charts/reports filtered -->
<div class="chart-container">
    <!-- Chart -->
</div>
```

### Example 3: Data Export with Filters

```php
<?php renderFilterBar($filters, $current_values); ?>

<button class="btn-primary">
    📥 Export Filtered Data (<?php echo count($leads); ?> records)
</button>
```

---

## Troubleshooting

### Filters Not Working?
1. Ensure `includes/filter-bar.php` is included
2. Check filter keys match your HTML IDs
3. Verify database column names in query

### Styling Issues?
1. Make sure `styles/filters.css` is imported
2. Check for CSS conflicts
3. Rebuild Tailwind: `npm run build`

### Dropdown Not Showing?
1. Check console for JavaScript errors
2. Verify dropdown div IDs match button data attributes
3. Check z-index isn't hidden by other elements

---

## Reference

- **Component File**: `includes/filter-bar.php`
- **CSS File**: `styles/filters.css`
- **Template**: `styles/filters-template.html`
- **Design System**: `styles/design-system.css`

---

**Ready to implement! Copy the examples and customize for your needs.** 🚀
