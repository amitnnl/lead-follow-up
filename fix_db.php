<?php
require_once __DIR__ . '/backend/includes/db.php';
try {
    $conn->query("ALTER TABLE financers ADD COLUMN contact_person VARCHAR(150) NULL");
    echo "Added contact_person\n";
} catch (Exception $e) { echo $e->getMessage() . "\n"; }

try {
    $conn->query("ALTER TABLE leads ADD COLUMN financer_lead_number VARCHAR(150) NULL");
    echo "Added financer_lead_number\n";
} catch (Exception $e) { echo $e->getMessage() . "\n"; }
