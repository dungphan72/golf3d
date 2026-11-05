CREATE TABLE `bill_discounts` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`booking_id` text NOT NULL,
	`amount` integer NOT NULL,
	`reason` text NOT NULL,
	`actor` text NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bill_discount_once` ON `bill_discounts` (`tenant`,`booking_id`);
--> statement-breakpoint
CREATE TRIGGER bill_discounts_validate BEFORE INSERT ON bill_discounts BEGIN
 SELECT CASE WHEN typeof(NEW.amount)<>'integer' OR NEW.amount<=0 OR length(trim(NEW.reason))<3 OR length(NEW.reason)>300 THEN RAISE(ABORT,'INVALID_DISCOUNT') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM bookings b WHERE b.id=NEW.booking_id AND b.tenant=NEW.tenant AND b.status='finished' AND b.golf_amount IS NOT NULL AND NEW.amount<b.golf_amount AND NOT EXISTS(SELECT 1 FROM finance_entries e WHERE e.tenant=b.tenant AND e.booking_id=b.id) AND NOT EXISTS(SELECT 1 FROM package_redemptions r WHERE r.tenant=b.tenant AND r.booking_id=b.id)) THEN RAISE(ABORT,'BOOKING_NOT_DISCOUNTABLE') END;
END;
--> statement-breakpoint
CREATE TRIGGER bill_discounts_apply AFTER INSERT ON bill_discounts BEGIN
 UPDATE bookings SET golf_amount=golf_amount-NEW.amount,amount=amount-NEW.amount WHERE id=NEW.booking_id AND tenant=NEW.tenant;
 INSERT INTO audit(id,tenant,action,detail,created) VALUES ('discount:'||NEW.id,NEW.tenant,'Giảm giá phiếu',json_object('booking',NEW.booking_id,'amount',NEW.amount,'reason',NEW.reason,'actor',NEW.actor),NEW.created);
END;
--> statement-breakpoint
CREATE TRIGGER bill_discounts_immutable BEFORE UPDATE ON bill_discounts BEGIN SELECT RAISE(ABORT,'DISCOUNT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER bill_discounts_no_delete BEFORE DELETE ON bill_discounts BEGIN SELECT RAISE(ABORT,'DISCOUNT_IMMUTABLE'); END;
--> statement-breakpoint
DROP TRIGGER finance_validate_entry;
--> statement-breakpoint
CREATE TRIGGER finance_validate_entry BEFORE INSERT ON finance_entries BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM shifts WHERE id=NEW.shift_id AND tenant=NEW.tenant AND status='open') THEN RAISE(ABORT,'SHIFT_NOT_OPEN') END;
 SELECT CASE WHEN typeof(NEW.amount) <> 'integer' OR NEW.amount <= 0 OR NEW.amount > 1000000000000 OR NEW.kind NOT IN ('payment','cash_in','cash_out','refund') OR NEW.method NOT IN ('cash','transfer','card') THEN RAISE(ABORT,'INVALID_ENTRY') END;
 SELECT CASE WHEN NEW.part NOT IN (0,1,2) OR (NEW.part=2)<>(NEW.kind='refund') OR (NEW.part=1 AND (NEW.kind<>'payment' OR NEW.package_id IS NOT NULL OR NEW.booking_id IS NULL)) THEN RAISE(ABORT,'INVALID_ENTRY') END;
 SELECT CASE WHEN NEW.kind IN ('cash_in','cash_out') AND (NEW.method <> 'cash' OR NEW.booking_id IS NOT NULL OR length(trim(NEW.note)) < 3) THEN RAISE(ABORT,'INVALID_CASH_MOVEMENT') END;
 SELECT CASE WHEN NEW.kind='payment' AND NEW.package_id IS NULL AND NOT EXISTS(SELECT 1 FROM bookings b WHERE b.id=NEW.booking_id AND b.tenant=NEW.tenant AND b.status='finished' AND ((NEW.part=0 AND b.amount-COALESCE((SELECT r.covered FROM package_redemptions r WHERE r.tenant=b.tenant AND r.booking_id=b.id),0)=NEW.amount AND NOT EXISTS(SELECT 1 FROM finance_entries e WHERE e.tenant=b.tenant AND e.booking_id=b.id AND e.kind='payment')) OR (NEW.part=1 AND NEW.amount<=b.amount-COALESCE((SELECT r.covered FROM package_redemptions r WHERE r.tenant=b.tenant AND r.booking_id=b.id),0)-COALESCE((SELECT SUM(e.amount) FROM finance_entries e WHERE e.tenant=b.tenant AND e.booking_id=b.id AND e.kind='payment'),0)))) THEN RAISE(ABORT,'BOOKING_NOT_PAYABLE') END;
 SELECT CASE WHEN NEW.kind='payment' AND NEW.package_id IS NOT NULL AND (NEW.booking_id IS NOT NULL OR NOT EXISTS(SELECT 1 FROM customer_packages p WHERE p.id=NEW.package_id AND p.tenant=NEW.tenant AND p.source='sale' AND p.price_paid=NEW.amount)) THEN RAISE(ABORT,'PACKAGE_NOT_PAYABLE') END;
 SELECT CASE WHEN NEW.kind<>'payment' AND NEW.package_id IS NOT NULL THEN RAISE(ABORT,'INVALID_CASH_MOVEMENT') END;
 SELECT CASE WHEN NEW.kind='refund' AND (NEW.package_id IS NOT NULL OR length(trim(NEW.note))<3 OR NOT EXISTS(SELECT 1 FROM bookings b WHERE b.id=NEW.booking_id AND b.tenant=NEW.tenant AND b.status='paid') OR NEW.amount > COALESCE((SELECT SUM(e.amount) FROM finance_entries e WHERE e.tenant=NEW.tenant AND e.booking_id=NEW.booking_id AND e.kind='payment' AND e.method=NEW.method),0) - COALESCE((SELECT SUM(e.amount) FROM finance_entries e WHERE e.tenant=NEW.tenant AND e.booking_id=NEW.booking_id AND e.kind='refund' AND e.method=NEW.method),0)) THEN RAISE(ABORT,'REFUND_NOT_ALLOWED') END;
 SELECT CASE WHEN (NEW.kind='cash_out' OR (NEW.kind='refund' AND NEW.method='cash')) AND NEW.amount > (SELECT opening_cash FROM shifts WHERE id=NEW.shift_id) + COALESCE((SELECT SUM(CASE WHEN kind IN ('cash_out','refund') THEN -amount ELSE amount END) FROM finance_entries WHERE tenant=NEW.tenant AND shift_id=NEW.shift_id AND method='cash'),0) THEN RAISE(ABORT,'INSUFFICIENT_CASH') END;
END;
--> statement-breakpoint
DROP TRIGGER finance_apply_entry;
--> statement-breakpoint
CREATE TRIGGER finance_apply_entry AFTER INSERT ON finance_entries BEGIN
 UPDATE bookings SET status='paid',payment=IIF((SELECT COUNT(DISTINCT method) FROM finance_entries WHERE tenant=NEW.tenant AND booking_id=NEW.booking_id AND kind='payment')>1,'mixed',NEW.method) WHERE id=NEW.booking_id AND tenant=NEW.tenant AND NEW.kind='payment' AND status='finished' AND (SELECT SUM(amount) FROM finance_entries WHERE tenant=NEW.tenant AND booking_id=NEW.booking_id AND kind='payment')=amount-COALESCE((SELECT r.covered FROM package_redemptions r WHERE r.tenant=NEW.tenant AND r.booking_id=NEW.booking_id),0);
 UPDATE shifts SET version=version+1 WHERE id=NEW.shift_id AND tenant=NEW.tenant;
 INSERT INTO audit(id,tenant,action,detail,created) VALUES ('finance:'||NEW.id,NEW.tenant,IIF(NEW.kind='refund','Hoàn tiền','Ghi sổ tiền'),json_object('shift',NEW.shift_id,'entry',NEW.id,'kind',NEW.kind,'method',NEW.method,'amount',NEW.amount,'booking',NEW.booking_id,'actor',NEW.actor,'part',NEW.part),NEW.created);
END;
--> statement-breakpoint
DROP TRIGGER shifts_validate_close;
--> statement-breakpoint
CREATE TRIGGER shifts_validate_close BEFORE UPDATE ON shifts BEGIN
 SELECT CASE WHEN OLD.status='closed' THEN RAISE(ABORT,'SHIFT_CLOSED_IMMUTABLE') END;
 SELECT CASE WHEN NEW.id<>OLD.id OR NEW.tenant<>OLD.tenant OR NEW.name<>OLD.name OR NEW.opened_by<>OLD.opened_by OR NEW.opened_at<>OLD.opened_at OR NEW.opening_cash<>OLD.opening_cash THEN RAISE(ABORT,'SHIFT_IDENTITY_IMMUTABLE') END;
 SELECT CASE WHEN NEW.status NOT IN ('open','closed') OR NEW.version<>OLD.version+1 THEN RAISE(ABORT,'INVALID_SHIFT_TRANSITION') END;
 SELECT CASE WHEN NEW.status='closed' AND (NEW.closed_by IS NULL OR NEW.closed_at IS NULL OR NEW.closed_at<NEW.opened_at OR typeof(NEW.counted_cash)<>'integer' OR typeof(NEW.counted_transfer)<>'integer' OR typeof(NEW.counted_card)<>'integer' OR NEW.counted_cash<0 OR NEW.counted_transfer<0 OR NEW.counted_card<0) THEN RAISE(ABORT,'INVALID_RECONCILIATION') END;
 SELECT CASE WHEN NEW.status='closed' AND (NEW.expected_cash IS NOT OLD.opening_cash+COALESCE((SELECT SUM(CASE WHEN kind IN ('cash_out','refund') THEN -amount ELSE amount END) FROM finance_entries WHERE tenant=OLD.tenant AND shift_id=OLD.id AND method='cash'),0) OR NEW.expected_transfer IS NOT COALESCE((SELECT SUM(CASE WHEN kind='refund' THEN -amount ELSE amount END) FROM finance_entries WHERE tenant=OLD.tenant AND shift_id=OLD.id AND kind IN ('payment','refund') AND method='transfer'),0) OR NEW.expected_card IS NOT COALESCE((SELECT SUM(CASE WHEN kind='refund' THEN -amount ELSE amount END) FROM finance_entries WHERE tenant=OLD.tenant AND shift_id=OLD.id AND kind IN ('payment','refund') AND method='card'),0)) THEN RAISE(ABORT,'RECONCILIATION_CHANGED') END;
 SELECT CASE WHEN NEW.status='closed' AND (NEW.counted_cash<>NEW.expected_cash OR NEW.counted_transfer<>NEW.expected_transfer OR NEW.counted_card<>NEW.expected_card) AND length(trim(COALESCE(NEW.note,'')))<5 THEN RAISE(ABORT,'DIFFERENCE_REASON_REQUIRED') END;
END;
