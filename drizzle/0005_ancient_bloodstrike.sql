CREATE TABLE `customer_packages` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`customer_id` text NOT NULL,
	`type_id` text,
	`name` text NOT NULL,
	`source` text NOT NULL,
	`price_paid` integer NOT NULL,
	`grants` text NOT NULL,
	`perks` text DEFAULT '' NOT NULL,
	`purchased` integer NOT NULL,
	`expires` integer NOT NULL,
	`actor` text NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `customer_package_customer` ON `customer_packages` (`tenant`,`customer_id`);--> statement-breakpoint
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customer_phone` ON `customers` (`tenant`,`phone`);--> statement-breakpoint
CREATE TABLE `loyalty_ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`customer_id` text NOT NULL,
	`delta` integer NOT NULL,
	`reason` text NOT NULL,
	`booking_id` text,
	`actor` text NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `loyalty_customer` ON `loyalty_ledger` (`tenant`,`customer_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `loyalty_earn_once` ON `loyalty_ledger` (`tenant`,`booking_id`) WHERE "loyalty_ledger"."reason" = 'earn';--> statement-breakpoint
CREATE TABLE `package_ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`package_id` text NOT NULL,
	`kind` text NOT NULL,
	`delta` integer NOT NULL,
	`reason` text NOT NULL,
	`booking_id` text,
	`actor` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`package_id`) REFERENCES `customer_packages`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `package_ledger_package` ON `package_ledger` (`tenant`,`package_id`);--> statement-breakpoint
CREATE TABLE `package_redemptions` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`booking_id` text NOT NULL,
	`package_id` text NOT NULL,
	`kind` text NOT NULL,
	`covered` integer NOT NULL,
	`actor` text NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`package_id`) REFERENCES `customer_packages`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `redemption_once` ON `package_redemptions` (`tenant`,`booking_id`);--> statement-breakpoint
CREATE TABLE `package_types` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`name` text NOT NULL,
	`price` integer NOT NULL,
	`grants` text NOT NULL,
	`valid_days` integer NOT NULL,
	`perks` text DEFAULT '' NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `package_type_tenant` ON `package_types` (`tenant`);--> statement-breakpoint
ALTER TABLE `finance_entries` ADD `package_id` text;
--> statement-breakpoint
CREATE UNIQUE INDEX `package_paid_once` ON `finance_entries` (`tenant`,`package_id`) WHERE "finance_entries"."package_id" IS NOT NULL;--> statement-breakpoint
DROP TRIGGER finance_validate_entry;--> statement-breakpoint
CREATE TRIGGER finance_validate_entry BEFORE INSERT ON finance_entries BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM shifts WHERE id=NEW.shift_id AND tenant=NEW.tenant AND status='open') THEN RAISE(ABORT,'SHIFT_NOT_OPEN') END;
 SELECT CASE WHEN typeof(NEW.amount) <> 'integer' OR NEW.amount <= 0 OR NEW.amount > 1000000000000 OR NEW.kind NOT IN ('payment','cash_in','cash_out') OR NEW.method NOT IN ('cash','transfer','card') THEN RAISE(ABORT,'INVALID_ENTRY') END;
 SELECT CASE WHEN NEW.kind <> 'payment' AND (NEW.method <> 'cash' OR NEW.booking_id IS NOT NULL OR length(trim(NEW.note)) < 3) THEN RAISE(ABORT,'INVALID_CASH_MOVEMENT') END;
 SELECT CASE WHEN NEW.kind='payment' AND NEW.package_id IS NULL AND NOT EXISTS(SELECT 1 FROM bookings b WHERE b.id=NEW.booking_id AND b.tenant=NEW.tenant AND b.status='finished' AND b.amount-COALESCE((SELECT r.covered FROM package_redemptions r WHERE r.tenant=b.tenant AND r.booking_id=b.id),0)=NEW.amount) THEN RAISE(ABORT,'BOOKING_NOT_PAYABLE') END;
 SELECT CASE WHEN NEW.kind='payment' AND NEW.package_id IS NOT NULL AND (NEW.booking_id IS NOT NULL OR NOT EXISTS(SELECT 1 FROM customer_packages p WHERE p.id=NEW.package_id AND p.tenant=NEW.tenant AND p.source='sale' AND p.price_paid=NEW.amount)) THEN RAISE(ABORT,'PACKAGE_NOT_PAYABLE') END;
 SELECT CASE WHEN NEW.kind<>'payment' AND NEW.package_id IS NOT NULL THEN RAISE(ABORT,'INVALID_CASH_MOVEMENT') END;
 SELECT CASE WHEN NEW.kind='cash_out' AND NEW.amount > (SELECT opening_cash FROM shifts WHERE id=NEW.shift_id) + COALESCE((SELECT SUM(CASE WHEN kind='cash_out' THEN -amount ELSE amount END) FROM finance_entries WHERE tenant=NEW.tenant AND shift_id=NEW.shift_id AND method='cash'),0) THEN RAISE(ABORT,'INSUFFICIENT_CASH') END;
