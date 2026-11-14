CREATE TABLE `event_signups` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`post_id` text NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `event_signup_once` ON `event_signups` (`tenant`,`post_id`,`phone`);--> statement-breakpoint
CREATE INDEX `event_signup_list` ON `event_signups` (`tenant`,`post_id`,`created`);
