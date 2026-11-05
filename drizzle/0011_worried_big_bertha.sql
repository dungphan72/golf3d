ALTER TABLE `customer_packages` ADD `room` text DEFAULT 'any' NOT NULL;--> statement-breakpoint
ALTER TABLE `package_redemptions` ADD `units` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `package_types` ADD `room` text DEFAULT 'any' NOT NULL;
--> statement-breakpoint
DROP TRIGGER package_ledger_validate;--> statement-breakpoint
CREATE TRIGGER package_ledger_validate BEFORE INSERT ON package_ledger BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM customer_packages WHERE id=NEW.package_id AND tenant=NEW.tenant) THEN RAISE(ABORT,'PACKAGE_NOT_FOUND') END;
 SELECT CASE WHEN NEW.kind NOT IN ('holes9','holes18','gdr') OR NEW.reason NOT IN ('grant','use','adjust') OR typeof(NEW.delta)<>'integer' OR NEW.delta=0 THEN RAISE(ABORT,'INVALID_LEDGER_ENTRY') END;
 SELECT CASE WHEN NEW.reason='grant' AND (NEW.delta<=0 OR NOT EXISTS(SELECT 1 FROM customer_packages p,json_each(p.grants) j WHERE p.id=NEW.package_id AND json_extract(j.value,'$.kind')=NEW.kind AND json_extract(j.value,'$.qty')=NEW.delta) OR EXISTS(SELECT 1 FROM package_ledger WHERE package_id=NEW.package_id AND kind=NEW.kind AND reason='grant')) THEN RAISE(ABORT,'INVALID_GRANT') END;
 SELECT CASE WHEN NEW.reason='use' AND (COALESCE(NEW.delta<>-(SELECT r.units FROM package_redemptions r WHERE r.tenant=NEW.tenant AND r.booking_id=NEW.booking_id AND r.package_id=NEW.package_id AND r.kind=NEW.kind),1) OR NEW.booking_id IS NULL OR NOT EXISTS(SELECT 1 FROM package_redemptions r WHERE r.tenant=NEW.tenant AND r.booking_id=NEW.booking_id AND r.package_id=NEW.package_id AND r.kind=NEW.kind) OR NOT EXISTS(SELECT 1 FROM customer_packages p WHERE p.id=NEW.package_id AND NEW.created<=p.expires)) THEN RAISE(ABORT,'PACKAGE_USE_INVALID') END;
 SELECT CASE WHEN NEW.reason='adjust' AND length(trim(NEW.note))<3 THEN RAISE(ABORT,'ADJUST_REASON_REQUIRED') END;
 SELECT CASE WHEN COALESCE((SELECT SUM(delta) FROM package_ledger WHERE package_id=NEW.package_id AND kind=NEW.kind),0)+NEW.delta<0 THEN RAISE(ABORT,'PACKAGE_EMPTY') END;
END;
--> statement-breakpoint
DROP TRIGGER package_redemptions_validate;--> statement-breakpoint
CREATE TRIGGER package_redemptions_validate BEFORE INSERT ON package_redemptions BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM bookings b WHERE b.id=NEW.booking_id AND b.tenant=NEW.tenant AND b.status='finished' AND b.golf_amount IS NOT NULL AND b.golf_amount>0 AND b.golf_amount=NEW.covered AND NEW.units>=1 AND (b.service='gdr' OR NEW.units=1) AND ((b.service='9' AND NEW.kind='holes9') OR (b.service='18' AND NEW.kind='holes18') OR (b.service='gdr' AND NEW.kind='gdr'))) THEN RAISE(ABORT,'BOOKING_NOT_REDEEMABLE') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM customer_packages p JOIN customers c ON c.id=p.customer_id JOIN bookings b ON b.id=NEW.booking_id WHERE p.id=NEW.package_id AND p.tenant=NEW.tenant AND c.phone=(SELECT CASE WHEN substr(d,1,3)='+84' THEN '0'||substr(d,4) WHEN substr(d,1,2)='84' AND length(d)>=11 THEN '0'||substr(d,3) ELSE d END FROM (SELECT replace(replace(replace(replace(replace(b.phone,' ',''),'-',''),'(',''),')',''),'.','') AS d))) THEN RAISE(ABORT,'PACKAGE_CUSTOMER_MISMATCH') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM customer_packages p WHERE p.id=NEW.package_id AND NEW.created<=p.expires) THEN RAISE(ABORT,'PACKAGE_EXPIRED') END;
 SELECT CASE WHEN COALESCE((SELECT SUM(delta) FROM package_ledger WHERE package_id=NEW.package_id AND kind=NEW.kind),0)<NEW.units THEN RAISE(ABORT,'PACKAGE_EMPTY') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM customer_packages p JOIN bookings b ON b.id=NEW.booking_id WHERE p.id=NEW.package_id AND p.tenant=NEW.tenant AND p.room='standard' AND b.room LIKE 'vip%') THEN RAISE(ABORT,'PACKAGE_ROOM_MISMATCH') END;
END;
