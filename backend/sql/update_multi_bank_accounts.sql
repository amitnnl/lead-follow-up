-- ============================================================
-- Multi-Bank Accounts & Isolated Ledger System Migration
-- ============================================================

-- 1. Create company_bank_accounts table
CREATE TABLE IF NOT EXISTS `company_bank_accounts` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `account_name` VARCHAR(200) NOT NULL,
  `entity_name` VARCHAR(200) NULL,
  `bank_name` VARCHAR(100) NOT NULL,
  `account_number` VARCHAR(50) NOT NULL,
  `ifsc_code` VARCHAR(20) NULL,
  `branch_name` VARCHAR(150) NULL,
  `account_type` ENUM('current', 'savings', 'od_cc') NOT NULL DEFAULT 'current',
  `opening_balance` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `opening_date` DATE NOT NULL,
  `current_balance` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `is_default` TINYINT(1) NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Add bank_account_id to bank_ledger
ALTER TABLE `bank_ledger`
ADD COLUMN IF NOT EXISTS `bank_account_id` INT UNSIGNED NULL AFTER `id`;

-- 3. Indexes for high performance
CREATE INDEX IF NOT EXISTS `idx_bank_ledger_acc` ON `bank_ledger` (`bank_account_id`, `post_date`);
CREATE INDEX IF NOT EXISTS `idx_bank_ledger_acc_utr` ON `bank_ledger` (`bank_account_id`, `utr_number`);

-- 4. Create a default account if no accounts exist yet
INSERT INTO `company_bank_accounts` (`account_name`, `entity_name`, `bank_name`, `account_number`, `ifsc_code`, `opening_balance`, `opening_date`, `is_default`, `is_active`)
SELECT 'Primary Company Account', 'Company Operations', 'Primary Bank', 'PRIMARY001', 'DEFAULT', 0.00, '2024-01-01', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM `company_bank_accounts` LIMIT 1);

-- 5. Backfill existing bank_ledger rows to default account
UPDATE `bank_ledger`
SET `bank_account_id` = (SELECT `id` FROM `company_bank_accounts` WHERE `is_default` = 1 LIMIT 1)
WHERE `bank_account_id` IS NULL;
