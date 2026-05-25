<?php
// migrate_phase3.php — Database migration for Phase 3 (Document Management)
require_once __DIR__ . '/includes/db.php';

header('Content-Type: text/plain');

echo "=== LeadFlow Pro: Phase 3 Database Migration ===\n\n";

// 1. Create lead_documents table
echo "Creating 'lead_documents' table...\n";
$sql = "CREATE TABLE IF NOT EXISTS `lead_documents` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `lead_id` INT UNSIGNED NOT NULL,
  `document_type` ENUM('aadhaar','pan','bank_statement','rc','insurance','vehicle_image','other') NOT NULL,
  `file_path` VARCHAR(255) NOT NULL,
  `verification_status` ENUM('pending','verified','rejected') DEFAULT 'pending',
  `verification_notes` TEXT,
  `uploaded_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB";

if ($conn->query($sql)) {
    echo "Successfully initialized 'lead_documents' table.\n";
} else {
    echo "Error creating table: " . $conn->error . "\n";
}

// 2. Initialize uploads/leads directory
$uploadDir = __DIR__ . '/uploads/leads';
echo "Initializing uploads directory at '$uploadDir'...\n";
if (!file_exists($uploadDir)) {
    if (mkdir($uploadDir, 0777, true)) {
        echo "Successfully created '$uploadDir' directory.\n";
    } else {
        echo "Error: Failed to create '$uploadDir' directory. Please check permissions.\n";
    }
} else {
    echo "Uploads directory already exists.\n";
}

echo "\nMigration complete!\n";
