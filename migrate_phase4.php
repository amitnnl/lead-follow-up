<?php
// migrate_phase4.php — Database migration for Phase 4 (Payout & Balance Splits)
require_once __DIR__ . '/includes/db.php';

header('Content-Type: text/plain');

echo "=== LeadFlow Pro: Phase 4 Database Migration ===\n\n";

$columns_to_add = [
    'payout_90_status' => "ENUM('pending', 'paid') NOT NULL DEFAULT 'pending'",
    'payout_90_date'   => "DATE NULL",
    'payout_90_mode'   => "ENUM('cash', 'bank_transfer', 'cheque') NULL",
    'payout_10_status' => "ENUM('pending', 'paid') NOT NULL DEFAULT 'pending'",
    'payout_10_date'   => "DATE NULL",
    'payout_10_mode'   => "ENUM('cash', 'bank_transfer', 'cheque') NULL",
    'additional_payout'=> "DECIMAL(10,2) NOT NULL DEFAULT 0.00"
];

foreach ($columns_to_add as $column => $definition) {
    $check_column = $conn->query("SHOW COLUMNS FROM commissions LIKE '$column'");
    if ($check_column->num_rows === 0) {
        echo "Adding column '$column' to 'commissions' table...\n";
        $alter_query = "ALTER TABLE commissions ADD COLUMN `$column` $definition";
        if ($conn->query($alter_query)) {
            echo "[SUCCESS] Added column '$column' successfully.\n";
        } else {
            echo "[ERROR] Failed to add column '$column': " . $conn->error . "\n";
        }
    } else {
        echo "Column '$column' already exists in 'commissions' table. Skipping.\n";
    }
}

echo "\nMigration complete!\n";
