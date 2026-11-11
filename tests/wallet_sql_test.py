"""Money wallet (migration 0026): top-up through the shift ledger, bonus, spending a whole bill."""
import sqlite3, pathlib, re, unittest
from finance_sql_test import connection, DDL, opening
from package_sql_test import customer, book, PAY_PKG, REDEEM, LEDGER, sell

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = (ROOT / 'lib/package-sql.ts').read_text()


def sql(name):
    return re.search(r'export const ' + name + r' = `([^`]+)`;', SOURCE).group(1)


WALLET = sql('INSERT_WALLET_LEDGER_SQL')
TOPUP_ENTRY = sql('INSERT_WALLET_TOPUP_ENTRY_SQL')
PAY_WALLET = sql('PAY_BY_WALLET_SQL')


def topup(c, id='w1', amount=1000000, bonus=200000, cust='c1', method='cash'):
    c.execute(WALLET, (id, 't1', cust, amount, 'topup', None, 'owner', '', 10))
    if bonus:
        c.execute(WALLET, (id + 'b', 't1', cust, bonus, 'bonus', None, 'owner', 'Tặng', 10))
    c.execute(TOPUP_ENTRY, ('e-' + id, 't1', 's1', method, amount, 'req-' + id, 'Nạp ví', 'owner', 10, id))


def balance(c, cust='c1'):
    row = c.execute('SELECT balance FROM wallet_balances WHERE tenant=? AND customer_id=?', ('t1', cust)).fetchone()
    return row[0] if row else 0


def spend(c, booking='b1', amount=650000, cust='c1'):
    c.execute(WALLET, ('s-' + booking, 't1', cust, -amount, 'spend', booking, 'owner', '', 20))
    c.execute(PAY_WALLET, ('t1', booking, amount))


class WalletSQL(unittest.TestCase):
    def setUp(self):
        self.c = connection()
        self.c.executescript(DDL)
        opening(self.c)
        customer(self.c)

    def test_topup_credits_amount_plus_bonus_and_is_collected_in_the_shift(self):
        topup(self.c)
        self.assertEqual(balance(self.c), 1200000)
        total = self.c.execute("SELECT SUM(amount) FROM finance_entries WHERE kind='payment'").fetchone()[0]
        self.assertEqual(total, 1000000)  # only real money enters the drawer; the bonus is free credit

    def test_second_tier(self):
        topup(self.c, amount=2000000, bonus=500000)
        self.assertEqual(balance(self.c), 2500000)

    def test_topup_entry_must_match_the_ledger_row(self):
        self.c.execute(WALLET, ('w1', 't1', 'c1', 1000000, 'topup', None, 'owner', '', 10))
        with self.assertRaisesRegex(sqlite3.DatabaseError, 'WALLET_NOT_PAYABLE'):
            self.c.execute(TOPUP_ENTRY, ('e1', 't1', 's1', 'cash', 900000, 'r1', 'Nạp ví', 'owner', 10, 'w1'))
        with self.assertRaisesRegex(sqlite3.DatabaseError, 'WALLET_NOT_PAYABLE'):
            self.c.execute(TOPUP_ENTRY, ('e1', 't1', 's1', 'cash', 1000000, 'r1', 'Nạp ví', 'owner', 10, 'nope'))

    def test_a_topup_is_collected_only_once(self):
        topup(self.c)
        with self.assertRaises(sqlite3.IntegrityError):
            self.c.execute(TOPUP_ENTRY, ('e2', 't1', 's1', 'cash', 1000000, 'r2', 'Nạp ví', 'owner', 11, 'w1'))

    def test_whole_bill_is_paid_from_the_wallet_without_touching_the_drawer(self):
        topup(self.c)
        book(self.c, golf=650000)
        spend(self.c)
        self.assertEqual(balance(self.c), 550000)
        row = self.c.execute("SELECT status,payment FROM bookings WHERE id='b1'").fetchone()
        self.assertEqual((row[0], row[1]), ('paid', 'wallet'))
        total = self.c.execute("SELECT SUM(amount) FROM finance_entries WHERE kind='payment'").fetchone()[0]
        self.assertEqual(total, 1000000)

    def test_overdraft_is_refused(self):
        topup(self.c, amount=100000, bonus=0)
        book(self.c, golf=650000)
        with self.assertRaisesRegex(sqlite3.DatabaseError, 'WALLET_INSUFFICIENT'):
            spend(self.c)

    def test_spend_must_equal_the_bill_and_bill_must_be_finished(self):
        topup(self.c)
        book(self.c, golf=650000)
        with self.assertRaisesRegex(sqlite3.DatabaseError, 'WALLET_SPEND_INVALID'):
            self.c.execute(WALLET, ('s1', 't1', 'c1', -100000, 'spend', 'b1', 'owner', '', 20))
        book(self.c, id='b2', status='playing')
        with self.assertRaisesRegex(sqlite3.DatabaseError, 'WALLET_SPEND_INVALID'):
            self.c.execute(WALLET, ('s2', 't1', 'c1', -650000, 'spend', 'b2', 'owner', '', 20))

    def test_a_bill_cannot_be_paid_from_the_wallet_twice(self):
        topup(self.c)
        book(self.c, golf=300000)
        spend(self.c, amount=300000)
        with self.assertRaises(sqlite3.DatabaseError):
            self.c.execute(WALLET, ('s-again', 't1', 'c1', -300000, 'spend', 'b1', 'owner', '', 21))

    def test_a_bill_already_covered_by_a_package_is_not_payable_by_wallet(self):
        topup(self.c)
        sell(self.c)
        book(self.c, golf=650000)
        self.c.execute(REDEEM, ('r1', 't1', 'b1', 'p1', 'holes18', 650000, 'owner', 20, 1))
        self.c.execute(LEDGER, ('u1', 't1', 'p1', 'holes18', -1, 'use', 'b1', 'owner', '', 20))
        with self.assertRaisesRegex(sqlite3.DatabaseError, 'WALLET_SPEND_INVALID'):
            self.c.execute(WALLET, ('s1', 't1', 'c1', -650000, 'spend', 'b1', 'owner', '', 21))

    def test_wallet_status_alone_cannot_mark_a_bill_paid(self):
        book(self.c, golf=650000)
        with self.assertRaisesRegex(sqlite3.DatabaseError, 'PAYMENT_REQUIRES_LEDGER'):
            self.c.execute(PAY_WALLET, ('t1', 'b1', 650000))

    def test_ledger_is_append_only(self):
        topup(self.c)
        with self.assertRaisesRegex(sqlite3.DatabaseError, 'LEDGER_IMMUTABLE'):
            self.c.execute("UPDATE wallet_ledger SET delta=1 WHERE id='w1'")
        with self.assertRaisesRegex(sqlite3.DatabaseError, 'LEDGER_IMMUTABLE'):
            self.c.execute("DELETE FROM wallet_ledger WHERE id='w1'")

    def test_unknown_customer_is_refused(self):
        with self.assertRaisesRegex(sqlite3.DatabaseError, 'CUSTOMER_NOT_FOUND'):
            self.c.execute(WALLET, ('w9', 't1', 'ghost', 100000, 'topup', None, 'owner', '', 10))


if __name__ == '__main__':
    unittest.main()
