import { db, loadConfig } from '../../../lib/server/common';
import { POINTS_PER_FREE_ROUND } from '../../../lib/member';
import { careMessage, MARKETING_RULES, careSettings, CARE_CHANNELS } from '../core/care';
import { isManager } from '../core/access';
import { DAY, fail, getSettings, reply, type Ctx, type Result } from './store';

// Care tasks are created for customers (members, walk-ins), not leads. Every statement is set based and
// idempotent: INSERT OR IGNORE on the task key, so it can run on every cron tick without duplicates.
// Keys keep the format the old "Chăm sóc KH" used, so tasks imported from it are never created twice.
const VN = 7 * 3_600_000;
const ID = `lower(hex(randomblob(16)))`;
const PHONE = `replace(replace(replace(replace(replace(b.phone,' ',''),'-',''),'(',''),')',''),'.','')`;
const NORM = `CASE WHEN ${PHONE} LIKE '+84%' THEN '0'||substr(${PHONE},4) WHEN ${PHONE} LIKE '84%' AND length(${PHONE})>=11 THEN '0'||substr(${PHONE},3) ELSE ${PHONE} END`;
const dateOf = (col: string) => `strftime('%d/%m/%Y',(${col}+${VN})/1000,'unixepoch')`;
const COLS =
  'id,tenant,lead_id,title,type,due_at,done_at,assignee,created_by,reminded_at,ukey,created,customer_id,rule,data,channel,note,outcome';
const ENSURE_CUSTOMERS = `INSERT OR IGNORE INTO customers(id,tenant,name,phone,note,birthday,created)
 SELECT ${ID}, b.tenant, MAX(trim(b.customer)), ${NORM}, 'Tự tạo từ phiếu thanh toán', '', ?
 FROM bookings b WHERE b.tenant=? AND b.status='paid' AND length(trim(b.customer)) BETWEEN 2 AND 100
 AND ${NORM} GLOB '0[0-9]*' AND ${NORM} NOT GLOB '*[^0-9]*' AND length(${NORM}) BETWEEN 9 AND 11
 GROUP BY ${NORM}`;

const BALANCES = `json((SELECT json_group_array(json_object('kind',b.kind,'remaining',b.remaining)) FROM package_balances b WHERE b.tenant=cp.tenant AND b.package_id=cp.id AND b.remaining>0))`;

/** One INSERT per rule. `due` is the due-time expression, `rest` the FROM/WHERE part. */
const insert = (
  rule: string,
  title: string,
  ukey: string,
  data: string,
  due: string,
  rest: string,
) =>
  `INSERT OR IGNORE INTO crm2_tasks(${COLS}) SELECT ${ID}, c.tenant, NULL, '${title}', 'CALL', ${due}, NULL, NULL, 'Hệ thống', NULL, ${ukey}, ?, c.id, '${rule}', ${data}, '', '', '' ${rest}`;

