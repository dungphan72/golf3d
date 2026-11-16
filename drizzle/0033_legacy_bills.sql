CREATE TABLE `legacy_bills` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`code` text DEFAULT '' NOT NULL,
	`bill_at` integer NOT NULL,
	`customer` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`room` text DEFAULT '' NOT NULL,
	`service` text NOT NULL,
	`lines` text NOT NULL,
	`total` integer NOT NULL,
	`food` integer DEFAULT 0 NOT NULL,
	`method` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`status` text NOT NULL,
	`created_by` text NOT NULL,
	`created_by_name` text NOT NULL,
	`created` integer NOT NULL,
	`reviewed_by` text DEFAULT '' NOT NULL,
	`reviewed_by_name` text DEFAULT '' NOT NULL,
	`reviewed_at` integer,
	`review_note` text DEFAULT '' NOT NULL
);--> statement-breakpoint
CREATE INDEX `legacy_bills_list` ON `legacy_bills` (`tenant`,`status`,`bill_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `legacy_bills_code` ON `legacy_bills` (`tenant`,`code`) WHERE `code` <> '';
