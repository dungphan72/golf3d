"""Actual D1 SQL + all migrations in SQLite, including financial trigger atomicity."""
import sqlite3,pathlib,re,unittest,tempfile,concurrent.futures
ROOT=pathlib.Path(__file__).resolve().parents[1]
SOURCE=(ROOT/'lib/finance-sql.ts').read_text()
def sql(name):return re.search(r'export const '+name+r' = `([^`]+)`;',SOURCE).group(1)
DDL='\n'.join(p.read_text().replace('--> statement-breakpoint','') for p in sorted((ROOT/'drizzle').glob('*.sql')))
OPEN=sql('OPEN_SHIFT_SQL');ENTRY=sql('INSERT_ENTRY_SQL');CLOSE=sql('CLOSE_SHIFT_SQL');SUMMARY=sql('SHIFT_SUMMARY_SQL')
def connection(path=':memory:'):
 c=sqlite3.connect(path,timeout=5);c.row_factory=sqlite3.Row;c.execute('PRAGMA foreign_keys=ON');return c
def opening(c,id='s1',tenant='t1',amount=500000):return c.execute(OPEN,(id,tenant,'Ca test','owner',1,amount)).rowcount
def booking(c,id='b1',tenant='t1',amount=100000,status='finished'):
 c.execute("INSERT INTO bookings(id,tenant,room,customer,phone,service,people,start,end,status,segments,amount,price,created) VALUES (?,?,?,'Test','0900000000','gdr',1,0,1,?,'[]',?,'{}',0)",(id,tenant,'line-1',status,amount))
def entry(c,id='e1',tenant='t1',shift='s1',kind='payment',method='cash',amount=100000,book='b1',key=None):
 return c.execute(ENTRY,(id,tenant,shift,kind,method,amount,book,key or 'request-'+id,'Lý do test','owner',10)).rowcount
def closing(c,id='s1',tenant='t1',cash=None,transfer=None,card=None,note='',version=None):
 s=next(r for r in c.execute(SUMMARY,(tenant,)).fetchall() if r['id']==id)
 expected=s['opening_cash']+s['cash_received']+s['cash_in']-s['cash_out']
 return c.execute(CLOSE,('owner',100,cash if cash is not None else expected,transfer if transfer is not None else s['transfer_received'],card if card is not None else s['card_received'],expected,s['transfer_received'],s['card_received'],note,tenant,id,s['version'] if version is None else version)).rowcount