END;
--> statement-breakpoint
DROP TRIGGER bookings_paid_requires_ledger;--> statement-breakpoint
CREATE TRIGGER bookings_paid_requires_ledger BEFORE UPDATE ON bookings WHEN NEW.status='paid' AND OLD.status<>'paid' BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM finance_entries WHERE tenant=NEW.tenant AND booking_id=NEW.id AND kind='payment' AND method=NEW.payment AND amount=NEW.amount-COALESCE((SELECT r.covered FROM package_redemptions r WHERE r.tenant=NEW.tenant AND r.booking_id=NEW.id),0)) AND NOT (NEW.payment='package' AND EXISTS(SELECT 1 FROM package_redemptions r WHERE r.tenant=NEW.tenant AND r.booking_id=NEW.id AND r.covered=NEW.amount) AND EXISTS(SELECT 1 FROM package_ledger l WHERE l.tenant=NEW.tenant AND l.booking_id=NEW.id AND l.reason='use')) THEN RAISE(ABORT,'PAYMENT_REQUIRES_LEDGER') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM package_redemptions r WHERE r.tenant=NEW.tenant AND r.booking_id=NEW.id) AND NOT EXISTS(SELECT 1 FROM package_ledger l WHERE l.tenant=NEW.tenant AND l.booking_id=NEW.id AND l.reason='use') THEN RAISE(ABORT,'REDEMPTION_WITHOUT_USE') END;
END;
--> statement-breakpoint
CREATE VIEW package_balances AS SELECT tenant,package_id,kind,SUM(delta) AS remaining FROM package_ledger GROUP BY tenant,package_id,kind;--> statement-breakpoint
CREATE VIEW customer_points AS SELECT tenant,customer_id,SUM(delta) AS points FROM loyalty_ledger GROUP BY tenant,customer_id;--> statement-breakpoint
CREATE TRIGGER customers_validate_create BEFORE INSERT ON customers BEGIN
 SELECT CASE WHEN length(trim(NEW.name))<2 OR length(NEW.name)>100 OR NEW.phone NOT GLOB '0[0-9]*' OR NEW.phone GLOB '*[^0-9]*' OR length(NEW.phone)<9 OR length(NEW.phone)>11 THEN RAISE(ABORT,'INVALID_CUSTOMER') END;
END;
--> statement-breakpoint
CREATE TRIGGER customers_validate_update BEFORE UPDATE ON customers BEGIN
 SELECT CASE WHEN NEW.id<>OLD.id OR NEW.tenant<>OLD.tenant OR NEW.phone<>OLD.phone OR NEW.created<>OLD.created OR length(trim(NEW.name))<2 OR length(NEW.name)>100 THEN RAISE(ABORT,'CUSTOMER_IDENTITY_IMMUTABLE') END;
END;
--> statement-breakpoint
CREATE TRIGGER customers_no_delete BEFORE DELETE ON customers BEGIN SELECT RAISE(ABORT,'CUSTOMER_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER package_types_validate BEFORE INSERT ON package_types BEGIN
 SELECT CASE WHEN length(trim(NEW.name))<2 OR typeof(NEW.price)<>'integer' OR NEW.price<=0 OR NEW.price>1000000000 OR typeof(NEW.valid_days)<>'integer' OR NEW.valid_days<1 OR NEW.valid_days>3660 OR NOT json_valid(NEW.grants) OR json_array_length(NEW.grants)<1 OR NEW.active NOT IN (0,1) THEN RAISE(ABORT,'INVALID_PACKAGE_TYPE') END;
END;
--> statement-breakpoint
CREATE TRIGGER package_types_validate_update BEFORE UPDATE ON package_types BEGIN
 SELECT CASE WHEN NEW.id<>OLD.id OR NEW.tenant<>OLD.tenant OR length(trim(NEW.name))<2 OR typeof(NEW.price)<>'integer' OR NEW.price<=0 OR NEW.price>1000000000 OR typeof(NEW.valid_days)<>'integer' OR NEW.valid_days<1 OR NEW.valid_days>3660 OR NOT json_valid(NEW.grants) OR json_array_length(NEW.grants)<1 OR NEW.active NOT IN (0,1) THEN RAISE(ABORT,'INVALID_PACKAGE_TYPE') END;
END;
--> statement-breakpoint
CREATE TRIGGER package_types_no_delete BEFORE DELETE ON package_types BEGIN SELECT RAISE(ABORT,'ARCHIVE_PACKAGE_INSTEAD'); END;
--> statement-breakpoint
CREATE TRIGGER customer_packages_validate BEFORE INSERT ON customer_packages BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM customers WHERE id=NEW.customer_id AND tenant=NEW.tenant) THEN RAISE(ABORT,'CUSTOMER_NOT_FOUND') END;
 SELECT CASE WHEN NEW.source NOT IN ('sale','loyalty') OR typeof(NEW.price_paid)<>'integer' OR NEW.price_paid<0 OR (NEW.source='sale' AND NEW.price_paid<=0) OR (NEW.source='loyalty' AND NEW.price_paid<>0) OR NEW.expires<=NEW.purchased OR NOT json_valid(NEW.grants) OR json_array_length(NEW.grants)<1 THEN RAISE(ABORT,'INVALID_PACKAGE') END;
