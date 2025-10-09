-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 09, 2025 at 05:47 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `luct_reporting`
--

-- --------------------------------------------------------

--
-- Table structure for table `attendance`
--

CREATE TABLE `attendance` (
  `student_id` int(11) NOT NULL,
  `class_id` int(11) NOT NULL,
  `present` tinyint(1) NOT NULL,
  `date` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `attendance`
--

INSERT INTO `attendance` (`student_id`, `class_id`, `present`, `date`) VALUES
(31, 1, 1, '2025-10-04 13:58:04'),
(31, 1, 0, '2025-10-04 15:25:09'),
(31, 1, 1, '2025-10-04 15:25:11'),
(32, 1, 1, '2025-10-05 21:41:00'),
(32, 1, 1, '2025-10-05 21:41:02'),
(32, 1, 1, '2025-10-05 21:41:03'),
(32, 1, 1, '2025-10-05 21:41:05'),
(34, 2, 1, '2025-10-05 12:04:12'),
(34, 2, 1, '2025-10-05 12:04:14'),
(34, 2, 1, '2025-10-05 12:04:18'),
(34, 2, 1, '2025-10-05 12:04:20');

-- --------------------------------------------------------

--
-- Table structure for table `classes`
--

CREATE TABLE `classes` (
  `id` int(11) NOT NULL,
  `course_id` int(11) DEFAULT NULL,
  `class_name` enum('BSCIT','BSCBIT','BSCSM','DIT','DBIT','DSM') NOT NULL,
  `total_registered` int(11) DEFAULT NULL,
  `faculty` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `classes`
--

INSERT INTO `classes` (`id`, `course_id`, `class_name`, `total_registered`, `faculty`) VALUES
(1, NULL, 'BSCIT', 30, 'FICT'),
(2, NULL, 'BSCBIT', 25, 'FICT'),
(3, NULL, 'BSCSM', 20, 'FICT'),
(10, NULL, 'DIT', 20, 'FICT'),
(11, NULL, 'DBIT', 25, 'FICT'),
(12, NULL, 'DSM', 22, 'FICT');

-- --------------------------------------------------------

--
-- Table structure for table `class_courses`
--

CREATE TABLE `class_courses` (
  `id` int(11) NOT NULL,
  `class_id` int(11) NOT NULL,
  `course_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `class_courses`
--

INSERT INTO `class_courses` (`id`, `class_id`, `course_id`) VALUES
(1, 1, 1),
(2, 1, 6),
(3, 1, 8),
(4, 1, 10),
(5, 2, 4),
(6, 2, 7),
(7, 2, 9),
(8, 2, 11),
(9, 3, 2),
(10, 3, 12),
(11, 3, 13),
(12, 3, 15),
(13, 10, 3),
(14, 10, 5),
(15, 10, 14),
(16, 10, 16),
(17, 11, 17),
(18, 11, 19),
(19, 11, 21),
(20, 11, 23),
(21, 12, 18),
(22, 12, 20),
(23, 12, 22),
(24, 12, 24);

-- --------------------------------------------------------

--
-- Table structure for table `courses`
--

CREATE TABLE `courses` (
  `id` int(11) NOT NULL,
  `course_code` varchar(50) NOT NULL,
  `course_name` varchar(150) NOT NULL,
  `stream` varchar(100) NOT NULL,
  `venue` varchar(100) DEFAULT NULL,
  `scheduled_time` time DEFAULT NULL,
  `lecturer_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `courses`
--

INSERT INTO `courses` (`id`, `course_code`, `course_name`, `stream`, `venue`, `scheduled_time`, `lecturer_id`) VALUES
(1, 'CS101', 'Introduction to Computer Science', 'Computer Science', 'Room A101', '08:00:00', 26),
(2, 'CS301', 'Calculus II', 'Computer Science', 'Room A102', '08:30:00', 26),
(3, 'CS401', 'Physics Basics', 'Computer Science', 'Room A103', '09:00:00', 26),
(4, 'CS201', 'Data Structures', 'Computer Science', 'Room A104', '09:30:00', 26),
(5, 'IT401', 'Algorithms', 'Information Technology', 'Room B101', '10:00:00', 27),
(6, 'IT101', 'Networking Fundamentals', 'Information Technology', 'Room B102', '10:30:00', 27),
(7, 'IT201', 'Operating Systems', 'Information Technology', 'Room B103', '11:00:00', 27),
(8, 'SE101', 'Software Engineering I', 'Software Engineering', 'Room C101', '11:30:00', 28),
(9, 'SE201', 'Agile Methodologies', 'Software Engineering', 'Room C102', '12:00:00', 28),
(10, 'IS101', 'Database Systems', 'Information Systems', 'Room D101', '12:30:00', 29),
(11, 'IS201', 'Enterprise Systems', 'Information Systems', 'Room D102', '13:00:00', 29),
(12, 'IT301', 'Database Administration', 'Information Technology', 'Room B104', '13:30:00', 27),
(13, 'SE301', 'Software Testing', 'Software Engineering', 'Room C103', '14:00:00', 28),
(14, 'SE401', 'Project Management', 'Software Engineering', 'Room C104', '14:30:00', 28),
(15, 'IS301', 'Business Analytics', 'Information Systems', 'Room D103', '15:00:00', 29),
(16, 'IS401', 'Enterprise Architecture', 'Information Systems', 'Room D104', '15:30:00', 29),
(17, 'CS501', 'Artificial Intelligence', 'Computer Science', 'Room A105', '16:00:00', 26),
(18, 'CS601', 'Computer Graphics', 'Computer Science', 'Room A106', '16:30:00', 26),
(19, 'IT501', 'Cloud Computing', 'Information Technology', 'Room B105', '17:00:00', 27),
(20, 'IT601', 'Cybersecurity', 'Information Technology', 'Room B106', '17:30:00', 27),
(21, 'SE501', 'Software Architecture', 'Software Engineering', 'Room C105', '18:00:00', 28),
(22, 'SE601', 'Mobile App Development', 'Software Engineering', 'Room C106', '18:30:00', 28),
(23, 'IS501', 'Data Warehousing', 'Information Systems', 'Room D105', '19:00:00', 29),
(24, 'IS601', 'IT Project Implementation', 'Information Systems', 'Room D106', '19:30:00', 29),
(26, 'IT507', 'c++', 'Information Technology', NULL, NULL, 27);

-- --------------------------------------------------------

--
-- Table structure for table `lecturer_class_ratings`
--

CREATE TABLE `lecturer_class_ratings` (
  `id` int(11) NOT NULL,
  `lecturer_id` int(11) NOT NULL,
  `class_id` int(11) NOT NULL,
  `course_id` int(11) NOT NULL,
  `rating` int(11) NOT NULL CHECK (`rating` >= 1 and `rating` <= 5),
  `comment` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `lecturer_class_ratings`
--

INSERT INTO `lecturer_class_ratings` (`id`, `lecturer_id`, `class_id`, `course_id`, `rating`, `comment`, `created_at`) VALUES
(1, 28, 11, 21, 2, '', '2025-10-06 10:09:23'),
(2, 26, 3, 2, 2, '', '2025-10-08 19:13:24'),
(3, 27, 2, 7, 3, '', '2025-10-07 13:55:21');

-- --------------------------------------------------------

--
-- Table structure for table `prl_feedback`
--

CREATE TABLE `prl_feedback` (
  `id` int(11) NOT NULL,
  `report_id` int(11) DEFAULT NULL,
  `prl_id` int(11) DEFAULT NULL,
  `feedback` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `prl_feedback`
--

INSERT INTO `prl_feedback` (`id`, `report_id`, `prl_id`, `feedback`, `created_at`) VALUES
(1, 4, 23, 'time', '2025-10-06 15:03:50');

-- --------------------------------------------------------

--
-- Table structure for table `rating`
--

CREATE TABLE `rating` (
  `id` int(11) NOT NULL,
  `student_id` int(11) DEFAULT NULL,
  `lecturer_id` int(11) DEFAULT NULL,
  `rating` int(11) DEFAULT NULL,
  `comment` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `rating`
--

INSERT INTO `rating` (`id`, `student_id`, `lecturer_id`, `rating`, `comment`, `created_at`) VALUES
(13, 31, 28, 4, '', '2025-10-04 18:06:26'),
(14, 31, 26, 3, '', '2025-10-04 18:10:37'),
(15, 31, 27, 1, '', '2025-10-05 08:45:21'),
(16, 34, 26, 3, '', '2025-10-05 10:03:44'),
(17, 34, 26, 2, '', '2025-10-05 18:10:58'),
(18, 34, 29, 2, '', '2025-10-05 19:09:05'),
(19, 32, 27, 3, '', '2025-10-05 19:41:32'),
(20, 34, 28, 3, '', '2025-10-06 02:05:03'),
(21, 34, 27, 3, 'wow', '2025-10-07 12:07:44'),
(22, 33, 28, 3, 'wlow', '2025-10-07 13:00:15'),
(23, 31, 29, 2, '', '2025-10-07 13:01:17');

-- --------------------------------------------------------

--
-- Table structure for table `reports`
--

CREATE TABLE `reports` (
  `id` int(11) NOT NULL,
  `faculty_name` varchar(100) DEFAULT NULL,
  `class_name` varchar(100) DEFAULT NULL,
  `week_of_reporting` varchar(20) DEFAULT NULL,
  `date_of_lecture` date DEFAULT NULL,
  `course_name` varchar(100) DEFAULT NULL,
  `course_code` varchar(50) DEFAULT NULL,
  `lecturer_name` varchar(100) DEFAULT NULL,
  `actual_students_present` int(11) DEFAULT NULL,
  `total_students` int(11) DEFAULT NULL,
  `venue` varchar(100) DEFAULT NULL,
  `scheduled_time` varchar(50) DEFAULT NULL,
  `topic` varchar(255) DEFAULT NULL,
  `learning_outcomes` text DEFAULT NULL,
  `recommendations` text DEFAULT NULL,
  `stream` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `reports`
--

INSERT INTO `reports` (`id`, `faculty_name`, `class_name`, `week_of_reporting`, `date_of_lecture`, `course_name`, `course_code`, `lecturer_name`, `actual_students_present`, `total_students`, `venue`, `scheduled_time`, `topic`, `learning_outcomes`, `recommendations`, `stream`) VALUES
(1, 'Engineering', 'CS101 - Morning', 'Week 1', '2025-09-25', 'Introduction to Computer Science', 'CS101', 'Dr. John Smith', 28, 30, 'Room 101', '08:00 AM', 'Programming Basics', 'Understand basic programming concepts', 'Review student participation', NULL),
(2, 'Science', 'MATH201 - Afternoon', 'Week 1', '2025-09-26', 'Calculus II', 'MATH201', 'Dr. John Smith', 24, 25, 'Room 202', '02:00 PM', 'Derivatives', 'Understand how to calculate derivatives', 'Provide more examples', NULL),
(3, 'Science', 'PHY101 - Evening', 'Week 1', '2025-09-26', 'Physics Basics', 'PHY101', 'Dr. John Smith', 18, 20, 'Room 303', '05:00 PM', 'Newton Laws', 'Understand Newton’s three laws of motion', 'Include real-world examples', NULL),
(4, 'FICT', 'BSCBIT', '1', '2025-10-06', 'Agile Methodologies', 'SE201', 'Jacinta', 2, 25, 'Room C102', '12:00:00', 'fundamentals', 'kvhgkvtftg', 'nb,chgdfbiu', 'Software Engineering'),
(5, 'FICT', 'BSCBIT', '1', '2025-10-08', 'Data Structures', 'CS201', 'Ntsoaki', 4, 25, 'Room A104', '09:30:00', 'neh', 'boo', 'iyoo', 'Computer Science'),
(6, 'Information Technology', 'BSCSM', 'Week 41', '2025-10-08', 'Cybersecurity', 'IT601', 'Jay', 34, 59, 'Room B106', '17:30:00', 'fundamentals', 'ktg', 'jhlg7u', 'Information Technology'),
(7, 'Computer Science', 'BSCIT', 'Week 41', '2025-10-08', 'Introduction to Computer Science', 'CS101', 'Jay', 34, 59, 'Room A101', '08:00:00', 'fundamentals', '', '', 'Computer Science');

-- --------------------------------------------------------

--
-- Table structure for table `student_classes`
--

CREATE TABLE `student_classes` (
  `id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `class_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('student','lecturer','prl','pl') NOT NULL,
  `stream` varchar(100) DEFAULT NULL,
  `class_id` int(11) DEFAULT NULL,
  `faculty` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`, `stream`, `class_id`, `faculty`) VALUES
(19, 'nkhapetla', 'nkhapetla@pl.com', '$2b$10$uytR3.MVvQ8FWr/pQZP5zuiWgSz0Jc91zT4evq/9YzJmNTp10QPNm', 'pl', NULL, NULL, 'FICT'),
(21, 'ntsoaki', 'ntsoaki@prl.com', '$2b$10$EJ4nSpyoXqgLDWTxUoNHUeVRSVYfiropimsHRWiNv8s1hJ1HfM9Mu', 'prl', 'Information Technology', NULL, NULL),
(22, 'nkhapetla', 'nkhapetla@prl.com', '$2b$10$dJ6WZLjLD/48vD0iuBp7U./J4dj16Ku3N/g7FHV3F.bwOXM.OoP0C', 'prl', 'Software Engineering', NULL, NULL),
(23, 'jacinta', 'jacinta@prl.com', '$2b$10$pVnrGUopRWDSMrIRnDU9xuqkmu1FVsrnVkJLv.YjR1u/.lpeusxI2', 'prl', 'Information Systems', NULL, NULL),
(24, 'jay', 'jay@prl.com', '$2b$10$vBR.SpaboRLhpf0fqXZ37eo3P7qWD6Y96f6y0N.41nW.XM9JK9bIa', 'prl', 'Computer Science', NULL, NULL),
(26, 'Ntsoaki', 'ntsoaki@l.com', '$2b$10$LQu5Mf35mOeIfVc8yd6HFuDcx729jR4xON7kuqdMUKzAINDjf.jCO', 'lecturer', NULL, NULL, 'FICT'),
(27, 'Nkhapetla', 'nkhapetla@l.com', '$2b$10$PBuTAz3xpNCJ9ZMzV2SHzuYNXWGMzj4I.8TBppslDOtMBu1g6m516', 'lecturer', NULL, NULL, 'FICT'),
(28, 'Jacinta', 'jacinta@l.com', '$2b$10$Ns1hIgYkh2O6c6niWGaQIuKS/GRhwZVrCSyCsEXZv6JGobRvF13GW', 'lecturer', NULL, NULL, 'FICT'),
(29, 'Jay', 'jay@l.com', '$2b$10$qjHF.mjPSudr2EU1pc1B4e0Bwwx5DtCal.QiB60qXXk58IADPFx6G', 'lecturer', NULL, NULL, 'FICT'),
(31, 'ntsoaki', 'ntsoaki@s.com', '$2b$10$QqFHV1YgoxDg/RFOiFkezebWetLMGj1mMLrveNS16Y/Q5fdvGIcVq', 'student', NULL, 1, NULL),
(32, 'nkhapetla', 'nkhapetla@s.com', '$2b$10$mU3r3o/XK152qPywP1DKpuvpUyNjhicH6/6HbAqseHFjFjXIDxLZS', 'student', NULL, 1, NULL),
(33, 'jacinta', 'jacinta@s.com', '$2b$10$YDfpwEkLw8KJnaLn0dTUU.kTVubKXCyU/zmiDsqSKPzrrAn7d1o2q', 'student', NULL, 2, NULL),
(34, 'jay', 'jay@s.com', '$2b$10$c26z2a5AnFQQBd2/l6dSiewuo87kreAjPdzUA8ZzKxJNpgCWxHgcC', 'student', NULL, 2, NULL),
(35, 'jac', 'jac@s.com', '$2b$10$ONOhou8rgC8pjk0KY7vJyeFsp.R7A/lwDvdWMWUFm6ssL9LVNMHJm', 'student', NULL, 3, NULL),
(36, 'juicy jay', 'juicyjay@s.com', '$2b$10$diniw60HbrdHH1J.iVpxoOP.gIpSH9LxapYMMWEHSDHgAIb4V9DXq', 'student', NULL, 3, NULL),
(37, 'clement', 'clement@s.com', '$2b$10$1z0x9sb/RT5KDRnmPvLJ7Op4O0//U9o/ei4z6IRMPeCJyI3r9l5.u', 'student', NULL, 10, NULL),
(38, 'clementine', 'clementine@s.com', '$2b$10$euyCXKBdLr2gKnnMQN528eVn6MmelyTdXkgtX5UQkH5thcd/3074C', 'student', NULL, 10, NULL),
(39, 'theko', 'theko@s.com', '$2b$10$qLrlxSPfKHhjN0vgTcCsTug2Qxm7DejvCmZu5CRvXCMYrslSSOUHO', 'student', NULL, 11, NULL),
(40, 'mahlape', 'mahlape@s.com', '$2b$10$dry3xVQqbgLocrnz4wcH2.MjhhDiitXpDmAlG3BZswfnqNVj4hzE6', 'student', NULL, 11, NULL),
(41, 'nala', 'nala@s.com', '$2b$10$4S9kqBNguNX6ZU9fjoj.MuQSGtrG9FF0cyBDGJYylGGmAaAh5vfwy', 'student', NULL, 12, NULL),
(42, 'sehlabo', 'sehlabo@s.com', '$2b$10$Zf60BwHMa5akrYTnkO.j1OOP1VCsgpGZQhTf5oVG/8Kym/GuynzV2', 'student', NULL, 12, NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `attendance`
--
ALTER TABLE `attendance`
  ADD PRIMARY KEY (`student_id`,`class_id`,`date`),
  ADD KEY `class_id` (`class_id`);

--
-- Indexes for table `classes`
--
ALTER TABLE `classes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `course_id` (`course_id`);

--
-- Indexes for table `class_courses`
--
ALTER TABLE `class_courses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `class_id` (`class_id`),
  ADD KEY `course_id` (`course_id`);

--
-- Indexes for table `courses`
--
ALTER TABLE `courses`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `course_code` (`course_code`);

--
-- Indexes for table `lecturer_class_ratings`
--
ALTER TABLE `lecturer_class_ratings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_lecturer_class` (`lecturer_id`,`class_id`,`course_id`),
  ADD KEY `class_id` (`class_id`),
  ADD KEY `course_id` (`course_id`);

--
-- Indexes for table `prl_feedback`
--
ALTER TABLE `prl_feedback`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_report_feedback` (`report_id`,`prl_id`);

--
-- Indexes for table `rating`
--
ALTER TABLE `rating`
  ADD PRIMARY KEY (`id`),
  ADD KEY `student_id` (`student_id`),
  ADD KEY `lecturer_id` (`lecturer_id`);

--
-- Indexes for table `reports`
--
ALTER TABLE `reports`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `student_classes`
--
ALTER TABLE `student_classes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `student_id` (`student_id`),
  ADD KEY `class_id` (`class_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `fk_class` (`class_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `classes`
--
ALTER TABLE `classes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `class_courses`
--
ALTER TABLE `class_courses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- AUTO_INCREMENT for table `courses`
--
ALTER TABLE `courses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- AUTO_INCREMENT for table `lecturer_class_ratings`
--
ALTER TABLE `lecturer_class_ratings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `prl_feedback`
--
ALTER TABLE `prl_feedback`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `rating`
--
ALTER TABLE `rating`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT for table `reports`
--
ALTER TABLE `reports`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `student_classes`
--
ALTER TABLE `student_classes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=43;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `attendance`
--
ALTER TABLE `attendance`
  ADD CONSTRAINT `attendance_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `attendance_ibfk_2` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`);

--
-- Constraints for table `classes`
--
ALTER TABLE `classes`
  ADD CONSTRAINT `classes_ibfk_1` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`);

--
-- Constraints for table `class_courses`
--
ALTER TABLE `class_courses`
  ADD CONSTRAINT `class_courses_ibfk_1` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`),
  ADD CONSTRAINT `class_courses_ibfk_2` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`);

--
-- Constraints for table `lecturer_class_ratings`
--
ALTER TABLE `lecturer_class_ratings`
  ADD CONSTRAINT `lecturer_class_ratings_ibfk_1` FOREIGN KEY (`lecturer_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `lecturer_class_ratings_ibfk_2` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`),
  ADD CONSTRAINT `lecturer_class_ratings_ibfk_3` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`);

--
-- Constraints for table `rating`
--
ALTER TABLE `rating`
  ADD CONSTRAINT `rating_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `rating_ibfk_2` FOREIGN KEY (`lecturer_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `student_classes`
--
ALTER TABLE `student_classes`
  ADD CONSTRAINT `student_classes_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `student_classes_ibfk_2` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`);

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `fk_class` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