/** Creates the care tasks that are due; returns how many were created now. */
export async function generateCareTasks(tenant: string, now: number) {
  const d = db();
  const s = (await getSettings(tenant)).care;
  const on = (id: keyof typeof s.rules) => s.rules[id].enabled;
  const stmts = [d.prepare(ENSURE_CUSTOMERS).bind(now, tenant)];
  if (on('welcome'))
    stmts.push(
      d
        .prepare(
          insert(
            'welcome',
            'Chào mừng khách mới',
            `'welcome:'||c.id`,
            `json_object('ten',c.name)`,
            `c.created+?*3600000`,
            `FROM customers c WHERE c.tenant=? AND c.created>?`,
          ),
        )
        .bind(s.rules.welcome.value, now, tenant, now - 14 * DAY),
    );
  if (on('thanks'))
    stmts.push(
      d
        .prepare(
          insert(
            'thanks',
            'Cảm ơn sau buổi chơi',
            `'thanks:'||v.booking_id`,
            `json_object('ten',c.name,'ngay',${dateOf('v.finished')},'dich_vu',v.service)`,
            `v.finished+?*3600000`,
            `FROM crm_visits v JOIN customers c ON c.id=v.customer_id AND c.tenant=v.tenant
 WHERE v.tenant=? AND v.finished>?
 AND v.finished=(SELECT MAX(v2.finished) FROM crm_visits v2 WHERE v2.tenant=v.tenant AND v2.customer_id=v.customer_id)
 AND NOT EXISTS(SELECT 1 FROM crm2_tasks t WHERE t.tenant=c.tenant AND t.customer_id=c.id AND t.rule='thanks' AND t.created>?)`,
          ),
        )
        .bind(s.rules.thanks.value, now, tenant, now - 3 * DAY, now - 7 * DAY),
    );
  if (on('comeback'))
    stmts.push(
      d
        .prepare(
          insert(
            'comeback',
            'Mời khách quay lại',
            `'comeback:'||c.id||':'||lv.last`,
            `json_object('ten',c.name,'ngay_cuoi',${dateOf('lv.last')},'so_ngay',CAST((?-lv.last)/${DAY} AS INTEGER))`,
            `?`,
            `FROM customers c JOIN (SELECT tenant,customer_id,MAX(finished) AS last FROM crm_visits GROUP BY tenant,customer_id) lv ON lv.tenant=c.tenant AND lv.customer_id=c.id
 WHERE c.tenant=? AND lv.last<? AND lv.last>?`,
          ),
        )
        .bind(now, now, now, tenant, now - s.rules.comeback.value * DAY, now - 365 * DAY),
    );
  if (on('pkg_expiring'))
    stmts.push(
      d
        .prepare(
          insert(
            'pkg_expiring',
            'Gói sắp hết hạn',
            `'pkgexp:'||cp.id`,
            `json_object('ten',c.name,'goi',cp.name,'han',${dateOf('cp.expires')},'balances',${BALANCES})`,
            `?`,
            `FROM customer_packages cp JOIN customers c ON c.id=cp.customer_id AND c.tenant=cp.tenant
 WHERE cp.tenant=? AND cp.expires>=? AND cp.expires<=?
 AND EXISTS(SELECT 1 FROM package_balances b WHERE b.tenant=cp.tenant AND b.package_id=cp.id AND b.remaining>0)`,
          ),
        )
        .bind(now, now, tenant, now, now + s.rules.pkg_expiring.value * DAY),
    );
  if (on('pkg_low'))
    stmts.push(
      d
        .prepare(
          insert(
            'pkg_low',
            'Gói sắp hết giờ',
            `'pkglow:'||cp.id`,
            `json_object('ten',c.name,'goi',cp.name,'han',${dateOf('cp.expires')},'balances',${BALANCES})`,
            `?`,
            `FROM customer_packages cp JOIN customers c ON c.id=cp.customer_id AND c.tenant=cp.tenant
 WHERE cp.tenant=? AND cp.expires>=?
 AND EXISTS(SELECT 1 FROM package_balances b WHERE b.tenant=cp.tenant AND b.package_id=cp.id AND b.remaining>=1 AND ((b.kind='gdr' AND b.remaining<=?) OR (b.kind<>'gdr' AND b.remaining<=1)))`,
          ),
        )
        .bind(now, now, tenant, now, s.rules.pkg_low.value || 2),
    );
  if (on('birthday')) {
    const lead = s.rules.birthday.value;
    const days = Array.from({ length: lead + 1 }, (_, i) =>
      new Date(now + VN + i * DAY).toISOString().slice(5, 10),
    );
    const year = new Date(now + VN).toISOString().slice(0, 4);
    stmts.push(
      d
        .prepare(
          insert(
            'birthday',
            'Chúc mừng sinh nhật',
            `'bday:'||c.id||':'||?`,
            `json_object('ten',c.name,'ngay',substr(c.birthday,-5))`,
            `?`,
            `FROM customers c WHERE c.tenant=? AND c.birthday<>'' AND NOT EXISTS(SELECT 1 FROM crm2_customer_profiles p WHERE p.tenant=c.tenant AND p.phone_norm=c.phone AND p.birthday<>'') AND substr(c.birthday,-5) IN (${days.map(() => '?').join(',')})`,
          ),
        )
        .bind(now, year, now, tenant, ...days),
    );
  }
  if (on('points'))
    stmts.push(
      d
        .prepare(
          insert(
            'points',
            'Đủ điểm đổi lượt miễn phí',
            `'points:'||c.id||':'||CAST(p.points/? AS INTEGER)`,
            `json_object('ten',c.name,'diem',p.points)`,
            `?`,
            `FROM customer_points p JOIN customers c ON c.id=p.customer_id AND c.tenant=p.tenant
 WHERE p.tenant=? AND p.points>=?`,
          ),
        )
        .bind(now, POINTS_PER_FREE_ROUND, now, tenant, POINTS_PER_FREE_ROUND),
    );

  // 1. Nhắc lịch đặt sân (trước giờ chơi)
  if (on('booking_reminder')) {
    const hours = s.rules.booking_reminder.value || 2;
    stmts.push(
      d
        .prepare(
          `INSERT OR IGNORE INTO crm2_tasks(${COLS})
           SELECT ${ID}, b.tenant, NULL, 'Nhắc lịch đặt sân: '||upper(b.room)||' ('||strftime('%H:%M',(b.start+${VN})/1000,'unixepoch')||')', 'CALL', ?, NULL, NULL, 'Hệ thống', NULL, 'bookrem:'||b.id, ?, c.id, 'booking_reminder', json_object('ten',c.name,'phong',upper(b.room),'dich_vu',b.service,'gio',strftime('%H:%M',(b.start+${VN})/1000,'unixepoch'),'ngay',strftime('%d/%m/%Y',(b.start+${VN})/1000,'unixepoch')), '', '', ''
           FROM bookings b JOIN customers c ON c.tenant=b.tenant AND c.phone=${NORM}
           WHERE b.tenant=? AND b.status IN ('booked','confirmed')
           AND b.start > ? AND b.start <= ?`,
        )
        .bind(now, now, tenant, now, now + hours * 3_600_000),
    );
  }

  // 2. Cảnh báo số dư ví thấp (<= 200.000đ)
  if (on('wallet_low')) {
    const threshold = s.rules.wallet_low.value || 200_000;
    const week = new Date(now + VN).toISOString().slice(0, 10);
    stmts.push(
      d
        .prepare(
          `INSERT OR IGNORE INTO crm2_tasks(${COLS})
           SELECT ${ID}, c.tenant, NULL, 'Cảnh báo số dư ví thấp (<= 200.000đ)', 'CALL', ?, NULL, NULL, 'Hệ thống', NULL, 'wlow:'||c.id||':'||?, ?, c.id, 'wallet_low', json_object('ten',c.name,'so_du',wb.balance), '', '', ''
           FROM wallet_balances wb JOIN customers c ON c.tenant=wb.tenant AND c.id=wb.customer_id
           WHERE wb.tenant=? AND wb.balance > 0 AND wb.balance <= ? AND COALESCE(c.marketing_consent,1) <> 0`,
        )
        .bind(now, week, now, tenant, threshold),
    );
  }

  // 3. Nhắc gia hạn thẻ trước 7 / 3 / 1 ngày
  if (on('pkg_expiring_steps')) {
    const m7 = 7 * DAY;
    const m3 = 3 * DAY;
    const m1 = 1 * DAY;
    stmts.push(
      d
        .prepare(
          `INSERT OR IGNORE INTO crm2_tasks(${COLS})
           SELECT ${ID}, cp.tenant, NULL, 'Nhắc gia hạn thẻ: còn 7 ngày', 'CALL', ?, NULL, NULL, 'Hệ thống', NULL, 'pkg_exp7:'||cp.id, ?, c.id, 'pkg_expiring_steps', json_object('ten',c.name,'goi',cp.name,'so_ngay',7,'han',${dateOf('cp.expires')}), '', '', ''
           FROM customer_packages cp JOIN customers c ON c.id=cp.customer_id AND c.tenant=cp.tenant
           WHERE cp.tenant=? AND cp.expires >= ? AND cp.expires <= ?`,
        )
        .bind(now, now, tenant, now, now + m7),
    );
    stmts.push(
      d
        .prepare(
          `INSERT OR IGNORE INTO crm2_tasks(${COLS})
           SELECT ${ID}, cp.tenant, NULL, 'Nhắc gia hạn thẻ: còn 3 ngày', 'CALL', ?, NULL, NULL, 'Hệ thống', NULL, 'pkg_exp3:'||cp.id, ?, c.id, 'pkg_expiring_steps', json_object('ten',c.name,'goi',cp.name,'so_ngay',3,'han',${dateOf('cp.expires')}), '', '', ''
           FROM customer_packages cp JOIN customers c ON c.id=cp.customer_id AND c.tenant=cp.tenant
           WHERE cp.tenant=? AND cp.expires >= ? AND cp.expires <= ?`,
        )
        .bind(now, now, tenant, now, now + m3),
    );
    stmts.push(
      d
        .prepare(
          `INSERT OR IGNORE INTO crm2_tasks(${COLS})
           SELECT ${ID}, cp.tenant, NULL, 'Khẩn cấp: Thẻ hội viên hết hạn trong 24h', 'CALL', ?, NULL, NULL, 'Hệ thống', NULL, 'pkg_exp1:'||cp.id, ?, c.id, 'pkg_expiring_steps', json_object('ten',c.name,'goi',cp.name,'so_ngay',1,'han',${dateOf('cp.expires')}), '', '', ''
           FROM customer_packages cp JOIN customers c ON c.id=cp.customer_id AND c.tenant=cp.tenant
           WHERE cp.tenant=? AND cp.expires >= ? AND cp.expires <= ?`,
        )
        .bind(now, now, tenant, now, now + m1),
    );
  }

  // 4. Chăm sóc khách không quay lại 7 / 14 / 30 ngày (tôn trọng opt-out)
  if (on('retention_stages')) {
    const week = new Date(now + VN).toISOString().slice(0, 10);
    const month = new Date(now + VN).toISOString().slice(0, 7);
    stmts.push(
      d
        .prepare(
          `INSERT OR IGNORE INTO crm2_tasks(${COLS})
           SELECT ${ID}, c.tenant, NULL, 'Chăm sóc khách 7 ngày chưa quay lại', 'CALL', ?, NULL, NULL, 'Hệ thống', NULL, 'ret7:'||c.id||':'||?, ?, c.id, 'retention_stages', json_object('ten',c.name,'so_ngay',7,'ngay_cuoi',${dateOf('lv.last')}), '', '', ''
           FROM customers c JOIN (SELECT tenant,customer_id,MAX(finished) AS last FROM crm_visits GROUP BY tenant,customer_id) lv ON lv.tenant=c.tenant AND lv.customer_id=c.id
           WHERE c.tenant=? AND lv.last <= ? AND lv.last > ? AND COALESCE(c.marketing_consent,1) <> 0`,
        )
        .bind(now, week, now, tenant, now - 7 * DAY, now - 14 * DAY),
    );
    stmts.push(
      d
        .prepare(
          `INSERT OR IGNORE INTO crm2_tasks(${COLS})
           SELECT ${ID}, c.tenant, NULL, 'Chăm sóc khách 14 ngày chưa quay lại', 'CALL', ?, NULL, NULL, 'Hệ thống', NULL, 'ret14:'||c.id||':'||?, ?, c.id, 'retention_stages', json_object('ten',c.name,'so_ngay',14,'ngay_cuoi',${dateOf('lv.last')}), '', '', ''
           FROM customers c JOIN (SELECT tenant,customer_id,MAX(finished) AS last FROM crm_visits GROUP BY tenant,customer_id) lv ON lv.tenant=c.tenant AND lv.customer_id=c.id
           WHERE c.tenant=? AND lv.last <= ? AND lv.last > ? AND COALESCE(c.marketing_consent,1) <> 0`,
        )
        .bind(now, week, now, tenant, now - 14 * DAY, now - 21 * DAY),
    );
    stmts.push(
      d
        .prepare(
          `INSERT OR IGNORE INTO crm2_tasks(${COLS})
           SELECT ${ID}, c.tenant, NULL, 'Kéo khách ngủ đông (30 ngày chưa chơi lại)', 'CALL', ?, NULL, NULL, 'Hệ thống', NULL, 'ret30:'||c.id||':'||?, ?, c.id, 'retention_stages', json_object('ten',c.name,'so_ngay',30,'ngay_cuoi',${dateOf('lv.last')}), '', '', ''
           FROM customers c JOIN (SELECT tenant,customer_id,MAX(finished) AS last FROM crm_visits GROUP BY tenant,customer_id) lv ON lv.tenant=c.tenant AND lv.customer_id=c.id
           WHERE c.tenant=? AND lv.last <= ? AND lv.last > ? AND COALESCE(c.marketing_consent,1) <> 0`,
        )
        .bind(now, month, now, tenant, now - 30 * DAY, now - 60 * DAY),
    );
  }
  const results = await d.batch(stmts);
  // The first statement only makes sure customers exist; the rest are the care tasks created now.
  return results.slice(1).reduce((n, r) => n + (r.meta.changes ?? 0), 0);
}

