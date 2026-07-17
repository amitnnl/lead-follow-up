<?php
/**
 * LeadFlow Pro — Premium Filter Bar Component
 * 
 * Usage:
 * include 'includes/filter-bar.php';
 * renderFilterBar($filters, $current_values);
 * 
 * Example:
 * $filters = [
 *   'channel' => ['label' => 'Channel', 'icon' => '🔗', 'options' => ['All Channels', 'Freehold', 'Partner']],
 *   'dealer' => ['label' => 'Dealer', 'icon' => '🏪', 'options' => ['All Dealers', 'ABC Motors']],
 * ];
 * 
 * $current_values = [
 *   'channel' => 'All Channels',
 *   'dealer' => 'All Dealers',
 * ];
 */

/**
 * Render the filter bar component
 * 
 * @param array $filters Filter configuration
 * @param array $current_values Current filter values
 * @param bool $compact Use compact mode (icons + values only)
 */
function renderFilterBar($filters, $current_values = [], $compact = false) {
    $class = $compact ? 'filter-bar-compact' : 'filter-bar';
    ?>
    <div class="<?php echo $class; ?>">
        <?php
        $first = true;
        foreach ($filters as $key => $filter):
            if (!$first):
                ?>
                <div class="filter-divider"></div>
                <?php
            endif;
            $first = false;

            $current_value = $current_values[$key] ?? ($filter['options'][0] ?? 'All');
            ?>
            <div class="filter-item">
                <div class="filter-icon"><?php echo $filter['icon']; ?></div>
                <div class="relative">
                    <button 
                        class="filter-button" 
                        onclick="toggleFilterDropdown(event, '<?php echo $key; ?>')"
                        data-filter-key="<?php echo $key; ?>"
                    >
                        <?php if (!$compact): ?>
                            <span class="filter-label"><?php echo htmlspecialchars($filter['label']); ?></span>
                        <?php endif; ?>
                        <span class="filter-value" data-current-value="<?php echo htmlspecialchars($current_value); ?>">
                            <?php echo htmlspecialchars($current_value); ?>
                        </span>
                        <svg class="filter-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
                        </svg>
                    </button>

                    <div class="filter-dropdown" id="<?php echo $key; ?>-dropdown">
                        <?php foreach ($filter['options'] as $option): ?>
                            <div 
                                class="filter-dropdown-item <?php echo ($option === $current_value) ? 'active' : ''; ?>"
                                onclick="selectFilterOption(event, '<?php echo $key; ?>', '<?php echo htmlspecialchars($option); ?>')"
                            >
                                <?php echo htmlspecialchars($option); ?>
                            </div>
                        <?php endforeach; ?>
                    </div>
                </div>
            </div>
        <?php endforeach; ?>
    </div>

    <script>
        // Toggle dropdown visibility
        function toggleFilterDropdown(event, filterId) {
            event.preventDefault();
            const dropdown = document.getElementById(filterId + '-dropdown');
            const button = event.currentTarget;

            // Close all other dropdowns
            document.querySelectorAll('.filter-dropdown').forEach(el => {
                if (el !== dropdown) {
                    el.style.display = 'none';
                }
            });

            document.querySelectorAll('.filter-button.active').forEach(btn => {
                if (btn !== button) {
                    btn.classList.remove('active');
                }
            });

            // Toggle current dropdown
            dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
            button.classList.toggle('active');
        }

        // Select filter option
        function selectFilterOption(event, filterId, value) {
            event.preventDefault();
            const button = event.currentTarget.parentElement.parentElement.querySelector('.filter-button');
            const valueSpan = button.querySelector('.filter-value');
            const dropdown = document.getElementById(filterId + '-dropdown');

            // Update value
            valueSpan.textContent = value;
            valueSpan.dataset.currentValue = value;

            // Update active state
            const items = dropdown.querySelectorAll('.filter-dropdown-item');
            items.forEach(item => {
                item.classList.remove('active');
            });
            event.currentTarget.classList.add('active');

            // Close dropdown
            dropdown.style.display = 'none';
            button.classList.remove('active');

            // Trigger filter change event
            document.dispatchEvent(new CustomEvent('filterChanged', {
                detail: {
                    filterId: filterId,
                    value: value
                }
            }));
        }

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.filter-item')) {
                document.querySelectorAll('.filter-dropdown').forEach(el => {
                    el.style.display = 'none';
                });
                document.querySelectorAll('.filter-button').forEach(btn => {
                    btn.classList.remove('active');
                });
            }
        });
    </script>
    <?php
}

/**
 * Render a minimal filter bar (just icons + values)
 */
function renderFilterBarMinimal($filters, $current_values = []) {
    renderFilterBar($filters, $current_values, true);
}

/**
 * Get current filter values from URL query parameters
 */
function getFilterValuesFromUrl($filter_keys) {
    $values = [];
    foreach ($filter_keys as $key) {
        $values[$key] = $_GET[$key] ?? null;
    }
    return $values;
}

/**
 * Build URL with filter parameters
 */
function buildFilterUrl($filter_key, $filter_value, $base_url = '') {
    if (empty($base_url)) {
        $base_url = $_SERVER['REQUEST_URI'];
        // Remove query string
        if (strpos($base_url, '?') !== false) {
            $base_url = substr($base_url, 0, strpos($base_url, '?'));
        }
    }

    $params = $_GET;
    $params[$filter_key] = $filter_value;

    // Remove empty values
    $params = array_filter($params);

    return $base_url . (count($params) ? '?' . http_build_query($params) : '');
}
?>
