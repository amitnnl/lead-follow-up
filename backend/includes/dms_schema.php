<?php
/**
 * dms_schema.php — Enterprise Document Management System (DMS) Schema & Auto-Seeding
 * Ensures production-ready banking-grade database structures for Phase 3.
 */

function ensure_dms_tables_exist($conn) {
    if (!$conn) return;

    // 1. DMS Categories
    $conn->query("
        CREATE TABLE IF NOT EXISTS `dms_categories` (
            `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            `code` VARCHAR(50) UNIQUE NOT NULL,
            `name` VARCHAR(100) NOT NULL,
            `description` TEXT NULL,
            `sort_order` INT UNSIGNED DEFAULT 10,
            `is_active` TINYINT(1) DEFAULT 1,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // 2. DMS Document Types
    $conn->query("
        CREATE TABLE IF NOT EXISTS `dms_document_types` (
            `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            `category_id` INT UNSIGNED NOT NULL,
            `category_code` VARCHAR(50) NOT NULL,
            `code` VARCHAR(50) UNIQUE NOT NULL,
            `name` VARCHAR(100) NOT NULL,
            `is_mandatory` TINYINT(1) DEFAULT 0,
            `has_expiry` TINYINT(1) DEFAULT 0,
            `allowed_extensions` VARCHAR(255) DEFAULT 'pdf,jpg,jpeg,png,webp',
            `max_size_mb` INT DEFAULT 15,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX (`category_code`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // 3. Smart Document Checklists
    $conn->query("
        CREATE TABLE IF NOT EXISTS `dms_checklists` (
            `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            `name` VARCHAR(150) NOT NULL,
            `loan_type` VARCHAR(50) NOT NULL DEFAULT 'all',
            `vehicle_type` VARCHAR(50) NOT NULL DEFAULT 'all',
            `customer_category` VARCHAR(50) NOT NULL DEFAULT 'all',
            `required_doc_types` TEXT NOT NULL,
            `block_progression` TINYINT(1) DEFAULT 1,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // 4. DMS Documents Vault
    $conn->query("
        CREATE TABLE IF NOT EXISTS `dms_documents` (
            `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            `uuid` VARCHAR(36) UNIQUE NOT NULL,
            `lead_id` INT UNSIGNED NOT NULL,
            `customer_id` INT UNSIGNED NULL,
            `category_code` VARCHAR(50) NOT NULL,
            `doc_type_code` VARCHAR(50) NOT NULL,
            `original_name` VARCHAR(255) NOT NULL,
            `stored_name` VARCHAR(255) NOT NULL,
            `file_path` VARCHAR(255) NOT NULL,
            `extension` VARCHAR(20) NOT NULL,
            `mime_type` VARCHAR(100) NOT NULL,
            `file_size` BIGINT UNSIGNED NOT NULL,
            `checksum_sha256` VARCHAR(64) NOT NULL,
            `uploader_id` INT UNSIGNED NULL,
            `version_number` INT UNSIGNED DEFAULT 1,
            `verification_status` ENUM('pending', 'under_review', 'verified', 'rejected', 'requires_reupload', 'expired') DEFAULT 'pending',
            `expiry_date` DATE NULL,
            `ocr_status` ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
            `ocr_text` LONGTEXT NULL,
            `download_count` INT UNSIGNED DEFAULT 0,
            `preview_count` INT UNSIGNED DEFAULT 0,
            `remarks` TEXT NULL,
            `verification_notes` TEXT NULL,
            `verifier_id` INT UNSIGNED NULL,
            `verified_at` DATETIME NULL,
            `is_deleted` TINYINT(1) DEFAULT 0,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX (`lead_id`),
            INDEX (`category_code`),
            INDEX (`doc_type_code`),
            INDEX (`verification_status`),
            INDEX (`checksum_sha256`),
            INDEX (`expiry_date`),
            INDEX (`is_deleted`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // 5. DMS Document Versions History
    $conn->query("
        CREATE TABLE IF NOT EXISTS `dms_document_versions` (
            `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            `document_id` INT UNSIGNED NOT NULL,
            `version_number` INT UNSIGNED NOT NULL,
            `original_name` VARCHAR(255) NOT NULL,
            `stored_name` VARCHAR(255) NOT NULL,
            `file_path` VARCHAR(255) NOT NULL,
            `file_size` BIGINT UNSIGNED NOT NULL,
            `checksum_sha256` VARCHAR(64) NOT NULL,
            `uploader_id` INT UNSIGNED NULL,
            `change_reason` VARCHAR(255) NULL,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX (`document_id`),
            INDEX (`version_number`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // 6. DMS Verification History
    $conn->query("
        CREATE TABLE IF NOT EXISTS `dms_verification_history` (
            `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            `document_id` INT UNSIGNED NOT NULL,
            `verifier_id` INT UNSIGNED NULL,
            `verifier_role` VARCHAR(50) NOT NULL,
            `old_status` VARCHAR(50) NOT NULL,
            `new_status` VARCHAR(50) NOT NULL,
            `action_taken` VARCHAR(100) NOT NULL,
            `reason` VARCHAR(255) NULL,
            `notes` TEXT NULL,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX (`document_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // 7. DMS Audit Logs (Immutable)
    $conn->query("
        CREATE TABLE IF NOT EXISTS `dms_audit_logs` (
            `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            `document_id` INT UNSIGNED NULL,
            `user_id` INT UNSIGNED NULL,
            `user_role` VARCHAR(50) NOT NULL,
            `action` VARCHAR(50) NOT NULL,
            `ip_address` VARCHAR(45) NOT NULL,
            `user_agent` VARCHAR(255) NULL,
            `old_value` TEXT NULL,
            `new_value` TEXT NULL,
            `reason` TEXT NULL,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX (`document_id`),
            INDEX (`user_id`),
            INDEX (`action`),
            INDEX (`created_at`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // Check if seeding is required for categories
    $catCheck = $conn->query("SELECT COUNT(*) as c FROM `dms_categories`");
    $catCount = ($catCheck && $row = $catCheck->fetch_assoc()) ? (int)$row['c'] : 0;
    if ($catCount === 0) {
        $default_categories = [
            ['customer', 'Customer Documents', 'Primary borrower identity, income, and banking records', 10],
            ['co_applicant', 'Co-Applicant Documents', 'Co-borrower KYC and financial verification files', 20],
            ['guarantor', 'Guarantor Documents', 'Guarantor identity and asset verification files', 30],
            ['vehicle', 'Vehicle Documents', 'Registration Certificate (RC), Insurance, Invoice, and inspection photos', 40],
            ['dealer', 'Dealer Documents', 'Dealer quotation, proforma invoice, and payout agreements', 50],
            ['executive', 'Executive Documents', 'Field executive inspection reports and verification forms', 60],
            ['agent', 'Agent Documents', 'DSA Agent KYC and bank account verification documents', 70],
            ['finance_partner', 'Finance Partner Documents', 'Bank/NBFC sanction letters and queries', 80],
            ['branch', 'Branch Documents', 'Internal branch physical verification reports', 90],
            ['legal', 'Legal Documents', 'Loan agreements, promissory notes, and disbursal memos', 100],
            ['custom', 'Custom Documents', 'Additional miscellaneous administrative and custom files', 110]
        ];

        $stmt = $conn->prepare("INSERT INTO `dms_categories` (`code`, `name`, `description`, `sort_order`) VALUES (?, ?, ?, ?)");
        if ($stmt) {
            foreach ($default_categories as $cat) {
                $stmt->bind_param("sssi", $cat[0], $cat[1], $cat[2], $cat[3]);
                $stmt->execute();
            }
            $stmt->close();
        }

        // Seed Document Types
        $types = [
            // customer
            ['customer', 'aadhaar', 'Aadhaar Card', 1, 0],
            ['customer', 'pan', 'PAN Card', 1, 0],
            ['customer', 'bank_statement', 'Bank Statement (6 Months)', 1, 0],
            ['customer', 'salary_slip', 'Salary Slip / Income Proof', 1, 0],
            ['customer', 'itr', 'ITR / Form 16', 0, 0],
            ['customer', 'passport', 'Passport', 0, 1],
            ['customer', 'photograph', 'Customer Photograph', 0, 0],
            // co_applicant
            ['co_applicant', 'co_aadhaar', 'Co-Applicant Aadhaar Card', 0, 0],
            ['co_applicant', 'co_pan', 'Co-Applicant PAN Card', 0, 0],
            ['co_applicant', 'co_bank_statement', 'Co-Applicant Bank Statement', 0, 0],
            // guarantor
            ['guarantor', 'guarantor_aadhaar', 'Guarantor Aadhaar Card', 0, 0],
            ['guarantor', 'guarantor_pan', 'Guarantor PAN Card', 0, 0],
            // vehicle
            ['vehicle', 'rc', 'Registration Certificate (RC)', 1, 1],
            ['vehicle', 'insurance', 'Insurance Policy', 1, 1],
            ['vehicle', 'invoice', 'Vehicle Invoice / Valuation', 1, 0],
            ['vehicle', 'driving_license', 'Driving License', 1, 1],
            ['vehicle', 'pollution_certificate', 'Pollution Under Control (PUC)', 0, 1],
            ['vehicle', 'vehicle_image', 'Vehicle Inspection Photo', 0, 0],
            // dealer
            ['dealer', 'dealer_quotation', 'Dealer Proforma Invoice', 0, 0],
            ['dealer', 'dealer_cheque', 'Dealer Cancelled Cheque', 0, 0],
            ['dealer', 'dealer_agreement', 'Dealer DSA Agreement', 0, 0],
            // agent
            ['agent', 'agent_kyc', 'Agent KYC Document', 0, 0],
            ['agent', 'agent_bank_details', 'Agent Bank Details Verified', 0, 0],
            // legal
            ['legal', 'loan_agreement', 'Signed Loan Agreement', 0, 0],
            ['legal', 'disbursal_memo', 'Disbursal Authorization Memo', 0, 0],
            // custom
            ['custom', 'other', 'Other Custom Attachment', 0, 0]
        ];

        // Map category codes to IDs
        $catMap = [];
        $resCats = $conn->query("SELECT id, code FROM `dms_categories`");
        while ($resCats && $r = $resCats->fetch_assoc()) {
            $catMap[$r['code']] = (int)$r['id'];
        }

        $stmtT = $conn->prepare("INSERT INTO `dms_document_types` (`category_id`, `category_code`, `code`, `name`, `is_mandatory`, `has_expiry`) VALUES (?, ?, ?, ?, ?, ?)");
        if ($stmtT) {
            foreach ($types as $t) {
                $cid = $catMap[$t[0]] ?? 1;
                $stmtT->bind_param("isssii", $cid, $t[0], $t[1], $t[2], $t[3], $t[4]);
                $stmtT->execute();
            }
            $stmtT->close();
        }
    }

    // Check if seeding is required for checklists
    $chkCheck = $conn->query("SELECT COUNT(*) as c FROM `dms_checklists`");
    $chkCount = ($chkCheck && $row = $chkCheck->fetch_assoc()) ? (int)$row['c'] : 0;
    if ($chkCount === 0) {
        $checklists = [
            ['Standard Personal Loan Mandatory Rules', 'Personal Loan', 'all', 'all', json_encode(['aadhaar', 'pan', 'bank_statement', 'salary_slip']), 1],
            ['Standard Vehicle Loan Mandatory Rules', 'Vehicle Loan', 'all', 'all', json_encode(['aadhaar', 'pan', 'rc', 'insurance', 'invoice', 'driving_license']), 1],
            ['Universal Base KYC Checklist', 'all', 'all', 'all', json_encode(['aadhaar', 'pan', 'bank_statement']), 0]
        ];

        $stmtC = $conn->prepare("INSERT INTO `dms_checklists` (`name`, `loan_type`, `vehicle_type`, `customer_category`, `required_doc_types`, `block_progression`) VALUES (?, ?, ?, ?, ?, ?)");
        if ($stmtC) {
            foreach ($checklists as $ch) {
                $stmtC->bind_param("sssssi", $ch[0], $ch[1], $ch[2], $ch[3], $ch[4], $ch[5]);
                $stmtC->execute();
            }
            $stmtC->close();
        }
    }
}
