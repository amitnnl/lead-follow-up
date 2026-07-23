<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/includes/db.php';

echo "<h1>Financer Executive Migration</h1>";

$queries = [
    "ALTER TABLE `financers` ADD COLUMN `executive_id` INT UNSIGNED NULL AFTER `dsa_code`;",
    "ALTER TABLE `financers` ADD CONSTRAINT `fk_financer_executive` FOREIGN KEY (`executive_id`) REFERENCES `executives`(`id`) ON DELETE SET NULL;",
    "ALTER TABLE `financers` DROP COLUMN `contact_person`;",
    "ALTER TABLE `financers` DROP COLUMN `mobile`;",
    "ALTER TABLE `financers` DROP COLUMN `email`;"
];

foreach ($queries as $q) {
    if ($conn->query($q)) {
        echo "<p style='color:green'>Success: " . htmlspecialchars($q) . "</p>";
    } else {
        echo "<p style='color:orange'>Skipped/Error: " . htmlspecialchars($conn->error) . " (Query: " . htmlspecialchars($q) . ")</p>";
    }
}

echo "<h2>Migration finished.</h2>";
?>
