CREATE TABLE `room_maintenance` (
	`tenant` text NOT NULL,
	`room` text NOT NULL,
	`since` integer NOT NULL,
	`reason` text DEFAULT '' NOT NULL,
	`actor` text NOT NULL,
	PRIMARY KEY(`tenant`, `room`)
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`image` text DEFAULT '' NOT NULL,
	`event_at` integer,
	`place` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created` integer NOT NULL,
	`updated` integer NOT NULL,
	`actor` text NOT NULL,
	CHECK (`kind` IN ('news','event')),
	CHECK (`status` IN ('draft','published')),
	CHECK (`kind`='news' OR `event_at` IS NOT NULL)
);
--> statement-breakpoint
CREATE INDEX `posts_public` ON `posts` (`tenant`,`status`,`kind`,`created`);
