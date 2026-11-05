DROP INDEX `booking_paid_once`;--> statement-breakpoint
ALTER TABLE `finance_entries` ADD `part` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `booking_part_method_once` ON `finance_entries` (`tenant`,`booking_id`,`method`) WHERE "finance_entries"."booking_id" IS NOT NULL AND "finance_entries"."part" = 1;--> statement-breakpoint
CREATE UNIQUE INDEX `booking_paid_once` ON `finance_entries` (`tenant`,`booking_id`) WHERE "finance_entries"."booking_id" IS NOT NULL AND "finance_entries"."part" = 0;
--> statement-breakpoint
DROP TRIGGER finance_validate_entry;--> statement-breakpoint
CREATE TRIGGER finance_validate_entry BEFORE INSERT ON finance_entries BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM shifts WHERE id=NEW.shift_id AND tenant=NEW.tenant AND status='open') THEN RAISE(ABORT,'SHIFT_NOT_OPEN') END;
 SELECT CASE WHEN typeof(NEW.amount) <> 'integer' OR NEW.amount <= 0 OR NEW.amount > 1000000000000 OR NEW.kind NOT IN ('payment','cash_in','cash_out') OR NEW.method NOT IN ('cash','transfer','card') THEN RAISE(ABORT,'INVALID_ENTRY') END;
 SELECT CASE WHEN NEW.part NOT IN (0,1) OR (NEW.part=1 AND (NEW.kind<>'payment' OR NEW.package_id IS NOT NULL OR NEW.booking_id IS NULL)) THEN RAISE(ABORT,'INVALID_ENTRY') END;
 SELECT CASE WHEN NEW.kind <> 'payment' AND (NEW.method <> 'cash' OR NEW.booking_id IS NOT NULL OR length(trim(NEW.note)) < 3) THEN RAISE(ABORT,'INVALID_CASH_MOVEMENT') END;
 SELECT CASE WHEN NEW.kind='payment' AND NEW.package_id IS NULL AND NOT EXISTS(SELECT 1 FROM bookings b WHERE b.id=NEW.booking_id AND b.tenant=NEW.tenant AND b.status='finished' AND ((NEW.part=0 AND b.amount-COALESCE((SELECT r.covered FROM package_redemptions r WHERE r.tenant=b.tenant AND r.booking_id=b.id),0)=NEW.amount AND NOT EXISTS(SELECT 1 FROM finance_entries e WHERE e.tenant=b.tenant AND e.booking_id=b.id AND e.kind='payment')) OR (NEW.part=1 AND NEW.amount<=b.amount-COALESCE((SELECT r.covered FROM package_redemptions r WHERE r.tenant=b.tenant AND r.booking_id=b.id),0)-COALESCE((SELECT SUM(e.amount) FROM finance_entries e WHERE e.tenant=b.tenant AND e.booking_id=b.id AND e.kind='payment'),0)))) THEN RAISE(ABORT,'BOOKING_NOT_PAYABLE') END;
 SELECT CASE WHEN NEW.kind='payment' AND NEW.package_id IS NOT NULL AND (NEW.booking_id IS NOT NULL OR NOT EXISTS(SELECT 1 FROM customer_packages p WHERE p.id=NEW.package_id AND p.tenant=NEW.tenant AND p.source='sale' AND p.price_paid=NEW.amount)) THEN RAISE(ABORT,'PACKAGE_NOT_PAYABLE') END;
 SELECT CASE WHEN NEW.kind<>'payment' AND NEW.package_id IS NOT NULL THEN RAISE(ABORT,'INVALID_CASH_MOVEMENT') END;
 SELECT CASE WHEN NEW.kind='cash_out' AND NEW.amount > (SELECT opening_cash FROM shifts WHERE id=NEW.shift_id) + COALESCE((SELECT SUM(CASE WHEN kind='cash_out' THEN -amount ELSE amount END) FROM finance_entries WHERE tenant=NEW.tenant AND shift_id=NEW.shift_id AND method='cash'),0) THEN RAISE(ABORT,'INSUFFICIENT_CASH') END;
