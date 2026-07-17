-- ============================================================
-- Enterprise Banking & Payouts Expansion Migration
-- ============================================================

-- Add payout_type, approval_status, approved_by, approval_date, rejection_reason to lead_transactions
ALTER TABLE `lead_transactions`
ADD COLUMN IF NOT EXISTS `payout_type` ENUM('customer','dealer','org_retained','commission') NOT NULL DEFAULT 'customer',
ADD COLUMN IF NOT EXISTS `beneficiary_name` VARCHAR(200) NULL,
ADD COLUMN IF NOT EXISTS `status` VARCHAR(50) DEFAULT 'completed',
ADD COLUMN IF NOT EXISTS `approval_status` ENUM('approved','pending_approval','rejected') NOT NULL DEFAULT 'approved',
ADD COLUMN IF NOT EXISTS `approved_by` INT UNSIGNED NULL,
ADD COLUMN IF NOT EXISTS `approval_date` DATETIME NULL,
ADD COLUMN IF NOT EXISTS `rejection_reason` TEXT NULL;

-- Add tds_rate, tds_amount, net_payable, approval_status, approved_by, approval_date, batch_id to commissions
ALTER TABLE `commissions`
ADD COLUMN IF NOT EXISTS `tds_rate` DECIMAL(5,2) NOT NULL DEFAULT 5.00,
ADD COLUMN IF NOT EXISTS `tds_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS `net_payable` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS `approval_status` ENUM('approved','pending_approval','rejected') NOT NULL DEFAULT 'approved',
ADD COLUMN IF NOT EXISTS `approved_by` INT UNSIGNED NULL,
ADD COLUMN IF NOT EXISTS `approval_date` DATETIME NULL,
ADD COLUMN IF NOT EXISTS `batch_id` VARCHAR(50) NULL;