type CareRow = {
  id: string;
  customerId: string;
  name: string;
  phone: string;
  consent: number;
  rule: string;
  title: string;
  data: string;
  dueAt: number | null;
  doneAt: number | null;
  assignee: string | null;
  assigneeName: string | null;
  channel: string;
  note: string;
  outcome: string;
};

/** Care tasks: open ones and those closed in the last 3 days, with the message staff would send. */
export async function listCareTasks(c: Ctx, scope: 'mine' | 'all', showDone: boolean) {
  const mgr = isManager(c.role) && scope === 'all';
  const rows = (
    await db()
      .prepare(
        `SELECT t.id,t.customer_id AS customerId,cu.name,cu.phone,cu.marketing_consent AS consent,t.rule,t.title,t.data,
           t.due_at AS dueAt,t.done_at AS doneAt,t.assignee,ua.name AS assigneeName,t.channel,t.note,t.outcome
         FROM crm2_tasks t JOIN customers cu ON cu.id=t.customer_id AND cu.tenant=t.tenant
         LEFT JOIN users ua ON ua.id=t.assignee
         WHERE t.tenant=? AND t.customer_id IS NOT NULL AND (?=1 OR t.assignee=? OR t.assignee IS NULL)
           AND (t.done_at IS NULL OR (?=1 AND t.done_at>?))
         ORDER BY t.done_at IS NOT NULL, t.due_at LIMIT 400`,
      )
      .bind(c.tenant, mgr ? 1 : 0, c.userId, showDone ? 1 : 0, c.now - 3 * DAY)
      .all<CareRow>()
  ).results;
  const settings = careSettings((await getSettings(c.tenant)).care);
  const club = (await loadConfig(c.tenant)).name;
  return rows.map((r) => ({
    ...r,
    message: r.doneAt ? '' : careMessage(r, settings, club),
    marketing: MARKETING_RULES.has(r.rule),
  }));
}

