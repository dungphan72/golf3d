CREATE TABLE `crm2_activities` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`lead_id` text NOT NULL,
	`type` text NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`meta` text DEFAULT '{}' NOT NULL,
	`actor` text DEFAULT '' NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `crm2_activity_lead` ON `crm2_activities` (`tenant`,`lead_id`,`created`);--> statement-breakpoint
CREATE TABLE `crm2_appointments` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`lead_id` text NOT NULL,
	`owner` text,
	`service` text DEFAULT '' NOT NULL,
	`at` integer NOT NULL,
	`status` text DEFAULT 'CONFIRMED' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_by` text DEFAULT '' NOT NULL,
	`approved_by` text,
	`decided_at` integer,
	`created` integer NOT NULL,
	`updated` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `crm2_appt_at` ON `crm2_appointments` (`tenant`,`at`);--> statement-breakpoint
CREATE INDEX `crm2_appt_lead` ON `crm2_appointments` (`tenant`,`lead_id`);--> statement-breakpoint
CREATE TABLE `crm2_blocked_phones` (
	`tenant` text NOT NULL,
	`phone_norm` text NOT NULL,
	`reason` text DEFAULT '' NOT NULL,
	`added_by` text DEFAULT '' NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `crm2_blocked_key` ON `crm2_blocked_phones` (`tenant`,`phone_norm`);--> statement-breakpoint
CREATE TABLE `crm2_customer_profiles` (
	`tenant` text NOT NULL,
	`phone_norm` text NOT NULL,
	`code` text NOT NULL,
	`birthday` text DEFAULT '' NOT NULL,
	`gender` text DEFAULT '' NOT NULL,
	`occupation` text DEFAULT '' NOT NULL,
	`interests` text DEFAULT '[]' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`birthday_task_year` integer,
	`updated_by` text DEFAULT '' NOT NULL,
	`created` integer NOT NULL,
	`updated` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `crm2_profile_phone` ON `crm2_customer_profiles` (`tenant`,`phone_norm`);--> statement-breakpoint
CREATE UNIQUE INDEX `crm2_profile_code` ON `crm2_customer_profiles` (`tenant`,`code`);--> statement-breakpoint
CREATE TABLE `crm2_holds` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`product_code` text NOT NULL,
	`product_name` text DEFAULT '' NOT NULL,
	`limited` integer DEFAULT 0 NOT NULL,
	`lead_id` text NOT NULL,
	`lead_name` text DEFAULT '' NOT NULL,
	`kind` text DEFAULT 'HOLD' NOT NULL,
	`amount` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`expires_at` integer,
	`note` text DEFAULT '' NOT NULL,
	`created_by` text DEFAULT '' NOT NULL,
	`created` integer NOT NULL,
	`updated` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `crm2_hold_lead` ON `crm2_holds` (`tenant`,`lead_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `crm2_hold_active` ON `crm2_holds` (`tenant`,`product_code`) WHERE status = 'ACTIVE' AND limited = 1;--> statement-breakpoint
CREATE TABLE `crm2_leads` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`full_name` text NOT NULL,
	`phone` text NOT NULL,
	`phone_norm` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`source` text DEFAULT '' NOT NULL,
	`target_service` text DEFAULT '' NOT NULL,
	`preferred_date` text DEFAULT '' NOT NULL,
	`preferred_time` text DEFAULT '' NOT NULL,
	`stage` text DEFAULT 'NEW' NOT NULL,
	`status_id` text DEFAULT 'khach-moi' NOT NULL,
	`owner` text,
	`owned_at` integer,
	`claimed_by` text,
	`claimed_at` integer,
	`pooled_at` integer,
	`lost_reason` text DEFAULT '' NOT NULL,
	`expected_value` integer DEFAULT 0 NOT NULL,
	`budget` integer DEFAULT 0 NOT NULL,
	`last_contact_at` integer,
	`inquiry_count` integer DEFAULT 1 NOT NULL,
	`next_action` text DEFAULT 'NEW' NOT NULL,
	`next_due` integer,
	`call_attempts` integer DEFAULT 0 NOT NULL,
	`last_result` text DEFAULT '' NOT NULL,
	`labels` text DEFAULT '[]' NOT NULL,
	`sla_alerted_at` integer,
	`stale_task_at` integer,
	`first_response_at` integer,
	`first_response_by` text,
	`first_response_min` integer,
	`first_response_work_min` integer,
	`won_at` integer,
	`created` integer NOT NULL,
	`updated` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `crm2_lead_phone` ON `crm2_leads` (`tenant`,`phone_norm`);--> statement-breakpoint
