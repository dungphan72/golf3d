CREATE TABLE `bank_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`external_id` text NOT NULL,
	`amount` integer NOT NULL,
	`content` text NOT NULL,
	`account` text NOT NULL,
	`reference` text DEFAULT '' NOT NULL,
	`tx_time` integer NOT NULL,
	`code` text,
	`status` text NOT NULL,
	`booking_id` text,
	`received` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bank_tx_external` ON `bank_transactions` (`tenant`,`external_id`);--> statement-breakpoint
CREATE INDEX `bank_tx_code` ON `bank_transactions` (`tenant`,`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `bank_tx_booking_once` ON `bank_transactions` (`tenant`,`booking_id`) WHERE "bank_transactions"."booking_id" IS NOT NULL;--> statement-breakpoint
CREATE TABLE `integrations` (
	`tenant` text NOT NULL,
	`provider` text NOT NULL,
	`key_hash` text NOT NULL,
	`updated` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `integration_tenant_provider` ON `integrations` (`tenant`,`provider`);--> statement-breakpoint
CREATE UNIQUE INDEX `integration_key` ON `integrations` (`provider`,`key_hash`);
--> statement-breakpoint
CREATE TRIGGER integrations_validate BEFORE INSERT ON integrations BEGIN
 SELECT CASE WHEN NEW.provider NOT IN ('sepay') OR length(NEW.key_hash)<20 OR length(NEW.key_hash)>100 THEN RAISE(ABORT,'INVALID_INTEGRATION') END;
END;
--> statement-breakpoint
CREATE TRIGGER integrations_validate_update BEFORE UPDATE ON integrations BEGIN
 SELECT CASE WHEN NEW.tenant<>OLD.tenant OR NEW.provider<>OLD.provider OR length(NEW.key_hash)<20 OR length(NEW.key_hash)>100 THEN RAISE(ABORT,'INVALID_INTEGRATION') END;
END;
--> statement-breakpoint
CREATE TRIGGER bank_tx_validate BEFORE INSERT ON bank_transactions BEGIN
 SELECT CASE WHEN NEW.status<>'received' OR NEW.booking_id IS NOT NULL THEN RAISE(ABORT,'INVALID_BANK_TX_STATE') END;
 SELECT CASE WHEN typeof(NEW.amount)<>'integer' OR NEW.amount<=0 OR NEW.amount>1000000000000 OR length(NEW.external_id)<1 OR length(NEW.external_id)>100 OR length(NEW.content)>500 OR length(NEW.account)>40 OR length(NEW.reference)>100 OR typeof(NEW.tx_time)<>'integer' THEN RAISE(ABORT,'INVALID_BANK_TX') END;
END;
--> statement-breakpoint
CREATE TRIGGER bank_tx_update BEFORE UPDATE ON bank_transactions BEGIN
 SELECT CASE WHEN NEW.id<>OLD.id OR NEW.tenant<>OLD.tenant OR NEW.external_id<>OLD.external_id OR NEW.amount<>OLD.amount OR NEW.content<>OLD.content OR NEW.account<>OLD.account OR NEW.reference<>OLD.reference OR NEW.tx_time<>OLD.tx_time OR NEW.code IS NOT OLD.code OR NEW.received<>OLD.received THEN RAISE(ABORT,'BANK_TX_IMMUTABLE') END;
 SELECT CASE WHEN OLD.status<>'received' THEN RAISE(ABORT,'BANK_TX_CLOSED') END;
 SELECT CASE WHEN NEW.status NOT IN ('received','used','ignored') THEN RAISE(ABORT,'INVALID_BANK_TX_STATE') END;
 SELECT CASE WHEN NEW.status='used' AND (NEW.booking_id IS NULL OR NOT EXISTS(SELECT 1 FROM finance_entries WHERE tenant=NEW.tenant AND booking_id=NEW.booking_id AND kind='payment' AND method='transfer' AND amount=NEW.amount)) THEN RAISE(ABORT,'BANK_TX_NOT_PAID') END;
 SELECT CASE WHEN NEW.status<>'used' AND NEW.booking_id IS NOT NULL THEN RAISE(ABORT,'INVALID_BANK_TX_STATE') END;
END;
--> statement-breakpoint
CREATE TRIGGER bank_tx_no_delete BEFORE DELETE ON bank_transactions BEGIN SELECT RAISE(ABORT,'BANK_TX_IMMUTABLE'); END;