END;
--> statement-breakpoint
CREATE TRIGGER customer_packages_audit AFTER INSERT ON customer_packages BEGIN
 INSERT INTO audit(id,tenant,action,detail,created) VALUES ('package:'||NEW.id,NEW.tenant,'Bán gói',json_object('package',NEW.id,'customer',NEW.customer_id,'name',NEW.name,'source',NEW.source,'price',NEW.price_paid,'actor',NEW.actor),NEW.purchased);
END;
--> statement-breakpoint
CREATE TRIGGER customer_packages_no_update BEFORE UPDATE ON customer_packages BEGIN SELECT RAISE(ABORT,'PACKAGE_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER customer_packages_no_delete BEFORE DELETE ON customer_packages BEGIN SELECT RAISE(ABORT,'PACKAGE_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER package_ledger_validate BEFORE INSERT ON package_ledger BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM customer_packages WHERE id=NEW.package_id AND tenant=NEW.tenant) THEN RAISE(ABORT,'PACKAGE_NOT_FOUND') END;
 SELECT CASE WHEN NEW.kind NOT IN ('holes9','holes18','gdr') OR NEW.reason NOT IN ('grant','use','adjust') OR typeof(NEW.delta)<>'integer' OR NEW.delta=0 THEN RAISE(ABORT,'INVALID_LEDGER_ENTRY') END;
 SELECT CASE WHEN NEW.reason='grant' AND (NEW.delta<=0 OR NOT EXISTS(SELECT 1 FROM customer_packages p,json_each(p.grants) j WHERE p.id=NEW.package_id AND json_extract(j.value,'$.kind')=NEW.kind AND json_extract(j.value,'$.qty')=NEW.delta) OR EXISTS(SELECT 1 FROM package_ledger WHERE package_id=NEW.package_id AND kind=NEW.kind AND reason='grant')) THEN RAISE(ABORT,'INVALID_GRANT') END;
 SELECT CASE WHEN NEW.reason='use' AND (NEW.delta<>-1 OR NEW.booking_id IS NULL OR NOT EXISTS(SELECT 1 FROM package_redemptions r WHERE r.tenant=NEW.tenant AND r.booking_id=NEW.booking_id AND r.package_id=NEW.package_id AND r.kind=NEW.kind) OR NOT EXISTS(SELECT 1 FROM customer_packages p WHERE p.id=NEW.package_id AND NEW.created<=p.expires)) THEN RAISE(ABORT,'PACKAGE_USE_INVALID') END;
 SELECT CASE WHEN NEW.reason='adjust' AND length(trim(NEW.note))<3 THEN RAISE(ABORT,'ADJUST_REASON_REQUIRED') END;
 SELECT CASE WHEN COALESCE((SELECT SUM(delta) FROM package_ledger WHERE package_id=NEW.package_id AND kind=NEW.kind),0)+NEW.delta<0 THEN RAISE(ABORT,'PACKAGE_EMPTY') END;
