CREATE TABLE `crm2_inbound` (
	`tenant` text NOT NULL,
	`ext_key` text NOT NULL,
	`lead_id` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `crm2_inbound_key` ON `crm2_inbound` (`tenant`,`ext_key`);--> statement-breakpoint
ALTER TABLE `crm2_leads` ADD `channel_ref` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX `crm2_lead_channel` ON `crm2_leads` (`tenant`,`channel_ref`);