<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/includes/db.php';

echo "<h1>Migration Script</h1>";

$queries = [
    // Create Channels Table
    "CREATE TABLE IF NOT EXISTS `channels` (
      `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      `name` VARCHAR(200) NOT NULL,
      `contact_person` VARCHAR(150) NULL,
      `mobile` VARCHAR(15) NULL,
      `email` VARCHAR(150) NULL,
      `notes` TEXT NULL,
      `is_active` TINYINT(1) NOT NULL DEFAULT 1,
      `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;",
    
    // Create Channel Executives Table
    "CREATE TABLE IF NOT EXISTS `channel_executives` (
      `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      `user_id` INT UNSIGNED NULL,
      `channel_id` INT UNSIGNED NULL,
      `name` VARCHAR(150) NOT NULL,
      `mobile` VARCHAR(15) NOT NULL,
      `email` VARCHAR(150) NULL,
      `bank_name` VARCHAR(150) NULL,
      `bank_account` VARCHAR(50) NULL,
      `ifsc_code` VARCHAR(20) NULL,
      `pan_number` VARCHAR(20) NULL,
      `is_active` TINYINT(1) NOT NULL DEFAULT 1,
      `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
      FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON DELETE SET NULL
    ) ENGINE=InnoDB;",
    
    // Add columns to leads (ignoring errors if they already exist)
    "ALTER TABLE `leads` ADD COLUMN `customer_mobile2` VARCHAR(15) NULL AFTER `customer_mobile`;",
    "ALTER TABLE `leads` ADD COLUMN `vehicle_condition` VARCHAR(50) NULL AFTER `customer_address`;",
    "ALTER TABLE `leads` ADD COLUMN `insurance_company` VARCHAR(150) NULL AFTER `registration_number`;",
    "ALTER TABLE `leads` ADD COLUMN `policy_number` VARCHAR(100) NULL AFTER `insurance_company`;",
    "ALTER TABLE `leads` ADD COLUMN `insurance_expiry_date` DATE NULL AFTER `policy_number`;",
    "ALTER TABLE `leads` ADD COLUMN `channel_id` INT UNSIGNED NULL AFTER `agent_id`;",
    "ALTER TABLE `leads` ADD COLUMN `channel_executive_id` INT UNSIGNED NULL AFTER `channel_id`;",
    "ALTER TABLE `leads` ADD COLUMN `financer_lead_number` VARCHAR(100) NULL AFTER `financer_id`;",
    "ALTER TABLE `financers` ADD COLUMN `dsa_code` VARCHAR(100) NULL AFTER `name`;",
];

foreach ($queries as $q) {
    if ($conn->query($q)) {
        echo "<p style='color:green'>Success: " . htmlspecialchars($q) . "</p>";
    } else {
        echo "<p style='color:orange'>Skipped/Error: " . htmlspecialchars($conn->error) . " (Query: " . htmlspecialchars($q) . ")</p>";
    }
}

// Constraints separately so they don't break the column additions
$constraints = [
    "ALTER TABLE `leads` ADD CONSTRAINT `fk_leads_channel` FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON DELETE SET NULL;",
    "ALTER TABLE `leads` ADD CONSTRAINT `fk_leads_channel_exec` FOREIGN KEY (`channel_executive_id`) REFERENCES `channel_executives`(`id`) ON DELETE SET NULL;"
];

foreach ($constraints as $q) {
    if ($conn->query($q)) {
        echo "<p style='color:green'>Success: " . htmlspecialchars($q) . "</p>";
    } else {
        echo "<p style='color:orange'>Skipped/Error: " . htmlspecialchars($conn->error) . " (Query: " . htmlspecialchars($q) . ")</p>";
    }
}

echo "<h2>Migration finished.</h2>";
?>
