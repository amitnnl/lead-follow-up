ALTER TABLE `financers` ADD COLUMN `dsa_code` VARCHAR(100) NULL COMMENT 'DSA Code assigned by this financer' AFTER `name`;
ALTER TABLE `leads` ADD COLUMN `financer_lead_number` VARCHAR(100) NULL COMMENT 'Lead/App number given by financer' AFTER `financer_id`;
