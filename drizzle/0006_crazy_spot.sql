CREATE TABLE `booking_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`code_hash` text NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`service` text NOT NULL,
	`vip` integer DEFAULT 0 NOT NULL,
	`people` integer NOT NULL,
	`start` integer NOT NULL,
	`minutes` integer DEFAULT 0 NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`quote` text NOT NULL,
	`status` text NOT NULL,
	`room` text,
	`booking_id` text,
	`reason` text DEFAULT '' NOT NULL,
	`handled_by` text,
	`handled_at` integer,
	`ip_hash` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `booking_request_code` ON `booking_requests` (`code_hash`);--> statement-breakpoint
CREATE INDEX `booking_request_tenant` ON `booking_requests` (`tenant`,`status`,`created`);--> statement-breakpoint
CREATE INDEX `booking_request_ip` ON `booking_requests` (`ip_hash`,`created`);
--> statement-breakpoint
CREATE TRIGGER booking_requests_validate BEFORE INSERT ON booking_requests BEGIN
 SELECT CASE WHEN NEW.status<>'pending' OR NEW.room IS NOT NULL OR NEW.booking_id IS NOT NULL OR NEW.handled_by IS NOT NULL THEN RAISE(ABORT,'INVALID_REQUEST_STATE') END;
 SELECT CASE WHEN length(trim(NEW.name))<2 OR length(NEW.name)>100 OR NEW.phone NOT GLOB '0[0-9]*' OR NEW.phone GLOB '*[^0-9]*' OR length(NEW.phone)<9 OR length(NEW.phone)>11 OR NEW.service NOT IN ('gdr','9','18') OR NEW.vip NOT IN (0,1) OR typeof(NEW.people)<>'integer' OR NEW.people<1 OR NEW.people>4 OR typeof(NEW.start)<>'integer' OR NEW.start<NEW.created-300000 OR typeof(NEW.minutes)<>'integer' OR NEW.minutes<0 OR NEW.minutes>720 OR length(NEW.note)>300 OR NOT json_valid(NEW.quote) OR length(NEW.code_hash)<20 THEN RAISE(ABORT,'INVALID_REQUEST') END;
 SELECT CASE WHEN (SELECT COUNT(*) FROM booking_requests WHERE tenant=NEW.tenant AND phone=NEW.phone AND status='pending')>=3 THEN RAISE(ABORT,'TOO_MANY_PENDING_PHONE') END;
 SELECT CASE WHEN (SELECT COUNT(*) FROM booking_requests WHERE tenant=NEW.tenant AND status='pending')>=300 THEN RAISE(ABORT,'TOO_MANY_PENDING') END;
 SELECT CASE WHEN (SELECT COUNT(*) FROM booking_requests WHERE ip_hash=NEW.ip_hash AND created>NEW.created-3600000)>=10 THEN RAISE(ABORT,'RATE_LIMITED') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM booking_requests WHERE tenant=NEW.tenant AND phone=NEW.phone AND start=NEW.start AND service=NEW.service AND status='pending') THEN RAISE(ABORT,'DUPLICATE_REQUEST') END;
END;
--> statement-breakpoint
CREATE TRIGGER booking_requests_update BEFORE UPDATE ON booking_requests BEGIN
 SELECT CASE WHEN NEW.id<>OLD.id OR NEW.tenant<>OLD.tenant OR NEW.code_hash<>OLD.code_hash OR NEW.name<>OLD.name OR NEW.phone<>OLD.phone OR NEW.service<>OLD.service OR NEW.vip<>OLD.vip OR NEW.people<>OLD.people OR NEW.start<>OLD.start OR NEW.minutes<>OLD.minutes OR NEW.note<>OLD.note OR NEW.quote<>OLD.quote OR NEW.ip_hash<>OLD.ip_hash OR NEW.created<>OLD.created THEN RAISE(ABORT,'REQUEST_IMMUTABLE') END;
 SELECT CASE WHEN OLD.status<>'pending' THEN RAISE(ABORT,'REQUEST_CLOSED') END;
 SELECT CASE WHEN NEW.status NOT IN ('pending','confirmed','rejected','cancelled') THEN RAISE(ABORT,'INVALID_REQUEST_STATE') END;
 SELECT CASE WHEN NEW.status='confirmed' AND (NEW.room IS NULL OR NEW.booking_id IS NULL OR NEW.handled_by IS NULL OR NEW.handled_at IS NULL) THEN RAISE(ABORT,'INVALID_CONFIRMATION') END;
 SELECT CASE WHEN NEW.status='rejected' AND (length(trim(NEW.reason))<3 OR NEW.handled_by IS NULL OR NEW.handled_at IS NULL) THEN RAISE(ABORT,'REJECTION_REASON_REQUIRED') END;
 SELECT CASE WHEN NEW.status='cancelled' AND (NEW.handled_by IS NOT NULL OR NEW.booking_id IS NOT NULL) THEN RAISE(ABORT,'INVALID_CANCEL') END;
END;
--> statement-breakpoint
CREATE TRIGGER booking_requests_audit AFTER UPDATE ON booking_requests WHEN OLD.status='pending' AND NEW.status<>'pending' BEGIN
 INSERT INTO audit(id,tenant,action,detail,created) VALUES ('request:'||NEW.id,NEW.tenant,'Yêu cầu đặt online',json_object('request',NEW.id,'status',NEW.status,'booking',NEW.booking_id,'actor',NEW.handled_by),COALESCE(NEW.handled_at,NEW.created));
END;
--> statement-breakpoint
CREATE TRIGGER booking_requests_no_delete BEFORE DELETE ON booking_requests BEGIN SELECT RAISE(ABORT,'REQUEST_IMMUTABLE'); END;
