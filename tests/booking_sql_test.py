"""Exercise the actual parameterized SQLite statements used by the D1 route."""
import sqlite3, pathlib, re, unittest, tempfile, concurrent.futures
ROOT=pathlib.Path(__file__).resolve().parents[1]
SOURCE=(ROOT/'lib/server/club-service.ts').read_text()
SQL=re.search(r'prepare\(\s*"(INSERT INTO bookings.*?)",?\s*\)',SOURCE).group(1)
SETTINGS=re.search(r'prepare\(\s*"(INSERT INTO settings.*?)",?\s*\)',SOURCE).group(1)
UPDATE=re.search(r"prepare\(\s*['\"](UPDATE bookings SET status=\?,segments=.*?)['\"],?\s*\)",SOURCE).group(1)
DDL=(ROOT/'drizzle/0000_amazing_dreadnoughts.sql').read_text().replace('--> statement-breakpoint','')
def insert(conn,id,tenant='t1',room='line-1',start=1000000,end=2000000,status='booked',now=0):
 return conn.execute(SQL,(id,tenant,room,'Test user','0900000000','gdr',1,start,end,status,'{}',now,tenant,room,end,start,tenant,room,start,now+300000)).rowcount
class BookingSQL(unittest.TestCase):
 def setUp(self):
  self.c=sqlite3.connect(':memory:');self.c.executescript(DDL)
 def test_overlap_rejected(self):
  self.assertEqual(insert(self.c,'a'),1);self.assertEqual(insert(self.c,'b',start=1500000),0)
 def test_adjacent_allowed_after_cleaning(self):
  self.assertEqual(insert(self.c,'a'),1);self.assertEqual(insert(self.c,'b',start=2000000,end=3000000),1)
 def test_tenant_isolation(self):
  insert(self.c,'a');self.assertEqual(insert(self.c,'b',tenant='t2'),1)
 def test_other_room_allowed(self):
  insert(self.c,'a');self.assertEqual(insert(self.c,'b',room='line-2'),1)
 def test_cancelled_does_not_block(self):
  insert(self.c,'a');self.c.execute("UPDATE bookings SET status='cancelled' WHERE id='a'");self.assertEqual(insert(self.c,'b'),1)
 def test_paid_cleaning_still_blocks(self):
  insert(self.c,'a');self.c.execute("UPDATE bookings SET status='paid' WHERE id='a'");self.assertEqual(insert(self.c,'b',start=1500000),0)
 def test_active_overrun_blocks_immediate_booking(self):
  insert(self.c,'a',start=1,end=500,status='playing');self.assertEqual(insert(self.c,'b',start=1200000,end=1500000,now=1100000),0)
 def test_active_does_not_block_tomorrow(self):
  insert(self.c,'a',start=1,end=500,status='playing');self.assertEqual(insert(self.c,'b',start=90000000,end=92000000,now=1100000),1)
 def test_transition_guard_prevents_repeat_payment(self):
  insert(self.c,'a',status='finished');values=('paid','[]',None,1500000,250000,'cash',1500000,1800000,'t1','a','finished',None)
  self.assertEqual(self.c.execute(UPDATE,values).rowcount,1);self.assertEqual(self.c.execute(UPDATE,values).rowcount,0)
 def test_settings_revision_prevents_lost_update(self):
  self.assertEqual(self.c.execute(SETTINGS,('t1','{"pricingRevision":"v2"}','v01-upgrade')).rowcount,1)
  self.assertEqual(self.c.execute(SETTINGS,('t1','{"pricingRevision":"stale"}','v01-upgrade')).rowcount,0)
  self.assertEqual(self.c.execute(SETTINGS,('t1','{"pricingRevision":"v3"}','v2')).rowcount,1)
 def test_legacy_settings_upgrade_is_guarded(self):
  self.c.execute('INSERT INTO settings VALUES (?,?)',('t1','{"name":"Golf3D"}'))
  self.assertEqual(self.c.execute(SETTINGS,('t1','{"pricingRevision":"new"}','v01-upgrade')).rowcount,1)
 def test_settings_of_other_tenant_are_not_overwritten(self):
  self.c.execute('INSERT INTO settings VALUES (?,?)',('t1','{"pricingRevision":"first"}'))
  self.c.execute(SETTINGS,('t2','{"pricingRevision":"second"}','v01-upgrade'))
  self.assertEqual(self.c.execute('SELECT value FROM settings WHERE tenant="t1"').fetchone()[0],'{"pricingRevision":"first"}')
 def test_concurrent_booking_one_winner(self):
  with tempfile.TemporaryDirectory() as d:
   path=pathlib.Path(d)/'db.sqlite';con=sqlite3.connect(path);con.executescript(DDL);con.close()
   def run(i):
    c=sqlite3.connect(path,timeout=5)
    try:
     count=insert(c,str(i));c.commit();return count
    finally:c.close()
   with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:self.assertEqual(sum(pool.map(run,range(8))),1)
if __name__=='__main__':unittest.main(verbosity=2)
