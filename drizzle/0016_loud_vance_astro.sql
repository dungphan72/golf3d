CREATE TABLE `crm_interactions` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`customer_id` text NOT NULL,
	`task_id` text,
	`channel` text NOT NULL,
	`content` text NOT NULL,
	`actor` text NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `crm_interaction_customer` ON `crm_interactions` (`tenant`,`customer_id`,`created`);--> statement-breakpoint
CREATE TABLE `crm_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`customer_id` text NOT NULL,
	`rule` text NOT NULL,
	`key` text NOT NULL,
	`title` text NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`due` integer NOT NULL,
	`status` text NOT NULL,
	`assignee` text,
	`channel` text,
	`note` text DEFAULT '' NOT NULL,
	`created` integer NOT NULL,
	`handled_by` text,
	`handled_at` integer,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `crm_task_key` ON `crm_tasks` (`tenant`,`key`);--> statement-breakpoint
CREATE INDEX `crm_task_status` ON `crm_tasks` (`tenant`,`status`,`due`);--> statement-breakpoint
CREATE INDEX `crm_task_customer` ON `crm_tasks` (`tenant`,`customer_id`);--> statement-breakpoint
ALTER TABLE `customers` ADD `birthday` text DEFAULT '' NOT NULL;
--> statement-breakpoint
CREATE VIEW crm_visits AS SELECT c.tenant AS tenant,c.id AS customer_id,b.id AS booking_id,b.service AS service,b.finished AS finished,b.amount AS amount FROM customers c JOIN bookings b ON b.tenant=c.tenant AND b.status='paid' AND b.finished IS NOT NULL AND c.phone=CASE WHEN replace(replace(replace(replace(replace(b.phone,' ',''),'-',''),'(',''),')',''),'.','') LIKE '+84%' THEN '0'||substr(replace(replace(replace(replace(replace(b.phone,' ',''),'-',''),'(',''),')',''),'.',''),4) WHEN replace(replace(replace(replace(replace(b.phone,' ',''),'-',''),'(',''),')',''),'.','') LIKE '84%' AND length(replace(replace(replace(replace(replace(b.phone,' ',''),'-',''),'(',''),')',''),'.',''))>=11 THEN '0'||substr(replace(replace(replace(replace(replace(b.phone,' ',''),'-',''),'(',''),')',''),'.',''),3) ELSE replace(replace(replace(replace(replace(b.phone,' ',''),'-',''),'(',''),')',''),'.','') END;
--> statement-breakpoint
CREATE TRIGGER customers_birthday_valid BEFORE UPDATE OF birthday ON customers BEGIN
 SELECT CASE WHEN NEW.birthday<>'' AND NEW.birthday NOT GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]' AND NEW.birthday NOT GLOB '[01][0-9]-[0-3][0-9]' THEN RAISE(ABORT,'INVALID_BIRTHDAY') END;
END;
--> statement-breakpoint
CREATE TRIGGER crm_tasks_validate BEFORE INSERT ON crm_tasks BEGIN
 SELECT CASE WHEN NEW.status<>'open' OR NEW.handled_by IS NOT NULL OR NEW.handled_at IS NOT NULL OR length(trim(NEW.title))<2 OR length(NEW.title)>200 OR length(NEW.rule)<2 OR length(NEW.key)<3 OR NOT json_valid(NEW.data) OR typeof(NEW.due)<>'integer' THEN RAISE(ABORT,'INVALID_TASK') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM customers WHERE id=NEW.customer_id AND tenant=NEW.tenant) THEN RAISE(ABORT,'CUSTOMER_NOT_FOUND') END;
END;
--> statement-breakpoint
CREATE TRIGGER crm_tasks_update BEFORE UPDATE ON crm_tasks BEGIN
 SELECT CASE WHEN NEW.id<>OLD.id OR NEW.tenant<>OLD.tenant OR NEW.customer_id<>OLD.customer_id OR NEW.rule<>OLD.rule OR NEW.key<>OLD.key OR NEW.title<>OLD.title OR NEW.data<>OLD.data OR NEW.created<>OLD.created THEN RAISE(ABORT,'TASK_IDENTITY_IMMUTABLE') END;
 SELECT CASE WHEN OLD.status<>'open' THEN RAISE(ABORT,'TASK_CLOSED_IMMUTABLE') END;
 SELECT CASE WHEN NEW.status NOT IN ('open','done','skipped') OR (NEW.status<>'open' AND (NEW.handled_by IS NULL OR NEW.handled_at IS NULL)) OR length(NEW.note)>1000 THEN RAISE(ABORT,'INVALID_TASK_TRANSITION') END;
END;
--> statement-breakpoint
CREATE TRIGGER crm_tasks_no_delete BEFORE DELETE ON crm_tasks BEGIN SELECT RAISE(ABORT,'TASK_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER crm_interactions_validate BEFORE INSERT ON crm_interactions BEGIN
 SELECT CASE WHEN NEW.channel NOT IN ('call','zalo','sms','visit','email','note') OR length(trim(NEW.content))<1 OR length(NEW.content)>1000 THEN RAISE(ABORT,'INVALID_INTERACTION') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM customers WHERE id=NEW.customer_id AND tenant=NEW.tenant) THEN RAISE(ABORT,'CUSTOMER_NOT_FOUND') END;
END;
--> statement-breakpoint
CREATE TRIGGER crm_interactions_immutable BEFORE UPDATE ON crm_interactions BEGIN SELECT RAISE(ABORT,'INTERACTION_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER crm_interactions_no_delete BEFORE DELETE ON crm_interactions BEGIN SELECT RAISE(ABORT,'INTERACTION_IMMUTABLE'); END;
