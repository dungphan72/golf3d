"""Bank transfers: webhook dedupe, one-time use and tenant isolation (migration 0008)."""
import sqlite3, pathlib, re, unittest
from finance_sql_test import connection, DDL, opening, entry, booking

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = (ROOT / 'lib/bank-sql.ts').read_text()


def sql(name):
    return re.search(r'export const ' + name + r' = `([^`]+)`;', SOURCE).group(1)


SET_KEY = sql('SET_INTEGRATION_SQL')
BY_KEY = sql('TENANT_BY_KEY_SQL')
INSERT = sql('INSERT_BANK_TX_SQL')
USE = sql('USE_BANK_TX_SQL')
IGNORE = sql('IGNORE_BANK_TX_SQL')
FOR_CODE = sql('BANK_TX_FOR_CODE_SQL')
HASH = 'h' * 44


def tx(c, id='x1', tenant='t1', external='sepay-1', amount=100000, code='SGGABCD1234', content='SGGABCD1234 chuyen khoan'):
    c.execute(INSERT, (id, tenant, external, amount, content, '0123456789', 'FT1', 1000, code, 2000))


class BankSQL(unittest.TestCase):
    def setUp(self):
        self.c = connection()
        self.c.executescript(DDL)
        opening(self.c)
        booking(self.c)

    def status(self, id='x1'):
        return tuple(self.c.execute('SELECT status,booking_id FROM bank_transactions WHERE id=?', (id,)).fetchone())

    def test_integration_key_maps_to_one_tenant_and_can_rotate(self):
        self.c.execute(SET_KEY, ('t1', 'sepay', HASH, 1))
        self.assertEqual(self.c.execute(BY_KEY, ('sepay', HASH)).fetchone()['tenant'], 't1')
        with self.assertRaises(sqlite3.IntegrityError):
            self.c.execute(SET_KEY, ('t2', 'sepay', HASH, 1))  # same key cannot serve two cabinets
        self.c.execute(SET_KEY, ('t1', 'sepay', 'n' * 44, 2))
        self.assertIsNone(self.c.execute(BY_KEY, ('sepay', HASH)).fetchone())
        with self.assertRaises(sqlite3.IntegrityError):
            self.c.execute(SET_KEY, ('t3', 'other', HASH, 1))

    def test_webhook_retries_never_duplicate_money(self):
        tx(self.c)
        with self.assertRaises(sqlite3.IntegrityError):
            tx(self.c, id='x2')  # same external id, same tenant
        tx(self.c, id='x3', tenant='t2')  # another cabinet may reuse the id
        self.assertEqual(self.c.execute('SELECT COUNT(*) FROM bank_transactions').fetchone()[0], 2)

    def test_invalid_transactions_are_rejected(self):
        for i, kw in enumerate([dict(amount=0), dict(amount=-5), dict(external=''), dict(content='x' * 501)]):
            with self.subTest(kw=kw), self.assertRaises(sqlite3.IntegrityError):
                tx(self.c, id=f'b{i}', external=kw.get('external', f'e{i}'), **{k: v for k, v in kw.items() if k != 'external'})

    def test_using_a_transaction_requires_a_matching_transfer_payment(self):
        tx(self.c)
        with self.assertRaises(sqlite3.IntegrityError):  # no payment recorded yet
            self.c.execute(USE, ('b1', 't1', 'x1'))
        entry(self.c, method='cash', amount=100000)  # wrong method
        # the cash payment already paid the booking; use a second booking for the transfer case
        booking(self.c, id='b2', amount=100000)
        with self.assertRaises(sqlite3.IntegrityError):
            self.c.execute(USE, ('b2', 't1', 'x1'))
        entry(self.c, id='e2', book='b2', method='transfer', amount=100000)
        self.assertEqual(self.c.execute(USE, ('b2', 't1', 'x1')).rowcount, 1)
        self.assertEqual(self.status(), ('used', 'b2'))

    def test_amount_mismatch_cannot_consume_the_transaction(self):
        tx(self.c, amount=90000)
        entry(self.c, method='transfer', amount=100000)
        with self.assertRaises(sqlite3.IntegrityError):
            self.c.execute(USE, ('b1', 't1', 'x1'))

    def test_a_transaction_is_used_once_and_a_booking_takes_one_transaction(self):
        tx(self.c)
        tx(self.c, id='x2', external='sepay-2')
        entry(self.c, method='transfer', amount=100000)
        self.assertEqual(self.c.execute(USE, ('b1', 't1', 'x1')).rowcount, 1)
        self.assertEqual(self.c.execute(USE, ('b1', 't1', 'x1')).rowcount, 0)  # already used
        with self.assertRaises(sqlite3.IntegrityError):
            self.c.execute(USE, ('b1', 't1', 'x2'))  # a booking cannot consume two transfers

    def test_tenant_isolation_and_immutability(self):
        tx(self.c)
        self.assertEqual(self.c.execute(USE, ('b1', 't2', 'x1')).rowcount, 0)
        self.assertEqual(self.c.execute(IGNORE, ('t2', 'x1')).rowcount, 0)
        for statement in ['UPDATE bank_transactions SET amount=1', "UPDATE bank_transactions SET content='x'", 'DELETE FROM bank_transactions']:
            with self.assertRaises(sqlite3.IntegrityError):
                self.c.execute(statement)

    def test_ignored_transactions_are_final_and_codes_are_listed(self):
        tx(self.c)
        self.assertEqual(self.c.execute(IGNORE, ('t1', 'x1')).rowcount, 1)
        self.assertEqual(self.c.execute(IGNORE, ('t1', 'x1')).rowcount, 0)
        with self.assertRaises(sqlite3.IntegrityError):
            self.c.execute("UPDATE bank_transactions SET status='received'")
        self.assertEqual([r['id'] for r in self.c.execute(FOR_CODE, ('t1', 'SGGABCD1234')).fetchall()], ['x1'])


if __name__ == '__main__':
    unittest.main(verbosity=2)
