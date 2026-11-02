CREATE TABLE `food_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`booking_id` text NOT NULL,
	`request_id` text NOT NULL,
	`request_data` text NOT NULL,
	`items` text NOT NULL,
	`subtotal` integer NOT NULL,
	`fee` integer NOT NULL,
	`vat` integer NOT NULL,
	`total` integer NOT NULL,
	`note` text NOT NULL,
	`status` text NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`actor` text NOT NULL,
	`created` integer NOT NULL,
	`updated` integer NOT NULL,
	`reason` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `food_order_request_once` ON `food_orders` (`tenant`,`request_id`);--> statement-breakpoint
CREATE INDEX `food_order_booking` ON `food_orders` (`tenant`,`booking_id`);--> statement-breakpoint
CREATE INDEX `food_order_status` ON `food_orders` (`tenant`,`status`);--> statement-breakpoint
CREATE TABLE `menu_items` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`unit` text NOT NULL,
	`price` integer NOT NULL,
	`fee_bps` integer NOT NULL,
	`vat_bps` integer NOT NULL,
	`active` integer NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `menu_tenant` ON `menu_items` (`tenant`,`active`);--> statement-breakpoint
ALTER TABLE `bookings` ADD `food_total` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD `golf_amount` integer;--> statement-breakpoint
CREATE TRIGGER menu_validate_create BEFORE INSERT ON menu_items BEGIN
 SELECT CASE WHEN NEW.version<>0 OR NEW.active NOT IN (0,1) OR typeof(NEW.price)<>'integer' OR NEW.price<1 OR NEW.price>100000000 OR NEW.fee_bps<0 OR NEW.fee_bps>10000 OR NEW.vat_bps<0 OR NEW.vat_bps>10000 THEN RAISE(ABORT,'INVALID_MENU_ITEM') END;
 SELECT CASE WHEN (SELECT COUNT(*) FROM menu_items WHERE tenant=NEW.tenant)>=500 THEN RAISE(ABORT,'MENU_LIMIT') END;
END;
--> statement-breakpoint
CREATE TRIGGER menu_validate_update BEFORE UPDATE ON menu_items BEGIN
 SELECT CASE WHEN NEW.id<>OLD.id OR NEW.tenant<>OLD.tenant OR NEW.created<>OLD.created OR NEW.version<>OLD.version+1 OR NEW.active NOT IN (0,1) OR typeof(NEW.price)<>'integer' OR NEW.price<1 OR NEW.price>100000000 OR NEW.fee_bps<0 OR NEW.fee_bps>10000 OR NEW.vat_bps<0 OR NEW.vat_bps>10000 THEN RAISE(ABORT,'INVALID_MENU_ITEM') END;
END;
--> statement-breakpoint
CREATE TRIGGER menu_audit_create AFTER INSERT ON menu_items BEGIN INSERT INTO audit VALUES ('menu:'||NEW.id||':0',NEW.tenant,'Thêm món',json_object('item',NEW.id,'name',NEW.name,'price',NEW.price),NEW.created); END;
--> statement-breakpoint
CREATE TRIGGER menu_audit_update AFTER UPDATE ON menu_items BEGIN INSERT INTO audit VALUES ('menu:'||NEW.id||':'||NEW.version,NEW.tenant,'Sửa món',json_object('item',NEW.id,'oldPrice',OLD.price,'newPrice',NEW.price,'active',NEW.active),CAST(strftime('%s','now') AS INTEGER)*1000); END;
--> statement-breakpoint
CREATE TRIGGER menu_no_delete BEFORE DELETE ON menu_items BEGIN SELECT RAISE(ABORT,'ARCHIVE_MENU_INSTEAD'); END;
--> statement-breakpoint
CREATE TRIGGER food_validate_create BEFORE INSERT ON food_orders BEGIN
 SELECT CASE WHEN NEW.status<>'new' OR NEW.version<>0 OR NOT EXISTS(SELECT 1 FROM bookings WHERE tenant=NEW.tenant AND id=NEW.booking_id AND status IN ('playing','paused')) THEN RAISE(ABORT,'SESSION_NOT_ORDERABLE') END;
 SELECT CASE WHEN json_valid(NEW.items)<>1 THEN RAISE(ABORT,'INVALID_ORDER') END;
 SELECT CASE WHEN json_type(NEW.items)<>'array' OR json_array_length(NEW.items)<1 OR json_array_length(NEW.items)>10 OR (SELECT COUNT(DISTINCT json_extract(value,'$.itemId')) FROM json_each(NEW.items))<>json_array_length(NEW.items) THEN RAISE(ABORT,'INVALID_ORDER') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM json_each(NEW.items) l LEFT JOIN menu_items p ON p.id=json_extract(l.value,'$.itemId') AND p.tenant=NEW.tenant WHERE p.id IS NULL OR p.active<>1 OR p.version IS NOT json_extract(l.value,'$.version') OR p.name IS NOT json_extract(l.value,'$.name') OR p.category IS NOT json_extract(l.value,'$.category') OR p.unit IS NOT json_extract(l.value,'$.unit') OR p.price IS NOT json_extract(l.value,'$.price') OR p.fee_bps IS NOT json_extract(l.value,'$.feeBps') OR p.vat_bps IS NOT json_extract(l.value,'$.vatBps') OR json_type(l.value,'$.qty') IS NOT 'integer' OR json_extract(l.value,'$.qty')<1 OR json_extract(l.value,'$.qty')>99) THEN RAISE(ABORT,'MENU_CHANGED') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM json_each(NEW.items) l WHERE json_extract(l.value,'$.subtotal') IS NOT json_extract(l.value,'$.price')*json_extract(l.value,'$.qty') OR json_extract(l.value,'$.fee') IS NOT (json_extract(l.value,'$.subtotal')*json_extract(l.value,'$.feeBps')+5000)/10000 OR json_extract(l.value,'$.vat') IS NOT ((json_extract(l.value,'$.subtotal')+json_extract(l.value,'$.fee'))*json_extract(l.value,'$.vatBps')+5000)/10000 OR json_extract(l.value,'$.total') IS NOT json_extract(l.value,'$.subtotal')+json_extract(l.value,'$.fee')+json_extract(l.value,'$.vat')) THEN RAISE(ABORT,'INVALID_ORDER_TOTAL') END;
 SELECT CASE WHEN NEW.subtotal IS NOT (SELECT SUM(json_extract(value,'$.subtotal')) FROM json_each(NEW.items)) OR NEW.fee IS NOT (SELECT SUM(json_extract(value,'$.fee')) FROM json_each(NEW.items)) OR NEW.vat IS NOT (SELECT SUM(json_extract(value,'$.vat')) FROM json_each(NEW.items)) OR NEW.total IS NOT NEW.subtotal+NEW.fee+NEW.vat OR NEW.total<1 OR NEW.total>100000000000 THEN RAISE(ABORT,'INVALID_ORDER_TOTAL') END;
 SELECT CASE WHEN (SELECT COUNT(*) FROM food_orders WHERE tenant=NEW.tenant AND booking_id=NEW.booking_id)>=100 OR (SELECT COUNT(*) FROM food_orders WHERE tenant=NEW.tenant AND status IN ('new','preparing','ready'))>=200 OR NEW.total+COALESCE((SELECT SUM(total) FROM food_orders WHERE tenant=NEW.tenant AND booking_id=NEW.booking_id AND status<>'cancelled'),0)>100000000000 THEN RAISE(ABORT,'ORDER_LIMIT') END;
END;
--> statement-breakpoint
CREATE TRIGGER food_audit_create AFTER INSERT ON food_orders BEGIN INSERT INTO audit VALUES ('food:'||NEW.id||':0',NEW.tenant,'Gọi món',json_object('order',NEW.id,'booking',NEW.booking_id,'total',NEW.total,'actor',NEW.actor),NEW.created); END;
--> statement-breakpoint
CREATE TRIGGER food_validate_transition BEFORE UPDATE ON food_orders BEGIN
 SELECT CASE WHEN OLD.status IN ('served','cancelled') OR NEW.version<>OLD.version+1 OR NEW.updated<OLD.updated THEN RAISE(ABORT,'ORDER_ALREADY_FINAL') END;
 SELECT CASE WHEN NEW.id<>OLD.id OR NEW.tenant<>OLD.tenant OR NEW.booking_id<>OLD.booking_id OR NEW.request_id<>OLD.request_id OR NEW.request_data<>OLD.request_data OR NEW.items<>OLD.items OR NEW.subtotal<>OLD.subtotal OR NEW.fee<>OLD.fee OR NEW.vat<>OLD.vat OR NEW.total<>OLD.total OR NEW.note<>OLD.note OR NEW.actor<>OLD.actor OR NEW.created<>OLD.created THEN RAISE(ABORT,'ORDER_SNAPSHOT_IMMUTABLE') END;
 SELECT CASE WHEN NOT ((OLD.status='new' AND NEW.status='preparing') OR (OLD.status='preparing' AND NEW.status='ready') OR (OLD.status='ready' AND NEW.status='served') OR (OLD.status IN ('new','preparing','ready') AND NEW.status='cancelled' AND length(trim(NEW.reason))>=5)) THEN RAISE(ABORT,'INVALID_ORDER_TRANSITION') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM bookings WHERE tenant=NEW.tenant AND id=NEW.booking_id AND status IN ('playing','paused','finished')) THEN RAISE(ABORT,'SESSION_NOT_ORDERABLE') END;
END;
--> statement-breakpoint
CREATE TRIGGER food_apply_transition AFTER UPDATE ON food_orders BEGIN
 UPDATE bookings SET food_total=food_total+NEW.total,amount= CASE WHEN status='finished' AND amount IS NOT NULL THEN amount+NEW.total ELSE amount END WHERE id=NEW.booking_id AND tenant=NEW.tenant AND NEW.status='served';
 INSERT INTO audit VALUES ('food:'||NEW.id||':'||NEW.version,NEW.tenant,'Trạng thái món',json_object('order',NEW.id,'from',OLD.status,'to',NEW.status,'reason',NEW.reason),NEW.updated);
END;
--> statement-breakpoint
CREATE TRIGGER food_no_delete BEFORE DELETE ON food_orders BEGIN SELECT RAISE(ABORT,'ORDER_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER bookings_food_consistency BEFORE UPDATE ON bookings BEGIN
 SELECT CASE WHEN NEW.food_total IS NOT COALESCE((SELECT SUM(total) FROM food_orders WHERE tenant=NEW.tenant AND booking_id=NEW.id AND status='served'),0) THEN RAISE(ABORT,'FOOD_TOTAL_MISMATCH') END;
 SELECT CASE WHEN NEW.status IN ('finished','paid') AND NEW.golf_amount IS NOT NULL AND NEW.amount IS NOT NEW.golf_amount+NEW.food_total THEN RAISE(ABORT,'BILL_TOTAL_MISMATCH') END;
END;
--> statement-breakpoint
CREATE TRIGGER finance_food_guard BEFORE INSERT ON finance_entries WHEN NEW.kind='payment' BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM food_orders WHERE tenant=NEW.tenant AND booking_id=NEW.booking_id AND status IN ('new','preparing','ready')) THEN RAISE(ABORT,'UNSERVED_FOOD_ORDERS') END;
END;
