ALTER TABLE `crm_leads` ADD `stage` text DEFAULT 'new' NOT NULL;--> statement-breakpoint
ALTER TABLE `crm_leads` ADD `interest` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `crm_leads` ADD `budget` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `crm_leads` ADD `tags` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `crm_leads` ADD `note` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `crm_leads` ADD `deal_value` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `crm_leads` ADD `next_at` integer;--> statement-breakpoint
ALTER TABLE `crm_leads` ADD `next_note` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `crm_leads` ADD `missed` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE `crm_leads` SET `stage`='contacted' WHERE `status`='contacted';--> statement-breakpoint
UPDATE `crm_leads` SET `stage`='won' WHERE `status`='booked';--> statement-breakpoint
UPDATE `crm_leads` SET `stage`='lost' WHERE `status`='lost';
