"""Bill discounts, refunds and shift reconciliation with refunds (migration 0014)."""
import sqlite3, unittest
from finance_sql_test import connection, DDL, opening, entry

ENTRY = (
    "INSERT INTO finance_entries(id,tenant,shift_id,kind,method,amount,booking_id,request_id,note,actor,created,part) "
    "VALUES (?,?,?,?,?,?,?,?,?,'owner',?,?)"
)


def bill(c, id='b1', tenant='t1', golf=500_000, status='finished'):
    c.execute(
        "INSERT INTO bookings(id,tenant,room,customer,phone,service,people,start,end,status,segments,golf_amount,food_total,amount,price,created) VALUES (?,?,?,'Test','0900000000','gdr',1,0,1,?,'[]',?,0,?,'{}',0)",
        (id, tenant, 'line-1', status, golf, golf),
    )


def discount(c, id='d1', booking='b1', amount=50_000, reason='Khách quen', tenant='t1'):
    return c.execute(
        "INSERT INTO bill_discounts(id,tenant,booking_id,amount,reason,actor,created) VALUES (?,?,?,?,?,'owner',5)",
        (id, tenant, booking, amount, reason),
    ).rowcount


def refund(c, id='r1', booking='b1', method='cash', amount=50_000, note='Thu nhầm', tenant='t1', shift='s1'):
    return c.execute(ENTRY, (id, tenant, shift, 'refund', method, amount, booking, 'refund-' + id, note, 20, 2)).rowcount


def cash_out(c, id, amount):
    return c.execute(ENTRY, (id, 't1', 's1', 'cash_out', 'cash', amount, None, 'out-' + id, 'Chi thử', 30, 0)).rowcount


def amounts(c, id='b1'):
    r = c.execute('SELECT amount,golf_amount FROM bookings WHERE id=?', (id,)).fetchone()
    return r[0], r[1]


CLOSE = (
    "UPDATE shifts SET status='closed',closed_by='o',closed_at=100,counted_cash=?,counted_transfer=0,counted_card=0,"
    "expected_cash=?,expected_transfer=0,expected_card=0,note='',version=version+1 WHERE id='s1'"
)


class DiscountSQL(unittest.TestCase):
    def setUp(self):
        self.c = connection()
        self.c.executescript(DDL)

    def test_discount_lowers_the_bill_and_the_payment_matches_it(self):
        bill(self.c)
        self.assertEqual(discount(self.c), 1)
        self.assertEqual(amounts(self.c), (450_000, 450_000))
        opening(self.c)
        with self.assertRaises(sqlite3.IntegrityError):  # the old total can no longer be paid
            entry(self.c, amount=500_000)
        self.assertEqual(entry(self.c, amount=450_000), 1)
        self.assertEqual(self.c.execute("SELECT status FROM bookings WHERE id='b1'").fetchone()[0], 'paid')
        self.assertEqual(self.c.execute("SELECT COUNT(*) FROM audit WHERE action='Giảm giá phiếu'").fetchone()[0], 1)

    def test_discount_must_stay_below_the_golf_part(self):
        bill(self.c, golf=300_000)
        with self.assertRaises(sqlite3.IntegrityError):
            discount(self.c, amount=300_000)
        discount(self.c, amount=100_000)
        self.assertEqual(amounts(self.c), (200_000, 200_000))

    def test_discount_rules(self):
        bill(self.c)
        bill(self.c, 'b2', status='playing')
        bill(self.c, 'b3', tenant='t2')
        for kw in [dict(amount=0), dict(amount=-5), dict(reason='ab'), dict(booking='b2'), dict(booking='nope'), dict(booking='b3')]:
            with self.assertRaises(sqlite3.IntegrityError, msg=str(kw)):
                discount(self.c, **kw)
        discount(self.c)
        with self.assertRaises(sqlite3.IntegrityError):  # one discount per bill
            discount(self.c, 'd2', amount=1000)

    def test_no_discount_after_payment_started_and_never_edited(self):
        bill(self.c)
        opening(self.c)
        entry(self.c, amount=500_000)
        with self.assertRaises(sqlite3.IntegrityError):
            discount(self.c)
        bill(self.c, 'b4')
        discount(self.c, 'd4', booking='b4')
        for stmt in ['UPDATE bill_discounts SET amount=1', 'DELETE FROM bill_discounts']:
            with self.assertRaises(sqlite3.IntegrityError, msg=stmt):
                self.c.execute(stmt)


class RefundSQL(unittest.TestCase):
    def setUp(self):
        self.c = connection()
        self.c.executescript(DDL)
        opening(self.c, amount=500_000)
        bill(self.c)
        entry(self.c, amount=500_000)  # paid in cash

    def test_refund_is_limited_to_what_was_paid_by_that_method(self):
        self.assertEqual(refund(self.c, amount=200_000), 1)
        self.assertEqual(refund(self.c, 'r2', amount=300_000), 1)
        with self.assertRaises(sqlite3.IntegrityError):  # everything is refunded already
            refund(self.c, 'r3', amount=1)
        with self.assertRaises(sqlite3.IntegrityError):  # never paid by card
            refund(self.c, 'r4', method='card', amount=1000)

    def test_refund_needs_a_paid_bill_a_reason_and_an_open_shift(self):
        bill(self.c, 'b2')
        for kw in [dict(booking='b2'), dict(note='ab'), dict(amount=0), dict(shift='nope'), dict(booking='none')]:
            with self.assertRaises(sqlite3.IntegrityError, msg=str(kw)):
                refund(self.c, **kw)

    def test_refund_comes_out_of_the_cash_drawer(self):
        refund(self.c, amount=100_000)
        # drawer: 500.000 opening + 500.000 sale - 100.000 refund = 900.000
        with self.assertRaises(sqlite3.IntegrityError):
            cash_out(self.c, 'o1', 950_000)
        self.assertEqual(cash_out(self.c, 'o2', 900_000), 1)

    def test_cash_refund_cannot_exceed_the_drawer(self):
        cash_out(self.c, 'o1', 1_000_000)
        with self.assertRaises(sqlite3.IntegrityError):
            refund(self.c, amount=1000)

    def test_shift_closes_only_with_refunds_in_the_expected_cash(self):
        refund(self.c, amount=120_000)
        with self.assertRaises(sqlite3.IntegrityError):  # expected cash ignoring the refund
            self.c.execute(CLOSE, (1_000_000, 1_000_000))
        self.assertEqual(self.c.execute(CLOSE, (880_000, 880_000)).rowcount, 1)

    def test_refund_is_audited_and_the_ledger_stays_immutable(self):
        refund(self.c, amount=1000)
        self.assertEqual(self.c.execute("SELECT COUNT(*) FROM audit WHERE action='Hoàn tiền'").fetchone()[0], 1)
        for stmt in ["UPDATE finance_entries SET amount=1 WHERE kind='refund'", "DELETE FROM finance_entries WHERE kind='refund'"]:
            with self.assertRaises(sqlite3.IntegrityError):
                self.c.execute(stmt)
        self.assertEqual(self.c.execute("SELECT status FROM bookings WHERE id='b1'").fetchone()[0], 'paid')


if __name__ == '__main__':
    unittest.main()
