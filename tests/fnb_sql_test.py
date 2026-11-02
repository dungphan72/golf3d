import sqlite3,pathlib,re,json,unittest,tempfile,concurrent.futures
from finance_sql_test import connection,DDL,opening,entry,booking
ROOT=pathlib.Path(__file__).resolve().parents[1]
SOURCE=(ROOT/'lib/fnb-sql.ts').read_text()
def sql(name):return re.search(r'export const '+name+r' = `([^`]+)`;',SOURCE).group(1)
ITEM=sql('CREATE_ITEM_SQL');EDIT=sql('UPDATE_ITEM_SQL');ORDER=sql('CREATE_ORDER_SQL');STATE=sql('TRANSITION_ORDER_SQL');FINISH=sql('FINISH_SESSION_SQL')
def item(c,id='p1',tenant='t1',price=50000):c.execute(ITEM,(id,tenant,'Nước uống','drink','ly',price,500,1000,1,1))
def line(id='p1',qty=2,price=50000,version=0):
 base=price*qty;fee=(base*500+5000)//10000;vat=((base+fee)*1000+5000)//10000
 return dict(itemId=id,name='Nước uống',category='drink',unit='ly',price=price,qty=qty,version=version,feeBps=500,vatBps=1000,subtotal=base,fee=fee,vat=vat,total=base+fee+vat)
def order(c,id='o1',tenant='t1',book='b1',lines=None,key=None,total=None):
 lines=[line()] if lines is None else lines
 sums={k:sum(l[k] for l in lines) for k in ('subtotal','fee','vat','total')}
 return c.execute(ORDER,(id,tenant,book,key or 'request-'+id,'fingerprint',json.dumps(lines),sums['subtotal'],sums['fee'],sums['vat'],sums['total'] if total is None else total,'Ít đá','owner',10,10)).rowcount
def transition(c,status,id='o1',version=None,reason=''):
 v=c.execute('SELECT version FROM food_orders WHERE id=?',(id,)).fetchone()[0] if version is None else version
 return c.execute(STATE,(status,reason,30,'t1',id,v)).rowcount
