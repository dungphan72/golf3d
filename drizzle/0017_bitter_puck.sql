CREATE TABLE `crm_agents` (
	`tenant` text NOT NULL,
	`user_id` text NOT NULL,
	`receives_leads` integer DEFAULT 0 NOT NULL,
	`on_duty` integer DEFAULT 0 NOT NULL,
	`duty_since` integer,
	`last_assigned` integer,
	`zalo_id` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`updated` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `crm_agent_user` ON `crm_agents` (`tenant`,`user_id`);--> statement-breakpoint
CREATE TABLE `crm_lead_contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`lead_id` text NOT NULL,
	`source` text NOT NULL,
	`campaign` text DEFAULT '' NOT NULL,
	`ext_key` text NOT NULL,
	`message` text DEFAULT '' NOT NULL,
	`received_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `crm_contact_key` ON `crm_lead_contacts` (`tenant`,`ext_key`);--> statement-breakpoint
CREATE INDEX `crm_contact_lead` ON `crm_lead_contacts` (`lead_id`);--> statement-breakpoint
CREATE TABLE `crm_lead_events` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`lead_id` text NOT NULL,
	`customer_id` text,
	`kind` text NOT NULL,
	`actor` text,
	`detail` text DEFAULT '{}' NOT NULL,
	`created` integer NOT NULL,
	`ukey` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `crm_event_key` ON `crm_lead_events` (`tenant`,`ukey`);--> statement-breakpoint
CREATE INDEX `crm_event_lead` ON `crm_lead_events` (`lead_id`,`created`);--> statement-breakpoint
CREATE INDEX `crm_event_customer` ON `crm_lead_events` (`tenant`,`customer_id`,`created`);--> statement-breakpoint
CREATE TABLE `crm_leads` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`customer_id` text,
	`name` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`zalo_id` text DEFAULT '' NOT NULL,
	`source` text NOT NULL,
	`campaign` text DEFAULT '' NOT NULL,
	`channel_ref` text DEFAULT '' NOT NULL,
	`need` text DEFAULT '' NOT NULL,
	`guests` integer DEFAULT 0 NOT NULL,
	`preferred_start` integer,
	`message` text DEFAULT '' NOT NULL,
	`status` text NOT NULL,
	`assignee` text,
	`assigned_at` integer,
	`due_at` integer,
	`first_call_at` integer,
	`escalations` integer DEFAULT 0 NOT NULL,
	`tried` text DEFAULT '[]' NOT NULL,
	`received_at` integer NOT NULL,
	`updated` integer NOT NULL,
	`closed_at` integer,
	`lost_reason` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `crm_lead_status` ON `crm_leads` (`tenant`,`status`,`due_at`);--> statement-breakpoint
CREATE INDEX `crm_lead_phone` ON `crm_leads` (`tenant`,`phone`);--> statement-breakpoint
CREATE TABLE `crm_outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`ukey` text NOT NULL,
	`channel` text NOT NULL,
	`recipient` text NOT NULL,
	`subject` text DEFAULT '' NOT NULL,
	`body` text NOT NULL,
	`kind` text NOT NULL,
	`audience` text DEFAULT 'staff' NOT NULL,
	`lead_id` text,
	`customer_id` text,
	`send_at` integer NOT NULL,
	`status` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text DEFAULT '' NOT NULL,
	`created` integer NOT NULL,
	`sent_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `crm_outbox_key` ON `crm_outbox` (`tenant`,`ukey`);--> statement-breakpoint
CREATE INDEX `crm_outbox_status` ON `crm_outbox` (`status`,`send_at`);--> statement-breakpoint
ALTER TABLE `customers` ADD `email` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `customers` ADD `zalo_id` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `customers` ADD `marketing_consent` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `customers` ADD `consent_at` integer;
--> statement-breakpoint
CREATE UNIQUE INDEX `crm_lead_open_phone` ON `crm_leads` (`tenant`,`phone`) WHERE `phone` <> '' AND `status` IN ('queued','assigned');
--> statement-breakpoint
CREATE TRIGGER crm_agents_validate BEFORE INSERT ON crm_agents BEGIN
 SELECT CASE WHEN NEW.receives_leads NOT IN (0,1) OR NEW.on_duty NOT IN (0,1) OR length(NEW.email)>200 OR length(NEW.zalo_id)>100 THEN RAISE(ABORT,'INVALID_AGENT') END;
END;
--> statement-breakpoint
CREATE TRIGGER crm_agents_update BEFORE UPDATE ON crm_agents BEGIN
 SELECT CASE WHEN NEW.tenant<>OLD.tenant OR NEW.user_id<>OLD.user_id OR NEW.receives_leads NOT IN (0,1) OR NEW.on_duty NOT IN (0,1) OR length(NEW.email)>200 OR length(NEW.zalo_id)>100 THEN RAISE(ABORT,'INVALID_AGENT') END;
END;
--> statement-breakpoint
CREATE TRIGGER crm_leads_validate BEFORE INSERT ON crm_leads BEGIN
 SELECT CASE WHEN NEW.source NOT IN ('facebook','zalo','website','ads','manual') OR NEW.status NOT IN ('queued','assigned') OR length(NEW.name)>100 OR length(NEW.need)>20 OR NEW.guests<0 OR NEW.guests>1000 OR length(NEW.message)>2000 THEN RAISE(ABORT,'INVALID_LEAD') END;
 SELECT CASE WHEN NEW.phone<>'' AND (NEW.phone NOT GLOB '0[0-9]*' OR NEW.phone GLOB '*[^0-9]*' OR length(NEW.phone)<9 OR length(NEW.phone)>11) THEN RAISE(ABORT,'INVALID_LEAD') END;
END;
--> statement-breakpoint
CREATE TRIGGER crm_leads_update BEFORE UPDATE ON crm_leads BEGIN
 SELECT CASE WHEN NEW.id<>OLD.id OR NEW.tenant<>OLD.tenant OR NEW.source<>OLD.source OR NEW.received_at<>OLD.received_at OR (OLD.phone<>'' AND NEW.phone<>OLD.phone) THEN RAISE(ABORT,'LEAD_IDENTITY_IMMUTABLE') END;
 SELECT CASE WHEN OLD.status IN ('booked','lost') THEN RAISE(ABORT,'LEAD_CLOSED_IMMUTABLE') END;
 SELECT CASE WHEN NEW.status NOT IN ('queued','assigned','contacted','booked','lost') OR (OLD.first_call_at IS NOT NULL AND NEW.first_call_at IS NOT OLD.first_call_at) OR NEW.escalations<OLD.escalations THEN RAISE(ABORT,'INVALID_LEAD_TRANSITION') END;
END;
--> statement-breakpoint
CREATE TRIGGER crm_leads_no_delete BEFORE DELETE ON crm_leads BEGIN SELECT RAISE(ABORT,'LEAD_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER crm_contacts_validate BEFORE INSERT ON crm_lead_contacts BEGIN
 SELECT CASE WHEN length(NEW.ext_key)<3 OR length(NEW.ext_key)>200 OR length(NEW.message)>2000 THEN RAISE(ABORT,'INVALID_CONTACT') END;
END;
--> statement-breakpoint
CREATE TRIGGER crm_contacts_immutable BEFORE UPDATE ON crm_lead_contacts BEGIN SELECT RAISE(ABORT,'CONTACT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER crm_contacts_no_delete BEFORE DELETE ON crm_lead_contacts BEGIN SELECT RAISE(ABORT,'CONTACT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER crm_events_validate BEFORE INSERT ON crm_lead_events BEGIN
 SELECT CASE WHEN length(NEW.kind)<2 OR length(NEW.kind)>40 OR NOT json_valid(NEW.detail) THEN RAISE(ABORT,'INVALID_EVENT') END;
END;
--> statement-breakpoint
CREATE TRIGGER crm_events_immutable BEFORE UPDATE ON crm_lead_events BEGIN SELECT RAISE(ABORT,'EVENT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER crm_events_no_delete BEFORE DELETE ON crm_lead_events BEGIN SELECT RAISE(ABORT,'EVENT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER crm_outbox_validate BEFORE INSERT ON crm_outbox BEGIN
 SELECT CASE WHEN NEW.channel NOT IN ('email','zalo') OR NEW.status<>'pending' OR NEW.audience NOT IN ('staff','customer') OR length(NEW.body)<1 OR length(NEW.body)>4000 OR length(NEW.ukey)<3 THEN RAISE(ABORT,'INVALID_MESSAGE') END;
END;
--> statement-breakpoint
CREATE TRIGGER crm_outbox_update BEFORE UPDATE ON crm_outbox BEGIN
 SELECT CASE WHEN NEW.id<>OLD.id OR NEW.tenant<>OLD.tenant OR NEW.ukey<>OLD.ukey OR NEW.channel<>OLD.channel OR NEW.recipient<>OLD.recipient OR NEW.body<>OLD.body OR NEW.created<>OLD.created THEN RAISE(ABORT,'MESSAGE_IMMUTABLE') END;
 SELECT CASE WHEN OLD.status NOT IN ('pending','failed') THEN RAISE(ABORT,'MESSAGE_CLOSED_IMMUTABLE') END;
 SELECT CASE WHEN NEW.status NOT IN ('pending','sent','failed','cancelled','expired') THEN RAISE(ABORT,'INVALID_MESSAGE') END;
END;
--> statement-breakpoint
CREATE TRIGGER crm_outbox_no_delete BEFORE DELETE ON crm_outbox BEGIN SELECT RAISE(ABORT,'MESSAGE_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER customers_consent_valid BEFORE UPDATE OF marketing_consent ON customers BEGIN
 SELECT CASE WHEN NEW.marketing_consent NOT IN (0,1) THEN RAISE(ABORT,'INVALID_CONSENT') END;
END;
--> statement-breakpoint
DROP TRIGGER integrations_validate;
--> statement-breakpoint
CREATE TRIGGER integrations_validate BEFORE INSERT ON integrations BEGIN
 SELECT CASE WHEN NEW.provider NOT IN ('sepay','lead_website','lead_ads') OR length(NEW.key_hash)<20 OR length(NEW.key_hash)>100 THEN RAISE(ABORT,'INVALID_INTEGRATION') END;
END;