CREATE INDEX `crm2_lead_owner` ON `crm2_leads` (`tenant`,`owner`,`next_action`,`next_due`);--> statement-breakpoint
CREATE INDEX `crm2_lead_stage` ON `crm2_leads` (`tenant`,`stage`);--> statement-breakpoint
CREATE TABLE `crm2_order_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`order_id` text NOT NULL,
	`kind` text DEFAULT 'INSTALLMENT' NOT NULL,
	`label` text DEFAULT '' NOT NULL,
	`amount` integer NOT NULL,
	`paid_amount` integer DEFAULT 0 NOT NULL,
	`due_date` text,
	`paid_at` integer,
	`method` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'PLANNED' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`reminded_at` integer,
	`created_by` text DEFAULT '' NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `crm2_payment_order` ON `crm2_order_payments` (`tenant`,`order_id`,`due_date`);--> statement-breakpoint
CREATE TABLE `crm2_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`code` text NOT NULL,
	`lead_id` text NOT NULL,
	`hold_id` text,
	`product_code` text DEFAULT '' NOT NULL,
	`product_name` text DEFAULT '' NOT NULL,
	`limited` integer DEFAULT 0 NOT NULL,
	`list_price` integer DEFAULT 0 NOT NULL,
	`discount` integer DEFAULT 0 NOT NULL,
	`price` integer NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_by` text DEFAULT '' NOT NULL,
	`cancelled_at` integer,
	`cancel_reason` text DEFAULT '' NOT NULL,
	`refund_due` integer DEFAULT 0 NOT NULL,
	`created` integer NOT NULL,
	`updated` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `crm2_order_code` ON `crm2_orders` (`tenant`,`code`);--> statement-breakpoint
CREATE INDEX `crm2_order_lead` ON `crm2_orders` (`tenant`,`lead_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `crm2_order_active` ON `crm2_orders` (`tenant`,`product_code`) WHERE status IN ('ACTIVE','COMPLETED') AND limited = 1;--> statement-breakpoint
CREATE TABLE `crm2_products` (
	`tenant` text NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`list_price` integer DEFAULT 0 NOT NULL,
	`limited` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `crm2_product_code` ON `crm2_products` (`tenant`,`code`);--> statement-breakpoint
CREATE TABLE `crm2_runtime` (
	`tenant` text NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`updated` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `crm2_runtime_key` ON `crm2_runtime` (`tenant`,`key`);--> statement-breakpoint
CREATE TABLE `crm2_settings` (
	`tenant` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `crm2_staff` (
	`tenant` text NOT NULL,
	`user_id` text NOT NULL,
	`team` text DEFAULT '' NOT NULL,
	`is_leader` integer DEFAULT 0 NOT NULL,
	`extension` text DEFAULT '' NOT NULL,
	`updated` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `crm2_staff_user` ON `crm2_staff` (`tenant`,`user_id`);--> statement-breakpoint
CREATE TABLE `crm2_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`lead_id` text,
	`title` text NOT NULL,
	`type` text DEFAULT 'FOLLOW_UP' NOT NULL,
	`due_at` integer,
	`done_at` integer,
	`assignee` text,
	`created_by` text DEFAULT '' NOT NULL,
	`reminded_at` integer,
	`ukey` text,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `crm2_task_assignee` ON `crm2_tasks` (`tenant`,`assignee`,`done_at`,`due_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `crm2_task_ukey` ON `crm2_tasks` (`tenant`,`ukey`);