CREATE TABLE `wallet_ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`customer_id` text NOT NULL,
	`delta` integer NOT NULL,
	`reason` text NOT NULL,
	`booking_id` text,
	`actor` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `wallet_ledger_customer` ON `wallet_ledger` (`tenant`,`customer_id`,`created`);--> statement-breakpoint
CREATE UNIQUE INDEX `wallet_spend_once` ON `wallet_ledger` (`tenant`,`booking_id`) WHERE "wallet_ledger"."reason" = 'spend';--> statement-breakpoint
ALTER TABLE `finance_entries` ADD `wallet_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `wallet_paid_once` ON `finance_entries` (`tenant`,`wallet_id`) WHERE "finance_entries"."wallet_id" IS NOT NULL;
--> statement-breakpoint
CREATE VIEW wallet_balances AS SELECT tenant,customer_id,SUM(delta) AS balance FROM wallet_ledger GROUP BY tenant,customer_id;
--> statement-breakpoint
CREATE TRIGGER wallet_ledger_validate BEFORE INSERT ON wallet_ledger BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM customers WHERE id=NEW.customer_id AND tenant=NEW.tenant) THEN RAISE(ABORT,'CUSTOMER_NOT_FOUND') END;
 SELECT CASE WHEN NEW.reason NOT IN ('topup','bonus','spend','adjust') OR typeof(NEW.delta)<>'integer' OR NEW.delta=0 OR ABS(NEW.delta)>1000000000 THEN RAISE(ABORT,'INVALID_WALLET_ENTRY') END;
 SELECT CASE WHEN NEW.reason IN ('topup','bonus') AND NEW.delta<=0 THEN RAISE(ABORT,'INVALID_WALLET_ENTRY') END;
 SELECT CASE WHEN NEW.reason='spend' AND (NEW.delta>=0 OR NEW.booking_id IS NULL OR NOT EXISTS(SELECT 1 FROM bookings b WHERE b.id=NEW.booking_id AND b.tenant=NEW.tenant AND b.status='finished' AND b.amount=-NEW.delta) OR EXISTS(SELECT 1 FROM package_redemptions r WHERE r.tenant=NEW.tenant AND r.booking_id=NEW.booking_id) OR EXISTS(SELECT 1 FROM finance_entries e WHERE e.tenant=NEW.tenant AND e.booking_id=NEW.booking_id AND e.kind='payment')) THEN RAISE(ABORT,'WALLET_SPEND_INVALID') END;
 SELECT CASE WHEN NEW.reason='adjust' AND length(trim(NEW.note))<3 THEN RAISE(ABORT,'ADJUST_REASON_REQUIRED') END;
 SELECT CASE WHEN COALESCE((SELECT SUM(delta) FROM wallet_ledger WHERE tenant=NEW.tenant AND customer_id=NEW.customer_id),0)+NEW.delta<0 THEN RAISE(ABORT,'WALLET_INSUFFICIENT') END;
