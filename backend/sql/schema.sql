-- ============================================================
-- Vehicle Finance DSA Management System — Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS `dsa_leads` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `dsa_leads`;

-- Users (Login Accounts)
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('admin','agent','staff','manager','executive','finance_manager','rto_desk','insurance_desk','channel_agent') NOT NULL DEFAULT 'staff',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Agents (DSA Partners)
CREATE TABLE IF NOT EXISTS `agents` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NULL,
  `financer_id` INT UNSIGNED NULL,
  `name` VARCHAR(150) NOT NULL,
  `mobile` VARCHAR(15) NOT NULL,
  `email` VARCHAR(150) NULL,
  `address` TEXT NULL,
  `pan_number` VARCHAR(20) NULL,
  `bank_account` VARCHAR(30) NULL,
  `ifsc_code` VARCHAR(15) NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`financer_id`) REFERENCES `financers`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Field Executives / SFE
CREATE TABLE IF NOT EXISTS `executives` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NULL,
  `name` VARCHAR(150) NOT NULL,
  `mobile` VARCHAR(15) NOT NULL,
  `email` VARCHAR(150) NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Channels
CREATE TABLE IF NOT EXISTS `channels` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(200) NOT NULL,
  `contact_person` VARCHAR(150) NULL,
  `mobile` VARCHAR(15) NULL,
  `email` VARCHAR(150) NULL,
  `notes` TEXT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Channel Executives (Channel Agents)
CREATE TABLE IF NOT EXISTS `channel_executives` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NULL,
  `channel_id` INT UNSIGNED NULL,
  `name` VARCHAR(150) NOT NULL,
  `mobile` VARCHAR(15) NOT NULL,
  `email` VARCHAR(150) NULL,
  `bank_name` VARCHAR(150) NULL,
  `bank_account` VARCHAR(50) NULL,
  `ifsc_code` VARCHAR(20) NULL,
  `pan_number` VARCHAR(20) NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Dealers
CREATE TABLE IF NOT EXISTS `dealers` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(200) NOT NULL,
  `contact_person` VARCHAR(150) NULL,
  `mobile` VARCHAR(15) NULL,
  `address` TEXT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Financers / Banks
CREATE TABLE IF NOT EXISTS `financers` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(200) NOT NULL,
  `contact_person` VARCHAR(150) NULL,
  `mobile` VARCHAR(15) NULL,
  `notes` TEXT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Leads (Core Table)
CREATE TABLE IF NOT EXISTS `leads` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `lead_id` VARCHAR(20) NOT NULL UNIQUE COMMENT 'Auto-generated e.g. DSA-2025-0001',
  `lead_date` DATE NOT NULL,
  -- Customer
  `customer_name` VARCHAR(200) NOT NULL,
  `customer_mobile` VARCHAR(15) NOT NULL,
  `customer_mobile2` VARCHAR(15) NULL,
  `customer_address` TEXT NULL,
  -- Vehicle
  `vehicle_make_model` VARCHAR(200) NULL COMMENT 'e.g. TATA 1512',
  `year_of_manufacture` YEAR NULL,
  `registration_number` VARCHAR(30) NULL,
  `loan_amount` DECIMAL(12,2) NULL,
  `loan_type` ENUM('new_loan','refinance') NOT NULL DEFAULT 'new_loan',
  -- Bank Details (Client)
  `customer_bank_name` VARCHAR(150) NULL,
  `customer_account_number` VARCHAR(30) NULL,
  `customer_ifsc_code` VARCHAR(15) NULL,
  -- References
  `referred_by` VARCHAR(200) NULL,
  `agent_id` INT UNSIGNED NULL,
  `financer_id` INT UNSIGNED NULL,
  `dealer_id` INT UNSIGNED NULL,
  `executive_id` INT UNSIGNED NULL COMMENT 'SFE assigned',
  -- Status
  `status` ENUM('new','pending','initiated','approved','disbursed','rejected','on_hold') NOT NULL DEFAULT 'new',
  `status_date` DATE NULL,
  `query_notes` TEXT NULL,
  -- Document & Payout Status
  `rc_status` ENUM('pending','received','not_applicable') DEFAULT 'pending',
  `rc_number` VARCHAR(50) NULL,
  `insurance_status` ENUM('pending','received','not_applicable') DEFAULT 'pending',
  `insurance_number` VARCHAR(50) NULL,
  `rto_status` ENUM('pending','done','not_applicable') DEFAULT 'pending',
  -- Payout
  `payout_amount` DECIMAL(10,2) NULL,
  `payout_status` ENUM('pending','paid','partial') DEFAULT 'pending',
  -- Misc
  `created_by` INT UNSIGNED NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`financer_id`) REFERENCES `financers`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`dealer_id`) REFERENCES `dealers`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`executive_id`) REFERENCES `executives`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Follow-ups
