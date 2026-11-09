CREATE TABLE `crm2_view_log` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`user_id` text NOT NULL,
	`lead_id` text NOT NULL,
	`lead_name` text DEFAULT '' NOT NULL,
	`kind` text DEFAULT 'lead' NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `crm2_view_log_time` ON `crm2_view_log` (`tenant`,`created`);--> statement-breakpoint
CREATE INDEX `crm2_view_log_user` ON `crm2_view_log` (`tenant`,`user_id`,`lead_id`,`created`);