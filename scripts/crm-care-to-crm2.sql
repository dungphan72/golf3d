-- One-time import of the old CRM's customer care data ("Chăm sóc KH") into the CRM module.
--
--   * crm_tasks         -> crm2_tasks           (id 'mig-' + old id; the old task key is kept as ukey, so the
--                                                 CRM cron never creates the same welcome/thanks/... task again)
--   * crm_interactions  -> crm2_customer_notes  (id 'mig-' + old id)
--   * settings.crm      -> crm2_settings.care   (rule switches, days, message templates, VIP spend)
--   * crm_agents        -> crm2_staff           (Zalo ID, notice email) and the "not receiving leads" list
--
-- Never changes or deletes the old tables. Safe to run again: rows already imported are skipped, and
-- settings or staff data already filled in the CRM module are never overwritten.
-- Undo (tasks and notes only): scripts/crm-care-undo.sql. Run only after a backup; see docs/CRM-MIGRATION.md.

-- 1. Care tasks. A closed task keeps who closed it and how; an open one stays open.
INSERT OR IGNORE INTO crm2_tasks (
  id, tenant, lead_id, title, type, due_at, done_at, assignee, created_by, reminded_at, ukey, created,
  customer_id, rule, data, channel, note, outcome
)
SELECT
  'mig-' || t.id,
  t.tenant,
  NULL,
  t.title,
  'CALL',
  t.due,
  CASE WHEN t.status = 'open' THEN NULL ELSE COALESCE(t.handled_at, t.created) END,
  COALESCE(t.assignee, CASE WHEN t.status = 'open' THEN NULL ELSE t.handled_by END),
  'CRM cũ',
  NULL,
  t.key,
  t.created,
  t.customer_id,
  t.rule,
  t.data,
  COALESCE(t.channel, ''),
  COALESCE(t.note, ''),
  CASE t.status WHEN 'done' THEN 'done' WHEN 'skipped' THEN 'skipped' ELSE '' END
FROM crm_tasks t
WHERE t.customer_id IS NOT NULL;

-- 2. Contact history. The actor becomes a name, as the module stores names, not user ids.
INSERT OR IGNORE INTO crm2_customer_notes (id, tenant, customer_id, task_id, channel, content, actor, created)
SELECT
  'mig-' || i.id,
  i.tenant,
  i.customer_id,
  CASE WHEN i.task_id IS NULL THEN NULL ELSE 'mig-' || i.task_id END,
  i.channel,
  i.content,
  COALESCE((SELECT u.name FROM users u WHERE u.id = i.actor), ''),
  i.created
FROM crm_interactions i;

-- 3. Care settings. A club that never used the CRM module gets a settings row holding only the care part;
--    the module fills every other setting with its defaults.
INSERT OR IGNORE INTO crm2_settings (tenant, value, updated)
SELECT s.tenant, json_object('care', json(json_extract(s.value, '$.crm'))), CAST(strftime('%s','now') AS INTEGER) * 1000
FROM settings s
WHERE json_type(s.value, '$.crm') = 'object';

UPDATE crm2_settings
SET value = json_set(value, '$.care', json((SELECT json_extract(s.value, '$.crm') FROM settings s WHERE s.tenant = crm2_settings.tenant)))
WHERE json_type(value, '$.care') IS NULL
  AND EXISTS (SELECT 1 FROM settings s WHERE s.tenant = crm2_settings.tenant AND json_type(s.value, '$.crm') = 'object');

-- 4. Staff: Zalo ID and notice email from the old agent list (filled only where the module has none).
INSERT INTO crm2_staff (tenant, user_id, team, is_leader, extension, zalo_id, notify_email, updated)
SELECT a.tenant, a.user_id, '', 0, '', a.zalo_id, a.email, a.updated FROM crm_agents a
WHERE true
ON CONFLICT (tenant, user_id) DO UPDATE SET
  zalo_id = CASE WHEN crm2_staff.zalo_id = '' THEN excluded.zalo_id ELSE crm2_staff.zalo_id END,
  notify_email = CASE WHEN crm2_staff.notify_email = '' THEN excluded.notify_email ELSE crm2_staff.notify_email END;

-- Agents who never received leads start as "not receiving" in the module (only when its list is still empty).
INSERT OR IGNORE INTO crm2_settings (tenant, value, updated)
SELECT DISTINCT a.tenant, '{}', CAST(strftime('%s','now') AS INTEGER) * 1000 FROM crm_agents a WHERE a.receives_leads = 0;

UPDATE crm2_settings
SET value = json_set(
  value,
  '$.distribution',
  json_patch(
    COALESCE(json_extract(value, '$.distribution'), '{}'),
    json_object('paused', json((SELECT json_group_array(a.user_id) FROM crm_agents a WHERE a.tenant = crm2_settings.tenant AND a.receives_leads = 0)))
  )
)
WHERE EXISTS (SELECT 1 FROM crm_agents a WHERE a.tenant = crm2_settings.tenant AND a.receives_leads = 0)
  AND COALESCE(json_array_length(json_extract(value, '$.distribution.paused')), 0) = 0;