CREATE TABLE IF NOT EXISTS `lead_followups` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `lead_id` INT UNSIGNED NOT NULL,
  `followup_date` DATE NOT NULL,
  `next_followup_date` DATE NULL,
  `remarks` TEXT NOT NULL,
  `status_changed_to` VARCHAR(50) NULL,
  `created_by` INT UNSIGNED NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Lead Audit Logs
CREATE TABLE IF NOT EXISTS `lead_logs` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `lead_id` INT UNSIGNED NOT NULL,
  `action` VARCHAR(100) NOT NULL,
  `details` TEXT NULL,
  `performed_by` INT UNSIGNED NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`performed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Commissions
CREATE TABLE IF NOT EXISTS `commissions` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `lead_id` INT UNSIGNED NOT NULL,
  `agent_id` INT UNSIGNED NULL,
  `commission_amount` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `paid_amount` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `payment_date` DATE NULL,
  `payment_mode` ENUM('cash','bank_transfer','cheque') NULL,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Lead Documents
CREATE TABLE IF NOT EXISTS `lead_documents` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `lead_id` INT UNSIGNED NOT NULL,
  `document_type` ENUM('aadhaar','pan','bank_statement','rc','insurance','vehicle_image','other') NOT NULL,
  `file_path` VARCHAR(255) NOT NULL,
  `verification_status` ENUM('pending','verified','rejected') DEFAULT 'pending',
  `verification_notes` TEXT,
  `uploaded_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Lead Banking
CREATE TABLE IF NOT EXISTS `lead_banking` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `lead_id` INT UNSIGNED NOT NULL UNIQUE,
  `received_amount` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `received_date` DATE NULL,
  `rc_charges` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `insurance_charges` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `rto_charges` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `other_charges` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `banking_notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Lead Transactions
CREATE TABLE IF NOT EXISTS `lead_transactions` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `lead_id` INT UNSIGNED NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `payment_date` DATE NOT NULL,
  `payment_mode` ENUM('cash','bank_transfer','cheque') DEFAULT 'bank_transfer',
  `reference_number` VARCHAR(100) NULL,
  `notes` TEXT NULL,
  `created_by` INT UNSIGNED NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Lead Deductions
CREATE TABLE IF NOT EXISTS `lead_deductions` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `lead_id` INT UNSIGNED NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `created_by` INT UNSIGNED NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Lead Notes
CREATE TABLE IF NOT EXISTS `lead_notes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `lead_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `note` TEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Notifications
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `message` TEXT NOT NULL,
  `link` VARCHAR(255) DEFAULT NULL,
  `is_read` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- System Settings
CREATE TABLE IF NOT EXISTS `system_settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `setting_key` VARCHAR(100) NOT NULL UNIQUE,
  `setting_value` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Failed Logins
