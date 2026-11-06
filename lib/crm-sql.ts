// CRM SQL. Task generation is set-based and idempotent (INSERT OR IGNORE on the unique task key), so
// it can run on every visit to the CRM screen without creating duplicates.
const PHONE = `replace(replace(replace(replace(replace(b.phone,' ',''),'-',''),'(',''),')',''),'.','')`;
const NORM = `CASE WHEN ${PHONE} LIKE '+84%' THEN '0'||substr(${PHONE},4) WHEN ${PHONE} LIKE '84%' AND length(${PHONE})>=11 THEN '0'||substr(${PHONE},3) ELSE ${PHONE} END`;
const DAY_MS = 86_400_000;
const VN = 25200; // seconds, UTC+7
const dateOf = (col: string) => `strftime('%d/%m/%Y',(${col}+${VN * 1000})/1000,'unixepoch')`;
const TASK_COLUMNS =
  'id,tenant,customer_id,rule,key,title,data,due,status,assignee,channel,note,created,handled_by,handled_at';
const ID = `lower(hex(randomblob(16)))`;

/** Creates a customer record for every paid booking whose phone number has none yet. Binds: now, tenant. */
export const CRM_ENSURE_CUSTOMERS_SQL = `INSERT OR IGNORE INTO customers(id,tenant,name,phone,note,birthday,created)
 SELECT ${ID}, b.tenant, MAX(trim(b.customer)), ${NORM}, 'Tự tạo từ phiếu thanh toán', '', ?
 FROM bookings b WHERE b.tenant=? AND b.status='paid' AND length(trim(b.customer)) BETWEEN 2 AND 100
 AND ${NORM} GLOB '0[0-9]*' AND ${NORM} NOT GLOB '*[^0-9]*' AND length(${NORM}) BETWEEN 9 AND 11
 GROUP BY ${NORM}`;

/** Binds: delayHours, now, tenant, createdAfter. */
export const CRM_WELCOME_SQL = `INSERT OR IGNORE INTO crm_tasks(${TASK_COLUMNS})
 SELECT ${ID}, c.tenant, c.id, 'welcome', 'welcome:'||c.id, 'Chào mừng khách mới', json_object('ten',c.name), c.created+?*3600000, 'open', NULL, NULL, '', ?, NULL, NULL
 FROM customers c WHERE c.tenant=? AND c.created>?`;

/** The latest paid round of each customer. Binds: delayHours, now, tenant, finishedAfter, cooldownAfter. */
export const CRM_THANKS_SQL = `INSERT OR IGNORE INTO crm_tasks(${TASK_COLUMNS})
 SELECT ${ID}, c.tenant, c.id, 'thanks', 'thanks:'||v.booking_id, 'Cảm ơn sau buổi chơi',
  json_object('ten',c.name,'ngay',${dateOf('v.finished')},'dich_vu',v.service), v.finished+?*3600000, 'open', NULL, NULL, '', ?, NULL, NULL
 FROM crm_visits v JOIN customers c ON c.id=v.customer_id AND c.tenant=v.tenant
 WHERE v.tenant=? AND v.finished>?
 AND v.finished=(SELECT MAX(v2.finished) FROM crm_visits v2 WHERE v2.tenant=v.tenant AND v2.customer_id=v.customer_id)
 AND NOT EXISTS(SELECT 1 FROM crm_tasks t WHERE t.tenant=c.tenant AND t.customer_id=c.id AND t.rule='thanks' AND t.created>?)`;

/** Customers whose last paid round is older than N days (once per lapse). Binds: now (days gone), now (due), now, tenant, lastBefore, lastAfter. */
export const CRM_COMEBACK_SQL = `INSERT OR IGNORE INTO crm_tasks(${TASK_COLUMNS})
 SELECT ${ID}, c.tenant, c.id, 'comeback', 'comeback:'||c.id||':'||lv.last, 'Mời khách quay lại',
  json_object('ten',c.name,'ngay_cuoi',${dateOf('lv.last')},'so_ngay',CAST((?-lv.last)/${DAY_MS} AS INTEGER)), ?, 'open', NULL, NULL, '', ?, NULL, NULL
 FROM customers c JOIN (SELECT tenant,customer_id,MAX(finished) AS last FROM crm_visits GROUP BY tenant,customer_id) lv ON lv.tenant=c.tenant AND lv.customer_id=c.id
 WHERE c.tenant=? AND lv.last<? AND lv.last>?`;

