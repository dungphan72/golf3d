import sqlite3,unittest,json,tempfile,concurrent.futures
from fnb_sql_test import connection,DDL,booking,item,line,order,ready,transition
class StockSQL(unittest.TestCase):
 def setUp(self):
  self.c=connection();self.c.executescript(DDL);booking(self.c,amount=None,status='playing');item(self.c)
 def configure(self,c=None):
  (c or self.c).execute("INSERT INTO stock_items VALUES ('p1','t1',2,10)")
 def move(self,qty=5,kind='receipt',key='manual1',c=None,tenant='t1'):
  c=c or self.c;c.execute('INSERT INTO stock_movements VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',(key,tenant,'p1','Nước uống','ly',kind,qty,-qty if kind=='adjust_out' else qty,key,'signature',None,'Nhập hàng mới','owner',10))
 def tracked(self,c=None,id='o1',qty=2):
  l=line(qty=qty,version=1);l['stockTracked']=True;order(c or self.c,id=id,lines=[l])
 def balance(self):return tuple(self.c.execute('SELECT on_hand,reserved,on_hand-reserved FROM stock_status').fetchone())
 def test_reserve_then_serve_once(self):
  self.configure();self.move();self.tracked();self.assertEqual(self.balance(),(5,2,3));ready(self.c);transition(self.c,'served');self.assertEqual(self.balance(),(3,0,3));self.assertEqual(transition(self.c,'served',version=2),0);self.assertEqual(self.balance(),(3,0,3))
 def test_cancel_releases_reservation_without_stock_loss(self):
  self.configure();self.move();self.tracked();transition(self.c,'cancelled',reason='Khách đổi ý');self.assertEqual(self.balance(),(5,0,5))
 def test_cannot_order_more_than_available(self):
  self.configure();self.move(3);self.tracked()
  with self.assertRaises(sqlite3.IntegrityError):self.tracked(id='o2')
  self.assertEqual(self.balance(),(3,2,1))
 def test_adjustment_cannot_consume_reserved_stock(self):
  self.configure();self.move(3);self.tracked()
  with self.assertRaises(sqlite3.IntegrityError):self.move(2,'adjust_out','out')
  self.move(1,'adjust_out','out');self.assertEqual(self.balance(),(2,2,0))
 def test_duplicate_manual_key_never_increases_stock(self):
  self.configure();self.move()
  with self.assertRaises(sqlite3.IntegrityError):self.move()
  self.assertEqual(self.balance(),(5,0,5))
 def test_cross_tenant_movement_rejected(self):
  self.configure()
  with self.assertRaises(sqlite3.IntegrityError):self.move(tenant='t2')
 def test_no_enabling_over_existing_pending_orders(self):
  order(self.c)
  with self.assertRaises(sqlite3.IntegrityError):self.configure()
  transition(self.c,'cancelled',reason='Khách đổi ý');self.configure()
 def test_unit_locked_and_ledger_immutable(self):
  self.configure();self.move()
  for sql in ["UPDATE menu_items SET unit='chai',version=version+1",'DELETE FROM stock_items','DELETE FROM stock_movements','UPDATE stock_movements SET delta=100']:
   with self.assertRaises(sqlite3.IntegrityError):self.c.execute(sql)
 def test_untracked_snapshot_cannot_bypass_reservation(self):
  self.configure();self.move()
  with self.assertRaises(sqlite3.IntegrityError):order(self.c,lines=[line(version=1)])
 def test_stock_audit_failure_rolls_back_order_bill_and_stock(self):
  self.configure();self.move();self.tracked();ready(self.c)
  self.c.executescript("CREATE TRIGGER fail_stock BEFORE INSERT ON audit WHEN NEW.action='stock-sale' BEGIN SELECT RAISE(ABORT,'injected'); END;")
  with self.assertRaises(sqlite3.IntegrityError):transition(self.c,'served')
  self.assertEqual(self.balance(),(5,2,3));self.assertEqual(self.c.execute('SELECT food_total FROM bookings').fetchone()[0],0);self.assertEqual(self.c.execute('SELECT status FROM food_orders').fetchone()[0],'ready')
 def test_competing_orders_cannot_oversell(self):
  with tempfile.TemporaryDirectory() as d:
   path=d+'/db.sqlite';c=connection(path);c.executescript(DDL);booking(c,amount=None,status='playing');item(c);self.configure(c);self.move(1,c=c);c.commit();c.close()
   def reserve(id):
    db=connection(path)
    try:self.tracked(db,id,1);db.commit();return True
    except sqlite3.IntegrityError:db.rollback();return False
    finally:db.close()
   with concurrent.futures.ThreadPoolExecutor() as pool:results=list(pool.map(reserve,['o1','o2']))
   self.assertEqual(sum(results),1)
if __name__=='__main__':unittest.main(verbosity=2)
