<?php
// migrate_phase1.php — Database migration for Phase 1 (Refinance & Executive roles)
require_once __DIR__ . '/includes/db.php';

header('Content-Type: text/plain');

echo "=== LeadFlow Pro: Phase 1 Database Migration ===\n\n";

// 1. Add 'loan_type' column to leads table
$check_column = $conn->query("SHOW COLUMNS FROM leads LIKE 'loan_type'");
if ($check_column->num_rows === 0) {
    echo "Adding 'loan_type' column to 'leads' table...\n";
    $alter_leads = $conn->query("ALTER TABLE leads ADD COLUMN loan_type ENUM('new_loan', 'refinance') NOT NULL DEFAULT 'new_loan' AFTER loan_amount");
    if ($alter_leads) {
        echo "Successfully added 'loan_type' column.\n";
    } else {
        echo "Error adding 'loan_type': " . $conn->error . "\n";
    }
} else {
    echo "'loan_type' column already exists in 'leads' table. Skipping.\n";
}

// 2. Modify 'users' table role enum
echo "Updating 'users' table 'role' column...\n";
$alter_users = $conn->query("ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'agent', 'staff', 'executive') NOT NULL DEFAULT 'staff'");
if ($alter_users) {
    echo "Successfully updated 'role' enum to include 'executive'.\n";
} else {
    echo "Error updating 'role' enum: " . $conn->error . "\n";
}

echo "\nMigration complete!\n";
