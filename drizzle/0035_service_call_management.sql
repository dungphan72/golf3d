CREATE TABLE IF NOT EXISTS `sc_settings` (
	`tenant` text PRIMARY KEY NOT NULL,
	`is_enabled` integer DEFAULT 1 NOT NULL,
	`guest_mode` text DEFAULT 'MODE_C' NOT NULL,
	`require_active_session` integer DEFAULT 0 NOT NULL,
	`sla_ack_seconds` integer DEFAULT 120 NOT NULL,
	`sla_resolve_seconds` integer DEFAULT 600 NOT NULL,
	`cooldown_seconds` integer DEFAULT 60 NOT NULL,
	`max_open_requests` integer DEFAULT 3 NOT NULL,
	`sound_alert_enabled` integer DEFAULT 1 NOT NULL,
	`auto_assign_staff` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `sc_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`code` text NOT NULL,
	`name_vi` text NOT NULL,
	`name_en` text NOT NULL,
	`name_ko` text NOT NULL,
	`icon` text DEFAULT 'Bell' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `sc_cat_tenant_idx` ON `sc_categories` (`tenant`,`sort_order`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `sc_qr_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`room_id` text NOT NULL,
	`token_secret` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`revoked_at` integer
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `sc_qr_token_idx` ON `sc_qr_codes` (`token_secret`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `sc_qr_room_idx` ON `sc_qr_codes` (`tenant`,`room_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `sc_guest_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`room_id` text NOT NULL,
	`qr_id` text NOT NULL,
	`phone` text,
	`ip_hash` text,
	`user_agent` text,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `sc_sess_exp_idx` ON `sc_guest_sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `sc_calls` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`room_id` text NOT NULL,
	`category_id` text NOT NULL,
	`category_code` text NOT NULL,
	`source` text NOT NULL,
	`status` text NOT NULL,
	`customer_name` text,
	`customer_phone` text,
	`member_id` text,
	`booking_id` text,
	`note` text,
	`assigned_staff_id` text,
	`assigned_staff_name` text,
	`resolution_type` text,
	`resolution_note` text,
	`idempotency_key` text,
	`created_at` integer NOT NULL,
	`acknowledged_at` integer,
	`started_at` integer,
	`completed_at` integer,
	`sla_ack_breached` integer DEFAULT 0 NOT NULL,
	`sla_resolve_breached` integer DEFAULT 0 NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `sc_calls_active_idx` ON `sc_calls` (`tenant`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `sc_calls_room_idx` ON `sc_calls` (`tenant`,`room_id`,`created_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `sc_calls_idemp_idx` ON `sc_calls` (`tenant`,`idempotency_key`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `sc_call_events` (
	`id` text PRIMARY KEY NOT NULL,
	`call_id` text NOT NULL,
	`tenant` text NOT NULL,
	`from_status` text,
	`to_status` text NOT NULL,
	`actor_type` text NOT NULL,
	`actor_id` text,
	`actor_name` text,
	`note` text,
	`created_at` integer NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `sc_events_call_idx` ON `sc_call_events` (`call_id`,`created_at`);
