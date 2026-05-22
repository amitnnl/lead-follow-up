<?php
require_once __DIR__ . '/includes/db.php';
$conn->query("ALTER TABLE leads ADD customer_bank_name VARCHAR(150) NULL, ADD customer_account_number VARCHAR(30) NULL, ADD customer_ifsc_code VARCHAR(15) NULL");
if ($conn->error) {
    echo "Error: " . $conn->error;
} else {
    echo "Migration successful.";
}
