<?php
require_once __DIR__ . '/../includes/db.php';

$sqlFile = __DIR__ . '/../sql/update_cibil.sql';
$sql = file_get_contents($sqlFile);

if ($conn->multi_query($sql)) {
    do {
        if ($result = $conn->store_result()) {
            $result->free();
        }
    } while ($conn->more_results() && $conn->next_result());
    echo "CIBIL schema update applied successfully.\n";
} else {
    echo "Error applying schema: " . $conn->error . "\n";
}