END;
--> statement-breakpoint
DROP TRIGGER finance_apply_entry;--> statement-breakpoint
CREATE TRIGGER finance_apply_entry AFTER INSERT ON finance_entries BEGIN
 UPDATE bookings SET status='paid',payment=IIF((SELECT COUNT(DISTINCT method) FROM finance_entries WHERE tenant=NEW.tenant AND booking_id=NEW.booking_id AND kind='payment')>1,'mixed',NEW.method) WHERE id=NEW.booking_id AND tenant=NEW.tenant AND NEW.kind='payment' AND status='finished' AND (SELECT SUM(amount) FROM finance_entries WHERE tenant=NEW.tenant AND booking_id=NEW.booking_id AND kind='payment')=amount-COALESCE((SELECT r.covered FROM package_redemptions r WHERE r.tenant=NEW.tenant AND r.booking_id=NEW.booking_id),0);
 UPDATE shifts SET version=version+1 WHERE id=NEW.shift_id AND tenant=NEW.tenant;
 INSERT INTO audit(id,tenant,action,detail,created) VALUES ('finance:'||NEW.id,NEW.tenant,'Ghi sổ tiền',json_object('shift',NEW.shift_id,'entry',NEW.id,'kind',NEW.kind,'method',NEW.method,'amount',NEW.amount,'booking',NEW.booking_id,'actor',NEW.actor,'part',NEW.part),NEW.created);
END;
--> statement-breakpoint
DROP TRIGGER bookings_paid_requires_ledger;--> statement-breakpoint
CREATE TRIGGER bookings_paid_requires_ledger BEFORE UPDATE ON bookings WHEN NEW.status='paid' AND OLD.status<>'paid' BEGIN
 SELECT CASE WHEN NOT (COALESCE((SELECT SUM(amount) FROM finance_entries WHERE tenant=NEW.tenant AND booking_id=NEW.id AND kind='payment'),0)>0 AND (SELECT SUM(amount) FROM finance_entries WHERE tenant=NEW.tenant AND booking_id=NEW.id AND kind='payment')=NEW.amount-COALESCE((SELECT r.covered FROM package_redemptions r WHERE r.tenant=NEW.tenant AND r.booking_id=NEW.id),0) AND ((NEW.payment='mixed' AND (SELECT COUNT(DISTINCT method) FROM finance_entries WHERE tenant=NEW.tenant AND booking_id=NEW.id AND kind='payment')>1) OR (NEW.payment IN ('cash','transfer','card') AND NOT EXISTS(SELECT 1 FROM finance_entries WHERE tenant=NEW.tenant AND booking_id=NEW.id AND kind='payment' AND method<>NEW.payment) AND EXISTS(SELECT 1 FROM finance_entries WHERE tenant=NEW.tenant AND booking_id=NEW.id AND kind='payment' AND method=NEW.payment)))) AND NOT (NEW.payment='package' AND EXISTS(SELECT 1 FROM package_redemptions r WHERE r.tenant=NEW.tenant AND r.booking_id=NEW.id AND r.covered=NEW.amount) AND EXISTS(SELECT 1 FROM package_ledger l WHERE l.tenant=NEW.tenant AND l.booking_id=NEW.id AND l.reason='use')) THEN RAISE(ABORT,'PAYMENT_REQUIRES_LEDGER') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM package_redemptions r WHERE r.tenant=NEW.tenant AND r.booking_id=NEW.id) AND NOT EXISTS(SELECT 1 FROM package_ledger l WHERE l.tenant=NEW.tenant AND l.booking_id=NEW.id AND l.reason='use') THEN RAISE(ABORT,'REDEMPTION_WITHOUT_USE') END;
END;
