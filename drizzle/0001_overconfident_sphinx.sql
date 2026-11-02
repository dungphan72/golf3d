CREATE TABLE `finance_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`shift_id` text NOT NULL,
	`kind` text NOT NULL,
	`method` text NOT NULL,
	`amount` integer NOT NULL,
	`booking_id` text,
	`request_id` text NOT NULL,
	`note` text NOT NULL,
	`actor` text NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`shift_id`) REFERENCES `shifts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `finance_request_once` ON `finance_entries` (`tenant`,`request_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `booking_paid_once` ON `finance_entries` (`tenant`,`booking_id`) WHERE "finance_entries"."booking_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX `finance_shift_time` ON `finance_entries` (`tenant`,`shift_id`,`created`);--> statement-breakpoint
CREATE TABLE `shifts` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`name` text NOT NULL,
	`status` text NOT NULL,
	`opened_by` text NOT NULL,
	`opened_at` integer NOT NULL,
	`opening_cash` integer NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`closed_by` text,
	`closed_at` integer,
	`counted_cash` integer,
	`counted_transfer` integer,
	`counted_card` integer,
	`expected_cash` integer,
	`expected_transfer` integer,
	`expected_card` integer,
	`note` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `one_open_shift_per_tenant` ON `shifts` (`tenant`) WHERE "shifts"."status" = 'open';--> statement-breakpoint
CREATE INDEX `shift_tenant_time` ON `shifts` (`tenant`,`opened_at`);--> statement-breakpoint
CREATE TRIGGER shifts_validate_open BEFORE INSERT ON shifts BEGIN
 SELECT CASE WHEN NEW.status <> 'open' OR NEW.version <> 0 OR typeof(NEW.opening_cash) <> 'integer' OR NEW.opening_cash < 0 OR NEW.opening_cash > 1000000000000 THEN RAISE(ABORT,'INVALID_SHIFT') END;
END;
--> statement-breakpoint
CREATE TRIGGER shifts_audit_open AFTER INSERT ON shifts BEGIN
 INSERT INTO audit(id,tenant,action,detail,created) VALUES ('shift-open:'||NEW.id,NEW.tenant,'Mở ca',json_object('shift',NEW.id,'name',NEW.name,'openingCash',NEW.opening_cash,'actor',NEW.opened_by),NEW.opened_at);
END;
--> statement-breakpoint
CREATE TRIGGER finance_validate_entry BEFORE INSERT ON finance_entries BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM shifts WHERE id=NEW.shift_id AND tenant=NEW.tenant AND status='open') THEN RAISE(ABORT,'SHIFT_NOT_OPEN') END;
 SELECT CASE WHEN typeof(NEW.amount) <> 'integer' OR NEW.amount <= 0 OR NEW.amount > 1000000000000 OR NEW.kind NOT IN ('payment','cash_in','cash_out') OR NEW.method NOT IN ('cash','transfer','card') THEN RAISE(ABORT,'INVALID_ENTRY') END;
 SELECT CASE WHEN NEW.kind <> 'payment' AND (NEW.method <> 'cash' OR NEW.booking_id IS NOT NULL OR length(trim(NEW.note)) < 3) THEN RAISE(ABORT,'INVALID_CASH_MOVEMENT') END;
 SELECT CASE WHEN NEW.kind='payment' AND NOT EXISTS(SELECT 1 FROM bookings WHERE id=NEW.booking_id AND tenant=NEW.tenant AND status='finished' AND amount=NEW.amount) THEN RAISE(ABORT,'BOOKING_NOT_PAYABLE') END;
 SELECT CASE WHEN NEW.kind='cash_out' AND NEW.amount > (SELECT opening_cash FROM shifts WHERE id=NEW.shift_id) + COALESCE((SELECT SUM(CASE WHEN kind='cash_out' THEN -amount ELSE amount END) FROM finance_entries WHERE tenant=NEW.tenant AND shift_id=NEW.shift_id AND method='cash'),0) THEN RAISE(ABORT,'INSUFFICIENT_CASH') END;
END;
--> statement-breakpoint
CREATE TRIGGER finance_apply_entry AFTER INSERT ON finance_entries BEGIN
 UPDATE bookings SET status='paid',payment=NEW.method WHERE id=NEW.booking_id AND tenant=NEW.tenant AND NEW.kind='payment' AND status='finished';
 UPDATE shifts SET version=version+1 WHERE id=NEW.shift_id AND tenant=NEW.tenant;
 INSERT INTO audit(id,tenant,action,detail,created) VALUES ('finance:'||NEW.id,NEW.tenant,'Ghi sổ tiền',json_object('shift',NEW.shift_id,'entry',NEW.id,'kind',NEW.kind,'method',NEW.method,'amount',NEW.amount,'booking',NEW.booking_id,'actor',NEW.actor),NEW.created);
END;
--> statement-breakpoint
CREATE TRIGGER finance_no_update BEFORE UPDATE ON finance_entries BEGIN SELECT RAISE(ABORT,'LEDGER_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER finance_no_delete BEFORE DELETE ON finance_entries BEGIN SELECT RAISE(ABORT,'LEDGER_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER shifts_validate_close BEFORE UPDATE ON shifts BEGIN
 SELECT CASE WHEN OLD.status='closed' THEN RAISE(ABORT,'SHIFT_CLOSED_IMMUTABLE') END;
 SELECT CASE WHEN NEW.id<>OLD.id OR NEW.tenant<>OLD.tenant OR NEW.name<>OLD.name OR NEW.opened_by<>OLD.opened_by OR NEW.opened_at<>OLD.opened_at OR NEW.opening_cash<>OLD.opening_cash THEN RAISE(ABORT,'SHIFT_IDENTITY_IMMUTABLE') END;
 SELECT CASE WHEN NEW.status NOT IN ('open','closed') OR NEW.version<>OLD.version+1 THEN RAISE(ABORT,'INVALID_SHIFT_TRANSITION') END;
 SELECT CASE WHEN NEW.status='closed' AND (NEW.closed_by IS NULL OR NEW.closed_at IS NULL OR NEW.closed_at<NEW.opened_at OR typeof(NEW.counted_cash)<>'integer' OR typeof(NEW.counted_transfer)<>'integer' OR typeof(NEW.counted_card)<>'integer' OR NEW.counted_cash<0 OR NEW.counted_transfer<0 OR NEW.counted_card<0) THEN RAISE(ABORT,'INVALID_RECONCILIATION') END;
 SELECT CASE WHEN NEW.status='closed' AND (NEW.expected_cash IS NOT OLD.opening_cash+COALESCE((SELECT SUM(CASE WHEN kind='cash_out' THEN -amount ELSE amount END) FROM finance_entries WHERE tenant=OLD.tenant AND shift_id=OLD.id AND method='cash'),0) OR NEW.expected_transfer IS NOT COALESCE((SELECT SUM(amount) FROM finance_entries WHERE tenant=OLD.tenant AND shift_id=OLD.id AND kind='payment' AND method='transfer'),0) OR NEW.expected_card IS NOT COALESCE((SELECT SUM(amount) FROM finance_entries WHERE tenant=OLD.tenant AND shift_id=OLD.id AND kind='payment' AND method='card'),0)) THEN RAISE(ABORT,'RECONCILIATION_CHANGED') END;
 SELECT CASE WHEN NEW.status='closed' AND (NEW.counted_cash<>NEW.expected_cash OR NEW.counted_transfer<>NEW.expected_transfer OR NEW.counted_card<>NEW.expected_card) AND length(trim(COALESCE(NEW.note,'')))<5 THEN RAISE(ABORT,'DIFFERENCE_REASON_REQUIRED') END;
END;
--> statement-breakpoint
CREATE TRIGGER shifts_audit_close AFTER UPDATE ON shifts WHEN OLD.status='open' AND NEW.status='closed' BEGIN
 INSERT INTO audit(id,tenant,action,detail,created) VALUES ('shift-close:'||NEW.id,NEW.tenant,'Đóng ca',json_object('shift',NEW.id,'expectedCash',NEW.expected_cash,'countedCash',NEW.counted_cash,'cashDifference',NEW.counted_cash-NEW.expected_cash,'transferDifference',NEW.counted_transfer-NEW.expected_transfer,'cardDifference',NEW.counted_card-NEW.expected_card,'note',NEW.note,'actor',NEW.closed_by),NEW.closed_at);
END;
--> statement-breakpoint
CREATE TRIGGER shifts_no_delete BEFORE DELETE ON shifts BEGIN SELECT RAISE(ABORT,'SHIFT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER bookings_paid_requires_ledger BEFORE UPDATE ON bookings WHEN NEW.status='paid' AND OLD.status<>'paid' BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM finance_entries WHERE tenant=NEW.tenant AND booking_id=NEW.id AND kind='payment' AND amount=NEW.amount AND method=NEW.payment) THEN RAISE(ABORT,'PAYMENT_REQUIRES_LEDGER') END;
END;
--> statement-breakpoint
CREATE TRIGGER bookings_paid_immutable BEFORE UPDATE ON bookings WHEN OLD.status='paid' BEGIN
 SELECT CASE WHEN NEW.status<>'paid' OR NEW.amount IS NOT OLD.amount OR NEW.payment IS NOT OLD.payment THEN RAISE(ABORT,'PAID_BOOKING_IMMUTABLE') END;
END;