async function careTask(c: Ctx, id: string) {
  return db()
    .prepare(
      'SELECT id,customer_id AS customerId,assignee,done_at AS doneAt FROM crm2_tasks WHERE tenant=? AND id=? AND customer_id IS NOT NULL',
    )
    .bind(c.tenant, id)
    .first<{ id: string; customerId: string; assignee: string | null; doneAt: number | null }>();
}
const mayWork = (c: Ctx, t: { assignee: string | null }) =>
  isManager(c.role) || t.assignee == null || t.assignee === c.userId;

/** Staff report how they reached the customer; the result is kept on the task and in the customer's notes. */
export async function finishCareTask(
  c: Ctx,
  o: { id: string; channel: string; note: string },
): Promise<Result> {
  const t = await careTask(c, o.id);
  if (!t) return fail('Không tìm thấy việc', 404);
  if (!mayWork(c, t)) return fail('Việc của nhân viên khác', 403);
  if (t.doneAt) return fail('Việc này đã xử lý', 409);
  if (!(CARE_CHANNELS as readonly string[]).includes(o.channel)) return fail('Kênh không hợp lệ');
  const note = o.note.trim().slice(0, 600);
  const by = await actorName(c.userId);
  const d = db();
  await d.batch([
    d
      .prepare(
        "UPDATE crm2_tasks SET done_at=?,channel=?,note=?,outcome='done',assignee=COALESCE(assignee,?) WHERE tenant=? AND id=? AND done_at IS NULL",
      )
      .bind(c.now, o.channel, note, c.userId, c.tenant, o.id),
    d
      .prepare(
        'INSERT INTO crm2_customer_notes(id,tenant,customer_id,task_id,channel,content,actor,created) VALUES (?,?,?,?,?,?,?,?)',
      )
      .bind(
        crypto.randomUUID(),
        c.tenant,
        t.customerId,
        o.id,
        o.channel,
        note || 'Đã liên hệ',
        by,
        c.now,
      ),
  ]);
  return reply({ ok: true });
}

