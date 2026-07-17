-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: dsa_leads
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `agents`
--

DROP TABLE IF EXISTS `agents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `agents` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned DEFAULT NULL,
  `name` varchar(150) NOT NULL,
  `mobile` varchar(15) NOT NULL,
  `email` varchar(150) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `pan_number` varchar(20) DEFAULT NULL,
  `bank_account` varchar(30) DEFAULT NULL,
  `ifsc_code` varchar(15) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `agents_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `agents`
--

LOCK TABLES `agents` WRITE;
/*!40000 ALTER TABLE `agents` DISABLE KEYS */;
INSERT INTO `agents` VALUES (1,NULL,'Rahul Desai','7777777771',NULL,NULL,NULL,NULL,NULL,1,'2026-06-08 14:44:22'),(2,NULL,'Amit N.','7777777772',NULL,NULL,NULL,NULL,NULL,1,'2026-06-08 14:44:22');
/*!40000 ALTER TABLE `agents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `commissions`
--

DROP TABLE IF EXISTS `commissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `commissions` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `lead_id` int(10) unsigned NOT NULL,
  `agent_id` int(10) unsigned DEFAULT NULL,
  `commission_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `paid_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `payment_date` date DEFAULT NULL,
  `payment_mode` enum('cash','bank_transfer','cheque') DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `payout_90_status` enum('pending','paid') NOT NULL DEFAULT 'pending',
  `payout_90_date` date DEFAULT NULL,
  `payout_90_mode` enum('cash','bank_transfer','cheque') DEFAULT NULL,
  `payout_10_status` enum('pending','paid') NOT NULL DEFAULT 'pending',
  `payout_10_date` date DEFAULT NULL,
  `payout_10_mode` enum('cash','bank_transfer','cheque') DEFAULT NULL,
  `additional_payout` decimal(10,2) NOT NULL DEFAULT 0.00,
  `irr_percentage` decimal(5,2) DEFAULT NULL,
  `payout_percentage` decimal(5,2) DEFAULT NULL,
  `gross_payout` decimal(12,2) NOT NULL DEFAULT 0.00,
  `tds_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `gst_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `net_payout` decimal(12,2) NOT NULL DEFAULT 0.00,
  `channel_paid_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `channel_payment_date` date DEFAULT NULL,
  `balance_payout` decimal(12,2) NOT NULL DEFAULT 0.00,
  `payout_month` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `lead_id` (`lead_id`),
  KEY `agent_id` (`agent_id`),
  CONSTRAINT `commissions_ibfk_1` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE CASCADE,
  CONSTRAINT `commissions_ibfk_2` FOREIGN KEY (`agent_id`) REFERENCES `agents` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `commissions`
--

LOCK TABLES `commissions` WRITE;
/*!40000 ALTER TABLE `commissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `commissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dealers`
--

DROP TABLE IF EXISTS `dealers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `dealers` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(200) NOT NULL,
  `contact_person` varchar(150) DEFAULT NULL,
  `mobile` varchar(15) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dealers`
--

LOCK TABLES `dealers` WRITE;
/*!40000 ALTER TABLE `dealers` DISABLE KEYS */;
INSERT INTO `dealers` VALUES (1,'Royal Motors','Sanjay Patel','8888888881','Ahmedabad',1,'2026-06-08 14:44:22'),(2,'AutoWorld Showroom','Arun Verma','8888888882','Surat',1,'2026-06-08 14:44:22');
/*!40000 ALTER TABLE `dealers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `executives`
--

DROP TABLE IF EXISTS `executives`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `executives` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned DEFAULT NULL,
  `name` varchar(150) NOT NULL,
  `mobile` varchar(15) NOT NULL,
  `email` varchar(150) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `executives_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `executives`
--

LOCK TABLES `executives` WRITE;
/*!40000 ALTER TABLE `executives` DISABLE KEYS */;
INSERT INTO `executives` VALUES (1,6,'Neha Gupta','9999999999',NULL,1,'2026-06-08 14:44:22');
/*!40000 ALTER TABLE `executives` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `failed_logins`
--

DROP TABLE IF EXISTS `failed_logins`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `failed_logins` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `ip_address` varchar(45) NOT NULL,
  `attempt_time` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_ip_time` (`ip_address`,`attempt_time`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `failed_logins`
--

LOCK TABLES `failed_logins` WRITE;
/*!40000 ALTER TABLE `failed_logins` DISABLE KEYS */;
/*!40000 ALTER TABLE `failed_logins` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `financers`
--

DROP TABLE IF EXISTS `financers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `financers` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(200) NOT NULL,
  `contact_person` varchar(150) DEFAULT NULL,
  `mobile` varchar(15) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `financers`
--

LOCK TABLES `financers` WRITE;
/*!40000 ALTER TABLE `financers` DISABLE KEYS */;
INSERT INTO `financers` VALUES (1,'HDFC Bank','Vikram Singh','9876543210',NULL,1,'2026-06-08 14:44:22'),(2,'Cholamandalam Finance','Priya Sharma','9876543211',NULL,1,'2026-06-08 14:44:22'),(3,'Shriram Finance','Ravi Kumar','9876543212',NULL,1,'2026-06-08 14:44:22');
/*!40000 ALTER TABLE `financers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lead_banking`
--

DROP TABLE IF EXISTS `lead_banking`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lead_banking` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `lead_id` int(10) unsigned NOT NULL,
  `received_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `received_date` date DEFAULT NULL,
  `rc_charges` decimal(10,2) NOT NULL DEFAULT 0.00,
  `insurance_charges` decimal(10,2) NOT NULL DEFAULT 0.00,
  `rto_charges` decimal(10,2) NOT NULL DEFAULT 0.00,
  `other_charges` decimal(10,2) NOT NULL DEFAULT 0.00,
  `banking_notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `lead_id` (`lead_id`),
  CONSTRAINT `lead_banking_ibfk_1` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lead_banking`
--

LOCK TABLES `lead_banking` WRITE;
/*!40000 ALTER TABLE `lead_banking` DISABLE KEYS */;
/*!40000 ALTER TABLE `lead_banking` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lead_documents`
--

DROP TABLE IF EXISTS `lead_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lead_documents` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `lead_id` int(10) unsigned NOT NULL,
  `document_type` enum('aadhaar','pan','bank_statement','rc','insurance','vehicle_image','other') NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `verification_status` enum('pending','verified','rejected') DEFAULT 'pending',
  `verification_notes` text DEFAULT NULL,
  `uploaded_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `lead_id` (`lead_id`),
  CONSTRAINT `lead_documents_ibfk_1` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lead_documents`
--

LOCK TABLES `lead_documents` WRITE;
/*!40000 ALTER TABLE `lead_documents` DISABLE KEYS */;
/*!40000 ALTER TABLE `lead_documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lead_followups`
--

DROP TABLE IF EXISTS `lead_followups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lead_followups` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `lead_id` int(10) unsigned NOT NULL,
  `followup_date` date NOT NULL,
  `next_followup_date` date DEFAULT NULL,
  `remarks` text NOT NULL,
  `status_changed_to` varchar(50) DEFAULT NULL,
  `created_by` int(10) unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `lead_id` (`lead_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `lead_followups_ibfk_1` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE CASCADE,
  CONSTRAINT `lead_followups_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lead_followups`
--

LOCK TABLES `lead_followups` WRITE;
/*!40000 ALTER TABLE `lead_followups` DISABLE KEYS */;
INSERT INTO `lead_followups` VALUES (4,5,'2026-06-09','2026-06-09','lead was approved by karan singh','approved',1,'2026-06-09 13:26:32');
/*!40000 ALTER TABLE `lead_followups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lead_logs`
--

DROP TABLE IF EXISTS `lead_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lead_logs` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `lead_id` int(10) unsigned NOT NULL,
  `action` varchar(100) NOT NULL,
  `details` text DEFAULT NULL,
  `performed_by` int(10) unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `lead_id` (`lead_id`),
  KEY `performed_by` (`performed_by`),
  CONSTRAINT `lead_logs_ibfk_1` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE CASCADE,
  CONSTRAINT `lead_logs_ibfk_2` FOREIGN KEY (`performed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lead_logs`
--

LOCK TABLES `lead_logs` WRITE;
/*!40000 ALTER TABLE `lead_logs` DISABLE KEYS */;
INSERT INTO `lead_logs` VALUES (6,5,'Created','Lead created with ID JUN-2026-0001',1,'2026-06-09 13:25:21'),(7,5,'Lead Assigned','Assignment updated by Admin User',1,'2026-06-09 13:25:57'),(8,5,'Status Changed','From pending to approved',1,'2026-06-09 13:26:32'),(9,5,'Follow-up Added','lead was approved by karan singh',1,'2026-06-09 13:26:32');
/*!40000 ALTER TABLE `lead_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lead_transactions`
--

DROP TABLE IF EXISTS `lead_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lead_transactions` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `lead_id` int(10) unsigned NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `payment_date` date NOT NULL,
  `payment_mode` enum('cash','bank_transfer','cheque') DEFAULT 'bank_transfer',
  `reference_number` varchar(100) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_by` int(10) unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `lead_id` (`lead_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `lead_transactions_ibfk_1` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE CASCADE,
  CONSTRAINT `lead_transactions_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lead_transactions`
--

LOCK TABLES `lead_transactions` WRITE;
/*!40000 ALTER TABLE `lead_transactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `lead_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `leads`
--

DROP TABLE IF EXISTS `leads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `leads` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `lead_id` varchar(20) NOT NULL COMMENT 'Auto-generated e.g. DSA-2025-0001',
  `lead_date` date NOT NULL,
  `customer_name` varchar(200) NOT NULL,
  `customer_mobile` varchar(15) NOT NULL,
  `customer_mobile2` varchar(15) DEFAULT NULL,
  `customer_address` text DEFAULT NULL,
  `vehicle_make_model` varchar(200) DEFAULT NULL COMMENT 'e.g. TATA 1512',
  `vehicle_condition` enum('new','old') NOT NULL DEFAULT 'new',
  `year_of_manufacture` year(4) DEFAULT NULL,
  `registration_number` varchar(30) DEFAULT NULL,
  `loan_amount` decimal(12,2) DEFAULT NULL,
  `loan_type` enum('new_loan','refinance') NOT NULL DEFAULT 'new_loan',
  `customer_bank_name` varchar(150) DEFAULT NULL,
  `customer_account_number` varchar(30) DEFAULT NULL,
  `customer_ifsc_code` varchar(15) DEFAULT NULL,
  `referred_by` varchar(200) DEFAULT NULL,
  `agent_id` int(10) unsigned DEFAULT NULL,
  `financer_id` int(10) unsigned DEFAULT NULL,
  `dealer_id` int(10) unsigned DEFAULT NULL,
  `executive_id` int(10) unsigned DEFAULT NULL COMMENT 'SFE assigned',
  `status` enum('new','pending','approved','disbursed','rejected','on_hold') NOT NULL DEFAULT 'new',
  `status_date` date DEFAULT NULL,
  `query_notes` text DEFAULT NULL,
  `rc_status` enum('pending','received','not_applicable') DEFAULT 'pending',
  `rc_number` varchar(50) DEFAULT NULL,
  `insurance_status` enum('pending','received','not_applicable') DEFAULT 'pending',
  `insurance_number` varchar(50) DEFAULT NULL,
  `rto_status` enum('pending','done','not_applicable') DEFAULT 'pending',
  `payout_amount` decimal(10,2) DEFAULT NULL,
  `payout_status` enum('pending','paid','partial') DEFAULT 'pending',
  `created_by` int(10) unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `disbursement_date` date DEFAULT NULL,
  `financer_branch` varchar(150) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `lead_id` (`lead_id`),
  KEY `agent_id` (`agent_id`),
  KEY `financer_id` (`financer_id`),
  KEY `dealer_id` (`dealer_id`),
  KEY `executive_id` (`executive_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `leads_ibfk_1` FOREIGN KEY (`agent_id`) REFERENCES `agents` (`id`) ON DELETE SET NULL,
  CONSTRAINT `leads_ibfk_2` FOREIGN KEY (`financer_id`) REFERENCES `financers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `leads_ibfk_3` FOREIGN KEY (`dealer_id`) REFERENCES `dealers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `leads_ibfk_4` FOREIGN KEY (`executive_id`) REFERENCES `executives` (`id`) ON DELETE SET NULL,
  CONSTRAINT `leads_ibfk_5` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `leads`
--

LOCK TABLES `leads` WRITE;
/*!40000 ALTER TABLE `leads` DISABLE KEYS */;
INSERT INTO `leads` VALUES (5,'JUN-2026-0001','2026-06-09','Amit Jangid','09416341097','','House No.206, Street No.1,','Swift LXI','new',2025,'HR35B3506',425000.00,'refinance',NULL,NULL,NULL,'Lalit Saini',2,1,NULL,1,'approved','2026-06-09','look up thaat lead','pending',NULL,'pending',NULL,'pending',NULL,'pending',1,'2026-06-09 13:25:21','2026-06-09 13:26:32',NULL,NULL);
/*!40000 ALTER TABLE `leads` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','agent','staff','executive') NOT NULL DEFAULT 'staff',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Admin User','admin@dsaleads.com','$2y$10$eo6f87GHmMiMbXPCANcffuNoGxd2He2d7mKqK8Zpc9pZLMEAFpjiW','admin',1,'2026-05-25 04:51:52','2026-05-25 04:51:52'),(2,'Vikram Kumar','vikram@dsaleads.com','$2y$10$eo6f87GHmMiMbXPCANcffuNoGxd2He2d7mKqK8Zpc9pZLMEAFpjiW','staff',1,'2026-05-25 04:51:52','2026-05-25 04:51:52'),(3,'Yogesh Sharma','yogesh@dsaleads.com','$2y$10$eo6f87GHmMiMbXPCANcffuNoGxd2He2d7mKqK8Zpc9pZLMEAFpjiW','staff',1,'2026-05-25 04:51:52','2026-05-25 04:51:52'),(4,'Kavinder Singh','kavinder@dsaleads.com','$2y$10$eo6f87GHmMiMbXPCANcffuNoGxd2He2d7mKqK8Zpc9pZLMEAFpjiW','agent',1,'2026-05-25 04:51:52','2026-05-25 04:51:52'),(5,'Seka Agent','seka@dsaleads.com','$2y$10$eo6f87GHmMiMbXPCANcffuNoGxd2He2d7mKqK8Zpc9pZLMEAFpjiW','agent',1,'2026-05-25 04:51:52','2026-05-25 04:51:52'),(6,'Neha Gupta','neha@demo.com','$2y$10$PRZ.NkP8Im725EFm/jm30e1zZriHaO/JT8srvZkfJ4zEdYOolEH96','executive',1,'2026-06-06 15:18:14','2026-06-06 15:18:14');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-10 10:28:12
