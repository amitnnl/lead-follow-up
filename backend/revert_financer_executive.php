<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/includes/db.php';

echo "<h1>Financer Revert Migration</h1>";

$queries = [
    "ALTER TABLE `financers` DROP FOREIGN KEY `fk_financer_executive`;",
    "ALTER TABLE `financers` DROP COLUMN `executive_id`;",
    "ALTER TABLE `financers` ADD COLUMN `contact_person` VARCHAR(150) NULL AFTER `dsa_code`;",
    "ALTER TABLE `financers` ADD COLUMN `mobile` VARCHAR(15) NULL AFTER `contact_person`;",
    "ALTER TABLE `financers` ADD COLUMN `email` VARCHAR(150) NULL AFTER `mobile`;"
];

foreach ($queries as $q) {
    if ($conn->query($q)) {
        echo "<p style='color:green'>Success: " . htmlspecialchars($q) . "</p>";
    } else {
        echo "<p style='color:orange'>Skipped/Error: " . htmlspecialchars($conn->error) . " (Query: " . htmlspecialchars($q) . ")</p>";
    }
}

echo "<h2>Revert finished.</h2>";
?>
