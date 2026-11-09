CREATE TABLE `crm2_ad_spend` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`campaign_id` text NOT NULL,
	`day` text NOT NULL,
	`amount` integer DEFAULT 0 NOT NULL,
	`impressions` integer DEFAULT 0 NOT NULL,
	`clicks` integer DEFAULT 0 NOT NULL,
	`updated` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `crm2_spend_day` ON `crm2_ad_spend` (`tenant`,`campaign_id`,`day`);--> statement-breakpoint
CREATE TABLE `crm2_campaigns` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`name` text NOT NULL,
	`source` text DEFAULT '' NOT NULL,
	`runner` text DEFAULT '' NOT NULL,
	`budget` integer DEFAULT 0 NOT NULL,
	`starts_on` text DEFAULT '' NOT NULL,
	`ends_on` text DEFAULT '' NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `crm2_campaign_name` ON `crm2_campaigns` (`tenant`,`name`);--> statement-breakpoint
CREATE TABLE `crm2_seeding` (
	`tenant` text NOT NULL,
	`phone_norm` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `crm2_seeding_key` ON `crm2_seeding` (`tenant`,`phone_norm`);--> statement-breakpoint
ALTER TABLE `crm2_leads` ADD `campaign` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `crm2_leads` ADD `seeding` integer DEFAULT 0 NOT NULL;