CREATE TABLE `package_absences` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`package_id` text NOT NULL,
	`start_day` text NOT NULL,
	`end_day` text NOT NULL,
	`days` integer NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`source` text NOT NULL,
	`actor` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created` integer NOT NULL,
	`cancelled_at` integer,
	FOREIGN KEY (`package_id`) REFERENCES `customer_packages`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `package_absence_package` ON `package_absences` (`tenant`,`package_id`);--> statement-breakpoint
ALTER TABLE `customer_packages` ADD `valid_days` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `customer_packages` ADD `activated_at` integer;--> statement-breakpoint
ALTER TABLE `customer_packages` ADD `activate_by` integer;--> statement-breakpoint
ALTER TABLE `customer_packages` ADD `renewed_from` text;--> statement-breakpoint
ALTER TABLE `customer_packages` ADD `reminded_expiry` integer;--> statement-breakpoint
ALTER TABLE `customer_packages` ADD `reminded_activate` integer;--> statement-breakpoint
DROP TRIGGER customer_packages_no_update;--> statement-breakpoint
UPDATE customer_packages SET valid_days=CAST(round((expires-purchased)/86400000.0) AS integer),activated_at=purchased;--> statement-breakpoint
CREATE TRIGGER customer_packages_no_update BEFORE UPDATE ON customer_packages
WHEN NEW.id IS NOT OLD.id OR NEW.tenant IS NOT OLD.tenant OR NEW.customer_id IS NOT OLD.customer_id OR NEW.type_id IS NOT OLD.type_id OR NEW.name IS NOT OLD.name OR NEW.source IS NOT OLD.source OR NEW.price_paid IS NOT OLD.price_paid OR NEW.grants IS NOT OLD.grants OR NEW.perks IS NOT OLD.perks OR NEW.room IS NOT OLD.room OR NEW.purchased IS NOT OLD.purchased OR NEW.actor IS NOT OLD.actor OR NEW.valid_days IS NOT OLD.valid_days OR NEW.activate_by IS NOT OLD.activate_by OR NEW.renewed_from IS NOT OLD.renewed_from OR NEW.expires<=NEW.purchased OR (OLD.activated_at IS NOT NULL AND NEW.activated_at IS NOT OLD.activated_at)
BEGIN SELECT RAISE(ABORT,'PACKAGE_IMMUTABLE'); END;--> statement-breakpoint
CREATE TRIGGER package_absences_no_delete BEFORE DELETE ON package_absences BEGIN SELECT RAISE(ABORT,'ABSENCE_IMMUTABLE'); END;
