ALTER TABLE `users` ADD `phone` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `users_phone` ON `users` (`phone`) WHERE `phone` <> '';
