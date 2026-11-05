CREATE TABLE `package_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`customer_id` text NOT NULL,
	`type_id` text NOT NULL,
	`name` text NOT NULL,
	`price` integer NOT NULL,
	`status` text NOT NULL,
	`package_id` text,
	`handled_by` text,
	`handled_at` integer,
	`created` integer NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `package_order_customer` ON `package_orders` (`tenant`,`customer_id`,`status`);
--> statement-breakpoint
CREATE TRIGGER package_orders_validate BEFORE INSERT ON package_orders BEGIN
 SELECT CASE WHEN NEW.status<>'pending' OR NEW.package_id IS NOT NULL OR NEW.handled_by IS NOT NULL THEN RAISE(ABORT,'INVALID_ORDER_STATE') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM customers WHERE id=NEW.customer_id AND tenant=NEW.tenant) THEN RAISE(ABORT,'CUSTOMER_NOT_FOUND') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM package_types WHERE id=NEW.type_id AND tenant=NEW.tenant AND active=1 AND name=NEW.name AND price=NEW.price) THEN RAISE(ABORT,'PACKAGE_TYPE_UNAVAILABLE') END;
 SELECT CASE WHEN (SELECT COUNT(*) FROM package_orders WHERE tenant=NEW.tenant AND customer_id=NEW.customer_id AND status='pending')>=3 THEN RAISE(ABORT,'TOO_MANY_PENDING_ORDERS') END;
END;
--> statement-breakpoint
CREATE TRIGGER package_orders_update BEFORE UPDATE ON package_orders BEGIN
 SELECT CASE WHEN NEW.id<>OLD.id OR NEW.tenant<>OLD.tenant OR NEW.customer_id<>OLD.customer_id OR NEW.type_id<>OLD.type_id OR NEW.name<>OLD.name OR NEW.price<>OLD.price OR NEW.created<>OLD.created OR OLD.status<>'pending' OR NEW.status NOT IN ('confirmed','rejected','cancelled','pending') THEN RAISE(ABORT,'ORDER_IMMUTABLE') END;
END;
--> statement-breakpoint
CREATE TRIGGER package_orders_no_delete BEFORE DELETE ON package_orders BEGIN SELECT RAISE(ABORT,'ORDER_IMMUTABLE'); END;
