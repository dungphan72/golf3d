CREATE TABLE `audit` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`action` text NOT NULL,
	`detail` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`room` text NOT NULL,
	`customer` text NOT NULL,
	`phone` text NOT NULL,
	`service` text NOT NULL,
	`people` integer NOT NULL,
	`start` integer NOT NULL,
	`end` integer NOT NULL,
	`status` text NOT NULL,
	`segments` text NOT NULL,
	`started` integer,
	`finished` integer,
	`amount` integer,
	`payment` text,
	`price` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `booking_room_time` ON `bookings` (`tenant`,`room`,`start`,`end`);--> statement-breakpoint
CREATE TABLE `requests` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`booking` text NOT NULL,
	`kind` text NOT NULL,
	`status` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`tenant` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