export async function skipCareTask(c: Ctx, o: { id: string; reason: string }): Promise<Result> {
  const t = await careTask(c, o.id);
  if (!t) return fail('Không tìm thấy việc', 404);
  if (!mayWork(c, t)) return fail('Việc của nhân viên khác', 403);
  const r = await db()
    .prepare(
      "UPDATE crm2_tasks SET done_at=?,note=?,outcome='skipped' WHERE tenant=? AND id=? AND done_at IS NULL",
    )
    .bind(c.now, o.reason.trim().slice(0, 600), c.tenant, o.id)
    .run();
  return r.meta.changes ? reply({ ok: true }) : fail('Việc này đã xử lý', 409);
}

export async function snoozeCareTask(c: Ctx, o: { id: string; days: number }): Promise<Result> {
  const t = await careTask(c, o.id);
  if (!t) return fail('Không tìm thấy việc', 404);
  if (!mayWork(c, t)) return fail('Việc của nhân viên khác', 403);
  const r = await db()
    .prepare(
      'UPDATE crm2_tasks SET due_at=?,reminded_at=NULL WHERE tenant=? AND id=? AND done_at IS NULL',
    )
    .bind(c.now + o.days * DAY, c.tenant, o.id)
    .run();
  return r.meta.changes ? reply({ ok: true }) : fail('Việc này đã xử lý', 409);
}

export async function claimCareTask(c: Ctx, id: string): Promise<Result> {
  const r = await db()
    .prepare(
      'UPDATE crm2_tasks SET assignee=? WHERE tenant=? AND id=? AND customer_id IS NOT NULL AND done_at IS NULL AND assignee IS NULL',
    )
    .bind(c.userId, c.tenant, id)
    .run();
  return r.meta.changes ? reply({ ok: true }) : fail('Việc đã có người nhận', 409);
}

async function actorName(userId: string) {
  const u = await db()
    .prepare('SELECT name FROM users WHERE id=?')
    .bind(userId)
    .first<{ name: string }>();
  return u?.name ?? '';
}