const BALANCES = `json((SELECT json_group_array(json_object('kind',b.kind,'remaining',b.remaining)) FROM package_balances b WHERE b.tenant=cp.tenant AND b.package_id=cp.id AND b.remaining>0))`;
/** Packages with something left that expire within N days. Binds: now, now, tenant, now, expiresBefore. */
export const CRM_PKG_EXPIRING_SQL = `INSERT OR IGNORE INTO crm_tasks(${TASK_COLUMNS})
 SELECT ${ID}, c.tenant, c.id, 'pkg_expiring', 'pkgexp:'||cp.id, 'Gói sắp hết hạn',
  json_object('ten',c.name,'goi',cp.name,'han',${dateOf('cp.expires')},'balances',${BALANCES}), ?, 'open', NULL, NULL, '', ?, NULL, NULL
 FROM customer_packages cp JOIN customers c ON c.id=cp.customer_id AND c.tenant=cp.tenant
 WHERE cp.tenant=? AND cp.expires>=? AND cp.expires<=?
 AND EXISTS(SELECT 1 FROM package_balances b WHERE b.tenant=cp.tenant AND b.package_id=cp.id AND b.remaining>0)`;

/** Packages down to their last hours or round. Binds: now, now, tenant, now, hours. */
export const CRM_PKG_LOW_SQL = `INSERT OR IGNORE INTO crm_tasks(${TASK_COLUMNS})
 SELECT ${ID}, c.tenant, c.id, 'pkg_low', 'pkglow:'||cp.id, 'Gói sắp hết giờ',
  json_object('ten',c.name,'goi',cp.name,'han',${dateOf('cp.expires')},'balances',${BALANCES}), ?, 'open', NULL, NULL, '', ?, NULL, NULL
 FROM customer_packages cp JOIN customers c ON c.id=cp.customer_id AND c.tenant=cp.tenant
 WHERE cp.tenant=? AND cp.expires>=?
 AND EXISTS(SELECT 1 FROM package_balances b WHERE b.tenant=cp.tenant AND b.package_id=cp.id AND b.remaining>=1 AND ((b.kind='gdr' AND b.remaining<=?) OR (b.kind<>'gdr' AND b.remaining<=1)))`;

/** Customers whose birthday (MM-DD) is among the next days. Binds: year, due, now, tenant, then one 'MM-DD' per day. */
export const crmBirthdaySql = (days: number) => `INSERT OR IGNORE INTO crm_tasks(${TASK_COLUMNS})
 SELECT ${ID}, c.tenant, c.id, 'birthday', 'bday:'||c.id||':'||?, 'Chúc mừng sinh nhật',
  json_object('ten',c.name,'ngay',substr(c.birthday,-5)), ?, 'open', NULL, NULL, '', ?, NULL, NULL
 FROM customers c WHERE c.tenant=? AND c.birthday<>'' AND substr(c.birthday,-5) IN (${Array.from({ length: days }, () => '?').join(',')})`;

/** Customers with enough points for a free round. Binds: perRound, due, now, tenant, perRound. */
export const CRM_POINTS_SQL = `INSERT OR IGNORE INTO crm_tasks(${TASK_COLUMNS})
 SELECT ${ID}, c.tenant, c.id, 'points', 'points:'||c.id||':'||CAST(p.points/? AS INTEGER), 'Đủ điểm đổi lượt miễn phí',
  json_object('ten',c.name,'diem',p.points), ?, 'open', NULL, NULL, '', ?, NULL, NULL
 FROM customer_points p JOIN customers c ON c.id=p.customer_id AND c.tenant=p.tenant
 WHERE p.tenant=? AND p.points>=?`;

