CREATE TABLE `staff_permissions` (
  `tenant` text NOT NULL,
  `user_id` text NOT NULL,
  `permissions` text NOT NULL,
  `updated_by` text NOT NULL,
  `updated_at` integer NOT NULL,
  PRIMARY KEY (`tenant`, `user_id`),
  FOREIGN KEY (`user_id`, `tenant`) REFERENCES `memberships` (`user_id`, `tenant`) ON DELETE CASCADE
);
