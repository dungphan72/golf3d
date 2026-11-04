CREATE TABLE `coaches` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`user_id` text,
	`name` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `coach_tenant` ON `coaches` (`tenant`);--> statement-breakpoint
CREATE TABLE `lessons` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`coach_id` text NOT NULL,
	`customer_id` text,
	`customer_name` text NOT NULL,
	`phone` text NOT NULL,
	`start` integer NOT NULL,
	`minutes` integer NOT NULL,
	`room` text,
	`status` text NOT NULL,
	`price` integer,
	`note` text DEFAULT '' NOT NULL,
	`coach_note` text DEFAULT '' NOT NULL,
	`actor` text NOT NULL,
	`request_id` text NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`coach_id`) REFERENCES `coaches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `lesson_coach_time` ON `lessons` (`tenant`,`coach_id`,`start`);--> statement-breakpoint
CREATE UNIQUE INDEX `lesson_request_once` ON `lessons` (`tenant`,`request_id`);
--> statement-breakpoint
CREATE TRIGGER coaches_validate_insert BEFORE INSERT ON coaches BEGIN
 SELECT CASE WHEN length(trim(NEW.name))<2 OR length(NEW.name)>100 OR length(NEW.phone)>20 OR NEW.active NOT IN (0,1) THEN RAISE(ABORT,'INVALID_COACH') END;
 SELECT CASE WHEN NEW.user_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM memberships WHERE user_id=NEW.user_id AND tenant=NEW.tenant AND role='coach') THEN RAISE(ABORT,'COACH_USER_INVALID') END;
END;
--> statement-breakpoint
CREATE TRIGGER coaches_validate_update BEFORE UPDATE ON coaches BEGIN
 SELECT CASE WHEN NEW.id<>OLD.id OR NEW.tenant<>OLD.tenant OR NEW.created<>OLD.created OR length(trim(NEW.name))<2 OR length(NEW.name)>100 OR length(NEW.phone)>20 OR NEW.active NOT IN (0,1) THEN RAISE(ABORT,'INVALID_COACH') END;
 SELECT CASE WHEN NEW.user_id IS NOT NULL AND NEW.user_id IS NOT OLD.user_id AND NOT EXISTS(SELECT 1 FROM memberships WHERE user_id=NEW.user_id AND tenant=NEW.tenant AND role='coach') THEN RAISE(ABORT,'COACH_USER_INVALID') END;
END;
--> statement-breakpoint
CREATE TRIGGER coaches_no_delete BEFORE DELETE ON coaches BEGIN SELECT RAISE(ABORT,'COACH_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER lessons_validate_insert BEFORE INSERT ON lessons BEGIN
 SELECT CASE WHEN NEW.status<>'scheduled' THEN RAISE(ABORT,'INVALID_LESSON_STATE') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM coaches WHERE id=NEW.coach_id AND tenant=NEW.tenant AND active=1) THEN RAISE(ABORT,'COACH_NOT_FOUND') END;
 SELECT CASE WHEN NEW.customer_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM customers WHERE id=NEW.customer_id AND tenant=NEW.tenant) THEN RAISE(ABORT,'CUSTOMER_NOT_FOUND') END;
 SELECT CASE WHEN length(trim(NEW.customer_name))<2 OR length(NEW.customer_name)>100 OR NEW.phone NOT GLOB '0[0-9]*' OR NEW.phone GLOB '*[^0-9]*' OR length(NEW.phone)<9 OR length(NEW.phone)>11 OR typeof(NEW.start)<>'integer' OR typeof(NEW.minutes)<>'integer' OR NEW.minutes<15 OR NEW.minutes>480 OR NEW.minutes%15<>0 OR NEW.start<NEW.created-300000 OR (NEW.price IS NOT NULL AND (typeof(NEW.price)<>'integer' OR NEW.price<0 OR NEW.price>1000000000)) OR length(NEW.note)>500 OR length(NEW.coach_note)>500 THEN RAISE(ABORT,'INVALID_LESSON') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM lessons WHERE tenant=NEW.tenant AND coach_id=NEW.coach_id AND status<>'cancelled' AND start<NEW.start+NEW.minutes*60000 AND start+minutes*60000>NEW.start) THEN RAISE(ABORT,'COACH_BUSY') END;
END;
--> statement-breakpoint
CREATE TRIGGER lessons_validate_update BEFORE UPDATE ON lessons BEGIN
 SELECT CASE WHEN NEW.id<>OLD.id OR NEW.tenant<>OLD.tenant OR NEW.created<>OLD.created OR NEW.request_id<>OLD.request_id OR NEW.actor<>OLD.actor OR NEW.customer_name<>OLD.customer_name OR NEW.phone<>OLD.phone OR NEW.customer_id IS NOT OLD.customer_id THEN RAISE(ABORT,'LESSON_IDENTITY_IMMUTABLE') END;
 SELECT CASE WHEN NEW.status NOT IN ('scheduled','done','cancelled','no_show') OR (OLD.status<>'scheduled' AND NEW.status<>OLD.status) THEN RAISE(ABORT,'INVALID_LESSON_STATE') END;
 SELECT CASE WHEN OLD.status<>'scheduled' AND (NEW.coach_id<>OLD.coach_id OR NEW.start<>OLD.start OR NEW.minutes<>OLD.minutes OR NEW.room IS NOT OLD.room OR NEW.price IS NOT OLD.price OR NEW.note<>OLD.note) THEN RAISE(ABORT,'LESSON_CLOSED') END;
 SELECT CASE WHEN length(NEW.coach_note)>500 OR length(NEW.note)>500 OR NEW.minutes<15 OR NEW.minutes>480 OR NEW.minutes%15<>0 THEN RAISE(ABORT,'INVALID_LESSON') END;
 SELECT CASE WHEN NEW.coach_id<>OLD.coach_id AND NOT EXISTS(SELECT 1 FROM coaches WHERE id=NEW.coach_id AND tenant=NEW.tenant AND active=1) THEN RAISE(ABORT,'COACH_NOT_FOUND') END;
 SELECT CASE WHEN NEW.status='scheduled' AND (NEW.coach_id<>OLD.coach_id OR NEW.start<>OLD.start OR NEW.minutes<>OLD.minutes) AND EXISTS(SELECT 1 FROM lessons WHERE tenant=NEW.tenant AND id<>NEW.id AND coach_id=NEW.coach_id AND status<>'cancelled' AND start<NEW.start+NEW.minutes*60000 AND start+minutes*60000>NEW.start) THEN RAISE(ABORT,'COACH_BUSY') END;
END;
--> statement-breakpoint
CREATE TRIGGER lessons_audit_insert AFTER INSERT ON lessons BEGIN
 INSERT INTO audit(id,tenant,action,detail,created) VALUES ('lesson:'||NEW.id,NEW.tenant,'Đặt buổi học',json_object('lesson',NEW.id,'coach',NEW.coach_id,'start',NEW.start,'minutes',NEW.minutes,'actor',NEW.actor),NEW.created);
END;
--> statement-breakpoint
CREATE TRIGGER lessons_audit_status AFTER UPDATE OF status ON lessons WHEN NEW.status<>OLD.status BEGIN
 INSERT INTO audit(id,tenant,action,detail,created) VALUES ('lesson-status:'||NEW.id||':'||NEW.status,NEW.tenant,'Buổi học '||NEW.status,json_object('lesson',NEW.id,'status',NEW.status),CAST(strftime('%s','now') AS INTEGER)*1000);
END;
--> statement-breakpoint
CREATE TRIGGER lessons_no_delete BEFORE DELETE ON lessons BEGIN SELECT RAISE(ABORT,'LESSON_IMMUTABLE'); END;
