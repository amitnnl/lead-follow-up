-- CIBIL Check Integration Database Updates

-- 1. Add PAN and DOB to leads table
ALTER TABLE `leads` 
ADD COLUMN `customer_pan` VARCHAR(20) NULL AFTER `customer_address`,
ADD COLUMN `customer_dob` DATE NULL AFTER `customer_pan`,
ADD COLUMN `cibil_score` INT NULL AFTER `customer_dob`;

-- 2. Create the CIBIL Checks table
CREATE TABLE IF NOT EXISTS `lead_cibil_checks` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `lead_id` INT UNSIGNED NOT NULL,
  `pan_number` VARCHAR(20) NOT NULL,
  `dob` DATE NOT NULL,
  `cibil_score` INT NOT NULL,
  `report_url` VARCHAR(255) NULL,
  `api_response_json` TEXT NULL,
  `fetched_by` INT UNSIGNED NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`fetched_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;