END;
--> statement-breakpoint
CREATE TRIGGER wallet_ledger_no_update BEFORE UPDATE ON wallet_ledger BEGIN SELECT RAISE(ABORT,'LEDGER_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER wallet_ledger_no_delete BEFORE DELETE ON wallet_ledger BEGIN SELECT RAISE(ABORT,'LEDGER_IMMUTABLE'); END;
--> statement-breakpoint
DROP TRIGGER finance_validate_entry;
--> statement-breakpoint
CREATE TRIGGER finance_validate_entry BEFORE INSERT ON finance_entries BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM shifts WHERE id=NEW.shift_id AND tenant=NEW.tenant AND status='open') THEN RAISE(ABORT,'SHIFT_NOT_OPEN') END;
 SELECT CASE WHEN typeof(NEW.amount) <> 'integer' OR NEW.amount <= 0 OR NEW.amount > 1000000000000 OR NEW.kind NOT IN ('payment','cash_in','cash_out','refund') OR NEW.method NOT IN ('cash','transfer','card') THEN RAISE(ABORT,'INVALID_ENTRY') END;
 SELECT CASE WHEN NEW.part NOT IN (0,1,2) OR (NEW.part=2)<>(NEW.kind='refund') OR (NEW.part=1 AND (NEW.kind<>'payment' OR NEW.package_id IS NOT NULL OR NEW.booking_id IS NULL)) THEN RAISE(ABORT,'INVALID_ENTRY') END;
 SELECT CASE WHEN NEW.kind IN ('cash_in','cash_out') AND (NEW.method <> 'cash' OR NEW.booking_id IS NOT NULL OR length(trim(NEW.note)) < 3) THEN RAISE(ABORT,'INVALID_CASH_MOVEMENT') END;
 SELECT CASE WHEN NEW.kind='payment' AND NEW.package_id IS NULL AND NEW.wallet_id IS NULL AND NOT EXISTS(SELECT 1 FROM bookings b WHERE b.id=NEW.booking_id AND b.tenant=NEW.tenant AND b.status='finished' AND ((NEW.part=0 AND b.amount-COALESCE((SELECT r.covered FROM package_redemptions r WHERE r.tenant=b.tenant AND r.booking_id=b.id),0)=NEW.amount AND NOT EXISTS(SELECT 1 FROM finance_entries e WHERE e.tenant=b.tenant AND e.booking_id=b.id AND e.kind='payment')) OR (NEW.part=1 AND NEW.amount<=b.amount-COALESCE((SELECT r.covered FROM package_redemptions r WHERE r.tenant=b.tenant AND r.booking_id=b.id),0)-COALESCE((SELECT SUM(e.amount) FROM finance_entries e WHERE e.tenant=b.tenant AND e.booking_id=b.id AND e.kind='payment'),0)))) THEN RAISE(ABORT,'BOOKING_NOT_PAYABLE') END;
 SELECT CASE WHEN NEW.kind='payment' AND NEW.package_id IS NOT NULL AND (NEW.booking_id IS NOT NULL OR NOT EXISTS(SELECT 1 FROM customer_packages p WHERE p.id=NEW.package_id AND p.tenant=NEW.tenant AND p.source='sale' AND p.price_paid=NEW.amount)) THEN RAISE(ABORT,'PACKAGE_NOT_PAYABLE') END;
 SELECT CASE WHEN NEW.kind<>'payment' AND NEW.package_id IS NOT NULL THEN RAISE(ABORT,'INVALID_CASH_MOVEMENT') END;
 SELECT CASE WHEN NEW.kind='refund' AND (NEW.package_id IS NOT NULL OR length(trim(NEW.note))<3 OR NOT EXISTS(SELECT 1 FROM bookings b WHERE b.id=NEW.booking_id AND b.tenant=NEW.tenant AND b.status='paid') OR NEW.amount > COALESCE((SELECT SUM(e.amount) FROM finance_entries e WHERE e.tenant=NEW.tenant AND e.booking_id=NEW.booking_id AND e.kind='payment' AND e.method=NEW.method),0) - COALESCE((SELECT SUM(e.amount) FROM finance_entries e WHERE e.tenant=NEW.tenant AND e.booking_id=NEW.booking_id AND e.kind='refund' AND e.method=NEW.method),0)) THEN RAISE(ABORT,'REFUND_NOT_ALLOWED') END;
 SELECT CASE WHEN (NEW.kind='cash_out' OR (NEW.kind='refund' AND NEW.method='cash')) AND NEW.amount > (SELECT opening_cash FROM shifts WHERE id=NEW.shift_id) + COALESCE((SELECT SUM(CASE WHEN kind IN ('cash_out','refund') THEN -amount ELSE amount END) FROM finance_entries WHERE tenant=NEW.tenant AND shift_id=NEW.shift_id AND method='cash'),0) THEN RAISE(ABORT,'INSUFFICIENT_CASH') END;
 SELECT CASE WHEN NEW.wallet_id IS NOT NULL AND (NEW.kind<>'payment' OR NEW.booking_id IS NOT NULL OR NEW.package_id IS NOT NULL OR NEW.part<>0 OR NOT EXISTS(SELECT 1 FROM wallet_ledger w WHERE w.id=NEW.wallet_id AND w.tenant=NEW.tenant AND w.reason='topup' AND w.delta=NEW.amount)) THEN RAISE(ABORT,'WALLET_NOT_PAYABLE') END;
END;
--> statement-breakpoint
DROP TRIGGER bookings_paid_requires_ledger;
--> statement-breakpoint
CREATE TRIGGER bookings_paid_requires_ledger BEFORE UPDATE ON bookings WHEN NEW.status='paid' AND OLD.status<>'paid' BEGIN
 SELECT CASE WHEN NOT (COALESCE((SELECT SUM(amount) FROM finance_entries WHERE tenant=NEW.tenant AND booking_id=NEW.id AND kind='payment'),0)>0 AND (SELECT SUM(amount) FROM finance_entries WHERE tenant=NEW.tenant AND booking_id=NEW.id AND kind='payment')=NEW.amount-COALESCE((SELECT r.covered FROM package_redemptions r WHERE r.tenant=NEW.tenant AND r.booking_id=NEW.id),0) AND ((NEW.payment='mixed' AND (SELECT COUNT(DISTINCT method) FROM finance_entries WHERE tenant=NEW.tenant AND booking_id=NEW.id AND kind='payment')>1) OR (NEW.payment IN ('cash','transfer','card') AND NOT EXISTS(SELECT 1 FROM finance_entries WHERE tenant=NEW.tenant AND booking_id=NEW.id AND kind='payment' AND method<>NEW.payment) AND EXISTS(SELECT 1 FROM finance_entries WHERE tenant=NEW.tenant AND booking_id=NEW.id AND kind='payment' AND method=NEW.payment)))) AND NOT (NEW.payment='wallet' AND NOT EXISTS(SELECT 1 FROM package_redemptions r WHERE r.tenant=NEW.tenant AND r.booking_id=NEW.id) AND NOT EXISTS(SELECT 1 FROM finance_entries WHERE tenant=NEW.tenant AND booking_id=NEW.id AND kind='payment') AND EXISTS(SELECT 1 FROM wallet_ledger w WHERE w.tenant=NEW.tenant AND w.booking_id=NEW.id AND w.reason='spend' AND w.delta=-NEW.amount)) AND NOT (NEW.payment='package' AND EXISTS(SELECT 1 FROM package_redemptions r WHERE r.tenant=NEW.tenant AND r.booking_id=NEW.id AND r.covered=NEW.amount) AND EXISTS(SELECT 1 FROM package_ledger l WHERE l.tenant=NEW.tenant AND l.booking_id=NEW.id AND l.reason='use')) THEN RAISE(ABORT,'PAYMENT_REQUIRES_LEDGER') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM package_redemptions r WHERE r.tenant=NEW.tenant AND r.booking_id=NEW.id) AND NOT EXISTS(SELECT 1 FROM package_ledger l WHERE l.tenant=NEW.tenant AND l.booking_id=NEW.id AND l.reason='use') THEN RAISE(ABORT,'REDEMPTION_WITHOUT_USE') END;
END;
