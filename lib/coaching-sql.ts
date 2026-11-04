// Coaches and lessons. Tenant scope, overlap prevention and the status machine are enforced by the
// triggers in migration 0007; these are single atomic statements.
export const CREATE_COACH_SQL = `INSERT INTO coaches(id,tenant,user_id,name,phone,active,created) VALUES (?,?,?,?,?,?,?)`;
export const UPDATE_COACH_SQL = `UPDATE coaches SET name=?,phone=?,user_id=?,active=? WHERE tenant=? AND id=?`;
export const CREATE_LESSON_SQL = `INSERT INTO lessons(id,tenant,coach_id,customer_id,customer_name,phone,start,minutes,room,status,price,note,coach_note,actor,request_id,created) VALUES (?,?,?,?,?,?,?,?,?,'scheduled',?,?,'',?,?,?)`;
export const RESCHEDULE_LESSON_SQL = `UPDATE lessons SET coach_id=?,start=?,minutes=?,note=? WHERE tenant=? AND id=? AND status='scheduled'`;
export const SET_LESSON_STATUS_SQL = `UPDATE lessons SET status=?,coach_note=CASE WHEN ?<>'' THEN ? ELSE coach_note END WHERE tenant=? AND id=? AND status='scheduled'`;
export const NOTE_LESSON_SQL = `UPDATE lessons SET coach_note=? WHERE tenant=? AND id=?`;
export const LIST_COACHES_SQL = `SELECT id,user_id,name,phone,active FROM coaches WHERE tenant=? ORDER BY active DESC,name LIMIT 200`;
export const LIST_LESSONS_SQL = `SELECT l.id,l.coach_id,c.name AS coach_name,l.customer_id,l.customer_name,l.phone,l.start,l.minutes,l.room,l.status,l.price,l.note,l.coach_note FROM lessons l JOIN coaches c ON c.id=l.coach_id AND c.tenant=l.tenant WHERE l.tenant=? AND l.start>=? AND l.start<? AND (?='' OR l.coach_id=?) ORDER BY l.start LIMIT 300`;
