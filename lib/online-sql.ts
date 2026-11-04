// Online booking requests. Validation, rate limits and the state machine live in the triggers of
// migration 0006; these statements are single, atomic updates.
export const INSERT_REQUEST_SQL = `INSERT INTO booking_requests(id,tenant,code_hash,name,phone,service,vip,people,start,minutes,note,quote,status,ip_hash,created) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'pending',?,?)`;
export const CLAIM_REQUEST_SQL = `UPDATE booking_requests SET handled_by=?,handled_at=? WHERE tenant=? AND id=? AND status='pending' AND handled_by IS NULL`;
export const RELEASE_REQUEST_SQL = `UPDATE booking_requests SET handled_by=NULL,handled_at=NULL WHERE tenant=? AND id=? AND status='pending'`;
export const CONFIRM_REQUEST_SQL = `UPDATE booking_requests SET status='confirmed',room=?,booking_id=?,handled_by=?,handled_at=? WHERE tenant=? AND id=? AND status='pending' AND handled_by=?`;
export const REJECT_REQUEST_SQL = `UPDATE booking_requests SET status='rejected',reason=?,handled_by=?,handled_at=? WHERE tenant=? AND id=? AND status='pending' AND handled_by IS NULL`;
export const CANCEL_REQUEST_SQL = `UPDATE booking_requests SET status='cancelled' WHERE code_hash=? AND status='pending' AND handled_by IS NULL`;
export const REQUEST_BY_CODE_SQL = `SELECT status,service,vip,people,start,minutes,reason,quote,created FROM booking_requests WHERE code_hash=?`;
export const LIST_REQUESTS_SQL = `SELECT id,name,phone,service,vip,people,start,minutes,note,quote,status,room,booking_id,reason,handled_by,handled_at,created FROM booking_requests WHERE tenant=? ORDER BY CASE WHEN status='pending' THEN 0 ELSE 1 END,CASE WHEN status='pending' THEN start END,created DESC LIMIT 100`;
