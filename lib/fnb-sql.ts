export const CREATE_ITEM_SQL = `INSERT INTO menu_items(id,tenant,name,category,unit,price,fee_bps,vat_bps,active,version,created) VALUES (?,?,?,?,?,?,?,?,?,0,?)`;
export const UPDATE_ITEM_SQL = `UPDATE menu_items SET name=?,category=?,unit=?,price=?,fee_bps=?,vat_bps=?,active=?,version=version+1 WHERE tenant=? AND id=? AND version=?`;
export const CREATE_ORDER_SQL = `INSERT INTO food_orders(id,tenant,booking_id,request_id,request_data,items,subtotal,fee,vat,total,note,status,version,actor,created,updated,reason) VALUES (?,?,?,?,?,?,?,?,?,?,?,'new',0,?,?,?,'')`;
export const TRANSITION_ORDER_SQL = `UPDATE food_orders SET status=?,reason=?,version=version+1,updated=? WHERE tenant=? AND id=? AND version=?`;
export const FINISH_SESSION_SQL = `UPDATE bookings SET status='finished',segments=?,started=NULL,finished=?,golf_amount=?,amount=CASE WHEN ? IS NULL THEN NULL ELSE ?+food_total END,end=? WHERE tenant=? AND id=? AND status=? AND started IS ?`;
