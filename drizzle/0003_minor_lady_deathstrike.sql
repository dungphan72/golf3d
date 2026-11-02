CREATE TABLE `stock_items` (
	`item_id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`low_level` integer NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `menu_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `stock_movements` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`item_id` text NOT NULL,
	`item_name` text NOT NULL,
	`unit` text NOT NULL,
	`kind` text NOT NULL,
	`qty` integer NOT NULL,
	`delta` integer NOT NULL,
	`request_id` text NOT NULL,
	`signature` text NOT NULL,
	`order_id` text,
	`note` text NOT NULL,
	`actor` text NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `menu_items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`order_id`) REFERENCES `food_orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stock_request_once` ON `stock_movements` (`tenant`,`request_id`);--> statement-breakpoint
CREATE INDEX `stock_item_time` ON `stock_movements` (`tenant`,`item_id`,`created`);--> statement-breakpoint
CREATE VIEW stock_status AS
SELECT m.id,m.tenant,m.name,m.unit,s.low_level,
 COALESCE((SELECT sum(delta) FROM stock_movements x WHERE x.item_id=m.id AND x.tenant=m.tenant),0) AS on_hand,
 COALESCE((SELECT sum(json_extract(j.value,'$.qty')) FROM food_orders o,json_each(o.items) j WHERE o.tenant=m.tenant AND o.status IN ('new','preparing','ready') AND json_extract(j.value,'$.itemId')=m.id AND json_extract(j.value,'$.stockTracked')=1),0) AS reserved
FROM menu_items m LEFT JOIN stock_items s ON s.item_id=m.id AND s.tenant=m.tenant;
--> statement-breakpoint
CREATE TRIGGER stock_config_insert BEFORE INSERT ON stock_items BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM menu_items WHERE id=NEW.item_id AND tenant=NEW.tenant) OR NEW.low_level<0 OR NEW.low_level>1000000 THEN RAISE(ABORT,'INVALID_STOCK') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM stock_items WHERE item_id=NEW.item_id) AND EXISTS(SELECT 1 FROM food_orders o,json_each(o.items) j WHERE o.tenant=NEW.tenant AND o.status IN ('new','preparing','ready') AND json_extract(j.value,'$.itemId')=NEW.item_id) THEN RAISE(ABORT,'STOCK_PENDING_ORDERS') END;
END;
--> statement-breakpoint
CREATE TRIGGER stock_config_added AFTER INSERT ON stock_items BEGIN
 UPDATE menu_items SET version=version+1 WHERE id=NEW.item_id AND tenant=NEW.tenant;
 INSERT INTO audit VALUES (lower(hex(randomblob(16))),NEW.tenant,'stock-config',NEW.item_id,NEW.created);
END;
--> statement-breakpoint
CREATE TRIGGER stock_config_update BEFORE UPDATE ON stock_items BEGIN
 SELECT CASE WHEN NEW.item_id<>OLD.item_id OR NEW.tenant<>OLD.tenant OR NEW.created<>OLD.created OR NEW.low_level<0 OR NEW.low_level>1000000 THEN RAISE(ABORT,'INVALID_STOCK') END;
END;
--> statement-breakpoint
CREATE TRIGGER stock_config_updated AFTER UPDATE ON stock_items BEGIN
 INSERT INTO audit VALUES (lower(hex(randomblob(16))),NEW.tenant,'stock-threshold',NEW.item_id || ':' || NEW.low_level,CAST(strftime('%s','now') AS INTEGER)*1000);
END;
--> statement-breakpoint
CREATE TRIGGER stock_config_delete BEFORE DELETE ON stock_items BEGIN SELECT RAISE(ABORT,'STOCK_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER stock_unit_guard BEFORE UPDATE OF unit ON menu_items WHEN NEW.unit<>OLD.unit AND EXISTS(SELECT 1 FROM stock_items WHERE item_id=OLD.id) BEGIN SELECT RAISE(ABORT,'STOCK_UNIT_LOCKED'); END;
--> statement-breakpoint
CREATE TRIGGER stock_order_guard BEFORE INSERT ON food_orders BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM json_each(NEW.items) j LEFT JOIN stock_status s ON s.id=json_extract(j.value,'$.itemId') AND s.tenant=NEW.tenant WHERE COALESCE(json_extract(j.value,'$.stockTracked'),0)<> CASE WHEN s.low_level IS NULL THEN 0 ELSE 1 END OR (s.low_level IS NOT NULL AND s.on_hand-s.reserved<json_extract(j.value,'$.qty'))) THEN RAISE(ABORT,'STOCK_UNAVAILABLE') END;
END;
--> statement-breakpoint
CREATE TRIGGER stock_movement_guard BEFORE INSERT ON stock_movements BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM stock_items s JOIN menu_items m ON m.id=s.item_id WHERE s.item_id=NEW.item_id AND s.tenant=NEW.tenant AND m.name=NEW.item_name AND m.unit=NEW.unit) OR typeof(NEW.qty)<>'integer' OR NEW.qty<1 OR NEW.qty>1000000 THEN RAISE(ABORT,'INVALID_STOCK') END;
 SELECT CASE WHEN NOT ((NEW.kind IN ('receipt','adjust_in') AND NEW.delta=NEW.qty AND NEW.order_id IS NULL AND length(trim(NEW.note))>=5) OR (NEW.kind='adjust_out' AND NEW.delta=-NEW.qty AND NEW.order_id IS NULL AND length(trim(NEW.note))>=5) OR (NEW.kind='sale' AND NEW.delta=-NEW.qty AND EXISTS(SELECT 1 FROM food_orders o,json_each(o.items) j WHERE o.id=NEW.order_id AND o.tenant=NEW.tenant AND o.status='served' AND json_extract(j.value,'$.stockTracked')=1 AND json_extract(j.value,'$.itemId')=NEW.item_id AND json_extract(j.value,'$.qty')=NEW.qty) AND NEW.request_id='sale:' || NEW.order_id || ':' || NEW.item_id)) THEN RAISE(ABORT,'INVALID_STOCK') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM stock_status WHERE id=NEW.item_id AND tenant=NEW.tenant AND (on_hand+NEW.delta<reserved OR on_hand+NEW.delta>1000000000)) THEN RAISE(ABORT,'STOCK_UNAVAILABLE') END;
END;
--> statement-breakpoint
CREATE TRIGGER stock_movement_audit AFTER INSERT ON stock_movements BEGIN
 INSERT INTO audit VALUES (lower(hex(randomblob(16))),NEW.tenant,'stock-' || NEW.kind,NEW.item_id || ':' || NEW.delta || ':' || NEW.note,NEW.created);
END;
--> statement-breakpoint
CREATE TRIGGER stock_movement_update BEFORE UPDATE ON stock_movements BEGIN SELECT RAISE(ABORT,'STOCK_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER stock_movement_delete BEFORE DELETE ON stock_movements BEGIN SELECT RAISE(ABORT,'STOCK_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER stock_order_served AFTER UPDATE OF status ON food_orders WHEN NEW.status='served' AND OLD.status<>'served' BEGIN
 INSERT INTO stock_movements(id,tenant,item_id,item_name,unit,kind,qty,delta,request_id,signature,order_id,note,actor,created)
 SELECT lower(hex(randomblob(16))),NEW.tenant,m.id,m.name,m.unit,'sale',json_extract(j.value,'$.qty'),-json_extract(j.value,'$.qty'),'sale:' || NEW.id || ':' || m.id,'',NEW.id,'Phục vụ đơn ' || NEW.id,NEW.actor,NEW.updated
 FROM json_each(NEW.items) j JOIN menu_items m ON m.id=json_extract(j.value,'$.itemId') AND m.tenant=NEW.tenant WHERE json_extract(j.value,'$.stockTracked')=1;
END;
