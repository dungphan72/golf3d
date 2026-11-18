CREATE TABLE IF NOT EXISTS `parking_settings` (
	`tenant` text PRIMARY KEY NOT NULL,
	`is_enabled` integer DEFAULT 1 NOT NULL,
	`facility_name` text DEFAULT 'Bãi xe GoPick' NOT NULL,
	`address` text DEFAULT '250 Lương Định Của, Phường An Phú, TP. Thủ Đức, TP.HCM' NOT NULL,
	`directions_url` text DEFAULT 'https://maps.google.com/?q=250+Luong+Dinh+Cua' NOT NULL,
	`default_hourly_rate` integer DEFAULT 30000 NOT NULL,
	`buffer_minutes` integer DEFAULT 0 NOT NULL,
	`hold_timeout_seconds` integer DEFAULT 300 NOT NULL,
	`golf_free_hours` integer DEFAULT 3 NOT NULL,
	`golf_slots_per_booking` integer DEFAULT 1 NOT NULL,
	`overtime_rate_per_hour` integer DEFAULT 30000 NOT NULL,
	`allow_paper_tickets` integer DEFAULT 1 NOT NULL,
	`updated_at` integer NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `parking_spots` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`code` text NOT NULL,
	`section` text NOT NULL,
	`spot_type` text DEFAULT 'car' NOT NULL,
	`row_index` integer DEFAULT 0 NOT NULL,
	`col_index` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `parking_spots_tenant_code_idx` ON `parking_spots` (`tenant`,`code`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `parking_spots_tenant_sort_idx` ON `parking_spots` (`tenant`,`sort_order`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `parking_tickets` (
	`id` text PRIMARY KEY NOT NULL,
	`ticket_code` text NOT NULL,
	`tenant` text NOT NULL,
	`spot_id` text NOT NULL,
	`spot_code` text NOT NULL,
	`section` text NOT NULL,
	`customer_id` text DEFAULT '' NOT NULL,
	`customer_name` text NOT NULL,
	`customer_phone` text NOT NULL,
	`license_plate` text NOT NULL,
	`vehicle_type` text DEFAULT 'car' NOT NULL,
	`expected_in` integer NOT NULL,
	`expected_out` integer NOT NULL,
	`actual_in` integer,
	`actual_out` integer,
	`checkin_by` text DEFAULT '' NOT NULL,
	`checkout_by` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'holding' NOT NULL,
	`source` text DEFAULT 'web' NOT NULL,
	`golf_booking_id` text,
	`pos_bill_id` text,
	`base_amount` integer DEFAULT 30000 NOT NULL,
	`sponsored_amount` integer DEFAULT 0 NOT NULL,
	`paid_amount` integer DEFAULT 0 NOT NULL,
	`overtime_amount` integer DEFAULT 0 NOT NULL,
	`total_amount` integer DEFAULT 30000 NOT NULL,
	`refund_amount` integer DEFAULT 0 NOT NULL,
	`fee_payer` text DEFAULT 'customer' NOT NULL,
	`hold_expires_at` integer NOT NULL,
	`access_token` text NOT NULL,
	`payment_method` text DEFAULT '' NOT NULL,
	`payment_ref` text DEFAULT '' NOT NULL,
	`paid_at` integer,
	`paper_ticket_no` text,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `parking_tickets_code_idx` ON `parking_tickets` (`ticket_code`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `parking_tickets_token_idx` ON `parking_tickets` (`access_token`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `parking_tickets_tenant_spot_time_idx` ON `parking_tickets` (`tenant`,`spot_id`,`expected_in`,`expected_out`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `parking_tickets_tenant_status_idx` ON `parking_tickets` (`tenant`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `parking_tickets_plate_idx` ON `parking_tickets` (`tenant`,`license_plate`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `parking_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`ticket_id` text NOT NULL,
	`ticket_code` text NOT NULL,
	`shift_id` text,
	`tx_type` text NOT NULL,
	`method` text NOT NULL,
	`amount` integer NOT NULL,
	`reference_code` text DEFAULT '' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`recorded_by` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `parking_tx_tenant_created_idx` ON `parking_transactions` (`tenant`,`created_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `parking_tx_shift_idx` ON `parking_transactions` (`tenant`,`shift_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `parking_shifts` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`staff_id` text NOT NULL,
	`staff_name` text NOT NULL,
	`opened_at` integer NOT NULL,
	`closed_at` integer,
	`status` text DEFAULT 'open' NOT NULL,
	`online_total` integer DEFAULT 0 NOT NULL,
	`gate_cash_total` integer DEFAULT 0 NOT NULL,
	`gate_transfer_total` integer DEFAULT 0 NOT NULL,
	`refund_total` integer DEFAULT 0 NOT NULL,
	`net_collected` integer DEFAULT 0 NOT NULL,
	`sponsored_total` integer DEFAULT 0 NOT NULL,
	`cash_submitted` integer DEFAULT 0 NOT NULL,
	`cash_diff` integer DEFAULT 0 NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `parking_shifts_tenant_idx` ON `parking_shifts` (`tenant`,`opened_at`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `parking_audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`ticket_id` text,
	`actor_id` text NOT NULL,
	`actor_name` text NOT NULL,
	`action` text NOT NULL,
	`detail` text NOT NULL,
	`created_at` integer NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `parking_audit_tenant_idx` ON `parking_audit_logs` (`tenant`,`created_at`);