CREATE TABLE IF NOT EXISTS `failed_logins` (
  `ip_address` VARCHAR(45) NOT NULL,
  `attempt_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- System Logs
CREATE TABLE IF NOT EXISTS `system_logs` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `action` VARCHAR(255) NOT NULL,
  `details` TEXT NULL,
  `performed_by` INT UNSIGNED NULL,
  `ip_address` VARCHAR(45) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`performed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Bank Ledger
CREATE TABLE IF NOT EXISTS `bank_ledger` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `post_date` DATE NOT NULL,
  `customer_name` VARCHAR(200) NOT NULL,
  `reg_no` VARCHAR(50) NULL,
  `loan_amount` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `deduction_info` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `status` VARCHAR(50) DEFAULT 'Clear',
  `account_description` VARCHAR(255) NULL,
  `debit_amount` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `credit_amount` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `running_balance` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `pending_amount` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `remarks` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- SEED DATA
-- ============================================================

-- Default Admin User (password: admin123)
INSERT INTO `users` (`name`, `email`, `password`, `role`) VALUES
('Admin User', 'admin@dsaleads.com', '$2y$10$eo6f87GHmMiMbXPCANcffuNoGxd2He2d7mKqK8Zpc9pZLMEAFpjiW', 'admin'),
('Vikram Kumar', 'vikram@dsaleads.com', '$2y$10$eo6f87GHmMiMbXPCANcffuNoGxd2He2d7mKqK8Zpc9pZLMEAFpjiW', 'staff'),
('Yogesh Sharma', 'yogesh@dsaleads.com', '$2y$10$eo6f87GHmMiMbXPCANcffuNoGxd2He2d7mKqK8Zpc9pZLMEAFpjiW', 'staff'),
('Kavinder Singh', 'kavinder@dsaleads.com', '$2y$10$eo6f87GHmMiMbXPCANcffuNoGxd2He2d7mKqK8Zpc9pZLMEAFpjiW', 'agent'),
('Seka Agent', 'seka@dsaleads.com', '$2y$10$eo6f87GHmMiMbXPCANcffuNoGxd2He2d7mKqK8Zpc9pZLMEAFpjiW', 'agent');

-- Executives
INSERT INTO `executives` (`user_id`, `name`, `mobile`) VALUES
(2, 'Vikram Kumar', '9876543210'),
(3, 'Yogesh Sharma', '9876543211'),
(4, 'Kavinder Singh', '9876543212');

-- Agents
INSERT INTO `agents` (`user_id`, `name`, `mobile`) VALUES
(5, 'Seka N', '9876500001'),
(NULL, 'Direct', '0000000000');

-- Financers
INSERT INTO `financers` (`name`) VALUES
('AU Small Finance Bank'),
('Chola Finance'),
('HDFC Bank'),
('ICICI Bank'),
('Mahindra Finance'),
('Shriram Finance');

-- Dealers
INSERT INTO `dealers` (`name`, `mobile`) VALUES
('Haryana Motors', '9876511111'),
('Rajasthan Trucks', '9876522222'),
('Punjab Commercial Vehicles', '9876533333');

-- Sample Leads (from prompt data)
INSERT INTO `leads`
  (`lead_id`,`lead_date`,`customer_name`,`customer_mobile`,`customer_address`,`vehicle_make_model`,`year_of_manufacture`,`registration_number`,`loan_amount`,`referred_by`,`agent_id`,`financer_id`,`dealer_id`,`executive_id`,`status`,`query_notes`,`payout_amount`)
VALUES
('DSA-2025-0001','2025-09-01','Harpal Singh S/o Matu Singh','9636637067','Vill Golwa','TATA 1512',2022,'HR55AL4871',900000,'Seka N',1,1,NULL,1,'approved','Guarantor will provide tomorrow',NULL),
('DSA-2025-0002','2025-09-01','Abhey Singh S/o Duli Chand','7300184340','Vill. Daroli Ahir','TATA 1616',NULL,'New',1800000,'Direct',2,2,NULL,2,'disbursed',NULL,NULL),
('DSA-2025-0003','2025-09-01','Mahesh Kumar','9306982512','Vill. Dhokhera','TATA 1916',NULL,'New',1900000,'Seka Y',1,3,NULL,3,'disbursed',NULL,NULL),
('DSA-2025-0004','2025-09-01','Omprakash S/o Madu','8769638340','Vill. Mehara Jatuwas','LPT 3718',2022,'RJ32GC9878',1600000,'Direct',2,1,NULL,1,'rejected',NULL,NULL),
('DSA-2025-0005','2025-09-05','Ramesh Verma','9988776655','Vill. Karnal','TATA 407',2021,'HR29AB1234',650000,'Seka N',1,4,1,2,'pending','Documents pending from customer',NULL),
('DSA-2025-0006','2025-09-07','Suresh Chand','8877665544','Vill. Rohtak','Mahindra Blazo',2023,'HR12CD5678',2200000,'Direct',2,5,2,1,'disbursed',NULL,25000),
('DSA-2025-0007','2025-09-10','Pradeep Kumar','7766554433','Vill. Panipat','Ashok Leyland 2518',2022,'HR06EF9012',1750000,'Seka N',1,6,NULL,3,'approved',NULL,18000),
('DSA-2025-0008','2025-09-12','Naresh Singh','6655443322','Vill. Sonipat','TATA 2518',2020,'HR27GH3456',1400000,'Direct',2,2,3,2,'on_hold','Insurance pending',NULL);

-- Follow-ups for lead 1
INSERT INTO `lead_followups` (`lead_id`,`followup_date`,`next_followup_date`,`remarks`,`status_changed_to`,`created_by`) VALUES
(1,'2025-09-02','2025-09-05','Called customer, guarantor documents awaited','pending',1),
(1,'2025-09-05','2025-09-08','Guarantor documents received, sent to financer','approved',1);

-- Follow-ups for lead 5
INSERT INTO `lead_followups` (`lead_id`,`followup_date`,`next_followup_date`,`remarks`,`status_changed_to`,`created_by`) VALUES
(5,'2025-09-06','2025-09-09','Customer promised to submit documents by Monday','pending',2),
(5,'2025-09-09','2025-09-12','Still waiting for income proof','pending',2);

-- Commissions
INSERT INTO `commissions` (`lead_id`,`agent_id`,`commission_amount`,`paid_amount`,`payment_date`,`payment_mode`) VALUES
(2,2,9000,9000,'2025-09-15','bank_transfer'),
(3,1,9500,9500,'2025-09-15','bank_transfer'),
(6,2,11000,11000,'2025-09-20','bank_transfer');
