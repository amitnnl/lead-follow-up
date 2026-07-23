<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/includes/db.php';

echo "<h1>Drop contact_person Migration</h1>";

$queries = [
    "ALTER TABLE `financers` DROP COLUMN `contact_person`;"
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
