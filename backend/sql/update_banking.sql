-- Create lead_banking table
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

-- Create lead_transactions table (payouts to clients)
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