/** Open and recent tasks with the customer and the people involved. Binds: tenant, closedAfter. */
export const CRM_TASKS_SQL = `SELECT t.id,t.customer_id,c.name,c.phone,t.rule,t.title,t.data,t.due,t.status,t.assignee,ua.name AS assignee_name,t.channel,t.note,t.created,t.handled_at,uh.name AS handled_name,c.marketing_consent AS consent
 FROM crm_tasks t JOIN customers c ON c.id=t.customer_id AND c.tenant=t.tenant
 LEFT JOIN users ua ON ua.id=t.assignee LEFT JOIN users uh ON uh.id=t.handled_by
 WHERE t.tenant=? AND (t.status='open' OR t.handled_at>?) ORDER BY t.status='open' DESC, t.due ASC LIMIT 400`;

/** Customers with their visit statistics. Binds: now-90d, tenant, search, like, like. */
export const CRM_CUSTOMERS_SQL = `SELECT c.id,c.name,c.phone,c.birthday,c.email,c.zalo_id,c.marketing_consent,c.created,
  (SELECT COUNT(*) FROM crm_visits v WHERE v.tenant=c.tenant AND v.customer_id=c.id) AS visits,
  (SELECT MAX(v.finished) FROM crm_visits v WHERE v.tenant=c.tenant AND v.customer_id=c.id) AS last_visit,
  (SELECT COALESCE(SUM(v.amount),0) FROM crm_visits v WHERE v.tenant=c.tenant AND v.customer_id=c.id) AS spend,
  (SELECT COUNT(*) FROM crm_visits v WHERE v.tenant=c.tenant AND v.customer_id=c.id AND v.finished>?) AS recent_visits,
  COALESCE((SELECT p.points FROM customer_points p WHERE p.tenant=c.tenant AND p.customer_id=c.id),0) AS points,
  (SELECT COUNT(*) FROM crm_tasks t WHERE t.tenant=c.tenant AND t.customer_id=c.id AND t.status='open') AS open_tasks,
  (SELECT a.verified FROM member_accounts a WHERE a.tenant=c.tenant AND a.customer_id=c.id) AS account
 FROM customers c WHERE c.tenant=? AND (?='' OR c.phone LIKE ? OR c.name LIKE ?) ORDER BY c.created DESC LIMIT 300`;

/** One customer with the same statistics. Binds: now-90d, tenant, id. */
export const CRM_CUSTOMER_SQL = CRM_CUSTOMERS_SQL.replace(
  "WHERE c.tenant=? AND (?='' OR c.phone LIKE ? OR c.name LIKE ?) ORDER BY c.created DESC LIMIT 300",
  'WHERE c.tenant=? AND c.id=?',
);
export const CRM_INSERT_TASK_SQL = `INSERT INTO crm_tasks(${TASK_COLUMNS}) VALUES (?,?,?,?,?,?,?,?,'open',NULL,NULL,'',?,NULL,NULL)`;
export const CRM_CLOSE_TASK_SQL = `UPDATE crm_tasks SET status=?,channel=?,note=?,handled_by=?,handled_at=? WHERE tenant=? AND id=? AND status='open'`;
export const CRM_SNOOZE_TASK_SQL = `UPDATE crm_tasks SET due=? WHERE tenant=? AND id=? AND status='open'`;
export const CRM_CLAIM_TASK_SQL = `UPDATE crm_tasks SET assignee=? WHERE tenant=? AND id=? AND status='open'`;
export const CRM_INSERT_INTERACTION_SQL = `INSERT INTO crm_interactions(id,tenant,customer_id,task_id,channel,content,actor,created) VALUES (?,?,?,?,?,?,?,?)`;
export const CRM_SET_BIRTHDAY_SQL = `UPDATE customers SET birthday=? WHERE tenant=? AND id=?`;
