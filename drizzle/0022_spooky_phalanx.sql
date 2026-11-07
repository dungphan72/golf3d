CREATE TABLE `crm2_customer_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`customer_id` text NOT NULL,
	`task_id` text,
	`channel` text NOT NULL,
	`content` text NOT NULL,
	`actor` text DEFAULT '' NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `crm2_note_customer` ON `crm2_customer_notes` (`tenant`,`customer_id`,`created`);--> statement-breakpoint
ALTER TABLE `crm2_tasks` ADD `customer_id` text;--> statement-breakpoint
ALTER TABLE `crm2_tasks` ADD `rule` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `crm2_tasks` ADD `data` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `crm2_tasks` ADD `channel` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `crm2_tasks` ADD `note` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `crm2_tasks` ADD `outcome` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX `crm2_task_customer` ON `crm2_tasks` (`tenant`,`customer_id`);