CREATE TABLE `member_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`ip_hash` text NOT NULL,
	`subject` text DEFAULT '' NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `member_attempt_ip` ON `member_attempts` (`kind`,`ip_hash`,`created`);--> statement-breakpoint
CREATE INDEX `member_attempt_subject` ON `member_attempts` (`kind`,`subject`,`created`);
--> statement-breakpoint
DROP TRIGGER member_accounts_validate;
--> statement-breakpoint
CREATE TRIGGER member_accounts_validate BEFORE INSERT ON member_accounts BEGIN
 SELECT CASE WHEN NEW.verified<>0 OR NEW.phone NOT GLOB '0[0-9]*' OR NEW.phone GLOB '*[^0-9]*' OR length(NEW.phone)<9 OR length(NEW.phone)>11 OR length(NEW.email)>200 OR length(NEW.password_hash)<20 THEN RAISE(ABORT,'INVALID_ACCOUNT') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM customers WHERE id=NEW.customer_id AND tenant=NEW.tenant AND phone=NEW.phone) THEN RAISE(ABORT,'CUSTOMER_NOT_FOUND') END;
 SELECT CASE WHEN (SELECT COUNT(*) FROM member_accounts WHERE tenant=NEW.tenant AND created>NEW.created-3600000)>=100 THEN RAISE(ABORT,'RATE_LIMITED') END;
END;