END;
--> statement-breakpoint
CREATE TRIGGER package_ledger_no_update BEFORE UPDATE ON package_ledger BEGIN SELECT RAISE(ABORT,'LEDGER_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER package_ledger_no_delete BEFORE DELETE ON package_ledger BEGIN SELECT RAISE(ABORT,'LEDGER_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER package_redemptions_validate BEFORE INSERT ON package_redemptions BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM bookings b WHERE b.id=NEW.booking_id AND b.tenant=NEW.tenant AND b.status='finished' AND b.golf_amount IS NOT NULL AND b.golf_amount>0 AND b.golf_amount=NEW.covered AND ((b.service='9' AND NEW.kind='holes9') OR (b.service='18' AND NEW.kind='holes18') OR (b.service='gdr' AND NEW.kind='gdr'))) THEN RAISE(ABORT,'BOOKING_NOT_REDEEMABLE') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM customer_packages p JOIN customers c ON c.id=p.customer_id JOIN bookings b ON b.id=NEW.booking_id WHERE p.id=NEW.package_id AND p.tenant=NEW.tenant AND c.phone=(SELECT CASE WHEN substr(d,1,3)='+84' THEN '0'||substr(d,4) WHEN substr(d,1,2)='84' AND length(d)>=11 THEN '0'||substr(d,3) ELSE d END FROM (SELECT replace(replace(replace(replace(replace(b.phone,' ',''),'-',''),'(',''),')',''),'.','') AS d))) THEN RAISE(ABORT,'PACKAGE_CUSTOMER_MISMATCH') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM customer_packages p WHERE p.id=NEW.package_id AND NEW.created<=p.expires) THEN RAISE(ABORT,'PACKAGE_EXPIRED') END;
 SELECT CASE WHEN COALESCE((SELECT SUM(delta) FROM package_ledger WHERE package_id=NEW.package_id AND kind=NEW.kind),0)<1 THEN RAISE(ABORT,'PACKAGE_EMPTY') END;
END;
--> statement-breakpoint
CREATE TRIGGER package_redemptions_audit AFTER INSERT ON package_redemptions BEGIN
 INSERT INTO audit(id,tenant,action,detail,created) VALUES ('redeem:'||NEW.id,NEW.tenant,'Trả bằng gói',json_object('booking',NEW.booking_id,'package',NEW.package_id,'kind',NEW.kind,'covered',NEW.covered,'actor',NEW.actor),NEW.created);
END;
--> statement-breakpoint
CREATE TRIGGER package_redemptions_no_update BEFORE UPDATE ON package_redemptions BEGIN SELECT RAISE(ABORT,'REDEMPTION_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER package_redemptions_no_delete BEFORE DELETE ON package_redemptions BEGIN SELECT RAISE(ABORT,'REDEMPTION_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER loyalty_ledger_validate BEFORE INSERT ON loyalty_ledger BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM customers WHERE id=NEW.customer_id AND tenant=NEW.tenant) THEN RAISE(ABORT,'CUSTOMER_NOT_FOUND') END;
 SELECT CASE WHEN NEW.reason NOT IN ('earn','redeem','adjust') OR typeof(NEW.delta)<>'integer' OR NEW.delta=0 THEN RAISE(ABORT,'INVALID_LEDGER_ENTRY') END;
 SELECT CASE WHEN NEW.reason='earn' AND (NEW.delta<>1 OR NEW.booking_id IS NULL OR NOT EXISTS(SELECT 1 FROM bookings WHERE id=NEW.booking_id AND tenant=NEW.tenant AND status='paid' AND service IN ('9','18'))) THEN RAISE(ABORT,'INVALID_EARN') END;
 SELECT CASE WHEN NEW.reason='redeem' AND NEW.delta<>-10 THEN RAISE(ABORT,'INVALID_REDEEM') END;
 SELECT CASE WHEN COALESCE((SELECT SUM(delta) FROM loyalty_ledger WHERE tenant=NEW.tenant AND customer_id=NEW.customer_id),0)+NEW.delta<0 THEN RAISE(ABORT,'POINTS_INSUFFICIENT') END;
END;
--> statement-breakpoint
CREATE TRIGGER loyalty_ledger_no_update BEFORE UPDATE ON loyalty_ledger BEGIN SELECT RAISE(ABORT,'LEDGER_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER loyalty_ledger_no_delete BEFORE DELETE ON loyalty_ledger BEGIN SELECT RAISE(ABORT,'LEDGER_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER loyalty_earn_on_paid AFTER UPDATE ON bookings WHEN NEW.status='paid' AND OLD.status<>'paid' AND NEW.service IN ('9','18') BEGIN
 INSERT OR IGNORE INTO loyalty_ledger(id,tenant,customer_id,delta,reason,booking_id,actor,created) SELECT 'earn:'||NEW.id,NEW.tenant,c.id,1,'earn',NEW.id,'system',CAST(strftime('%s','now') AS INTEGER)*1000 FROM customers c WHERE c.tenant=NEW.tenant AND c.phone=(SELECT CASE WHEN substr(d,1,3)='+84' THEN '0'||substr(d,4) WHEN substr(d,1,2)='84' AND length(d)>=11 THEN '0'||substr(d,3) ELSE d END FROM (SELECT replace(replace(replace(replace(replace(NEW.phone,' ',''),'-',''),'(',''),')',''),'.','') AS d));
END;
