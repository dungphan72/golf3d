-- One-time import of the old CRM leads ("Chăm sóc KH", tables crm_*) into the CRM module (tables crm2_*).
--
--   * Reads crm_leads, crm_lead_contacts and crm_lead_events. Never changes or deletes them, so the old
--     screens keep working and nothing is lost if the import is wrong.
--   * Every imported row gets the id 'mig-' + the old id, so the file is safe to run again: rows that were
--     already imported are skipped (INSERT OR IGNORE) and new old-system leads are picked up.
--   * Not imported: crm_tasks and crm_interactions (they hang on customers, not on leads), crm_agents,
--     crm_outbox. See docs/CRM-MIGRATION.md.
--   * Undo: scripts/crm-legacy-undo.sql removes exactly the rows whose id starts with 'mig-'.
--
-- Run only after a backup. Steps and checks: docs/CRM-MIGRATION.md.

-- ---------------------------------------------------------------------------------------------------------
-- 1. Leads
-- ---------------------------------------------------------------------------------------------------------
INSERT OR IGNORE INTO crm2_leads (
  id, tenant, full_name, phone, phone_norm, email, notes, source, target_service,
  preferred_date, preferred_time, stage, status_id, owner, owned_at, pooled_at, lost_reason,
  expected_value, budget, last_contact_at, inquiry_count, next_action, next_due, call_attempts,
  last_result, labels, first_response_at, first_response_by, first_response_min, won_at, created, updated
)
SELECT
  'mig-' || x.id,
  x.tenant,
  COALESCE(NULLIF(trim(x.name), ''), 'Khách chưa có tên'),
  x.phone,
  x.phone,                                    -- the old table only allows digits, already in national form
  x.email,
  trim(
    x.message
    || CASE WHEN x.note <> '' THEN char(10) || x.note ELSE '' END
    || CASE WHEN x.next_note <> '' THEN char(10) || 'Việc tiếp theo: ' || x.next_note ELSE '' END,
    char(10) || ' '                            -- also strip the line break left when the first part is empty
  ),
  CASE x.source
    WHEN 'facebook' THEN 'Facebook'
    WHEN 'zalo' THEN 'Zalo OA'
    WHEN 'website' THEN 'Website'
    WHEN 'ads' THEN 'Quảng cáo'
    WHEN 'manual' THEN 'Nhập tay'
    ELSE x.source
  END,
  CASE x.need
    WHEN 'swing' THEN 'Luyện swing'
    WHEN '9' THEN 'Game 9 hố'
    WHEN '18' THEN 'Game 18 hố'
    WHEN 'group' THEN 'Nhóm / sự kiện'
    ELSE ''
  END,
  CASE WHEN x.preferred_start IS NULL THEN ''
       ELSE strftime('%Y-%m-%d', (x.preferred_start + 25200000) / 1000, 'unixepoch') END,   -- Vietnam time
  CASE WHEN x.preferred_start IS NULL THEN ''
       ELSE strftime('%H:%M', (x.preferred_start + 25200000) / 1000, 'unixepoch') END,
  x.stg,
  CASE
    WHEN x.stg = 'LOST' AND x.lost_reason = 'Không liên lạc được' THEN 'khong-lien-lac-duoc'
    WHEN x.stg = 'NEW' THEN 'khach-moi'
    WHEN x.stg = 'CONTACTED' THEN 'da-lien-he'
    WHEN x.stg = 'QUALIFIED' THEN 'goi-lai-1'
    WHEN x.stg = 'VISIT_SCHEDULED' THEN 'hen-trai-nghiem'
    WHEN x.stg = 'VISITED' THEN 'da-trai-nghiem'
    WHEN x.stg = 'DEPOSITED' THEN 'dat-coc'
    WHEN x.stg = 'WON' THEN 'da-mua'
    ELSE 'khong-mua'
  END,
  CASE WHEN x.status = 'queued' THEN NULL ELSE x.assignee END,           -- queued = nobody on duty: back to the pool
  CASE WHEN x.status = 'queued' THEN NULL ELSE x.assigned_at END,
  CASE WHEN x.status = 'queued' AND x.stg NOT IN ('WON', 'LOST') THEN x.received_at END,
  x.lost_reason,
  x.deal_value,
  x.budget,
  x.first_call_at,
  MAX(1, (SELECT COUNT(*) FROM crm_lead_contacts c WHERE c.tenant = x.tenant AND c.lead_id = x.id)),
  CASE WHEN x.stg IN ('WON', 'LOST') THEN 'NONE'
       WHEN x.status IN ('queued', 'assigned') THEN 'NEW'
       ELSE 'FOLLOW_UP' END,
  CASE WHEN x.stg IN ('WON', 'LOST') THEN NULL
       WHEN x.status IN ('queued', 'assigned') THEN x.due_at
       ELSE x.next_at END,
  x.missed,
  '',
  json_insert(CASE WHEN json_valid(x.tags) AND json_type(x.tags) = 'array' THEN x.tags ELSE '[]' END, '$[#]', 'CRM cũ'),
  x.first_call_at,
  CASE WHEN x.first_call_at IS NOT NULL THEN x.assignee END,
  CASE WHEN x.first_call_at IS NOT NULL THEN MAX(0, (x.first_call_at - x.received_at) / 60000) END,
  CASE WHEN x.stg = 'WON' THEN COALESCE(x.closed_at, x.updated) END,
  x.received_at,
  x.updated
