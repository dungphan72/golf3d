"""Split payments (several methods for one bill): sums, status flip, immutability (migration 0009)."""
import sqlite3, pathlib, re, unittest
from finance_sql_test import connection, DDL, opening, booking, entry, closing, SUMMARY

ROOT = pathlib.Path(__file__).resolve().parents[1]
PART = re.search(r'INSERT_PART_ENTRY_SQL = `([^`]+)`;', (ROOT / 'lib/finance-sql.ts').read_text()).group(1)


def part(c, id, method, amount, book='b1', tenant='t1', shift='s1'):
    return c.execute(PART, (id, tenant, shift, method, amount, book, 'req-' + id, 'Thanh toán chia', 'owner', 10)).rowcount


class SplitSQL(unittest.TestCase):
    def setUp(self):
        self.c = connection()
        self.c.executescript(DDL)
        opening(self.c, amount=0)
        booking(self.c, amount=100000)

    def row(self):
        return tuple(self.c.execute("SELECT status,payment FROM bookings WHERE id='b1'").fetchone())

    def test_parts_add_up_then_booking_is_paid_as_mixed(self):
        part(self.c, 'p1', 'cash', 60000)
        self.assertEqual(self.row(), ('finished', None))  # still owing
        part(self.c, 'p2', 'transfer', 40000)
        self.assertEqual(self.row(), ('paid', 'mixed'))
        s = self.c.execute(SUMMARY, ('t1',)).fetchone()
        self.assertEqual((s['cash_received'], s['transfer_received']), (60000, 40000))

    def test_overpayment_and_duplicate_method_are_rejected(self):
        part(self.c, 'p1', 'cash', 60000)
        with self.assertRaises(sqlite3.IntegrityError):
            part(self.c, 'p2', 'transfer', 40001)  # more than what is left
        with self.assertRaises(sqlite3.IntegrityError):
            part(self.c, 'p3', 'cash', 10000)  # same method twice for one bill
        self.assertEqual(self.row(), ('finished', None))

    def test_two_parts_with_the_same_method_never_pay_out_of_order(self):
        part(self.c, 'p1', 'cash', 100000)  # a single "part" equal to the due is a normal cash payment
        self.assertEqual(self.row(), ('paid', 'cash'))
        with self.assertRaises(sqlite3.IntegrityError):
            part(self.c, 'p2', 'card', 1)  # bill already settled

    def test_whole_payment_still_requires_exact_amount_and_excludes_parts(self):
        part(self.c, 'p1', 'cash', 30000)
        with self.assertRaises(sqlite3.IntegrityError):
            entry(self.c, 'w1', amount=70000)  # whole-bill entry after a partial one
        booking(self.c, 'b2', amount=50000)
        with self.assertRaises(sqlite3.IntegrityError):
            entry(self.c, 'w2', book='b2', amount=49999)

    def test_parts_need_a_finished_booking_and_open_shift_and_same_tenant(self):
        booking(self.c, 'b2', amount=50000, status='playing')
        with self.assertRaises(sqlite3.IntegrityError):
            part(self.c, 'p1', 'cash', 50000, book='b2')
        with self.assertRaises(sqlite3.IntegrityError):
            part(self.c, 'p2', 'cash', 1000, tenant='t2')
        closing(self.c)
        with self.assertRaises(sqlite3.IntegrityError):
            part(self.c, 'p3', 'cash', 1000)

    def test_cannot_mark_paid_mixed_without_real_parts(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.c.execute("UPDATE bookings SET status='paid',payment='mixed' WHERE id='b1'")
        part(self.c, 'p1', 'cash', 40000)
        with self.assertRaises(sqlite3.IntegrityError):
            self.c.execute("UPDATE bookings SET status='paid',payment='mixed' WHERE id='b1'")  # not fully paid
        with self.assertRaises(sqlite3.IntegrityError):
            self.c.execute("UPDATE finance_entries SET amount=1")  # ledger stays append-only


if __name__ == '__main__':
    unittest.main(verbosity=2)
