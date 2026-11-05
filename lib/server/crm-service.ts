import { db, loadConfig, type ServiceResult } from './common';
import {
  CRM_RULES,
  crmSettings,
  renderTemplate,
  segmentsOf,
  type CrmInput,
  type CrmSettings,
  type CrmTask,
} from '../crm';
import {
  CRM_ENSURE_CUSTOMERS_SQL,
  CRM_WELCOME_SQL,
  CRM_THANKS_SQL,
  CRM_COMEBACK_SQL,
  CRM_PKG_EXPIRING_SQL,
  CRM_PKG_LOW_SQL,
  CRM_POINTS_SQL,
  crmBirthdaySql,
  CRM_TASKS_SQL,
  CRM_CUSTOMERS_SQL,
  CRM_CUSTOMER_SQL,
  CRM_INSERT_TASK_SQL,
  CRM_CLOSE_TASK_SQL,
  CRM_SNOOZE_TASK_SQL,
  CRM_CLAIM_TASK_SQL,
  CRM_INSERT_INTERACTION_SQL,
  CRM_SET_BIRTHDAY_SQL,
} from '../crm-sql';
import { CUSTOMER_PACKAGES_SQL } from '../package-sql';
import { KIND_LABELS, POINTS_PER_FREE_ROUND, UNLIMITED, type GrantKind } from '../member';

type R = ServiceResult;
const reply = (body: Record<string, unknown>, status = 200): R => ({ status, body });
const error = (message: string, status = 400): R => reply({ error: message }, status);
const DAY = 86_400_000;
const VN = 7 * 3_600_000;

const ERRORS: [string, string, number][] = [
  ['INVALID_BIRTHDAY', 'Ngày sinh không hợp lệ', 400],
  ['CUSTOMER_NOT_FOUND', 'Không tìm thấy khách hàng', 404],
  ['INVALID_INTERACTION', 'Nội dung ghi chú không hợp lệ', 400],
  ['INVALID_TASK', 'Việc chăm sóc không hợp lệ', 400],
];
function explain(e: unknown): R {
  const message = e instanceof Error ? e.message : String(e);
  for (const [needle, text, status] of ERRORS)
    if (message.includes(needle)) return error(text, status);
  console.error('crm operation', e);
  return error('Chưa xác minh được kết quả. Tải lại trước khi thử tiếp.', 500);
}

export async function crmSettingsOf(tenant: string): Promise<CrmSettings> {
  return crmSettings((await loadConfig(tenant)).crm);
}

/** Runs the automatic flows: customer records from paid bookings, then one task per event. Idempotent. */
export async function generateTasks(tenant: string, now = Date.now()) {
  const d = db();
  const s = await crmSettingsOf(tenant);
  const stmts = [d.prepare(CRM_ENSURE_CUSTOMERS_SQL).bind(now, tenant)];
  const on = (id: keyof CrmSettings['rules']) => s.rules[id].enabled;
  if (on('welcome'))
    stmts.push(d.prepare(CRM_WELCOME_SQL).bind(s.rules.welcome.value, now, tenant, now - 14 * DAY));
  if (on('thanks'))
    stmts.push(
      d
        .prepare(CRM_THANKS_SQL)
        .bind(s.rules.thanks.value, now, tenant, now - 3 * DAY, now - 7 * DAY),
    );
  if (on('comeback'))
    stmts.push(
      d
        .prepare(CRM_COMEBACK_SQL)
        .bind(now, now, now, tenant, now - s.rules.comeback.value * DAY, now - 365 * DAY),
    );
  if (on('pkg_expiring'))
    stmts.push(
      d
        .prepare(CRM_PKG_EXPIRING_SQL)
        .bind(now, now, tenant, now, now + s.rules.pkg_expiring.value * DAY),
    );
  if (on('pkg_low'))
    stmts.push(d.prepare(CRM_PKG_LOW_SQL).bind(now, now, tenant, now, s.rules.pkg_low.value || 2));
  if (on('birthday')) {
    const lead = s.rules.birthday.value;
    const days = Array.from({ length: lead + 1 }, (_, i) =>
      new Date(now + VN + i * DAY).toISOString().slice(5, 10),
    );
    const year = new Date(now + VN).toISOString().slice(0, 4);
    stmts.push(d.prepare(crmBirthdaySql(days.length)).bind(year, now, now, tenant, ...days));
  }
  if (on('points'))
    stmts.push(
      d
        .prepare(CRM_POINTS_SQL)
        .bind(POINTS_PER_FREE_ROUND, now, now, tenant, POINTS_PER_FREE_ROUND),
    );
  await d.batch(stmts);
}

const unitsText = (balances: { kind: GrantKind; remaining: number }[] | undefined) =>
  (balances ?? [])
    .map((b) =>
      b.remaining >= UNLIMITED
        ? 'không giới hạn'
        : `${b.remaining} ${KIND_LABELS[b.kind]?.toLowerCase() ?? b.kind}`,
    )
    .join(', ');

