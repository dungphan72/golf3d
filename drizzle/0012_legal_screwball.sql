CREATE TABLE `member_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`customer_id` text NOT NULL,
	`phone` text NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`password_hash` text NOT NULL,
	`verified` integer DEFAULT 0 NOT NULL,
	`failed_count` integer DEFAULT 0 NOT NULL,
	`locked_until` integer DEFAULT 0 NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `member_account_phone` ON `member_accounts` (`tenant`,`phone`);--> statement-breakpoint
CREATE INDEX `member_account_customer` ON `member_accounts` (`customer_id`);--> statement-breakpoint
CREATE TABLE `member_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`expires` integer NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `member_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `member_session_account` ON `member_sessions` (`account_id`);
--> statement-breakpoint
CREATE TRIGGER member_accounts_validate BEFORE INSERT ON member_accounts BEGIN
 SELECT CASE WHEN NEW.verified<>0 OR NEW.phone NOT GLOB '0[0-9]*' OR NEW.phone GLOB '*[^0-9]*' OR length(NEW.phone)<9 OR length(NEW.phone)>11 OR length(NEW.email)>200 OR length(NEW.password_hash)<20 THEN RAISE(ABORT,'INVALID_ACCOUNT') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM customers WHERE id=NEW.customer_id AND tenant=NEW.tenant AND phone=NEW.phone) THEN RAISE(ABORT,'CUSTOMER_NOT_FOUND') END;
 SELECT CASE WHEN (SELECT COUNT(*) FROM member_accounts WHERE tenant=NEW.tenant AND created>NEW.created-3600000)>=30 THEN RAISE(ABORT,'RATE_LIMITED') END;
END;
--> statement-breakpoint
CREATE TRIGGER member_accounts_update BEFORE UPDATE ON member_accounts BEGIN
 SELECT CASE WHEN NEW.id<>OLD.id OR NEW.tenant<>OLD.tenant OR NEW.customer_id<>OLD.customer_id OR NEW.phone<>OLD.phone OR NEW.created<>OLD.created OR (OLD.verified=1 AND NEW.verified=0) OR NEW.verified NOT IN (0,1) THEN RAISE(ABORT,'ACCOUNT_IMMUTABLE') END;
END;