FROM (
  SELECT l.*,
    CASE l.stage
      WHEN 'new' THEN 'NEW'
      WHEN 'contacted' THEN 'CONTACTED'
      WHEN 'qualified' THEN 'QUALIFIED'
      WHEN 'trial' THEN 'VISIT_SCHEDULED'
      WHEN 'visited' THEN 'VISITED'
      WHEN 'deposit' THEN 'DEPOSITED'
      WHEN 'won' THEN 'WON'
      WHEN 'lost' THEN 'LOST'
      ELSE 'NEW'
    END AS stg
  FROM crm_leads l
) x;

-- ---------------------------------------------------------------------------------------------------------
-- 2. Every message the customer sent (first contact and repeat inquiries)
-- ---------------------------------------------------------------------------------------------------------
INSERT OR IGNORE INTO crm2_activities (id, tenant, lead_id, type, content, meta, actor, created)
SELECT
  'mig-c-' || c.id,
  c.tenant,
  'mig-' || c.lead_id,
  'INQUIRY',
  CASE WHEN c.message <> '' THEN c.message ELSE 'Liên hệ qua ' || c.source END,
  json_object('legacy', 'contact', 'source', c.source, 'campaign', c.campaign),
  'CRM cũ',
  c.received_at
FROM crm_lead_contacts c
WHERE EXISTS (SELECT 1 FROM crm2_leads n WHERE n.tenant = c.tenant AND n.id = 'mig-' || c.lead_id);