/** The message staff send for a task: the flow's template filled with the customer's details. */
export function messageFor(
  task: { rule: string; data: string; name: string },
  settings: CrmSettings,
  club: string,
) {
  const data = JSON.parse(task.data || '{}') as Record<string, unknown>;
  const template =
    (settings.templates as Record<string, string>)[task.rule] ??
    'Chào {ten}, {cs} xin liên hệ anh/chị. Anh/chị cần hỗ trợ gì cứ nhắn em nhé!';
  return renderTemplate(template, {
    ten: String(data.ten ?? task.name),
    cs: club,
    ngay: String(data.ngay ?? ''),
    goi: String(data.goi ?? ''),
    han: String(data.han ?? ''),
    con: unitsText(data.balances as never),
    so_ngay: String(data.so_ngay ?? ''),
    diem: String(data.diem ?? ''),
    dich_vu: String(data.dich_vu ?? ''),
  });
}

export async function loadTasks(tenant: string, userId = ''): Promise<R> {
  try {
    const now = Date.now();
    await generateTasks(tenant, now);
    const [config, rows] = await Promise.all([
      loadConfig(tenant),
      db()
        .prepare(CRM_TASKS_SQL)
        .bind(tenant, now - 14 * DAY)
        .all<CrmTask & { data: string }>(),
    ]);
    const settings = crmSettings(config.crm);
    const tasks = rows.results.map(({ data, ...t }) => ({
      ...t,
      message: messageFor({ rule: t.rule, data, name: t.name }, settings, config.name),
      mine: !!userId && t.assignee === userId,
    }));
    const open = tasks.filter((t) => t.status === 'open');
    const startToday = Math.floor((now + VN) / DAY) * DAY - VN;
    const endToday = startToday + DAY;
    return reply({
      tasks,
      counts: {
        overdue: open.filter((t) => t.due < startToday).length,
        today: open.filter((t) => t.due >= startToday && t.due < endToday).length,
        upcoming: open.filter((t) => t.due >= endToday).length,
        doneWeek: tasks.filter((t) => t.status === 'done' && (t.handled_at ?? 0) > now - 7 * DAY)
          .length,
      },
      settings,
    });
  } catch (e) {
    console.error('crm tasks', e);
    return error('Chưa tải được việc chăm sóc. Kiểm tra migration 0016.', 503);
  }
}

type CustomerRow = {
  id: string;
  name: string;
  phone: string;
  birthday: string;
  created: number;
  visits: number;
  last_visit: number | null;
  spend: number;
  recent_visits: number;
  points: number;
  open_tasks: number;
  account: number | null;
};

export async function loadCustomers(tenant: string, query: string): Promise<R> {
  try {
    const now = Date.now();
    const q = query.trim().replace(/[%_]/g, '');
    const settings = await crmSettingsOf(tenant);
    const rows = (
      await db()
        .prepare(CRM_CUSTOMERS_SQL)
        .bind(now - 90 * DAY, tenant, q, `%${q.replace(/[ \-().]/g, '')}%`, `%${q}%`)
        .all<CustomerRow>()
    ).results;
    return reply({
      customers: rows.map((c) => ({
        ...c,
        segments: segmentsOf(
          {
            created: c.created,
            visits: c.visits,
            lastVisit: c.last_visit,
            spend: c.spend,
            recentVisits: c.recent_visits,
          },
          settings,
          now,
        ),
      })),
    });
  } catch (e) {
    console.error('crm customers', e);
    return error('Chưa tải được khách hàng', 503);
  }
}

export async function loadCustomer(tenant: string, id: string): Promise<R> {
  try {
    const d = db();
    const now = Date.now();
    const row = await d
      .prepare(CRM_CUSTOMER_SQL)
      .bind(now - 90 * DAY, tenant, id)
      .first<CustomerRow>();
    if (!row) return error('Không tìm thấy khách hàng', 404);
    const customer = {
      ...row,
      segments: segmentsOf(
        {
          created: row.created,
          visits: row.visits,
          lastVisit: row.last_visit,
          spend: row.spend,
          recentVisits: row.recent_visits,
        },
        await crmSettingsOf(tenant),
        now,
      ),
    };
    const config = await loadConfig(tenant);
    const settings = crmSettings(config.crm);
    const [visits, packages, interactions, tasks] = await Promise.all([
      d
        .prepare(
          `SELECT b.id,b.service,b.room,b.finished,b.amount,b.payment FROM crm_visits v JOIN bookings b ON b.id=v.booking_id WHERE v.tenant=? AND v.customer_id=? ORDER BY b.finished DESC LIMIT 20`,
        )
        .bind(tenant, id)
        .all(),
      d.prepare(CUSTOMER_PACKAGES_SQL).bind(tenant, id).all(),
      d
        .prepare(
          `SELECT i.id,i.channel,i.content,i.created,i.task_id,u.name AS actor_name FROM crm_interactions i LEFT JOIN users u ON u.id=i.actor WHERE i.tenant=? AND i.customer_id=? ORDER BY i.created DESC LIMIT 60`,
        )
        .bind(tenant, id)
        .all(),
      d
        .prepare(CRM_TASKS_SQL.replace('WHERE t.tenant=?', 'WHERE t.customer_id=? AND t.tenant=?'))
        .bind(id, tenant, 0)
        .all<CrmTask & { data: string }>(),
    ]);
    return reply({
      customer,
      visits: visits.results,
      packages: packages.results,
      interactions: interactions.results,
      tasks: tasks.results.slice(0, 30).map(({ data, ...t }) => ({
        ...t,
        message: messageFor({ rule: t.rule, data, name: t.name }, settings, config.name),
      })),
      now,
    });
  } catch (e) {
    console.error('crm customer', e);
    return error('Chưa tải được hồ sơ khách', 503);
  }
}