def ready(c,id='o1'):transition(c,'preparing',id);transition(c,'ready',id)
def finish(c,amount=100000):return c.execute(FINISH,('[]',20,amount,amount,amount,25,'t1','b1','playing',None)).rowcount
class FnbSQL(unittest.TestCase):
 def setUp(self):
  self.c=connection();self.c.executescript(DDL);booking(self.c,amount=None,status='playing');item(self.c)
 def test_new_orders_are_not_charged_until_served(self):
  order(self.c);self.assertEqual(self.c.execute('SELECT food_total FROM bookings').fetchone()[0],0)
  ready(self.c);self.assertEqual(self.c.execute('SELECT food_total FROM bookings').fetchone()[0],0)
  transition(self.c,'served');self.assertEqual(self.c.execute('SELECT food_total FROM bookings').fetchone()[0],115500)
 def test_serving_before_finish_is_added_exactly_once(self):
  order(self.c);ready(self.c);transition(self.c,'served');finish(self.c)
  b=self.c.execute('SELECT * FROM bookings').fetchone();self.assertEqual(b['golf_amount'],100000);self.assertEqual(b['amount'],215500)
  self.assertEqual(transition(self.c,'served',version=2),0)
  self.assertEqual(self.c.execute('SELECT amount FROM bookings').fetchone()[0],215500)
 def test_serving_after_finish_increases_total_without_retaxing_golf(self):
  order(self.c);ready(self.c);finish(self.c);transition(self.c,'served')
  b=self.c.execute('SELECT * FROM bookings').fetchone();self.assertEqual(b['amount'],215500);self.assertEqual(b['golf_amount'],100000)
 def test_pending_order_blocks_payment(self):
  order(self.c);finish(self.c);opening(self.c)
  with self.assertRaises(sqlite3.IntegrityError):entry(self.c,amount=100000)
  self.assertEqual(self.c.execute('SELECT COUNT(*) FROM finance_entries').fetchone()[0],0)
 def test_full_combined_bill_is_required_after_service(self):
  order(self.c);ready(self.c);finish(self.c);transition(self.c,'served');opening(self.c)
  with self.assertRaises(sqlite3.IntegrityError):entry(self.c,amount=100000)
  self.assertEqual(entry(self.c,amount=215500),1)
  self.assertEqual(self.c.execute('SELECT status FROM bookings').fetchone()[0],'paid')
 def test_cancelled_order_is_not_charged_and_requires_reason(self):
  order(self.c)
  with self.assertRaises(sqlite3.IntegrityError):transition(self.c,'cancelled')
  transition(self.c,'cancelled',reason='Khách đổi ý');finish(self.c);opening(self.c);entry(self.c)
  self.assertEqual(self.c.execute('SELECT food_total FROM bookings').fetchone()[0],0)
 def test_served_orders_cannot_be_cancelled_or_deleted(self):
  order(self.c);ready(self.c);transition(self.c,'served')
  with self.assertRaises(sqlite3.IntegrityError):transition(self.c,'cancelled',reason='Thử hủy lại')
  with self.assertRaises(sqlite3.IntegrityError):self.c.execute('DELETE FROM food_orders')
 def test_status_cannot_skip_preparation_steps(self):
  order(self.c)
  with self.assertRaises(sqlite3.IntegrityError):transition(self.c,'served')
 def test_order_snapshots_are_not_rewritten_by_menu_change(self):
  order(self.c);self.c.execute(EDIT,('Nước uống','drink','ly',60000,500,1000,1,'t1','p1',0));ready(self.c);transition(self.c,'served')
  self.assertEqual(self.c.execute('SELECT food_total FROM bookings').fetchone()[0],115500)
  with self.assertRaises(sqlite3.IntegrityError):order(self.c,'o2')
 def test_item_from_another_tenant_is_rejected(self):
  booking(self.c,'b2','t2',None,'playing')
  with self.assertRaises(sqlite3.IntegrityError):order(self.c,tenant='t2',book='b2')
 def test_foreign_booking_is_rejected(self):
  booking(self.c,'b2','t2',None,'playing')
  with self.assertRaises(sqlite3.IntegrityError):order(self.c,book='b2')
 def test_orders_require_active_session_and_active_product(self):
  finish(self.c)
  with self.assertRaises(sqlite3.IntegrityError):order(self.c)
  self.c.execute("UPDATE bookings SET status='playing' WHERE id='b1'")
  self.c.execute(EDIT,('Nước uống','drink','ly',50000,500,1000,0,'t1','p1',0))
  with self.assertRaises(sqlite3.IntegrityError):order(self.c)
 def test_tampered_total_and_duplicate_items_are_rejected(self):
  with self.assertRaises(sqlite3.IntegrityError):order(self.c,total=1)
  with self.assertRaises(sqlite3.IntegrityError):order(self.c,lines=[line(),line()])
 def test_snapshot_cannot_be_edited_in_place(self):
  order(self.c)
  with self.assertRaises(sqlite3.IntegrityError):self.c.execute("UPDATE food_orders SET total=1,version=1,status='preparing' WHERE id='o1'")
 def test_food_counter_cannot_be_edited_directly(self):
  with self.assertRaises(sqlite3.IntegrityError):self.c.execute('UPDATE bookings SET food_total=1')
 def test_duplicate_retry_key_does_not_add_an_order(self):
  order(self.c,key='same')
  with self.assertRaises(sqlite3.IntegrityError):order(self.c,'o2',key='same')
  self.assertEqual(self.c.execute('SELECT COUNT(*) FROM food_orders').fetchone()[0],1)
 def test_audit_failure_rolls_back_serving_and_bill(self):
  order(self.c);ready(self.c)
  self.c.executescript("CREATE TRIGGER reject_food_audit BEFORE INSERT ON audit WHEN NEW.action='Trạng thái món' AND json_extract(NEW.detail,'$.to')='served' BEGIN SELECT RAISE(ABORT,'INJECTED_FAILURE'); END;")
  with self.assertRaises(sqlite3.IntegrityError):transition(self.c,'served')
  self.assertEqual(self.c.execute('SELECT status FROM food_orders').fetchone()[0],'ready');self.assertEqual(self.c.execute('SELECT food_total FROM bookings').fetchone()[0],0)
 def test_concurrent_serve_has_one_charge(self):
  with tempfile.TemporaryDirectory() as d:
   path=pathlib.Path(d)/'db';c=connection(path);c.executescript(DDL);booking(c,amount=None,status='playing');item(c);order(c);ready(c);c.commit();c.close()
   def run(i):
    c=connection(path)
    try:r=transition(c,'served',version=2);c.commit();return r
    finally:c.close()
   with concurrent.futures.ThreadPoolExecutor(max_workers=8) as p:self.assertEqual(sum(p.map(run,range(8))),1)
   c=connection(path);self.assertEqual(c.execute('SELECT food_total FROM bookings').fetchone()[0],115500);c.close()
 def test_finishing_and_serving_race_preserves_combined_total(self):
  with tempfile.TemporaryDirectory() as d:
   path=pathlib.Path(d)/'db';c=connection(path);c.executescript(DDL);booking(c,amount=None,status='playing');item(c);order(c);ready(c);c.commit();c.close()
   def run(action):
    c=connection(path)
    try:r=finish(c) if action=='finish' else transition(c,'served',version=2);c.commit();return r
    finally:c.close()
   with concurrent.futures.ThreadPoolExecutor(max_workers=2) as p:self.assertEqual(sum(p.map(run,['finish','serve'])),2)
   c=connection(path);self.assertEqual(c.execute('SELECT amount FROM bookings').fetchone()[0],215500);c.close()
if __name__=='__main__':unittest.main(verbosity=2)
