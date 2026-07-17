<?php
// includes/settings_helper.php — Utilities for System Settings

/**
 * Get a setting value by key, or return the default if not found.
 */
function get_setting($key, $default = null) {
    global $conn;
    try {
        $stmt = $conn->prepare("SELECT setting_value FROM system_settings WHERE setting_key = ?");
        if (!$stmt) return $default; // For PHP < 8.1
        $stmt->bind_param('s', $key);
        $stmt->execute();
        $result = $stmt->get_result();
        if ($row = $result->fetch_assoc()) {
            return $row['setting_value'];
        }
    } catch (Exception $e) {
        // Table doesn't exist yet (e.g. during migration)
        return $default;
    }
    return $default;
}

/**
 * Set or update a setting value.
 */
function set_setting($key, $value) {
    global $conn;
    $stmt = $conn->prepare("
        INSERT INTO system_settings (setting_key, setting_value) 
        VALUES (?, ?) 
        ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
    ");
    $stmt->bind_param('ss', $key, $value);
    return $stmt->execute();
}

/**
 * Load all settings into an array for bulk access.
 */
function get_all_settings() {
    global $conn;
    $settings = [];
    try {
        $result = $conn->query("SELECT setting_key, setting_value FROM system_settings");
        if ($result) {
            while ($row = $result->fetch_assoc()) {
                $settings[$row['setting_key']] = $row['setting_value'];
            }
        }
    } catch (Exception $e) {
        // Table doesn't exist yet
    }
    return $settings;
}
