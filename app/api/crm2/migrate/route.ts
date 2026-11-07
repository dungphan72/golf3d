import { crmRoute } from '../../../../modules/crm/server/http';
import { fail, reply } from '../../../../modules/crm/server/store';
import { db } from '../../../../lib/server/common';
export const dynamic = 'force-dynamic';

/**
 * Endpoint for managing CRM data migration from legacy "Chăm sóc KH" to CRM2.
 * Only managers and owners can view or trigger migration.
 */
const route = crmRoute({ read: 'crm.manage', write: 'crm.manage' }, async (c, req, body) => {
  const d = db();

  if (req.method === 'GET') {
    const [legacyLeads, migratedLeads, legacyTasks, migratedTasks, legacyInteractions, migratedNotes] = await Promise.all([
      d.prepare('SELECT COUNT(*) AS n FROM crm_leads WHERE tenant=?').bind(c.tenant).first<{ n: number }>(),
      d.prepare("SELECT COUNT(*) AS n FROM crm2_leads WHERE tenant=? AND id LIKE 'mig-%'").bind(c.tenant).first<{ n: number }>(),
      d.prepare('SELECT COUNT(*) AS n FROM crm_tasks WHERE tenant=?').bind(c.tenant).first<{ n: number }>(),
      d.prepare("SELECT COUNT(*) AS n FROM crm2_tasks WHERE tenant=? AND id LIKE 'mig-%'").bind(c.tenant).first<{ n: number }>(),
      d.prepare('SELECT COUNT(*) AS n FROM crm_interactions WHERE tenant=?').bind(c.tenant).first<{ n: number }>(),
      d.prepare("SELECT COUNT(*) AS n FROM crm2_customer_notes WHERE tenant=? AND id LIKE 'mig-%'").bind(c.tenant).first<{ n: number }>(),
    ]);

    return reply({
      legacyLeads: legacyLeads?.n ?? 0,
      migratedLeads: migratedLeads?.n ?? 0,
      legacyTasks: legacyTasks?.n ?? 0,
      migratedTasks: migratedTasks?.n ?? 0,
      legacyInteractions: legacyInteractions?.n ?? 0,
      migratedNotes: migratedNotes?.n ?? 0,
    });
  }

  const action = (body as { action?: string }).action;

  if (action === 'migrate') {
    // 1. Migrate leads from crm_leads -> crm2_leads
    const leadsRes = await d.prepare(`
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
        x.phone,
        x.email,
        trim(
          x.message
          || CASE WHEN x.note <> '' THEN char(10) || x.note ELSE '' END
          || CASE WHEN x.next_note <> '' THEN char(10) || 'Việc tiếp theo: ' || x.next_note ELSE '' END,
          char(10) || ' '
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
             ELSE strftime('%Y-%m-%d', (x.preferred_start + 25200000) / 1000, 'unixepoch') END,
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
        CASE WHEN x.status = 'queued' THEN NULL ELSE x.assignee END,
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
        WHERE l.tenant = ?
      ) x
    `).bind(c.tenant).run();

    // 2. Contacts -> Activities
    await d.prepare(`
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
      WHERE c.tenant = ? AND EXISTS (SELECT 1 FROM crm2_leads n WHERE n.tenant = c.tenant AND n.id = 'mig-' || c.lead_id)
    `).bind(c.tenant).run();

    // 3. Lead Events -> Activities
    await d.prepare(`
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
        END || ' (CRM cũ)',
        json_object('legacy', 'event', 'kind', e.kind, 'detail', CASE WHEN json_valid(e.detail) THEN json(e.detail) ELSE e.detail END),
        COALESCE(e.actor, ''),
        e.created
      FROM crm_lead_events e
      WHERE e.tenant = ? AND e.kind NOT IN ('received', 'contact')
        AND EXISTS (SELECT 1 FROM crm2_leads n WHERE n.tenant = e.tenant AND n.id = 'mig-' || e.lead_id)
    `).bind(c.tenant).run();

    // 4. Activity system mark
    await d.prepare(`
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
      WHERE l.tenant = ? AND EXISTS (SELECT 1 FROM crm2_leads n WHERE n.tenant = l.tenant AND n.id = 'mig-' || l.id)
    `).bind(c.tenant).run();

    // 5. Tasks from crm_tasks -> crm2_tasks
    await d.prepare(`
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
      WHERE t.tenant = ? AND t.customer_id IS NOT NULL
    `).bind(c.tenant).run();

    // 6. Interactions from crm_interactions -> crm2_customer_notes
    await d.prepare(`
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
      FROM crm_interactions i
      WHERE i.tenant = ?
    `).bind(c.tenant).run();

    return reply({ ok: true, message: 'Đã hoàn tất chuyển dữ liệu sang CRM mới an toàn và chống trùng.' });
  }

  if (action === 'rollback') {
    await d.prepare("DELETE FROM crm2_activities WHERE tenant=? AND id LIKE 'mig-%'").bind(c.tenant).run();
    await d.prepare("DELETE FROM crm2_leads WHERE tenant=? AND id LIKE 'mig-%'").bind(c.tenant).run();
    await d.prepare("DELETE FROM crm2_tasks WHERE tenant=? AND id LIKE 'mig-%'").bind(c.tenant).run();
    await d.prepare("DELETE FROM crm2_customer_notes WHERE tenant=? AND id LIKE 'mig-%'").bind(c.tenant).run();
    return reply({ ok: true, message: 'Đã hoàn tác và xóa các dữ liệu nhập tạm (mã mig-*) thành công.' });
  }

  return fail('Thao tác không hợp lệ');
});

export const GET = route.GET;
export const POST = route.POST;
