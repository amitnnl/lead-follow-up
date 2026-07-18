<?php
require_once __DIR__ . '/includes/db.php';

// Avoid errors if columns already exist by checking first
$check = db_query($conn, "SHOW COLUMNS FROM leads LIKE 'final_loan_amount'");
if (mysqli_num_rows($check) == 0) {
    $sql = "ALTER TABLE leads 
            ADD COLUMN final_loan_amount DECIMAL(15,2) NULL, 
            ADD COLUMN tenure_months INT NULL, 
            ADD COLUMN roi DECIMAL(5,2) NULL";

    if (db_query($conn, $sql)) {
        echo "Columns added successfully!\n";
    } else {
        echo "Failed to add columns: " . mysqli_error($conn) . "\n";
    }
} else {
    echo "Columns already exist!\n";
}