export async function applyCrm(tenant: string, actor: string, input: CrmInput): Promise<R> {
  const d = db();
  const now = Date.now();
  try {
    if (input.action === 'settings-save') {
      const known = new Set<string>(CRM_RULES.map((r) => r.id));
      for (const [id, r] of Object.entries(input.settings.rules)) {
        const rule = CRM_RULES.find((x) => x.id === id);
        if (!known.has(id) || !rule) return error('Quy trình không hợp lệ');
        if (rule.param && (r.value < rule.param.min || r.value > rule.param.max))
          return error(
            `${rule.name}: ${rule.param.label} cần từ ${rule.param.min} đến ${rule.param.max}`,
          );
      }
      for (const id of Object.keys(input.settings.templates))
        if (!known.has(id)) return error('Mẫu tin nhắn không hợp lệ');
      const r = await d
        .prepare("UPDATE settings SET value=json_set(value,'$.crm',json(?)) WHERE tenant=?")
        .bind(JSON.stringify(input.settings), tenant)
        .run();
      return r.meta.changes ? reply({ ok: true }) : error('Chưa có cấu hình cơ sở', 409);
    }
    if (input.action === 'birthday-set') {
      const r = await d
        .prepare(CRM_SET_BIRTHDAY_SQL)
        .bind(input.birthday, tenant, input.customerId)
        .run();
      return r.meta.changes ? reply({ ok: true }) : error('Không tìm thấy khách hàng', 404);
    }
    if (input.action === 'note-add') {
      await d
        .prepare(CRM_INSERT_INTERACTION_SQL)
        .bind(
          crypto.randomUUID(),
          tenant,
          input.customerId,
          null,
          input.channel,
          input.content,
          actor,
          now,
        )
        .run();
      return reply({ ok: true });
    }
    if (input.action === 'task-create') {
      await d
        .prepare(CRM_INSERT_TASK_SQL)
        .bind(
          crypto.randomUUID(),
          tenant,
          input.customerId,
          'manual',
          'manual:' + crypto.randomUUID(),
          input.title,
          '{}',
          now + input.days * DAY,
          now,
        )
        .run();
      return reply({ ok: true });
    }
    // The remaining actions act on an open task of this club.
    const task = await d
      .prepare(
        "SELECT id,customer_id,title FROM crm_tasks WHERE tenant=? AND id=? AND status='open'",
      )
      .bind(tenant, input.id)
      .first<{ id: string; customer_id: string; title: string }>();
    if (!task) return error('Việc này đã được xử lý hoặc không tồn tại', 409);
    if (input.action === 'task-claim') {
      await d.prepare(CRM_CLAIM_TASK_SQL).bind(actor, tenant, task.id).run();
      return reply({ ok: true });
    }
    if (input.action === 'task-snooze') {
      await d
        .prepare(CRM_SNOOZE_TASK_SQL)
        .bind(now + input.days * DAY, tenant, task.id)
        .run();
      return reply({ ok: true });
    }
    if (input.action === 'task-skip') {
      await d
        .prepare(CRM_CLOSE_TASK_SQL)
        .bind('skipped', null, input.reason, actor, now, tenant, task.id)
        .run();
      return reply({ ok: true });
    }
    // task-done: close the task and log the contact in the same batch.
    await d.batch([
      d
        .prepare(CRM_CLOSE_TASK_SQL)
        .bind('done', input.channel, input.note, actor, now, tenant, task.id),
      d
        .prepare(CRM_INSERT_INTERACTION_SQL)
        .bind(
          crypto.randomUUID(),
          tenant,
          task.customer_id,
          task.id,
          input.channel,
          input.note || task.title,
          actor,
          now,
        ),
    ]);
    return reply({ ok: true });
  } catch (e) {
    return explain(e);
  }
}
