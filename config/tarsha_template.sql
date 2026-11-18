-- MySQL dump 10.13  Distrib 8.4.5, for macos15 (arm64)
--
-- Host: localhost    Database: tarsha
-- ------------------------------------------------------
-- Server version	8.4.5

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `all_important_`
--

DROP TABLE IF EXISTS `all_important_`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `all_important_` (
  `id` int NOT NULL AUTO_INCREMENT,
  `mst_company_id` int DEFAULT NULL,
  `mst_file_id` int DEFAULT NULL,
  `mst_type_id` int DEFAULT NULL,
  `show_website` int DEFAULT '0',
  `description` text,
  `short_description` text,
  `amount` double DEFAULT NULL,
  `date` date DEFAULT NULL,
  `file` text,
  `remark_by_hod` varchar(225) DEFAULT NULL,
  `remark_by_emp` varchar(225) DEFAULT NULL,
  `approved_by_hod` int DEFAULT NULL,
  `card` varchar(45) DEFAULT NULL,
  `is_save` int NOT NULL DEFAULT '0',
  `is_skip` int NOT NULL DEFAULT '0',
  `is_deleted` int NOT NULL DEFAULT '0',
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=776 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `all_important_fees`
--

DROP TABLE IF EXISTS `all_important_fees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `all_important_fees` (
  `id` int NOT NULL AUTO_INCREMENT,
  `approval_id` int DEFAULT NULL,
  `receipt_no` varchar(45) DEFAULT NULL,
  `fee_type` varchar(45) DEFAULT NULL,
  `amount` varchar(45) DEFAULT NULL,
  `date` date DEFAULT NULL,
  `file_upload` longtext,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=261 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `approval_process`
--

DROP TABLE IF EXISTS `approval_process`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `approval_process` (
  `id` int NOT NULL AUTO_INCREMENT,
  `level` varchar(45) DEFAULT NULL,
  `approval_id` int DEFAULT NULL,
  `date` date DEFAULT NULL,
  `status` varchar(45) DEFAULT NULL,
  `query` varchar(225) DEFAULT NULL,
  `approved_letter` longtext,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=302 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `arch_agency`
--

DROP TABLE IF EXISTS `arch_agency`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `arch_agency` (
  `id` int NOT NULL AUTO_INCREMENT,
  `arch_id` int DEFAULT NULL,
  `category_id` int DEFAULT NULL,
  `zed_upload` text,
  `agency_upload` text,
  `agency_name` text,
  `status` int DEFAULT NULL,
  `remark` text,
  `is_done` int DEFAULT NULL,
  `completed_date` date DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `arch_basic_details`
--

DROP TABLE IF EXISTS `arch_basic_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `arch_basic_details` (
  `id` int NOT NULL AUTO_INCREMENT,
  `arch_id` int DEFAULT NULL,
  `client_id` int DEFAULT NULL,
  `company_name` text,
  `email` text,
  `phone` text,
  `project_type` text,
  `scopework` text,
  `requirement` text,
  `project_detail` text,
  `is_done` int DEFAULT NULL,
  `completed_date` date DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_arch_id` (`arch_id`),
  KEY `idx_arch` (`arch_id`)
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `arch_contractor`
--

DROP TABLE IF EXISTS `arch_contractor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `arch_contractor` (
  `id` int NOT NULL AUTO_INCREMENT,
  `arch_id` int DEFAULT NULL,
  `category_id` int DEFAULT NULL,
  `vendors` int DEFAULT NULL,
  `price` int DEFAULT NULL,
  `status` int DEFAULT NULL,
  `remark` text,
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `arch_design_concept`
--

DROP TABLE IF EXISTS `arch_design_concept`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `arch_design_concept` (
  `id` int NOT NULL AUTO_INCREMENT,
  `arch_id` int NOT NULL,
  `category_id` int NOT NULL,
  `design_file` text,
  `internalstatus` int DEFAULT NULL,
  `internalremark` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `review_by` int DEFAULT NULL,
  `notes` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `clientstatus` int NOT NULL,
  `clientremark` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=104 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `arch_drawing`
--

DROP TABLE IF EXISTS `arch_drawing`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `arch_drawing` (
  `id` int NOT NULL AUTO_INCREMENT,
  `arch_id` int DEFAULT NULL,
  `design` text,
  `notes` text,
  `category_id` int DEFAULT NULL,
  `internalstatus` int DEFAULT NULL,
  `internalremark` text,
  `review_by` text,
  `clientstatus` int DEFAULT NULL,
  `clientremark` text,
  `client_review_by` int DEFAULT NULL,
  `is_done` int DEFAULT NULL,
  `team_id` int DEFAULT NULL,
  `completed_date` date DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_arch_id` (`arch_id`),
  KEY `idx_arch` (`arch_id`)
) ENGINE=InnoDB AUTO_INCREMENT=188 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `arch_finald`
--

DROP TABLE IF EXISTS `arch_finald`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `arch_finald` (
  `id` int NOT NULL AUTO_INCREMENT,
  `arch_id` int DEFAULT NULL,
  `upload` text,
  `type` text,
  `remark` varchar(225) DEFAULT NULL,
  `status` int DEFAULT NULL,
  `statusremark` varchar(225) DEFAULT NULL,
  `is_done` int DEFAULT NULL,
  `team_id` int DEFAULT NULL,
  `completed_date` date DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_arch_id` (`arch_id`),
  KEY `idx_arch` (`arch_id`)
) ENGINE=InnoDB AUTO_INCREMENT=51 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `arch_material`
--

DROP TABLE IF EXISTS `arch_material`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `arch_material` (
  `id` int NOT NULL AUTO_INCREMENT,
  `arch_id` int DEFAULT NULL,
  `category_id` int DEFAULT NULL,
  `vendor` int DEFAULT NULL,
  `material_photo` text,
  `material_name` text,
  `rate` int DEFAULT NULL,
  `status` int DEFAULT NULL,
  `remark` text,
  `is_done` int DEFAULT NULL,
  `completed_date` date DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `arch_mepf`
--

DROP TABLE IF EXISTS `arch_mepf`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `arch_mepf` (
  `id` int NOT NULL AUTO_INCREMENT,
  `arch_id` int DEFAULT NULL,
  `category_id` int DEFAULT NULL,
  `zed_upload` text,
  `agency_upload` text,
  `agency_name` varchar(225) DEFAULT NULL,
  `internalstatus` int DEFAULT NULL,
  `internalremark` varchar(225) DEFAULT NULL,
  `clientstatus` int DEFAULT NULL,
  `clientremark` varchar(225) DEFAULT NULL,
  `remark` varchar(225) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=61 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `arch_space_planning`
--

DROP TABLE IF EXISTS `arch_space_planning`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `arch_space_planning` (
  `id` int NOT NULL AUTO_INCREMENT,
  `arch_id` int NOT NULL,
  `category_id` int DEFAULT NULL,
  `internalstatus` int DEFAULT NULL,
  `internalremark` varchar(225) DEFAULT NULL,
  `review_by` int DEFAULT NULL,
  `design_file` text,
  `notes` text,
  `clientstatus` int DEFAULT NULL,
  `clientremark` varchar(225) DEFAULT NULL,
  `team_id` int DEFAULT NULL,
  `completed_date` date DEFAULT NULL,
  `is_done` int DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_arch_id` (`arch_id`),
  KEY `idx_arch` (`arch_id`),
  KEY `idx_arch2` (`arch_id`)
) ENGINE=InnoDB AUTO_INCREMENT=87 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `arch_structure`
--

DROP TABLE IF EXISTS `arch_structure`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `arch_structure` (
  `id` int NOT NULL AUTO_INCREMENT,
  `arch_id` int DEFAULT NULL,
  `category_id` int DEFAULT NULL,
  `zed_upload` text,
  `notes` varchar(255) DEFAULT NULL,
  `agency_upload` text,
  `agency_name` varchar(225) DEFAULT NULL,
  `internalstatus` int DEFAULT NULL,
  `internalremark` text,
  `clientstatus` int DEFAULT NULL,
  `clientremark` text,
  `remark` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=181 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `arch_threed`
--

DROP TABLE IF EXISTS `arch_threed`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `arch_threed` (
  `id` int NOT NULL AUTO_INCREMENT,
  `arch_id` int DEFAULT NULL,
  `category_id` int DEFAULT NULL,
  `vendor` varchar(255) DEFAULT NULL,
  `phone` varchar(225) DEFAULT NULL,
  `designphoto` text,
  `notes` varchar(225) DEFAULT NULL,
  `internalstatus` int DEFAULT NULL,
  `internalremark` varchar(255) DEFAULT NULL,
  `clientstatus` int DEFAULT NULL,
  `clientremark` varchar(225) DEFAULT NULL,
  `review_by` int DEFAULT NULL,
  `is_done` int DEFAULT NULL,
  `team_id` int DEFAULT NULL,
  `completed_date` date DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_arch_id` (`arch_id`),
  KEY `idx_arch` (`arch_id`)
) ENGINE=InnoDB AUTO_INCREMENT=109 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `arch_vendor`
--

DROP TABLE IF EXISTS `arch_vendor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `arch_vendor` (
  `id` int NOT NULL AUTO_INCREMENT,
  `arch_id` int DEFAULT NULL,
  `category_id` int DEFAULT NULL,
  `vendors` int DEFAULT NULL,
  `price` int DEFAULT NULL,
  `status` int DEFAULT NULL,
  `remark` text,
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `architecture_category`
--

DROP TABLE IF EXISTS `architecture_category`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `architecture_category` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` text,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `attendance`
--

DROP TABLE IF EXISTS `attendance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attendance` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `date` datetime DEFAULT NULL,
  `checkin` time DEFAULT NULL,
  `checkout` time DEFAULT NULL,
  `breakin` time DEFAULT NULL,
  `breakout` time DEFAULT NULL,
  `latitude` varchar(45) DEFAULT NULL,
  `longitude` varchar(45) DEFAULT NULL,
  `out_latitude` varchar(45) DEFAULT NULL,
  `out_longitude` varchar(45) DEFAULT NULL,
  `total_time` int DEFAULT NULL,
  `total_hours` decimal(8,2) DEFAULT NULL,
  `att_type` int DEFAULT NULL COMMENT '1= present,2= half day,3= full day leave,4 = absent',
  `in_reason` varchar(225) DEFAULT NULL,
  `out_reason` varchar(225) DEFAULT NULL,
  `reason` varchar(225) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `notes` varchar(255) DEFAULT NULL,
  `status` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '1 = apporved,2 = reject',
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_attendance_user_date` (`user_id`,`date`,`is_deleted`)
) ENGINE=InnoDB AUTO_INCREMENT=5893 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `basic_details`
--

DROP TABLE IF EXISTS `basic_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `basic_details` (
  `id` int NOT NULL AUTO_INCREMENT,
  `interior_id` int DEFAULT NULL,
  `client_id` int DEFAULT NULL,
  `company_name` varchar(233) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(225) DEFAULT NULL,
  `project_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `requirement` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `scopework` text,
  `project_detail` text,
  `is_done` int DEFAULT NULL,
  `completed_date` date DEFAULT NULL,
  `created_at` date DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` date DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_bd_interior_done` (`interior_id`,`is_done`)
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `building_detail`
--

DROP TABLE IF EXISTS `building_detail`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `building_detail` (
  `id` int NOT NULL AUTO_INCREMENT,
  `project_id` int DEFAULT NULL,
  `building_id` int DEFAULT NULL,
  `type` int DEFAULT NULL,
  `image_url` text,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cities`
--

DROP TABLE IF EXISTS `cities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cities` (
  `city_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(30) NOT NULL,
  `state_id` int NOT NULL,
  PRIMARY KEY (`city_id`)
) ENGINE=InnoDB AUTO_INCREMENT=48315 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `city`
--

DROP TABLE IF EXISTS `city`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `city` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `client_source`
--

DROP TABLE IF EXISTS `client_source`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `client_source` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `concept`
--

DROP TABLE IF EXISTS `concept`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `concept` (
  `id` int NOT NULL AUTO_INCREMENT,
  `interior_id` int DEFAULT NULL,
  `category_id` int DEFAULT NULL,
  `design_photo` text,
  `remark` text,
  `internalstatus` int DEFAULT NULL,
  `internalremark` varchar(255) DEFAULT NULL,
  `review_by` int DEFAULT NULL,
  `clientstatus` int DEFAULT NULL,
  `clientremark` varchar(255) DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=308 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `contacts`
--

DROP TABLE IF EXISTS `contacts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contacts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `services` varchar(100) DEFAULT NULL,
  `name` varchar(100) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `company_name` varchar(100) DEFAULT NULL,
  `description` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `countries`
--

DROP TABLE IF EXISTS `countries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `countries` (
  `country_id` int NOT NULL AUTO_INCREMENT,
  `sortname` varchar(3) NOT NULL,
  `name` varchar(150) NOT NULL,
  PRIMARY KEY (`country_id`)
) ENGINE=InnoDB AUTO_INCREMENT=247 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `deposit_expense`
--

DROP TABLE IF EXISTS `deposit_expense`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `deposit_expense` (
  `id` int NOT NULL AUTO_INCREMENT,
  `expense_type` int DEFAULT NULL COMMENT '1=Deposit, 2 = File Expense, 3  = Office Expense',
  `mst_file_id` int DEFAULT NULL COMMENT 'master file id',
  `team_id` int DEFAULT NULL COMMENT 'user_id',
  `amount` double DEFAULT NULL,
  `description` text,
  `date` date NOT NULL,
  `receipt_image` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT 'image',
  `submitters_img1` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `submitters_img2` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `submitters_img3` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `isdeleted` int NOT NULL DEFAULT '0' COMMENT '1 = deleted',
  `is_approved` int NOT NULL DEFAULT '0' COMMENT '1 = approved , 0 = pending , 2=cancel or reject',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_deposit_expense_type_date` (`expense_type`,`date`,`isdeleted`)
) ENGINE=InnoDB AUTO_INCREMENT=333 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `document_collection`
--

DROP TABLE IF EXISTS `document_collection`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `document_collection` (
  `id` int NOT NULL AUTO_INCREMENT,
  `document_clearance_id` int DEFAULT NULL,
  `team_id` varchar(25) DEFAULT NULL,
  `card` text,
  `doc_id` int DEFAULT NULL,
  `type` varchar(225) DEFAULT NULL,
  `photo` longtext,
  `completed_date` date DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5383 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `document_customer`
--

DROP TABLE IF EXISTS `document_customer`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `document_customer` (
  `id` int NOT NULL AUTO_INCREMENT,
  `mst_customer_id` int DEFAULT NULL COMMENT 'mst_cust',
  `document_path` int DEFAULT NULL,
  `mst_document_id` int DEFAULT NULL COMMENT 'mst_doc',
  `mst_company_id` int DEFAULT NULL COMMENT 'mst_comp',
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `document_employee`
--

DROP TABLE IF EXISTS `document_employee`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `document_employee` (
  `id` int NOT NULL AUTO_INCREMENT,
  `mst_employee_id` int DEFAULT NULL COMMENT 'mst_emp',
  `mst_document_id` text COMMENT 'mst_doc',
  `document_path` text,
  `mst_company_id` int DEFAULT NULL COMMENT 'mst_comp',
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `e_nagar_input_drawing`
--

DROP TABLE IF EXISTS `e_nagar_input_drawing`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `e_nagar_input_drawing` (
  `id` int NOT NULL AUTO_INCREMENT,
  `e_nagar_mst_id` int DEFAULT NULL,
  `upload_date` date DEFAULT NULL,
  `predcr_drawing` longtext,
  `query` varchar(225) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=43 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `e_nagar_mst_input`
--

DROP TABLE IF EXISTS `e_nagar_mst_input`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `e_nagar_mst_input` (
  `id` int NOT NULL AUTO_INCREMENT,
  `approval_id` int DEFAULT NULL,
  `architecturename` varchar(45) DEFAULT NULL,
  `developername` varchar(45) DEFAULT NULL,
  `application_upload_date` date DEFAULT NULL,
  `applicationnumber` varchar(45) DEFAULT NULL,
  `loginId` varchar(45) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `e_nagar_mst_output`
--

DROP TABLE IF EXISTS `e_nagar_mst_output`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `e_nagar_mst_output` (
  `id` int NOT NULL AUTO_INCREMENT,
  `approval_id` int DEFAULT NULL,
  `smcassign_application` varchar(225) DEFAULT NULL,
  `smc_checker_predcrdrawing` longtext,
  `permissionletter` longtext,
  `completed_date` date DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=62 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `e_nagar_output_details`
--

DROP TABLE IF EXISTS `e_nagar_output_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `e_nagar_output_details` (
  `id` int NOT NULL AUTO_INCREMENT,
  `e_nagar_output_mst_id` int DEFAULT NULL,
  `status_date` date DEFAULT NULL,
  `applicationstatus` varchar(225) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `emp_behavioural_competencies`
--

DROP TABLE IF EXISTS `emp_behavioural_competencies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `emp_behavioural_competencies` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `comp_id` int NOT NULL DEFAULT '1',
  `competency` varchar(255) NOT NULL,
  `description` text,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_comp_user` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `emp_career_growth`
--

DROP TABLE IF EXISTS `emp_career_growth`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `emp_career_growth` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `comp_id` int NOT NULL DEFAULT '1',
  `grade` varchar(50) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `condition_text` text,
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_growth_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `emp_domain_knowledge`
--

DROP TABLE IF EXISTS `emp_domain_knowledge`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `emp_domain_knowledge` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `comp_id` int NOT NULL DEFAULT '1',
  `topic` varchar(255) NOT NULL,
  `level` varchar(50) NOT NULL DEFAULT 'Working',
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_domain_user` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `emp_education`
--

DROP TABLE IF EXISTS `emp_education`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `emp_education` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `comp_id` int unsigned NOT NULL DEFAULT '1',
  `degree` varchar(200) NOT NULL,
  `institution` varchar(200) NOT NULL,
  `year` varchar(10) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_edu_user` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `emp_emergency_contacts`
--

DROP TABLE IF EXISTS `emp_emergency_contacts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `emp_emergency_contacts` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `comp_id` int unsigned NOT NULL DEFAULT '1',
  `name` varchar(150) NOT NULL,
  `relation` varchar(100) DEFAULT NULL,
  `phone` varchar(20) NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_ec_user` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `emp_kpis`
--

DROP TABLE IF EXISTS `emp_kpis`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `emp_kpis` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `comp_id` int NOT NULL DEFAULT '1',
  `category` varchar(100) NOT NULL DEFAULT 'Other',
  `metric` text NOT NULL,
  `target` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_emp_kpis_user` (`user_id`,`comp_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `emp_kras`
--

DROP TABLE IF EXISTS `emp_kras`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `emp_kras` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `comp_id` int NOT NULL DEFAULT '1',
  `kra` text NOT NULL,
  `target` varchar(100) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_kra_user` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `emp_responsibilities`
--

DROP TABLE IF EXISTS `emp_responsibilities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `emp_responsibilities` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `comp_id` int unsigned NOT NULL DEFAULT '1',
  `title` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_resp_user` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=114 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `emp_skills`
--

DROP TABLE IF EXISTS `emp_skills`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `emp_skills` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `comp_id` int unsigned NOT NULL DEFAULT '1',
  `name` varchar(150) NOT NULL,
  `level` tinyint unsigned NOT NULL DEFAULT '80' COMMENT '1-100 proficiency %',
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_skill_user` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `emp_software_tools`
--

DROP TABLE IF EXISTS `emp_software_tools`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `emp_software_tools` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `comp_id` int NOT NULL DEFAULT '1',
  `tool` varchar(255) NOT NULL,
  `level` varchar(50) NOT NULL DEFAULT 'Proficient',
  `note` varchar(500) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_tools_user` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `emp_stop_meeting_duties`
--

DROP TABLE IF EXISTS `emp_stop_meeting_duties`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `emp_stop_meeting_duties` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `comp_id` int NOT NULL DEFAULT '1',
  `meeting_type` varchar(100) NOT NULL DEFAULT 'Operational (Daily)',
  `duty` text NOT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_stop_user` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `emp_strengths`
--

DROP TABLE IF EXISTS `emp_strengths`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `emp_strengths` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `title` text,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `emp_system_duties`
--

DROP TABLE IF EXISTS `emp_system_duties`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `emp_system_duties` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `comp_id` int NOT NULL DEFAULT '1',
  `module` varchar(255) NOT NULL,
  `duty` text NOT NULL,
  `frequency` varchar(50) NOT NULL DEFAULT 'Daily',
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_sysduty_user` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `emp_weaknesses`
--

DROP TABLE IF EXISTS `emp_weaknesses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `emp_weaknesses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `title` text,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `emp_work_history`
--

DROP TABLE IF EXISTS `emp_work_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `emp_work_history` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `comp_id` int unsigned NOT NULL DEFAULT '1',
  `role` varchar(200) NOT NULL,
  `company` varchar(200) NOT NULL,
  `period` varchar(100) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_wh_user` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `escrow_expense`
--

DROP TABLE IF EXISTS `escrow_expense`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `escrow_expense` (
  `id` int NOT NULL AUTO_INCREMENT,
  `date` date DEFAULT NULL,
  `project_id` varchar(255) DEFAULT NULL,
  `ledger_group_id` int DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `mobile` varchar(255) DEFAULT NULL,
  `mode` varchar(225) DEFAULT NULL,
  `amount` int DEFAULT NULL,
  `services` text,
  `via_employee_id` varchar(255) DEFAULT NULL,
  `receipt_image` text,
  `remarks` text,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=281 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `escrow_income`
--

DROP TABLE IF EXISTS `escrow_income`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `escrow_income` (
  `id` int NOT NULL AUTO_INCREMENT,
  `date` date DEFAULT NULL,
  `project_id` varchar(255) DEFAULT NULL,
  `amount` int DEFAULT NULL,
  `mode` varchar(225) DEFAULT NULL,
  `via_employee_id` int DEFAULT NULL,
  `services` varchar(225) DEFAULT NULL,
  `remarks` text,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `file_aminities_fees`
--

DROP TABLE IF EXISTS `file_aminities_fees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `file_aminities_fees` (
  `id` int NOT NULL AUTO_INCREMENT,
  `mst_company_id` int DEFAULT NULL,
  `mst_file_id` int DEFAULT NULL,
  `amount` float DEFAULT NULL,
  `emi` int DEFAULT NULL,
  `emi_data` text COMMENT 'json_data [{date:"",amt:"",rec_date:"",file_path:""},{date:"",amt:"",rec_date:"",file_path:""}]',
  `is_type` int DEFAULT NULL COMMENT '1=fsi,2=ic',
  `is_save` int NOT NULL DEFAULT '0',
  `is_skip` int NOT NULL DEFAULT '0',
  `card` varchar(45) DEFAULT NULL,
  `remark_by_hod` varchar(225) DEFAULT NULL,
  `remark_by_emp` varchar(225) DEFAULT NULL,
  `approved_by_hod` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=103 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `file_approved_plan`
--

DROP TABLE IF EXISTS `file_approved_plan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `file_approved_plan` (
  `id` int NOT NULL AUTO_INCREMENT,
  `mst_company_id` int DEFAULT NULL,
  `mst_file_id` int DEFAULT NULL COMMENT 'mst_file',
  `mst_document_id` int DEFAULT NULL,
  `document_name` text,
  `show_website` int DEFAULT '0',
  `document_path` text,
  `remark_by_emp` varchar(225) DEFAULT NULL,
  `remark_by_hod` varchar(225) DEFAULT NULL,
  `card` varchar(45) DEFAULT NULL,
  `approved_by_hod` int DEFAULT NULL,
  `is_save` int DEFAULT '0',
  `is_deleted` int NOT NULL DEFAULT '0',
  `is_skip` int NOT NULL DEFAULT '0',
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=259 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `file_client_msg`
--

DROP TABLE IF EXISTS `file_client_msg`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `file_client_msg` (
  `id` int NOT NULL AUTO_INCREMENT,
  `mst_company_id` int DEFAULT NULL,
  `mst_file_id` int DEFAULT NULL COMMENT 'mst_file',
  `message` text,
  `file_received_date` date DEFAULT NULL,
  `hod_liasoner_id` int DEFAULT NULL,
  `remark_by_hod` varchar(225) DEFAULT NULL,
  `remark_by_emp` varchar(225) DEFAULT NULL,
  `approved_by_hod` int DEFAULT NULL,
  `card` varchar(45) DEFAULT NULL,
  `is_save` int DEFAULT '0',
  `is_skip` int NOT NULL DEFAULT '0',
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=102 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `file_details`
--

DROP TABLE IF EXISTS `file_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `file_details` (
  `id` int NOT NULL AUTO_INCREMENT,
  `mst_file_id` int DEFAULT NULL COMMENT 'mst_file',
  `office_file_no` int DEFAULT NULL,
  `land_detail` varchar(225) DEFAULT NULL,
  `hod` varchar(225) DEFAULT NULL,
  `team_id` int DEFAULT NULL,
  `google_location` varchar(225) DEFAULT NULL,
  `remark_by_assign_to` varchar(225) DEFAULT NULL,
  `remark_by_hod` varchar(225) DEFAULT NULL,
  `approved_by_hod` int DEFAULT NULL,
  `mst_company_id` int DEFAULT NULL COMMENT 'mst_comp',
  `smc_case_app_id` text,
  `village` text,
  `taluka` text,
  `district` text,
  `rs_block_no` int DEFAULT NULL COMMENT '1=RSNo,2=BlockNo',
  `rs_block_no_text` text,
  `tika_moje_no` int DEFAULT NULL COMMENT '1=tika,2=moje',
  `tika_moje_no_text` text,
  `ward_no` text,
  `cs_no` text,
  `tps_no` text,
  `tps_stage` int DEFAULT NULL COMMENT '1=''draft'',2=''final'',3=''Non tp''',
  `op_no` text,
  `fp_no` text,
  `subplot_no` text,
  `is_save` int DEFAULT '0',
  `is_skip` int NOT NULL DEFAULT '0',
  `card` varchar(45) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=119 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `file_document_list`
--

DROP TABLE IF EXISTS `file_document_list`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `file_document_list` (
  `id` int NOT NULL AUTO_INCREMENT,
  `mst_company_id` int DEFAULT NULL,
  `mst_file_id` int DEFAULT NULL COMMENT 'mst_file',
  `mst_document_id` int DEFAULT NULL,
  `disp_order` int DEFAULT '1',
  `is_save` int DEFAULT '0',
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `file_document_upload`
--

DROP TABLE IF EXISTS `file_document_upload`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `file_document_upload` (
  `id` int NOT NULL AUTO_INCREMENT,
  `mst_company_id` int DEFAULT NULL,
  `mst_file_id` int DEFAULT NULL COMMENT 'mst_file',
  `mst_document_id` text,
  `document_name` text,
  `show_website` int DEFAULT '0',
  `document_path` text,
  `approved_by_hod` int DEFAULT NULL,
  `remark_by_hod` varchar(225) DEFAULT NULL,
  `remark_by_emp` varchar(225) DEFAULT NULL,
  `card` varchar(45) DEFAULT NULL,
  `is_save` int DEFAULT '0',
  `is_deleted` int NOT NULL DEFAULT '0',
  `is_skip` int NOT NULL DEFAULT '0',
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=1251 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `file_employee`
--

DROP TABLE IF EXISTS `file_employee`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `file_employee` (
  `id` int NOT NULL AUTO_INCREMENT,
  `mst_file_id` int DEFAULT NULL COMMENT 'mst_file',
  `mst_employee_id` int DEFAULT NULL COMMENT 'mst_emp',
  `status_file_id` int DEFAULT NULL COMMENT 'status_file',
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=2 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `file_enagar_owner_portal`
--

DROP TABLE IF EXISTS `file_enagar_owner_portal`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `file_enagar_owner_portal` (
  `id` int NOT NULL AUTO_INCREMENT,
  `mst_company_id` int DEFAULT NULL,
  `mst_file_id` int DEFAULT NULL COMMENT 'mst_file',
  `application_number` text,
  `upload_date` date DEFAULT NULL,
  `approve_date` date DEFAULT NULL,
  `login` text,
  `password` text,
  `approved_by_hod` int DEFAULT NULL,
  `remark_by_hod` varchar(225) DEFAULT NULL,
  `remark_by_emp` varchar(225) DEFAULT NULL,
  `card` varchar(45) DEFAULT NULL,
  `is_save` int DEFAULT '0',
  `is_skip` int NOT NULL DEFAULT '0',
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=42 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `file_enagar_portal`
--

DROP TABLE IF EXISTS `file_enagar_portal`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `file_enagar_portal` (
  `id` int NOT NULL AUTO_INCREMENT,
  `mst_company_id` int DEFAULT NULL,
  `mst_file_id` int DEFAULT NULL COMMENT 'mst_file',
  `drawing_assign_date` date DEFAULT NULL,
  `completed_date` date DEFAULT NULL,
  `completed_date2` date DEFAULT NULL,
  `upload_date` date DEFAULT NULL,
  `application_number` text,
  `assign_application_number` int DEFAULT NULL,
  `pdf_received_date` date DEFAULT NULL,
  `assign_pdf_received_date` int DEFAULT NULL,
  `smc_checking_date` date DEFAULT NULL,
  `assign_smc_checking_date` int DEFAULT NULL,
  `smc_upload_date` date DEFAULT NULL,
  `approve_date` date DEFAULT NULL,
  `assign_approve_date` int DEFAULT NULL,
  `assign_liasoner` int DEFAULT NULL,
  `assign_planner` int DEFAULT NULL,
  `login` text,
  `password` text,
  `is_save` int DEFAULT '0',
  `is_skip` text,
  `type_save` text,
  `remark_by_hod` varchar(225) DEFAULT NULL,
  `remark_by_emp` varchar(225) DEFAULT NULL,
  `approved_by_hod` int DEFAULT NULL,
  `card` varchar(45) DEFAULT NULL,
  `is_rejected` int NOT NULL DEFAULT '0',
  `reason` text,
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=60 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `file_plot_validation`
--

DROP TABLE IF EXISTS `file_plot_validation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `file_plot_validation` (
  `id` int NOT NULL AUTO_INCREMENT,
  `mst_company_id` int DEFAULT NULL,
  `mst_file_id` int DEFAULT NULL,
  `mst_type_id` int DEFAULT NULL,
  `display_order` int DEFAULT NULL,
  `inward_no` text,
  `inward_date` date DEFAULT NULL,
  `outward_no` text,
  `outward_date` date DEFAULT NULL,
  `inward_assign_to` int DEFAULT NULL,
  `outward_assign_to` int DEFAULT NULL,
  `documents` text,
  `document_upload_date` text,
  `inward_is_save` int NOT NULL DEFAULT '0',
  `outward_is_save` int NOT NULL DEFAULT '0',
  `inward_is_reject` int NOT NULL DEFAULT '0',
  `outward_is_reject` int NOT NULL DEFAULT '0',
  `inward_is_skip` int NOT NULL DEFAULT '0',
  `outward_is_skip` int NOT NULL DEFAULT '0',
  `remark_by_hod` varchar(225) DEFAULT NULL,
  `remark_by_emp` varchar(225) DEFAULT NULL,
  `approved_by_hod` int DEFAULT NULL,
  `card` varchar(45) DEFAULT NULL,
  `is_rejected` int NOT NULL DEFAULT '0',
  `reason` text,
  `created_at` date DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` date DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=641 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `file_plot_validation_x`
--

DROP TABLE IF EXISTS `file_plot_validation_x`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `file_plot_validation_x` (
  `id` int NOT NULL AUTO_INCREMENT,
  `mst_company_id` int DEFAULT NULL,
  `mst_file_id` int DEFAULT NULL COMMENT 'mst_file',
  `mst_type_id` int DEFAULT NULL,
  `inward_no` text,
  `inward_date` date DEFAULT NULL,
  `outward_date` date DEFAULT NULL,
  `outward_no` text,
  `documents` text,
  `document_upload_date` date DEFAULT NULL,
  `assign_to` int DEFAULT NULL,
  `type` int DEFAULT NULL,
  `is_save` int DEFAULT '0',
  `is_rejected` int NOT NULL DEFAULT '0',
  `reason` text,
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=11 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `file_project`
--

DROP TABLE IF EXISTS `file_project`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `file_project` (
  `id` int NOT NULL AUTO_INCREMENT,
  `mst_file_id` int DEFAULT NULL,
  `title` text,
  `mst_company_id` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_by` datetime DEFAULT NULL,
  `updated_at` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `file_query`
--

DROP TABLE IF EXISTS `file_query`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `file_query` (
  `id` int NOT NULL AUTO_INCREMENT,
  `mst_company_id` int DEFAULT NULL,
  `mst_file_id` int DEFAULT NULL,
  `type_number` int DEFAULT NULL COMMENT '1=assistant_junior_eng,2=Deputy eng, 3= zonal officer,4=Deputy commissioner,5 = commissioner',
  `remarks` text,
  `date` date DEFAULT NULL,
  `documents` text,
  `is_save` int DEFAULT '0',
  `is_skip` int NOT NULL DEFAULT '0',
  `is_rejected` int DEFAULT '0',
  `remark_by_hod` varchar(225) DEFAULT NULL,
  `remark_by_emp` varchar(225) DEFAULT NULL,
  `approved_by_hod` int DEFAULT NULL,
  `card` varchar(45) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=266 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `file_road_scrunity`
--

DROP TABLE IF EXISTS `file_road_scrunity`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `file_road_scrunity` (
  `id` int NOT NULL AUTO_INCREMENT,
  `mst_company_id` int DEFAULT NULL,
  `mst_file_id` int DEFAULT NULL COMMENT 'mst_file',
  `mst_type_id` int DEFAULT NULL,
  `amount` float DEFAULT NULL,
  `is_active` int DEFAULT NULL,
  `show_website` int DEFAULT NULL,
  `outward_datex` date DEFAULT NULL,
  `outward_nox` text,
  `documents` text,
  `document_upload_date` date DEFAULT NULL,
  `remark_by_emp` varchar(225) DEFAULT NULL,
  `approved_by_hod` int DEFAULT NULL,
  `remark_by_hod` varchar(225) DEFAULT NULL,
  `assign_tox` int DEFAULT NULL,
  `card` varchar(45) DEFAULT NULL,
  `is_save` text,
  `is_rejected` int NOT NULL DEFAULT '0',
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=78 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `file_work_fee`
--

DROP TABLE IF EXISTS `file_work_fee`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `file_work_fee` (
  `id` int NOT NULL AUTO_INCREMENT,
  `mst_company_id` int DEFAULT NULL,
  `mst_file_id` int DEFAULT NULL,
  `fee_amount` float DEFAULT NULL,
  `fee_status` int DEFAULT NULL COMMENT '1=pending, 2 = paid',
  `remark_by_emp` varchar(225) DEFAULT NULL,
  `remark_by_hod` varchar(225) DEFAULT NULL,
  `approved_by_hod` int DEFAULT NULL,
  `card` varchar(45) DEFAULT NULL,
  `is_save` int NOT NULL DEFAULT '0',
  `is_skip` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=43 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `final_d`
--

DROP TABLE IF EXISTS `final_d`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `final_d` (
  `id` int NOT NULL AUTO_INCREMENT,
  `interior_id` int DEFAULT NULL,
  `upload` text,
  `type` varchar(255) DEFAULT NULL,
  `remark` varchar(225) DEFAULT NULL,
  `status` int DEFAULT NULL,
  `statusremark` varchar(225) DEFAULT NULL,
  `is_done` int DEFAULT NULL,
  `completed_date` date DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_finald_interior_done` (`interior_id`,`is_done`)
) ENGINE=InnoDB AUTO_INCREMENT=68 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `fire_noc`
--

DROP TABLE IF EXISTS `fire_noc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fire_noc` (
  `id` int NOT NULL AUTO_INCREMENT,
  `approval_id` int DEFAULT NULL,
  `team_id` int DEFAULT NULL,
  `completed_date` date DEFAULT NULL,
  `assign_application_date` date DEFAULT NULL,
  `received_application_date` date DEFAULT NULL,
  `application_number` varchar(45) DEFAULT NULL,
  `fire_noc_receipt` longtext,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `firebase_notification`
--

DROP TABLE IF EXISTS `firebase_notification`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `firebase_notification` (
  `id` int NOT NULL AUTO_INCREMENT,
  `device_token` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `user_id` int DEFAULT NULL,
  `message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `response` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `msg` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `fs_ic_fees`
--

DROP TABLE IF EXISTS `fs_ic_fees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fs_ic_fees` (
  `id` int NOT NULL AUTO_INCREMENT,
  `approval_id` int DEFAULT NULL,
  `total_fsi_emi` varchar(45) DEFAULT NULL,
  `total_fsi_amount` varchar(45) DEFAULT NULL,
  `total_ic_emi` varchar(45) DEFAULT NULL,
  `total_ic_amount` varchar(45) DEFAULT NULL,
  `date` datetime DEFAULT NULL,
  `amount` varchar(45) DEFAULT NULL,
  `received_date` datetime DEFAULT NULL,
  `file_upload` longtext,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `fsirows`
--

DROP TABLE IF EXISTS `fsirows`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fsirows` (
  `id` int NOT NULL AUTO_INCREMENT,
  `approval_id` int DEFAULT NULL,
  `total_fsi_emi` int DEFAULT NULL,
  `total_fsi_amount` int DEFAULT NULL,
  `date` date DEFAULT NULL,
  `amount` int DEFAULT NULL,
  `receivedDate` date DEFAULT NULL,
  `filePath` text,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `high_rise_detail`
--

DROP TABLE IF EXISTS `high_rise_detail`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `high_rise_detail` (
  `id` int NOT NULL AUTO_INCREMENT,
  `project_id` int DEFAULT NULL,
  `how_many_building` int DEFAULT NULL,
  `building_name` varchar(45) DEFAULT NULL,
  `basement` varchar(45) DEFAULT NULL,
  `basement_type` varchar(45) DEFAULT NULL,
  `floor_type` varchar(45) DEFAULT NULL,
  `how_many_floor` varchar(45) DEFAULT NULL,
  `per_floor_flat` varchar(45) DEFAULT NULL,
  `flat_type` varchar(45) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `icrows`
--

DROP TABLE IF EXISTS `icrows`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `icrows` (
  `id` int NOT NULL AUTO_INCREMENT,
  `apporval_id` int DEFAULT NULL,
  `total_ic_emi` int DEFAULT NULL,
  `total_ic_amount` int DEFAULT NULL,
  `date` date DEFAULT NULL,
  `amount` int DEFAULT NULL,
  `receivedDate` date DEFAULT NULL,
  `filePath` text,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `interior_category`
--

DROP TABLE IF EXISTS `interior_category`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `interior_category` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` text,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `interior_contractor`
--

DROP TABLE IF EXISTS `interior_contractor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `interior_contractor` (
  `id` int NOT NULL AUTO_INCREMENT,
  `interior_id` int DEFAULT NULL,
  `category_id` int DEFAULT NULL,
  `vendors` int DEFAULT NULL,
  `mobile_no` varchar(225) DEFAULT NULL,
  `price` int DEFAULT NULL,
  `status` int DEFAULT NULL,
  `remark` varchar(225) DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `interior_rnd_site_images`
--

DROP TABLE IF EXISTS `interior_rnd_site_images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `interior_rnd_site_images` (
  `id` int NOT NULL AUTO_INCREMENT,
  `interior_id` int DEFAULT NULL,
  `images` text,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=995 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `interior_study_rnd`
--

DROP TABLE IF EXISTS `interior_study_rnd`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `interior_study_rnd` (
  `id` int NOT NULL AUTO_INCREMENT,
  `interior_id` int DEFAULT NULL,
  `keyobservation` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `remarks` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `summary` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `site_incharge` varchar(225) DEFAULT NULL,
  `authorized_person` varchar(225) DEFAULT NULL,
  `report` text,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inward`
--

DROP TABLE IF EXISTS `inward`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inward` (
  `id` int NOT NULL AUTO_INCREMENT,
  `clientid` int DEFAULT NULL,
  `project` int DEFAULT NULL,
  `item` text NOT NULL,
  `received_from` text,
  `received_contact` text,
  `handover` int DEFAULT NULL,
  `signature` text,
  `photo` text,
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inward_details`
--

DROP TABLE IF EXISTS `inward_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inward_details` (
  `id` int NOT NULL AUTO_INCREMENT,
  `approval_id` int DEFAULT NULL,
  `application_inward` varchar(45) DEFAULT NULL,
  `scruityfees` longtext,
  `roaddeposit` longtext,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=42 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ledger_group`
--

DROP TABLE IF EXISTS `ledger_group`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ledger_group` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ledger_master`
--

DROP TABLE IF EXISTS `ledger_master`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ledger_master` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ledger_group_id` int DEFAULT NULL,
  `name` varchar(225) DEFAULT NULL,
  `whatsapp` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `material`
--

DROP TABLE IF EXISTS `material`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `material` (
  `id` int NOT NULL AUTO_INCREMENT,
  `interior_id` int DEFAULT NULL,
  `category_id` int DEFAULT NULL,
  `vendor` int DEFAULT NULL,
  `material_photo` text,
  `material_name` varchar(255) DEFAULT NULL,
  `rate` int DEFAULT NULL,
  `status` int DEFAULT NULL,
  `remark` text,
  `is_done` int DEFAULT NULL,
  `completed_date` date DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mepf`
--

DROP TABLE IF EXISTS `mepf`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mepf` (
  `id` int NOT NULL AUTO_INCREMENT,
  `interior_id` int DEFAULT NULL,
  `category_id` int DEFAULT NULL,
  `zed_upload` text,
  `agency_upload` text,
  `agency_name` varchar(225) DEFAULT NULL,
  `internalstatus` int DEFAULT NULL,
  `internalremark` varchar(225) DEFAULT NULL,
  `clientstatus` int DEFAULT NULL,
  `clientremark` varchar(225) DEFAULT NULL,
  `remark` varchar(225) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mst_arch_agency`
--

DROP TABLE IF EXISTS `mst_arch_agency`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mst_arch_agency` (
  `id` int NOT NULL AUTO_INCREMENT,
  `arch_id` int DEFAULT NULL,
  `name` text,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` int DEFAULT NULL,
  `updated_by` datetime DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mst_arch_contractor`
--

DROP TABLE IF EXISTS `mst_arch_contractor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mst_arch_contractor` (
  `id` int NOT NULL AUTO_INCREMENT,
  `arch_id` int DEFAULT NULL,
  `name` varchar(225) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mst_arch_dc`
--

DROP TABLE IF EXISTS `mst_arch_dc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mst_arch_dc` (
  `id` int NOT NULL AUTO_INCREMENT,
  `arch_id` int DEFAULT NULL,
  `name` varchar(225) DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=49 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mst_arch_details`
--

DROP TABLE IF EXISTS `mst_arch_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mst_arch_details` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` text,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mst_arch_document`
--

DROP TABLE IF EXISTS `mst_arch_document`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mst_arch_document` (
  `id` int NOT NULL AUTO_INCREMENT,
  `arch_id` int DEFAULT NULL,
  `upload` text,
  `type` text,
  `remark` text,
  `status` int DEFAULT NULL,
  `statusremark` text,
  `is_done` int DEFAULT NULL,
  `completed_date` date DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mst_arch_drawing`
--

DROP TABLE IF EXISTS `mst_arch_drawing`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mst_arch_drawing` (
  `id` int NOT NULL AUTO_INCREMENT,
  `arch_id` int DEFAULT NULL,
  `name` text,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` datetime DEFAULT NULL,
  `updated_at` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=47 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mst_arch_fees`
--

DROP TABLE IF EXISTS `mst_arch_fees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mst_arch_fees` (
  `id` int NOT NULL AUTO_INCREMENT,
  `arch_id` int DEFAULT NULL,
  `price` int DEFAULT NULL,
  `status` int DEFAULT NULL,
  `remark` text,
  `team_id` int DEFAULT NULL,
  `completed_date` date DEFAULT NULL,
  `is_done` int DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_arch_id` (`arch_id`),
  KEY `idx_arch` (`arch_id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mst_arch_material`
--

DROP TABLE IF EXISTS `mst_arch_material`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mst_arch_material` (
  `id` int NOT NULL AUTO_INCREMENT,
  `arch_id` int DEFAULT NULL,
  `title` text,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mst_arch_mepf`
--

DROP TABLE IF EXISTS `mst_arch_mepf`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mst_arch_mepf` (
  `id` int NOT NULL AUTO_INCREMENT,
  `arch_id` int DEFAULT NULL,
  `name` varchar(225) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mst_arch_quotation`
--

DROP TABLE IF EXISTS `mst_arch_quotation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mst_arch_quotation` (
  `id` int NOT NULL AUTO_INCREMENT,
  `arch_id` int DEFAULT NULL,
  `price` int DEFAULT NULL,
  `status` int DEFAULT NULL,
  `remark` text,
  `is_done` int DEFAULT NULL,
  `completed_date` date DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mst_arch_risk_matrix`
--

DROP TABLE IF EXISTS `mst_arch_risk_matrix`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mst_arch_risk_matrix` (
  `id` int NOT NULL AUTO_INCREMENT,
  `arch_id` int DEFAULT NULL,
  `upload` text,
  `agency` text,
  `remark` text,
  `date` datetime DEFAULT NULL,
  `team_id` int DEFAULT NULL,
  `is_done` int DEFAULT NULL,
  `completed_date` date DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_arch_id` (`arch_id`),
  KEY `idx_arch` (`arch_id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mst_arch_site_eng`
--

DROP TABLE IF EXISTS `mst_arch_site_eng`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mst_arch_site_eng` (
  `id` int NOT NULL AUTO_INCREMENT,
  `arch_id` int DEFAULT NULL,
  `report` text,
  `remark` text,
  `is_done` int DEFAULT NULL,
  `completed_date` date DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mst_arch_space_planning`
--

DROP TABLE IF EXISTS `mst_arch_space_planning`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mst_arch_space_planning` (
  `id` int NOT NULL AUTO_INCREMENT,
  `arch_id` int NOT NULL,
  `name` varchar(225) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mst_arch_structure`
--

DROP TABLE IF EXISTS `mst_arch_structure`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mst_arch_structure` (
  `id` int NOT NULL AUTO_INCREMENT,
  `arch_id` int DEFAULT NULL,
  `name` varchar(225) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mst_arch_threed`
--

DROP TABLE IF EXISTS `mst_arch_threed`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mst_arch_threed` (
  `id` int NOT NULL AUTO_INCREMENT,
  `arch_id` int DEFAULT NULL,
  `title` varchar(225) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mst_arch_vendor`
--

DROP TABLE IF EXISTS `mst_arch_vendor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mst_arch_vendor` (
  `id` int NOT NULL AUTO_INCREMENT,
  `arch_id` int DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mst_architect`
--

DROP TABLE IF EXISTS `mst_architect`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mst_architect` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` int DEFAULT NULL,
  `isdeleted` int DEFAULT '0',
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mst_campaign`
--

DROP TABLE IF EXISTS `mst_campaign`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mst_campaign` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  `budget` int DEFAULT NULL,
  `budget_type` int DEFAULT NULL,
  `post_id` int DEFAULT NULL,
  `description` text,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `campaign_platform` varchar(255) DEFAULT NULL,
  `target_people` text,
  `target_location` text,
  `screenshot` text,
  `status` int DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mst_category`
--

DROP TABLE IF EXISTS `mst_category`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mst_category` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(45) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mst_category_type_question`
--

DROP TABLE IF EXISTS `mst_category_type_question`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mst_category_type_question` (
  `id` int NOT NULL AUTO_INCREMENT,
  `type` int DEFAULT NULL COMMENT '1=architecture,2=interior',
  `category_id` int DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=47 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mst_company`
--

DROP TABLE IF EXISTS `mst_company`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mst_company` (
  `id` int NOT NULL AUTO_INCREMENT,
  `comp_name` text,
  `logo` longtext,
  `start_date` date DEFAULT NULL,
  `isdeleted` int NOT NULL DEFAULT '0',
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` int DEFAULT NULL,
  `updated_by` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=2 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mst_concept`
--

DROP TABLE IF EXISTS `mst_concept`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mst_concept` (
  `id` int NOT NULL AUTO_INCREMENT,
  `interior_id` int DEFAULT NULL,
  `title` varchar(225) DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=87 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mst_department`
--

DROP TABLE IF EXISTS `mst_department`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mst_department` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` text,
  `isdeleted` int DEFAULT '0',
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=8 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mst_document`
--

DROP TABLE IF EXISTS `mst_document`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mst_document` (
  `id` int NOT NULL AUTO_INCREMENT,
  `doc_name` text,
  `types` int DEFAULT NULL COMMENT '1=original,2=xerox',
  `category` text,
  `is_optional` int DEFAULT NULL COMMENT '1=yes,2=no',
  `comp_id` int DEFAULT NULL COMMENT 'mst_comp',
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=63 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mst_fees`
--

DROP TABLE IF EXISTS `mst_fees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mst_fees` (
  `id` int NOT NULL AUTO_INCREMENT,
  `interior_id` int DEFAULT NULL,
  `price` int DEFAULT NULL,
  `status` int DEFAULT NULL,
  `remark` text,
  `is_done` int DEFAULT NULL,
  `team_id` int DEFAULT NULL,
  `completed_date` date DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_fees_interior_done` (`interior_id`,`is_done`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mst_file`
--

DROP TABLE IF EXISTS `mst_file`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mst_file` (
  `id` int NOT NULL AUTO_INCREMENT,
  `office_file_no` text,
  `file_name` text,
  `cus_id` int DEFAULT NULL COMMENT 'users-table-role-client',
  `file_type` text COMMENT 'mst_type',
  `code` text,
  `dates` text,
  `images` text,
  `project_plan` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `category` int DEFAULT NULL COMMENT 'status_file',
  `buc` int DEFAULT NULL COMMENT 'status_file',
  `status` int DEFAULT NULL COMMENT 'status_file',
  `process` int DEFAULT NULL COMMENT 'status_file',
  `show_exp` int DEFAULT NULL COMMENT 'status_file',
  `show_todo` int DEFAULT NULL COMMENT 'status_file',
  `architect_id` int DEFAULT NULL COMMENT 'mst_architect',
  `comp_id` int DEFAULT NULL COMMENT 'mst_comp',
  `file_document_json` text,
  `is_save` int DEFAULT '0',
  `mst_stage_id` int NOT NULL DEFAULT '1' COMMENT 'mst_stage',
  `land_detail` varchar(225) DEFAULT NULL,
  `departments` text,
  `project_name` varchar(225) DEFAULT NULL,
  `hod` int DEFAULT NULL,
  `team_id` int DEFAULT NULL COMMENT 'users-employee',
  `approved_by_hod` int DEFAULT NULL,
  `remark_by_hod` varchar(225) DEFAULT NULL,
  `remark_by_emp` varchar(225) DEFAULT NULL,
  `card` varchar(45) DEFAULT NULL,
  `isdeleted` int NOT NULL DEFAULT '0',
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_isdeleted_status` (`isdeleted`,`status`),
  KEY `idx_team_id` (`team_id`)
) ENGINE=MyISAM AUTO_INCREMENT=181 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mst_file_code`
--

DROP TABLE IF EXISTS `mst_file_code`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mst_file_code` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` text,
  `is_deleted` int NOT NULL DEFAULT '0',
  `is_active` int NOT NULL DEFAULT '1',
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mst_final_drawing`
--

DROP TABLE IF EXISTS `mst_final_drawing`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mst_final_drawing` (
  `id` int NOT NULL AUTO_INCREMENT,
  `arch_id` int DEFAULT NULL,
  `upload` text,
  `type` text,
  `remark` text,
  `on_site` int DEFAULT NULL,
  `is_done` int DEFAULT NULL,
  `completed_date` date DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mst_final_files`
--

DROP TABLE IF EXISTS `mst_final_files`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mst_final_files` (
  `id` int NOT NULL AUTO_INCREMENT,
  `arch_id` int DEFAULT NULL,
  `upload` text,
  `type` text,
  `remark` text,
  `status` int DEFAULT NULL,
  `statusremark` text,
  `is_done` int DEFAULT NULL,
  `completed_date` date DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mst_follow_ups`
--

DROP TABLE IF EXISTS `mst_follow_ups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mst_follow_ups` (
  `id` int NOT NULL AUTO_INCREMENT,
  `lead_id` int DEFAULT NULL,
  `date` date DEFAULT NULL,
  `next_date` date DEFAULT NULL,
  `assign_person` int DEFAULT NULL,
  `talk` text,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4564 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mst_groups`
--

DROP TABLE IF EXISTS `mst_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mst_groups` (
  `id` mediumint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(20) NOT NULL,
  `description` varchar(100) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mst_holidays`
--

DROP TABLE IF EXISTS `mst_holidays`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mst_holidays` (
  `id` int NOT NULL AUTO_INCREMENT,
  `month` text,
  `week` int DEFAULT NULL COMMENT '(sunday)',
  `holiday` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mst_inspection_checklist`
--

DROP TABLE IF EXISTS `mst_inspection_checklist`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mst_inspection_checklist` (
  `id` int NOT NULL AUTO_INCREMENT,
  `mst_type_id` int DEFAULT NULL,
  `title` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `status` int NOT NULL DEFAULT '1',
  `is_deleted` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mst_interior_contractor`
--

DROP TABLE IF EXISTS `mst_interior_contractor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mst_interior_contractor` (
  `id` int NOT NULL AUTO_INCREMENT,
  `interior_id` int DEFAULT NULL,
  `name` varchar(225) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=96 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mst_interior_details`
--

DROP TABLE IF EXISTS `mst_interior_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mst_interior_details` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` text,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mst_leads`
--

DROP TABLE IF EXISTS `mst_leads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mst_leads` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  `mobile_no` varchar(225) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `service` varchar(225) DEFAULT NULL,
  `description` text,
  `address` text,
  `source` int DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  `remarks` text,
  `type` varchar(10) DEFAULT NULL,
  `status` varchar(10) DEFAULT 'active',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=642 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mst_leads_meeting`
--

DROP TABLE IF EXISTS `mst_leads_meeting`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mst_leads_meeting` (
  `id` int NOT NULL AUTO_INCREMENT,
  `lead_id` int DEFAULT NULL,
  `date` date DEFAULT NULL,
  `heading` text,
  `discussion` text,
  `assign_person` int DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mst_material`
--

DROP TABLE IF EXISTS `mst_material`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mst_material` (
  `id` int NOT NULL AUTO_INCREMENT,
  `interior_id` int DEFAULT NULL,
  `title` varchar(225) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=76 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mst_meeting`
--

DROP TABLE IF EXISTS `mst_meeting`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mst_meeting` (
  `id` int NOT NULL AUTO_INCREMENT,
  `mst_department_id` int DEFAULT NULL,
  `facilator` int DEFAULT NULL,
  `participants` varchar(255) DEFAULT NULL,
  `status` int DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mst_mepf`
--

DROP TABLE IF EXISTS `mst_mepf`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mst_mepf` (
  `id` int NOT NULL AUTO_INCREMENT,
  `interior_id` int DEFAULT NULL,
  `name` varchar(225) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mst_post`
--

DROP TABLE IF EXISTS `mst_post`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mst_post` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` text,
  `type` int DEFAULT NULL,
  `date` date DEFAULT NULL,
  `platform_add` text,
  `thumbnail` text CHARACTER SET utf8mb3 COLLATE utf8mb3_bin,
  `caption` text,
  `hastag` text,
  `status` int DEFAULT NULL COMMENT '0 = pending,1= approved 3= reject',
  `is_deleted` int DEFAULT '0',
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=102 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mst_project`
--

DROP TABLE IF EXISTS `mst_project`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mst_project` (
  `id` int NOT NULL AUTO_INCREMENT,
  `client_id` int DEFAULT NULL,
  `category_id` int DEFAULT NULL,
  `project_date` date DEFAULT NULL,
  `address` varchar(225) DEFAULT NULL,
  `project_name` varchar(45) DEFAULT NULL,
  `project_type` int DEFAULT NULL,
  `land_detail` varchar(225) DEFAULT NULL,
  `hod` int DEFAULT NULL,
  `departments` text,
  `show_in_expense` varchar(45) DEFAULT NULL,
  `show_in_todo` varchar(45) DEFAULT NULL,
  `office_no` varchar(45) DEFAULT NULL,
  `team_id1` int DEFAULT NULL,
  `team_id2` int DEFAULT NULL,
  `google_location` varchar(225) DEFAULT NULL,
  `site_condition` text,
  `east_side` text,
  `west_side` text,
  `north_side` text,
  `south_side` text,
  `process` int DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mst_project_details`
--

DROP TABLE IF EXISTS `mst_project_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mst_project_details` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(225) DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mst_project_type`
--

DROP TABLE IF EXISTS `mst_project_type`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mst_project_type` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `disp_order` int NOT NULL DEFAULT '1',
  `created_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `status` int NOT NULL DEFAULT '1',
  `is_deleted` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mst_project_type_category`
--

DROP TABLE IF EXISTS `mst_project_type_category`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mst_project_type_category` (
  `id` int NOT NULL AUTO_INCREMENT,
  `source_type` int DEFAULT NULL COMMENT '1= architetcure,2= interior',
  `project_type_id` int DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mst_proposal`
--

DROP TABLE IF EXISTS `mst_proposal`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mst_proposal` (
  `id` int NOT NULL AUTO_INCREMENT,
  `lead_id` int DEFAULT NULL,
  `proposal` text,
  `scope_of_work` varchar(225) DEFAULT NULL,
  `status` int DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mst_quation`
--

DROP TABLE IF EXISTS `mst_quation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mst_quation` (
  `id` int NOT NULL AUTO_INCREMENT,
  `interior_id` int DEFAULT NULL,
  `name` varchar(225) DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=198 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mst_question`
--

DROP TABLE IF EXISTS `mst_question`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mst_question` (
  `id` int NOT NULL AUTO_INCREMENT,
  `lead_id` int DEFAULT NULL,
  `heading` text,
  `answer` text,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=58 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mst_question_answer`
--

DROP TABLE IF EXISTS `mst_question_answer`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mst_question_answer` (
  `id` int NOT NULL AUTO_INCREMENT,
  `source_id` int DEFAULT NULL,
  `type` int DEFAULT NULL COMMENT '1 = architetcure,2 =interior',
  `question_id` int DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `answer` varchar(255) DEFAULT NULL,
  `created_at` date DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` date DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1387 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mst_site_visit`
--

DROP TABLE IF EXISTS `mst_site_visit`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mst_site_visit` (
  `id` int NOT NULL AUTO_INCREMENT,
  `lead_id` int DEFAULT NULL,
  `date` date DEFAULT NULL,
  `image` text,
  `visitor` int DEFAULT NULL,
  `site_visit_for` varchar(225) DEFAULT NULL,
  `observation` text,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mst_space_planning`
--

DROP TABLE IF EXISTS `mst_space_planning`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mst_space_planning` (
  `id` int NOT NULL AUTO_INCREMENT,
  `interior_id` int DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `created_at` date DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` date DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mst_stage`
--

DROP TABLE IF EXISTS `mst_stage`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mst_stage` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` text,
  `disp_order` int DEFAULT '1',
  `is_active` int DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=19 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mst_structure`
--

DROP TABLE IF EXISTS `mst_structure`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mst_structure` (
  `id` int NOT NULL AUTO_INCREMENT,
  `interior_id` int DEFAULT NULL,
  `name` varchar(225) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mst_technical_drawing`
--

DROP TABLE IF EXISTS `mst_technical_drawing`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mst_technical_drawing` (
  `id` int NOT NULL AUTO_INCREMENT,
  `interior_id` int DEFAULT NULL,
  `title` varchar(225) DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=99 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mst_threed`
--

DROP TABLE IF EXISTS `mst_threed`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mst_threed` (
  `id` int NOT NULL AUTO_INCREMENT,
  `interior_id` int DEFAULT NULL,
  `title` varchar(225) DEFAULT NULL,
  `created_at` date DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` date DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=50 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mst_type`
--

DROP TABLE IF EXISTS `mst_type`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mst_type` (
  `id` int NOT NULL AUTO_INCREMENT,
  `type_name` text,
  `types` text,
  `display_order` int DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=48 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mst_type_post`
--

DROP TABLE IF EXISTS `mst_type_post`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mst_type_post` (
  `id` int NOT NULL AUTO_INCREMENT,
  `post_id` int NOT NULL,
  `post_file` text NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=218 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `new_mst_document`
--

DROP TABLE IF EXISTS `new_mst_document`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `new_mst_document` (
  `id` int NOT NULL AUTO_INCREMENT,
  `doc_name` varchar(225) DEFAULT NULL,
  `type` varchar(225) DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `new_mst_file`
--

DROP TABLE IF EXISTS `new_mst_file`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `new_mst_file` (
  `id` int NOT NULL AUTO_INCREMENT,
  `case_id` varchar(255) DEFAULT NULL,
  `client_id` int DEFAULT NULL,
  `company_name` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `project_name` varchar(255) DEFAULT NULL,
  `project_type` int DEFAULT NULL,
  `category` text,
  `archcategory` int DEFAULT NULL,
  `authority` text,
  `address` text,
  `google_location` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `lat` varchar(225) DEFAULT NULL,
  `long` varchar(225) DEFAULT NULL,
  `land_type` varchar(50) DEFAULT NULL,
  `village` text,
  `city` text,
  `tpscheme` varchar(25) DEFAULT NULL,
  `op_no` varchar(50) DEFAULT NULL,
  `fp_no` varchar(50) DEFAULT NULL,
  `moje` varchar(50) DEFAULT NULL,
  `rs_no` varchar(50) DEFAULT NULL,
  `b_no` varchar(50) DEFAULT NULL,
  `ward_no` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `cs_no` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `fire_noc` varchar(25) DEFAULT NULL,
  `file_type` varchar(25) DEFAULT NULL,
  `tentative_design` varchar(225) DEFAULT NULL,
  `tentative_types` varchar(255) DEFAULT NULL,
  `tentative_created_at` date DEFAULT NULL,
  `tentative_updated_at` date DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_nmf_deleted` (`id`,`is_deleted`)
) ENGINE=InnoDB AUTO_INCREMENT=426 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `new_mst_file_details`
--

DROP TABLE IF EXISTS `new_mst_file_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `new_mst_file_details` (
  `id` int NOT NULL AUTO_INCREMENT,
  `project_id` int DEFAULT NULL,
  `source_type` int DEFAULT NULL COMMENT '1= approval,2=architecture,3= interior',
  `project_name` int DEFAULT NULL,
  `assign_to_hod` int DEFAULT NULL,
  `assign_members` varchar(45) DEFAULT NULL,
  `days` varchar(255) DEFAULT NULL,
  `hours` int DEFAULT NULL,
  `assign_on` date DEFAULT NULL,
  `completed_by` date DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_nmfd_project_id` (`project_id`,`project_name`,`source_type`),
  KEY `idx_project_deleted` (`project_id`,`is_deleted`),
  KEY `idx_hod` (`assign_to_hod`),
  KEY `idx_source_type` (`source_type`,`is_deleted`),
  KEY `idx_hod_deleted` (`assign_to_hod`,`is_deleted`),
  KEY `idx_project_source` (`project_id`,`source_type`,`is_deleted`),
  KEY `idx_project_source2` (`project_id`,`source_type`,`is_deleted`),
  KEY `idx_nmfd_project` (`project_id`,`source_type`,`is_deleted`,`project_name`),
  KEY `idx_nmfd_source_proj` (`project_id`,`source_type`,`project_name`,`is_deleted`)
) ENGINE=InnoDB AUTO_INCREMENT=2760 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `new_mst_file_project_details`
--

DROP TABLE IF EXISTS `new_mst_file_project_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `new_mst_file_project_details` (
  `id` int NOT NULL AUTO_INCREMENT,
  `project_id` int DEFAULT NULL,
  `application_name` varchar(45) DEFAULT NULL,
  `no_of_days` text,
  `assign_to_hod` varchar(255) DEFAULT NULL,
  `application_date` datetime DEFAULT NULL,
  `price` int DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_nmfpd_project_deleted_app` (`project_id`,`is_deleted`,`application_name`),
  KEY `idx_project_deleted_app` (`project_id`,`is_deleted`,`application_name`),
  KEY `idx_project_app` (`project_id`,`is_deleted`,`application_name`),
  KEY `idx_project_app2` (`project_id`,`is_deleted`,`application_name`),
  KEY `idx_nmfpd_app` (`project_id`,`application_name`,`is_deleted`),
  KEY `idx_proj_app_del` (`project_id`,`application_name`,`is_deleted`),
  KEY `idx_nmfpd_app_proj` (`application_name`,`is_deleted`,`project_id`)
) ENGINE=InnoDB AUTO_INCREMENT=459 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `notification`
--

DROP TABLE IF EXISTS `notification`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification` (
  `id` int NOT NULL AUTO_INCREMENT,
  `json_data` text,
  `child_id` int DEFAULT '0',
  `table_name` varchar(200) DEFAULT NULL,
  `assign_to` int DEFAULT NULL,
  `client_id` int DEFAULT NULL,
  `is_seen` int NOT NULL DEFAULT '0',
  `seen_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_notif_assign_seen` (`assign_to`,`is_seen`,`created_at`)
) ENGINE=MyISAM AUTO_INCREMENT=8084 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `op_meeting`
--

DROP TABLE IF EXISTS `op_meeting`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `op_meeting` (
  `id` int NOT NULL AUTO_INCREMENT,
  `mst_department_id` int DEFAULT NULL,
  `date` date DEFAULT NULL,
  `facilator` int DEFAULT NULL,
  `participants` varchar(225) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2742 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `op_meeting_detail`
--

DROP TABLE IF EXISTS `op_meeting_detail`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `op_meeting_detail` (
  `id` int NOT NULL AUTO_INCREMENT,
  `date` date DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `meeting_id` int DEFAULT NULL,
  `facilator` int DEFAULT NULL,
  `is_ok` int DEFAULT NULL COMMENT '1=yes,2=no',
  `is_ok_at` datetime DEFAULT NULL,
  `is_ok_by` int DEFAULT NULL,
  `remark` text,
  `verified` int DEFAULT NULL COMMENT '1 = yes , 0 = no',
  `verified_by` int DEFAULT NULL,
  `verified_at` datetime DEFAULT NULL,
  `clarity_1_key_highlight` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `clarity_1_key_action` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `clarity_2_key_highlight` text,
  `clarity_2_key_action` text,
  `total_completed_tasks` int DEFAULT NULL,
  `total_uncompleted_tasks` int DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_op_meeting_user_date` (`user_id`,`date`)
) ENGINE=InnoDB AUTO_INCREMENT=10463 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `outward`
--

DROP TABLE IF EXISTS `outward`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `outward` (
  `id` int NOT NULL AUTO_INCREMENT,
  `clientid` int DEFAULT NULL,
  `project` int DEFAULT NULL,
  `item` text NOT NULL,
  `received_from` text,
  `received_contact` text,
  `collected` int DEFAULT NULL,
  `signature` text,
  `photo` text,
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=119 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `outward_details`
--

DROP TABLE IF EXISTS `outward_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `outward_details` (
  `id` int NOT NULL AUTO_INCREMENT,
  `approval_id` int DEFAULT NULL,
  `building_date` date DEFAULT NULL,
  `building_letter` longtext,
  `approval_date` date DEFAULT NULL,
  `approval_plan` longtext,
  `completed_date` date DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=43 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `participants`
--

DROP TABLE IF EXISTS `participants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `participants` (
  `id` int NOT NULL AUTO_INCREMENT,
  `meeting_id` int DEFAULT NULL,
  `typeofmeeting` int DEFAULT NULL,
  `participant` int DEFAULT NULL,
  `date` date DEFAULT NULL,
  `status` varchar(45) DEFAULT NULL,
  `key_highlights` varchar(225) DEFAULT NULL,
  `today_works` varchar(45) DEFAULT NULL,
  `clarity` varchar(225) DEFAULT NULL,
  `key_action` varchar(225) DEFAULT NULL,
  `contribution` varchar(225) DEFAULT NULL,
  `whatgoal` varchar(225) DEFAULT NULL,
  `whatdone` varchar(225) DEFAULT NULL,
  `whatnotdone` varchar(225) DEFAULT NULL,
  `whatmissingfromend` varchar(225) DEFAULT NULL,
  `whatlearn` varchar(225) DEFAULT NULL,
  `whatdifferentend` varchar(225) DEFAULT NULL,
  `whatdoneandwhen` varchar(225) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payment_category`
--

DROP TABLE IF EXISTS `payment_category`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_category` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  `whatsapp` int DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  `mobile_no` varchar(10) DEFAULT NULL,
  `date` date DEFAULT NULL,
  `category_id` int DEFAULT NULL,
  `amount` int DEFAULT NULL,
  `via_employee_id` int DEFAULT NULL,
  `remarks` text,
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payments_expense`
--

DROP TABLE IF EXISTS `payments_expense`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments_expense` (
  `id` int NOT NULL AUTO_INCREMENT,
  `date` date DEFAULT NULL,
  `project_id` varchar(255) DEFAULT NULL,
  `ledger_group_id` int DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `mobile` varchar(255) DEFAULT NULL,
  `mode` varchar(225) DEFAULT NULL,
  `amount` int DEFAULT NULL,
  `services` text,
  `via_employee_id` varchar(255) DEFAULT NULL,
  `remarks` text,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  `receipt_image` varchar(255) DEFAULT NULL,
  `submitters_img1` varchar(255) DEFAULT NULL,
  `submitters_img2` varchar(255) DEFAULT NULL,
  `submitters_img3` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pms`
--

DROP TABLE IF EXISTS `pms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pms` (
  `id` int NOT NULL AUTO_INCREMENT,
  `task_id` int NOT NULL,
  `category` text,
  `task` text,
  `hours` float DEFAULT NULL,
  `minutes` int DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_pms_task_del` (`task_id`,`is_deleted`),
  KEY `idx_pms_created_by` (`created_by`,`is_deleted`,`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=3709 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `presentation`
--

DROP TABLE IF EXISTS `presentation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `presentation` (
  `id` int NOT NULL AUTO_INCREMENT,
  `lead_id` int DEFAULT NULL,
  `presentation` text,
  `presented_by` int DEFAULT NULL,
  `summary` varchar(255) DEFAULT NULL,
  `feedback` varchar(225) DEFAULT NULL,
  `date` date DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `process_stage_logs`
--

DROP TABLE IF EXISTS `process_stage_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `process_stage_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `mst_file_id` int DEFAULT NULL COMMENT 'mst_file',
  `mst_stage_id` int DEFAULT NULL COMMENT 'mst_stage',
  `details` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `project_detail_new`
--

DROP TABLE IF EXISTS `project_detail_new`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_detail_new` (
  `id` int NOT NULL AUTO_INCREMENT,
  `mst_file_id` int DEFAULT NULL,
  `project_name` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `project_date` date DEFAULT NULL,
  `mst_project_type_id` int DEFAULT NULL,
  `address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `latitude` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `longitude` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `google_location` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `google_image` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `project_plan` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `created_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `status` int NOT NULL DEFAULT '1',
  `is_deleted` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `project_details`
--

DROP TABLE IF EXISTS `project_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_details` (
  `id` int NOT NULL AUTO_INCREMENT,
  `mst_file_id` int DEFAULT NULL,
  `site_condition` text,
  `is_save_site_condition` int NOT NULL DEFAULT '0',
  `is_skip_site_condition` int NOT NULL DEFAULT '0',
  `created_at_site_condition` datetime DEFAULT NULL,
  `created_by_site_condition` int DEFAULT NULL,
  `updated_at_site_condition` text,
  `updated_by_site_condition` int DEFAULT NULL,
  `tentative_pdf` text,
  `is_save_tentative_pdf` int NOT NULL DEFAULT '0',
  `is_skip_tentative_pdf` int NOT NULL DEFAULT '0',
  `created_at_tentative_pdf` datetime DEFAULT NULL,
  `created_by_tentative_pdf` int DEFAULT NULL,
  `updated_at_tentative_pdf` datetime DEFAULT NULL,
  `updated_by_tentative_pdf` int DEFAULT NULL,
  `approved_plan_pdf` text,
  `is_save_approved_plan_pdf` int NOT NULL DEFAULT '0',
  `is_skip_approved_plan_pdf` int NOT NULL DEFAULT '0',
  `created_at_approved_plan_pdf` datetime DEFAULT NULL,
  `created_by_approved_plan_pdf` int DEFAULT NULL,
  `updated_at_approved_plan_pdf` datetime DEFAULT NULL,
  `updated_by_approved_plan_pdf` int DEFAULT NULL,
  `building_details` text,
  `building_project_type` int DEFAULT NULL,
  `is_save_building_details` int NOT NULL DEFAULT '0',
  `is_skip_building_details` int NOT NULL DEFAULT '0',
  `created_at_building_details` datetime DEFAULT NULL,
  `created_by_building_details` int DEFAULT NULL,
  `updated_at_building_details` datetime DEFAULT NULL,
  `updated_by_building_details` int DEFAULT NULL,
  `inauguration_date` date DEFAULT NULL,
  `inauguration_message` text,
  `is_save_inauguration_message` int NOT NULL DEFAULT '0',
  `is_skip_inauguration_message` int NOT NULL DEFAULT '0',
  `created_at_inauguration_message` datetime DEFAULT NULL,
  `created_by_inauguration_message` int DEFAULT NULL,
  `updated_at_inauguration_message` datetime DEFAULT NULL,
  `updated_by_inauguration_message` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `project_site_location`
--

DROP TABLE IF EXISTS `project_site_location`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_site_location` (
  `id` int NOT NULL AUTO_INCREMENT,
  `project_detail_id` int DEFAULT NULL,
  `direction` int DEFAULT NULL COMMENT '0='''',1=''east'',2=''west'',3=''north'',4=''south''',
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `file_upload` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `created_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `status` int NOT NULL DEFAULT '1',
  `is_deleted` int NOT NULL DEFAULT '0',
  `mst_file_id` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `project_type`
--

DROP TABLE IF EXISTS `project_type`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_type` (
  `id` int NOT NULL AUTO_INCREMENT,
  `project_detail_id` int DEFAULT NULL,
  `mst_project_subtype_id` int DEFAULT NULL,
  `qty` int NOT NULL DEFAULT '0',
  `created_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `status` int NOT NULL DEFAULT '1',
  `is_deleted` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `project_types_details`
--

DROP TABLE IF EXISTS `project_types_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_types_details` (
  `id` int NOT NULL AUTO_INCREMENT,
  `project_detail_id` int DEFAULT NULL,
  `project_type_id` int DEFAULT NULL,
  `title` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `file_upload` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `show_client` int DEFAULT '2' COMMENT '1=yes,2=no',
  `is_finalize` int DEFAULT '2' COMMENT '1=yes,2=no',
  `created_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `status` int NOT NULL DEFAULT '1',
  `is_deleted` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pv`
--

DROP TABLE IF EXISTS `pv`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pv` (
  `id` int NOT NULL AUTO_INCREMENT,
  `approval_id` int DEFAULT NULL,
  `completed_date` date DEFAULT NULL,
  `card` varchar(45) DEFAULT NULL,
  `application_date` date DEFAULT NULL,
  `document_file` text,
  `pv_date` date DEFAULT NULL,
  `pv_file` text,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=82 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `quotation`
--

DROP TABLE IF EXISTS `quotation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `quotation` (
  `id` int NOT NULL AUTO_INCREMENT,
  `interior_id` int DEFAULT NULL,
  `category_id` int DEFAULT NULL,
  `vendors` int DEFAULT NULL,
  `price` int DEFAULT NULL,
  `remark` varchar(255) DEFAULT NULL,
  `status` int DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `receipts`
--

DROP TABLE IF EXISTS `receipts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `receipts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `date` date DEFAULT NULL,
  `project_id` varchar(255) DEFAULT NULL,
  `ledger_group_id` int DEFAULT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `via_employee_id` varchar(255) DEFAULT NULL,
  `receipt_image` varchar(255) DEFAULT NULL,
  `services` varchar(255) DEFAULT NULL,
  `remarks` text,
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  `mode` varchar(20) DEFAULT 'cash',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `risk_matrix`
--

DROP TABLE IF EXISTS `risk_matrix`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `risk_matrix` (
  `id` int NOT NULL AUTO_INCREMENT,
  `interior_id` int DEFAULT NULL,
  `upload` text,
  `agency` varchar(255) DEFAULT NULL,
  `remark` varchar(225) DEFAULT NULL,
  `date` datetime DEFAULT NULL,
  `team_id` int DEFAULT NULL,
  `is_done` int DEFAULT NULL,
  `completed_date` date DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_rm_interior_done` (`interior_id`,`is_done`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `rnd_site_images`
--

DROP TABLE IF EXISTS `rnd_site_images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rnd_site_images` (
  `id` int NOT NULL AUTO_INCREMENT,
  `arch_id` int DEFAULT NULL,
  `images` text,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=154 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `schedule`
--

DROP TABLE IF EXISTS `schedule`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `schedule` (
  `id` int NOT NULL AUTO_INCREMENT,
  `source_id` int DEFAULT NULL,
  `source_type` int DEFAULT NULL COMMENT '1 = architecture,2= interior',
  `fromdate` date DEFAULT NULL,
  `todate` date DEFAULT NULL,
  `type` text,
  `team_member` text,
  `agency` text,
  `remark` text,
  `status` int DEFAULT NULL,
  `status_remark` text,
  `is_done` int DEFAULT NULL,
  `team_id` int DEFAULT NULL,
  `completed_date` date DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_source` (`source_id`,`source_type`),
  KEY `idx_sched_src_done` (`source_id`,`source_type`,`is_done`)
) ENGINE=InnoDB AUTO_INCREMENT=131 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `shifts`
--

DROP TABLE IF EXISTS `shifts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shifts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `site_inspection`
--

DROP TABLE IF EXISTS `site_inspection`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `site_inspection` (
  `id` int NOT NULL AUTO_INCREMENT,
  `department` int DEFAULT NULL,
  `mst_file_project_id` int DEFAULT NULL,
  `types` int DEFAULT NULL COMMENT '1=file,2=project',
  `mst_type_id` int DEFAULT NULL,
  `mst_inspection_checklist_id` int DEFAULT NULL,
  `others_text` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `key_observation` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `remarks` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `site_incharge` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `authorized_person` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `review_by` int DEFAULT NULL,
  `client_sign` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `review_by_sign` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `latitude` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `longitude` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `created_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=887 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `space_planning`
--

DROP TABLE IF EXISTS `space_planning`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `space_planning` (
  `id` int NOT NULL AUTO_INCREMENT,
  `interior_id` int DEFAULT NULL,
  `category_id` int DEFAULT NULL,
  `internalstatus` int DEFAULT NULL,
  `internalremark` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `review_by` int DEFAULT NULL,
  `materialphoto` text,
  `notes` varchar(255) DEFAULT NULL,
  `clientstatus` int DEFAULT NULL,
  `clientremark` varchar(255) DEFAULT NULL,
  `client_review_by` int DEFAULT NULL,
  `team_id` int DEFAULT NULL,
  `completed_date` date DEFAULT NULL,
  `is_done` int DEFAULT NULL,
  `created_at` date DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` date DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_sp_interior_done` (`interior_id`,`is_done`)
) ENGINE=InnoDB AUTO_INCREMENT=81 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `st_meeting`
--

DROP TABLE IF EXISTS `st_meeting`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `st_meeting` (
  `id` int NOT NULL AUTO_INCREMENT,
  `mst_department_id` int DEFAULT NULL,
  `date` date DEFAULT NULL,
  `facilator` int DEFAULT NULL,
  `participants` varchar(225) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=114 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `st_meeting_detail`
--

DROP TABLE IF EXISTS `st_meeting_detail`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `st_meeting_detail` (
  `id` int NOT NULL AUTO_INCREMENT,
  `facilator` int DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `meeting_id` int DEFAULT NULL,
  `date` date DEFAULT NULL,
  `task_mark` int DEFAULT NULL COMMENT '70 marks',
  `out_of_task` float DEFAULT NULL,
  `task_percentage` int DEFAULT NULL,
  `attendance` int DEFAULT NULL COMMENT '10 marks',
  `com_task` int DEFAULT NULL,
  `total_attendance` int DEFAULT NULL,
  `out_of_attendance` float DEFAULT NULL,
  `attendance_percentage` int DEFAULT NULL,
  `software` int DEFAULT NULL COMMENT '5 marks',
  `soft_percent` int DEFAULT NULL,
  `meeting` int DEFAULT NULL COMMENT '5 marks(single red -5)',
  `meeting_percent` int DEFAULT NULL,
  `collabation` int DEFAULT NULL COMMENT '5 marks(<10 or >30)=-0.5',
  `collbration_per` int DEFAULT NULL,
  `conflict` int DEFAULT NULL COMMENT 'conflicts+discipline',
  `con_percent` int DEFAULT NULL,
  `total_marks_data` int DEFAULT NULL,
  `total_contribution` int DEFAULT NULL,
  `total_task` int DEFAULT NULL,
  `total_completed_tasks` int DEFAULT NULL,
  `total_uncompleted_tasks` int DEFAULT NULL,
  `completed_percentage` decimal(5,2) DEFAULT NULL,
  `on_time` decimal(5,2) DEFAULT NULL,
  `on_time_task_comp_per` decimal(5,2) DEFAULT NULL,
  `what_did_u_well` text,
  `what_did_u_not_well` text,
  `what_can_u_do_diff` text,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=440 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `states`
--

DROP TABLE IF EXISTS `states`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `states` (
  `state_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(30) NOT NULL,
  `country_id` int NOT NULL DEFAULT '1',
  PRIMARY KEY (`state_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4121 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `status_file`
--

DROP TABLE IF EXISTS `status_file`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `status_file` (
  `id` int NOT NULL AUTO_INCREMENT,
  `status_file_name` text,
  `types` text,
  `comp_id` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=18 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `status_users`
--

DROP TABLE IF EXISTS `status_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `status_users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `status_users_name` text,
  `type` text,
  `comp_id` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=7 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `structure`
--

DROP TABLE IF EXISTS `structure`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `structure` (
  `id` int NOT NULL AUTO_INCREMENT,
  `interior_id` int DEFAULT NULL,
  `category_id` int DEFAULT NULL,
  `zed_upload` text,
  `agency_upload` text,
  `agency_name` varchar(225) DEFAULT NULL,
  `internalstatus` int DEFAULT NULL,
  `internalremark` varchar(225) DEFAULT NULL,
  `clientstatus` int DEFAULT NULL,
  `clientremark` varchar(225) DEFAULT NULL,
  `remark` varchar(225) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `study_rnd`
--

DROP TABLE IF EXISTS `study_rnd`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `study_rnd` (
  `id` int NOT NULL AUTO_INCREMENT,
  `arch_id` int NOT NULL,
  `keyobservation` text,
  `remarks` text,
  `summary` text,
  `site_incharge` varchar(225) DEFAULT NULL,
  `authorized_person` varchar(225) DEFAULT NULL,
  `report` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tc_meeting`
--

DROP TABLE IF EXISTS `tc_meeting`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tc_meeting` (
  `id` int NOT NULL AUTO_INCREMENT,
  `mst_department_id` int DEFAULT NULL,
  `date` date DEFAULT NULL,
  `facilator` int DEFAULT NULL,
  `participants` varchar(225) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=256 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tc_meeting_detail`
--

DROP TABLE IF EXISTS `tc_meeting_detail`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tc_meeting_detail` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `meeting_id` int DEFAULT NULL,
  `date` date DEFAULT NULL,
  `facilator` int DEFAULT NULL,
  `key_highlight` text,
  `key_action` text,
  `what_goal` int DEFAULT NULL,
  `what_done` int DEFAULT NULL,
  `what_not_done` int DEFAULT NULL,
  `what_missing` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `what_learn` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `what_different` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `what_done_when` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `total_task` int DEFAULT NULL,
  `total_completed_tasks` int DEFAULT NULL,
  `total_uncompleted_tasks` int DEFAULT NULL,
  `completed_percentage` decimal(5,2) DEFAULT NULL,
  `on_time` decimal(5,2) DEFAULT NULL,
  `on_time_task_comp_per` decimal(5,2) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=915 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `team_leave`
--

DROP TABLE IF EXISTS `team_leave`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `team_leave` (
  `id` int NOT NULL AUTO_INCREMENT,
  `team_id` int DEFAULT NULL,
  `title` varchar(200) DEFAULT NULL,
  `description` text,
  `from_date` date DEFAULT NULL,
  `to_date` date DEFAULT NULL,
  `status` int DEFAULT '1' COMMENT '1=Pending,2 = accepted,  3 = reject',
  `remarks` text,
  `is_deleted` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=126 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `technicaldrawing`
--

DROP TABLE IF EXISTS `technicaldrawing`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `technicaldrawing` (
  `id` int NOT NULL AUTO_INCREMENT,
  `interior_id` int DEFAULT NULL,
  `category_id` int DEFAULT NULL,
  `internalstatus` int DEFAULT NULL,
  `internalremark` text,
  `review_by` int DEFAULT NULL,
  `designphoto` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `notes` varchar(255) DEFAULT NULL,
  `clientstatus` int DEFAULT NULL,
  `clientremark` text,
  `client_review_by` int DEFAULT NULL,
  `is_done` int DEFAULT NULL,
  `completed_date` date DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_td_interior_done` (`interior_id`,`is_done`)
) ENGINE=InnoDB AUTO_INCREMENT=331 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tentative_plan`
--

DROP TABLE IF EXISTS `tentative_plan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tentative_plan` (
  `id` int NOT NULL AUTO_INCREMENT,
  `project_id` int DEFAULT NULL,
  `label` varchar(45) DEFAULT NULL,
  `project_data` text,
  `image` text,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `terms_n_condition`
--

DROP TABLE IF EXISTS `terms_n_condition`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `terms_n_condition` (
  `id` int NOT NULL AUTO_INCREMENT,
  `lead_id` int DEFAULT NULL,
  `terms` text,
  `status` int DEFAULT NULL,
  `date` date DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `threed`
--

DROP TABLE IF EXISTS `threed`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `threed` (
  `id` int NOT NULL AUTO_INCREMENT,
  `interior_id` int DEFAULT NULL,
  `category_id` int DEFAULT NULL,
  `vendor` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `phone` varchar(255) DEFAULT NULL,
  `designphoto` text,
  `notes` text,
  `internalstatus` int DEFAULT NULL,
  `internalremark` varchar(255) DEFAULT NULL,
  `clientstatus` int DEFAULT NULL,
  `clientremark` text,
  `review_by` int DEFAULT NULL,
  `is_done` int DEFAULT NULL,
  `completed_date` date DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_threed_interior_done` (`interior_id`,`is_done`)
) ENGINE=InnoDB AUTO_INCREMENT=245 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `todos`
--

DROP TABLE IF EXISTS `todos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `todos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `meeting_id` varchar(25) DEFAULT NULL,
  `mst_department_id` int DEFAULT NULL,
  `file_id` int DEFAULT NULL,
  `schedule_id` int DEFAULT NULL,
  `userid` int DEFAULT NULL,
  `counter` int DEFAULT NULL,
  `date` date DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `priority` varchar(255) DEFAULT NULL,
  `sub_function` int DEFAULT NULL,
  `task` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `project_id` varchar(255) DEFAULT NULL,
  `stage_id` varchar(25) DEFAULT NULL,
  `assign_to` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `contributon` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `status` int DEFAULT NULL COMMENT '0= pending, 1= completed',
  `reason` text,
  `location` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `hours` int DEFAULT NULL,
  `minutes` int DEFAULT NULL,
  `status_by` int DEFAULT NULL,
  `status_at` datetime DEFAULT NULL,
  `is_ok` int DEFAULT NULL,
  `is_ok_at` date DEFAULT NULL,
  `is_ok_by` int DEFAULT NULL,
  `verified` int DEFAULT NULL,
  `verified_by` int DEFAULT NULL,
  `verified_at` date DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_todos_deleted_due` (`is_deleted`,`due_date`,`status`),
  KEY `idx_file_status_at` (`file_id`,`status_at`),
  KEY `idx_todos_file_status` (`file_id`,`status_at`),
  KEY `idx_todos_file_status_at` (`file_id`,`status_at`)
) ENGINE=InnoDB AUTO_INCREMENT=16352 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `todos_counter`
--

DROP TABLE IF EXISTS `todos_counter`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `todos_counter` (
  `id` int NOT NULL AUTO_INCREMENT,
  `todos_id` int DEFAULT NULL,
  `status` int DEFAULT NULL,
  `reason` text,
  `remarks` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `due_date` date DEFAULT NULL,
  `created_at` date DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=24284 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `todos_x`
--

DROP TABLE IF EXISTS `todos_x`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `todos_x` (
  `id` int NOT NULL AUTO_INCREMENT,
  `todo_id` int DEFAULT NULL,
  `hod_id` int DEFAULT NULL,
  `department_id` int DEFAULT NULL,
  `title` text,
  `team_id` int DEFAULT NULL,
  `mst_file_id` int DEFAULT NULL,
  `description` text,
  `remarks` text,
  `reason` text,
  `work_done` text,
  `work_pending` text,
  `execution_date` date DEFAULT NULL,
  `completed_date` date DEFAULT NULL,
  `extended_date` date DEFAULT NULL,
  `actual_completed_date` date DEFAULT NULL,
  `is_deleted` int NOT NULL DEFAULT '0',
  `is_approved` int NOT NULL DEFAULT '0',
  `approved_date` date DEFAULT NULL,
  `card` text,
  `hod_remarks` text,
  `admin_card` text CHARACTER SET latin1 COLLATE latin1_swedish_ci,
  `admin_remarks` varchar(225) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `hod_comment` int DEFAULT NULL,
  `remainder` int DEFAULT NULL,
  `hod_comment_date` date DEFAULT NULL,
  `admin_comment_date` date DEFAULT NULL,
  `todo_status` int DEFAULT NULL,
  `mark_as_done` int DEFAULT NULL,
  `admin_id` int DEFAULT NULL,
  `remainder_date` date DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3460 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tpscheme`
--

DROP TABLE IF EXISTS `tpscheme`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tpscheme` (
  `id` int NOT NULL AUTO_INCREMENT,
  `village` int DEFAULT NULL,
  `tpscheme` varchar(45) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=56 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_department_post`
--

DROP TABLE IF EXISTS `user_department_post`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_department_post` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `department_id` int DEFAULT NULL,
  `post_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `user_department_post_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=284 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_time`
--

DROP TABLE IF EXISTS `user_time`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_time` (
  `id` int NOT NULL AUTO_INCREMENT,
  `shift_id` int DEFAULT NULL,
  `week` text,
  `from_time` time DEFAULT NULL,
  `to_time` time DEFAULT NULL,
  `created_at` int DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=133 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_track`
--

DROP TABLE IF EXISTS `user_track`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_track` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `track_data` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=144 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `first_name` varchar(100) NOT NULL,
  `last_name` text,
  `company_name` varchar(45) DEFAULT NULL,
  `email` varchar(150) NOT NULL,
  `dob` datetime DEFAULT NULL,
  `password` varchar(250) DEFAULT NULL,
  `shift_id` varchar(45) DEFAULT NULL,
  `username` varchar(100) NOT NULL,
  `source` varchar(255) DEFAULT NULL,
  `phone` varchar(12) NOT NULL,
  `country` varchar(225) DEFAULT NULL,
  `city` varchar(255) DEFAULT NULL,
  `state` varchar(225) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `gst` varchar(255) DEFAULT NULL,
  `street` varchar(100) DEFAULT NULL,
  `zip_code` varchar(20) DEFAULT NULL,
  `active` int NOT NULL DEFAULT '1',
  `address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `description` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `profile_picture` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `employee_id` varchar(50) DEFAULT NULL,
  `job_title` varchar(150) DEFAULT NULL,
  `sub_department` varchar(150) DEFAULT NULL,
  `employment_type` enum('Full-Time','Part-Time','Contract','Intern','Freelance') DEFAULT 'Full-Time',
  `work_location` enum('On-Site','Remote','Hybrid') DEFAULT 'On-Site',
  `reporting_to` varchar(200) DEFAULT NULL,
  `department_id` int DEFAULT NULL,
  `post_id` int DEFAULT NULL,
  `comp_id` int DEFAULT NULL,
  `country_id` int DEFAULT NULL,
  `state_id` int DEFAULT NULL,
  `city_id` int DEFAULT NULL,
  `device_token` text,
  `joining_date` date DEFAULT NULL,
  `probation_end_date` date DEFAULT NULL,
  `job_overview` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `ctc` varchar(50) DEFAULT NULL,
  `basic_salary` varchar(50) DEFAULT NULL,
  `hra` varchar(50) DEFAULT NULL,
  `allowances` varchar(50) DEFAULT NULL,
  `bonus` varchar(50) DEFAULT NULL,
  `pay_cycle` enum('Monthly','Bi-Weekly','Weekly') DEFAULT 'Monthly',
  `pay_mode` enum('Bank Transfer','Cheque','Cash') DEFAULT 'Bank Transfer',
  `bank_account` varchar(100) DEFAULT NULL,
  `resume` text,
  `adhar_card` text,
  `graduation_certificate` text,
  `offer_letter` text,
  `bond_agreement` text,
  `signature` text,
  `document_by` int DEFAULT NULL,
  `document_at` date DEFAULT NULL,
  `isdeleted` int NOT NULL DEFAULT '0',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `role_purpose` text,
  `coordinates_with` varchar(255) DEFAULT NULL,
  `authority_rights` json DEFAULT NULL,
  `deliverables` json DEFAULT NULL,
  `growth_index` json DEFAULT NULL,
  `risks_and_warning` json DEFAULT NULL,
  `hiring_requirements` json DEFAULT NULL COMMENT 'min_requirements, interview_test, first_45_days',
  `hiring_flags` json DEFAULT NULL COMMENT 'green_flags, red_flags',
  `gates` json DEFAULT NULL COMMENT 'competency_gates, performance_gates, behavioural_gates',
  PRIMARY KEY (`id`),
  KEY `idx_users_isdeleted` (`isdeleted`)
) ENGINE=InnoDB AUTO_INCREMENT=374 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users_groups`
--

DROP TABLE IF EXISTS `users_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users_groups` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `mst_user_id` int NOT NULL,
  `mst_group_id` mediumint unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `usergroup_group` (`mst_group_id`),
  KEY `mst_user_id` (`mst_user_id`),
  KEY `idx_ug_user_group` (`mst_user_id`,`mst_group_id`),
  CONSTRAINT `users_groups_ibfk_1` FOREIGN KEY (`mst_group_id`) REFERENCES `mst_groups` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `users_groups_ibfk_2` FOREIGN KEY (`mst_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=487 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `vendors`
--

DROP TABLE IF EXISTS `vendors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vendors` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  `mobile` varchar(225) NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `village`
--

DROP TABLE IF EXISTS `village`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `village` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(45) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=49 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `work_fees`
--

DROP TABLE IF EXISTS `work_fees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `work_fees` (
  `id` int NOT NULL AUTO_INCREMENT,
  `approval_id` int DEFAULT NULL,
  `receipt_no` varchar(45) DEFAULT NULL,
  `fee_type` varchar(45) DEFAULT NULL,
  `amount` varchar(45) DEFAULT NULL,
  `date` datetime DEFAULT NULL,
  `file_upload` longtext,
  `created_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `is_deleted` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=63 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-21 11:00:42