-- ---------------------------------------------------------------------------------------------------------
-- 3. The handling history (calls, stage changes, assignments, ...). 'received' and 'contact' are skipped:
--    the contact rows above already say the same thing.
-- ---------------------------------------------------------------------------------------------------------
INSERT OR IGNORE INTO crm2_activities (id, tenant, lead_id, type, content, meta, actor, created)
SELECT
  'mig-e-' || e.id,
  e.tenant,
  'mig-' || e.lead_id,
  CASE e.kind
    WHEN 'call' THEN 'CALL'
    WHEN 'replied' THEN 'CALL'
    WHEN 'stage' THEN 'STAGE'
    WHEN 'assigned' THEN 'ASSIGN'
    WHEN 'claimed' THEN 'ASSIGN'
    ELSE 'SYSTEM'
  END,
  CASE e.kind
    WHEN 'call' THEN 'Cuộc gọi'
    WHEN 'replied' THEN 'Đã trả lời khách'
    WHEN 'stage' THEN 'Chuyển giai đoạn'
    WHEN 'assigned' THEN 'Giao cho nhân viên'
    WHEN 'claimed' THEN 'Nhân viên nhận lead'
    WHEN 'queued' THEN 'Vào hàng chờ'
    WHEN 'overdue' THEN 'Quá hạn gọi'
    WHEN 'notify_gap' THEN 'Chưa gửi được thông báo'
    WHEN 'link_sent' THEN 'Đã gửi link đặt lịch'
    WHEN 'booked' THEN 'Đã đặt lịch'
    WHEN 'profile' THEN 'Cập nhật hồ sơ'
    ELSE e.kind
  END
  || CASE
       WHEN json_valid(e.detail) AND e.kind IN ('call', 'replied') AND json_extract(e.detail, '$.result') IS NOT NULL THEN
         ': ' || CASE json_extract(e.detail, '$.result')
           WHEN 'answered' THEN 'đã nghe máy, đã tư vấn'
           WHEN 'need_more' THEN 'có nhu cầu, cần tư vấn tiếp'
           WHEN 'thinking' THEN 'khách cần suy nghĩ thêm'
           WHEN 'trial' THEN 'hẹn đến trải nghiệm'
           WHEN 'trial_moved' THEN 'khách dời lịch trải nghiệm'
           WHEN 'trial_done' THEN 'đã gặp khách, đã trải nghiệm'
           WHEN 'callback' THEN 'khách hẹn gọi lại'
           WHEN 'no_answer' THEN 'không nghe máy'
           WHEN 'busy' THEN 'máy bận'
           WHEN 'wrong_number' THEN 'sai số'
           WHEN 'no_need' THEN 'không có nhu cầu'
           ELSE json_extract(e.detail, '$.result')
         END
       WHEN json_valid(e.detail) AND e.kind = 'stage'
            AND json_extract(e.detail, '$.from') IS NOT NULL AND json_extract(e.detail, '$.to') IS NOT NULL THEN
         ': ' || CASE json_extract(e.detail, '$.from')
           WHEN 'new' THEN 'Mới' WHEN 'contacted' THEN 'Đã liên hệ' WHEN 'qualified' THEN 'Có nhu cầu'
           WHEN 'trial' THEN 'Hẹn trải nghiệm' WHEN 'visited' THEN 'Đã trải nghiệm' WHEN 'deposit' THEN 'Giữ chỗ, đặt cọc'
           WHEN 'won' THEN 'Chốt dịch vụ' WHEN 'lost' THEN 'Không thành' ELSE json_extract(e.detail, '$.from')
         END || ' → ' || CASE json_extract(e.detail, '$.to')
           WHEN 'new' THEN 'Mới' WHEN 'contacted' THEN 'Đã liên hệ' WHEN 'qualified' THEN 'Có nhu cầu'
           WHEN 'trial' THEN 'Hẹn trải nghiệm' WHEN 'visited' THEN 'Đã trải nghiệm' WHEN 'deposit' THEN 'Giữ chỗ, đặt cọc'
           WHEN 'won' THEN 'Chốt dịch vụ' WHEN 'lost' THEN 'Không thành' ELSE json_extract(e.detail, '$.to')
         END
       ELSE ''
     END
  || ' (CRM cũ)',
  json_object('legacy', 'event', 'kind', e.kind, 'detail', CASE WHEN json_valid(e.detail) THEN json(e.detail) ELSE e.detail END),
  COALESCE(e.actor, ''),
  e.created
FROM crm_lead_events e
WHERE e.kind NOT IN ('received', 'contact')
  AND EXISTS (SELECT 1 FROM crm2_leads n WHERE n.tenant = e.tenant AND n.id = 'mig-' || e.lead_id);

-- ---------------------------------------------------------------------------------------------------------
-- 4. One line per lead saying where it came from
-- ---------------------------------------------------------------------------------------------------------
INSERT OR IGNORE INTO crm2_activities (id, tenant, lead_id, type, content, meta, actor, created)
SELECT
  'mig-s-' || l.id,
  l.tenant,
  'mig-' || l.id,
  'SYSTEM',
  'Nhập từ CRM cũ (Chăm sóc KH). Mã cũ: ' || l.id,
  json_object('legacy', 'lead', 'oldId', l.id, 'oldStatus', l.status, 'oldStage', l.stage),
  'Hệ thống',
  l.updated
FROM crm_leads l
WHERE EXISTS (SELECT 1 FROM crm2_leads n WHERE n.tenant = l.tenant AND n.id = 'mig-' || l.id);