class FinanceSQL(unittest.TestCase):
 def setUp(self):self.c=connection();self.c.executescript(DDL)
 def test_only_one_open_shift_per_tenant(self):
  opening(self.c)
  with self.assertRaises(sqlite3.IntegrityError):opening(self.c,'s2')
  self.assertEqual(opening(self.c,'s3','t2'),1)
 def test_receipt_updates_booking_and_shift_atomically(self):
  opening(self.c);booking(self.c);entry(self.c)
  self.assertEqual(self.c.execute("SELECT status FROM bookings WHERE id='b1'").fetchone()[0],'paid')
  self.assertEqual(self.c.execute("SELECT version FROM shifts WHERE id='s1'").fetchone()[0],1)
  self.assertEqual(self.c.execute("SELECT COUNT(*) FROM audit WHERE action='Ghi sổ tiền'").fetchone()[0],1)
 def test_duplicate_payment_cannot_create_second_receipt(self):
  opening(self.c);booking(self.c);entry(self.c)
  with self.assertRaises(sqlite3.IntegrityError):entry(self.c,'e2')
  self.assertEqual(self.c.execute('SELECT COUNT(*) FROM finance_entries').fetchone()[0],1)
 def test_wrong_amount_and_unfinished_booking_cannot_be_paid(self):
  opening(self.c);booking(self.c)
  with self.assertRaises(sqlite3.IntegrityError):entry(self.c,amount=1)
  booking(self.c,'b2',status='playing')
  with self.assertRaises(sqlite3.IntegrityError):entry(self.c,'e2',book='b2')
 def test_tenant_cannot_charge_foreign_shift_or_booking(self):
  opening(self.c);opening(self.c,'s2','t2');booking(self.c);booking(self.c,'b2','t2')
  with self.assertRaises(sqlite3.IntegrityError):entry(self.c,tenant='t2',book='b2')
  with self.assertRaises(sqlite3.IntegrityError):entry(self.c,shift='s2',book='b2')
 def test_cash_expense_cannot_exceed_drawer(self):
  opening(self.c,amount=100000)
  with self.assertRaises(sqlite3.IntegrityError):entry(self.c,kind='cash_out',book=None,amount=100001)
  self.assertEqual(entry(self.c,kind='cash_out',book=None,amount=100000),1)
 def test_bank_and_card_receipts_do_not_increase_cash_drawer(self):
  opening(self.c,amount=0);booking(self.c);entry(self.c,method='transfer')
  with self.assertRaises(sqlite3.IntegrityError):entry(self.c,'out',kind='cash_out',book=None,amount=1)
  summary=self.c.execute(SUMMARY,('t1',)).fetchone();self.assertEqual(summary['transfer_received'],100000);self.assertEqual(summary['cash_received'],0)
 def test_close_captures_cash_and_all_method_totals(self):
  opening(self.c);booking(self.c);entry(self.c);entry(self.c,'in',kind='cash_in',book=None,amount=20000);entry(self.c,'out',kind='cash_out',book=None,amount=10000)
  self.assertEqual(closing(self.c),1)
  s=self.c.execute('SELECT * FROM shifts').fetchone();self.assertEqual(s['status'],'closed');self.assertEqual(s['expected_cash'],610000);self.assertEqual(s['counted_cash'],610000)
 def test_stale_close_does_not_drop_a_new_receipt(self):
  opening(self.c);booking(self.c);entry(self.c)
  self.assertEqual(closing(self.c,version=0),0);self.assertEqual(self.c.execute('SELECT status FROM shifts').fetchone()[0],'open')
 def test_cash_difference_requires_a_reason(self):
  opening(self.c)
  with self.assertRaises(sqlite3.IntegrityError):closing(self.c,cash=400000)
  self.assertEqual(closing(self.c,cash=400000,note='Thiếu tiền khi kiểm đếm'),1)
 def test_closed_shift_rejects_entries_and_changes(self):
  opening(self.c);closing(self.c);booking(self.c)
  with self.assertRaises(sqlite3.IntegrityError):entry(self.c)
  with self.assertRaises(sqlite3.IntegrityError):self.c.execute("UPDATE shifts SET counted_cash=1 WHERE id='s1'")
  with self.assertRaises(sqlite3.IntegrityError):self.c.execute("DELETE FROM shifts WHERE id='s1'")
 def test_ledger_is_append_only(self):
  opening(self.c);booking(self.c);entry(self.c)
  with self.assertRaises(sqlite3.IntegrityError):self.c.execute('UPDATE finance_entries SET amount=1')
  with self.assertRaises(sqlite3.IntegrityError):self.c.execute('DELETE FROM finance_entries')
 def test_paid_booking_amount_cannot_be_rewritten(self):
  opening(self.c);booking(self.c);entry(self.c)
  with self.assertRaises(sqlite3.IntegrityError):self.c.execute("UPDATE bookings SET amount=1 WHERE id='b1'")
 def test_paid_status_cannot_bypass_ledger(self):
  booking(self.c)
  with self.assertRaises(sqlite3.IntegrityError):self.c.execute("UPDATE bookings SET status='paid',payment='cash' WHERE id='b1'")
 def test_failure_in_audit_rolls_back_every_financial_effect(self):
  opening(self.c);booking(self.c)
  self.c.executescript("CREATE TRIGGER reject_audit BEFORE INSERT ON audit WHEN NEW.action='Ghi sổ tiền' BEGIN SELECT RAISE(ABORT,'INJECTED_FAILURE'); END;")
  with self.assertRaises(sqlite3.IntegrityError):entry(self.c)
  self.assertEqual(self.c.execute('SELECT COUNT(*) FROM finance_entries').fetchone()[0],0)
  self.assertEqual(self.c.execute('SELECT status FROM bookings').fetchone()[0],'finished')
  self.assertEqual(self.c.execute('SELECT version FROM shifts').fetchone()[0],0)
 def test_same_retry_key_cannot_create_another_manual_entry(self):
  opening(self.c);entry(self.c,kind='cash_in',book=None,key='same')
  with self.assertRaises(sqlite3.IntegrityError):entry(self.c,'e2',kind='cash_in',book=None,key='same')
 def test_aggregate_uses_all_entries_not_only_display_page(self):
  opening(self.c,amount=0)
  for i in range(105):entry(self.c,'in'+str(i),kind='cash_in',book=None,amount=1000)
  s=self.c.execute(SUMMARY,('t1',)).fetchone();self.assertEqual(s['cash_in'],105000);self.assertEqual(s['entry_count'],105)
 def test_entry_after_close_cannot_be_hidden_from_reconciliation(self):
  opening(self.c);self.assertEqual(closing(self.c),1)
  with self.assertRaises(sqlite3.IntegrityError):entry(self.c,'late',kind='cash_in',book=None,amount=1)
  self.assertEqual(self.c.execute('SELECT expected_cash FROM shifts').fetchone()[0],500000)
 def test_close_audit_failure_keeps_shift_open(self):
  opening(self.c)
  self.c.executescript("CREATE TRIGGER reject_close_audit BEFORE INSERT ON audit WHEN NEW.action='Đóng ca' BEGIN SELECT RAISE(ABORT,'INJECTED_FAILURE'); END;")
  with self.assertRaises(sqlite3.IntegrityError):closing(self.c)
  self.assertEqual(self.c.execute('SELECT status FROM shifts').fetchone()[0],'open')
 def test_concurrent_expenses_cannot_overdraw_cash(self):
  with tempfile.TemporaryDirectory() as d:
   path=pathlib.Path(d)/'db';c=connection(path);c.executescript(DDL);opening(c,amount=500000);c.commit();c.close()
   def run(i):
    c=connection(path)
    try:entry(c,str(i),kind='cash_out',book=None,amount=300000);c.commit();return 1
    except sqlite3.IntegrityError:c.rollback();return 0
    finally:c.close()
   with concurrent.futures.ThreadPoolExecutor(max_workers=2) as p:self.assertEqual(sum(p.map(run,range(2))),1)
   c=connection(path);self.assertEqual(c.execute(SUMMARY,('t1',)).fetchone()['cash_out'],300000);c.close()
 def test_concurrent_payment_has_one_winner(self):
  with tempfile.TemporaryDirectory() as d:
   path=pathlib.Path(d)/'db';c=connection(path);c.executescript(DDL);opening(c);booking(c);c.commit();c.close()
   def run(i):
    c=connection(path)
    try:entry(c,str(i));c.commit();return 1
    except sqlite3.IntegrityError:c.rollback();return 0
    finally:c.close()
   with concurrent.futures.ThreadPoolExecutor(max_workers=8) as p:self.assertEqual(sum(p.map(run,range(8))),1)
   c=connection(path);self.assertEqual(c.execute('SELECT COUNT(*) FROM finance_entries').fetchone()[0],1);c.close()
if __name__=='__main__':unittest.main(verbosity=2)
