"""Customers, packages, redemptions and loyalty against the real migrations and SQL."""
import sqlite3, pathlib, re, json, unittest
from finance_sql_test import connection, DDL, opening, entry, booking, SUMMARY, closing

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = (ROOT / 'lib/package-sql.ts').read_text()


def sql(name):
    return re.search(r'export const ' + name + r' = `([^`]+)`;', SOURCE).group(1)


CUSTOMER = sql('CREATE_CUSTOMER_SQL')
PKG = sql('INSERT_PACKAGE_SQL')
LEDGER = sql('INSERT_PACKAGE_LEDGER_SQL')
SALE_ENTRY = sql('INSERT_PACKAGE_SALE_ENTRY_SQL')
REDEEM = sql('INSERT_REDEMPTION_SQL')
PAY_PKG = sql('PAY_BY_PACKAGE_SQL')
LOYALTY = sql('INSERT_LOYALTY_SQL')
FINISH_SQL = re.search(r'FINISH_SESSION_SQL = `([^`]+)`', (ROOT / 'lib/fnb-sql.ts').read_text()).group(1)
DAY = 86400000
GRANT18 = json.dumps([{'kind': 'holes18', 'qty': 11}])


def customer(c, id='c1', tenant='t1', phone='0912345678'):
    c.execute(CUSTOMER, (id, tenant, 'Khách A', phone, '', 1))


def sell(c, id='p1', cust='c1', tenant='t1', price=5000000, grants=GRANT18, expires=100 * DAY, method='transfer', pay=True, room='any'):
    c.execute(PKG, (id, tenant, cust, 'type1', 'Combo 18 hố', 'sale', price, grants, '', 10, expires, 'owner', room))
    for g in json.loads(grants):
        c.execute(LEDGER, ('g-' + id + g['kind'], tenant, id, g['kind'], g['qty'], 'grant', None, 'owner', '', 10))
    if pay:
        c.execute(SALE_ENTRY, ('sale-' + id, tenant, 's1', method, price, 'req-' + id, 'Bán gói', 'owner', 10, id))


def book(c, id='b1', service='18', phone='0912345678', golf=650000, food=0, status='finished', room='line-1'):
    c.execute("INSERT INTO bookings(id,tenant,room,customer,phone,service,people,start,end,status,segments,amount,golf_amount,food_total,price,created) VALUES (?,?,?,'Test',?,?,1,0,1,?,'[]',?,?,?,'{}',0)",
              (id, 't1', room, phone, service, status, golf + food, golf, food))


def redeem(c, booking_id='b1', pkg='p1', kind='holes18', covered=650000, created=20, units=1):
    c.execute(REDEEM, ('r-' + booking_id, 't1', booking_id, pkg, kind, covered, 'owner', created, units))
    c.execute(LEDGER, ('u-' + booking_id, 't1', pkg, kind, -units, 'use', booking_id, 'owner', '', created))


def remaining(c, pkg='p1', kind='holes18'):
    return c.execute('SELECT remaining FROM package_balances WHERE package_id=? AND kind=?', (pkg, kind)).fetchone()[0]


class PackageSQL(unittest.TestCase):
    def setUp(self):
        self.c = connection()
        self.c.executescript(DDL)
        opening(self.c)
        customer(self.c)

    def test_sale_goes_through_the_shift_ledger_and_reconciliation(self):
        sell(self.c, method='transfer')
        s = next(r for r in self.c.execute(SUMMARY, ('t1',)).fetchall() if r['id'] == 's1')
        self.assertEqual(s['transfer_received'], 5000000)
        self.assertEqual(remaining(self.c), 11)
        self.assertEqual(closing(self.c), 1)

    def test_sale_needs_open_shift_and_rolls_back_atomically(self):
        self.c.execute("UPDATE shifts SET status='closed',closed_by='x',closed_at=5,counted_cash=500000,counted_transfer=0,counted_card=0,expected_cash=500000,expected_transfer=0,expected_card=0,version=1")
        with self.assertRaises(sqlite3.IntegrityError):
            self.c.execute('SAVEPOINT s')
            sell(self.c, id='p2')
        self.c.execute('ROLLBACK TO s')
        self.assertEqual(self.c.execute("SELECT COUNT(*) FROM finance_entries WHERE package_id IS NOT NULL").fetchone()[0], 0)

    def test_payment_amount_must_match_price_and_be_paid_once(self):
        sell(self.c, pay=False)
        with self.assertRaises(sqlite3.IntegrityError):
            self.c.execute(SALE_ENTRY, ('x1', 't1', 's1', 'cash', 4000000, 'req1', 'Bán gói', 'owner', 10, 'p1'))
        self.c.execute(SALE_ENTRY, ('x2', 't1', 's1', 'cash', 5000000, 'req2', 'Bán gói', 'owner', 10, 'p1'))
        with self.assertRaises(sqlite3.IntegrityError):
            self.c.execute(SALE_ENTRY, ('x3', 't1', 's1', 'cash', 5000000, 'req3', 'Bán gói', 'owner', 10, 'p1'))

    def test_phone_is_normalised_unique_per_tenant(self):
        with self.assertRaises(sqlite3.IntegrityError):
            customer(self.c, id='c2')
        customer(self.c, id='c3', tenant='t2')
        for bad in ['+84912345678', '09123', '0912 345 678', 'abc']:
            with self.assertRaises(sqlite3.IntegrityError):
                customer(self.c, id='bad', phone=bad)

    def test_cannot_sell_to_other_tenants_customer(self):
        with self.assertRaises(sqlite3.IntegrityError):
            sell(self.c, tenant='t2', pay=False)

    def test_redeem_consumes_one_use_and_pays_booking_without_cash(self):
        sell(self.c)
        book(self.c)
        redeem(self.c)
        self.assertEqual(remaining(self.c), 10)
        before = self.c.execute('SELECT COUNT(*) FROM finance_entries').fetchone()[0]
        self.assertEqual(self.c.execute(PAY_PKG, ('t1', 'b1', 650000)).rowcount, 1)
        self.assertEqual(self.c.execute('SELECT status,payment FROM bookings').fetchone()[:], ('paid', 'package'))
        self.assertEqual(self.c.execute('SELECT COUNT(*) FROM finance_entries').fetchone()[0], before)

    def test_golf_covered_by_package_and_food_paid_in_cash(self):
        from fnb_sql_test import item, order, ready, transition, finish
        sell(self.c, grants=json.dumps([{'kind': 'gdr', 'qty': 5}]), price=1000000)
        book(self.c, service='gdr', golf=0, status='playing')
        self.c.execute("UPDATE bookings SET amount=NULL,golf_amount=NULL,started=5 WHERE id='b1'")
        item(self.c)
        order(self.c)
        ready(self.c)
        transition(self.c, 'served')
        food = self.c.execute('SELECT food_total FROM bookings').fetchone()[0]
        self.assertGreater(food, 0)
        self.c.execute(FINISH_SQL, ('[]', 20, 250000, 250000, 250000, 25, 't1', 'b1', 'playing', 5))
        total = 250000 + food
        redeem(self.c, kind='gdr', covered=250000)
        with self.assertRaises(sqlite3.IntegrityError):
            self.c.execute(PAY_PKG, ('t1', 'b1', total))  # package alone does not cover food
        with self.assertRaises(sqlite3.IntegrityError):
            entry(self.c, amount=total)  # full amount is no longer payable
        entry(self.c, amount=food)
        self.assertEqual(self.c.execute('SELECT status FROM bookings').fetchone()[0], 'paid')

    GDR_HOURS = json.dumps([{'kind': 'gdr', 'qty': 12}])

    def test_hourly_package_is_charged_in_hours_of_play(self):
        sell(self.c, grants=self.GDR_HOURS)
        book(self.c, service='gdr', golf=900000)
        redeem(self.c, kind='gdr', covered=900000, units=3)  # a three-hour session
        self.assertEqual(remaining(self.c, kind='gdr'), 9)

    def test_ledger_use_must_match_the_hours_recorded_on_the_redemption(self):
        sell(self.c, grants=self.GDR_HOURS)
        book(self.c, service='gdr', golf=900000)
        self.c.execute(REDEEM, ('r1', 't1', 'b1', 'p1', 'gdr', 900000, 'owner', 20, 3))
        with self.assertRaises(sqlite3.IntegrityError):  # taking 1 hour for a 3-hour session
            self.c.execute(LEDGER, ('u1', 't1', 'p1', 'gdr', -1, 'use', 'b1', 'owner', '', 20))
        with self.assertRaises(sqlite3.IntegrityError):  # taking 5 hours
            self.c.execute(LEDGER, ('u2', 't1', 'p1', 'gdr', -5, 'use', 'b1', 'owner', '', 20))

    def test_a_package_with_too_few_hours_cannot_pay_a_longer_session(self):
        sell(self.c, grants=json.dumps([{'kind': 'gdr', 'qty': 2}]))
        book(self.c, service='gdr', golf=900000)
        with self.assertRaises(sqlite3.IntegrityError):
            redeem(self.c, kind='gdr', covered=900000, units=3)

    def test_hole_rounds_still_cost_one_unit(self):
        sell(self.c)
        book(self.c)
        with self.assertRaises(sqlite3.IntegrityError):
            redeem(self.c, units=2)

    def test_a_standard_package_cannot_pay_for_a_vip_room(self):
        sell(self.c, grants=self.GDR_HOURS, room='standard')
        book(self.c, service='gdr', golf=300000, room='vip-1')
        with self.assertRaises(sqlite3.IntegrityError):
            redeem(self.c, kind='gdr', covered=300000, units=1)
        book(self.c, id='b2', service='gdr', golf=300000, room='line-2')
        redeem(self.c, booking_id='b2', kind='gdr', covered=300000, units=1)

    def test_a_vip_package_pays_for_either_room(self):
        sell(self.c, grants=self.GDR_HOURS, room='vip')
        book(self.c, service='gdr', golf=550000, room='vip-1')
        redeem(self.c, kind='gdr', covered=550000, units=1)
        book(self.c, id='b2', service='gdr', golf=300000, room='line-2')
        redeem(self.c, booking_id='b2', kind='gdr', covered=300000, units=1)
        self.assertEqual(remaining(self.c, kind='gdr'), 10)

    def test_redemption_without_ledger_use_cannot_finish_payment(self):
        sell(self.c)
        book(self.c)
        self.c.execute(REDEEM, ('r1', 't1', 'b1', 'p1', 'holes18', 650000, 'owner', 20, 1))
        with self.assertRaises(sqlite3.IntegrityError):
            self.c.execute(PAY_PKG, ('t1', 'b1', 650000))

    def test_wrong_service_kind_or_other_customer_is_rejected(self):
        sell(self.c)
        book(self.c, service='9', golf=500000)
        with self.assertRaises(sqlite3.IntegrityError):
            redeem(self.c, kind='holes18', covered=500000)
        book(self.c, id='b2', phone='0999999999')
        with self.assertRaises(sqlite3.IntegrityError):
            redeem(self.c, booking_id='b2')

    def test_phone_formats_still_match_the_customer(self):
        sell(self.c)
        book(self.c, phone='+84 912-345-678')
        redeem(self.c)
        self.assertEqual(remaining(self.c), 10)

    def test_expired_package_and_empty_balance_are_blocked(self):
        sell(self.c, expires=15)
        book(self.c)
        with self.assertRaises(sqlite3.IntegrityError):
            redeem(self.c, created=20)
        sell(self.c, id='p2', grants=json.dumps([{'kind': 'holes18', 'qty': 1}]), price=500000)
        book(self.c, id='b2')
        redeem(self.c, booking_id='b2', pkg='p2')
        book(self.c, id='b3')
        with self.assertRaises(sqlite3.IntegrityError):
            redeem(self.c, booking_id='b3', pkg='p2')

    def test_booking_can_only_be_redeemed_once(self):
        sell(self.c)
        book(self.c)
        redeem(self.c)
        with self.assertRaises(sqlite3.IntegrityError):
            self.c.execute(REDEEM, ('r2', 't1', 'b1', 'p1', 'holes18', 650000, 'owner', 21, 1))

    def test_ledgers_and_packages_are_immutable_and_adjustments_need_reason(self):
        sell(self.c)
        for statement in ['UPDATE package_ledger SET delta=99', 'DELETE FROM package_ledger', 'UPDATE customer_packages SET price_paid=1', 'DELETE FROM customer_packages', 'DELETE FROM customers']:
            with self.assertRaises(sqlite3.IntegrityError):
                self.c.execute(statement)
        with self.assertRaises(sqlite3.IntegrityError):
            self.c.execute(LEDGER, ('a1', 't1', 'p1', 'holes18', 1, 'adjust', None, 'owner', '', 30))
        self.c.execute(LEDGER, ('a2', 't1', 'p1', 'holes18', -2, 'adjust', None, 'owner', 'Sai sót nhập liệu', 30))
        self.assertEqual(remaining(self.c), 9)
        with self.assertRaises(sqlite3.IntegrityError):
            self.c.execute(LEDGER, ('a3', 't1', 'p1', 'holes18', -50, 'adjust', None, 'owner', 'Vượt số dư', 31))

    def test_grant_must_match_package_snapshot_once(self):
        self.c.execute(PKG, ('p9', 't1', 'c1', 'type1', 'Combo', 'sale', 100000, GRANT18, '', 10, 99, 'owner', 'any'))
        with self.assertRaises(sqlite3.IntegrityError):
            self.c.execute(LEDGER, ('g1', 't1', 'p9', 'holes18', 50, 'grant', None, 'owner', '', 10))
        self.c.execute(LEDGER, ('g2', 't1', 'p9', 'holes18', 11, 'grant', None, 'owner', '', 10))
        with self.assertRaises(sqlite3.IntegrityError):
            self.c.execute(LEDGER, ('g3', 't1', 'p9', 'holes18', 11, 'grant', None, 'owner', '', 10))

    def test_points_earned_once_per_paid_round_and_redeemed_in_tens(self):
        book(self.c, service='18', golf=650000)
        entry(self.c, amount=650000)
        self.assertEqual(self.c.execute('SELECT points FROM customer_points').fetchone()[0], 1)
        for i in range(2, 11):
            book(self.c, id=f'b{i}')
            entry(self.c, id=f'e{i}', book=f'b{i}', amount=650000)
        self.assertEqual(self.c.execute('SELECT points FROM customer_points').fetchone()[0], 10)
        with self.assertRaises(sqlite3.IntegrityError):
            self.c.execute(LOYALTY, ('x', 't1', 'c1', -5, 'redeem', None, 'owner', 40))
        self.c.execute(LOYALTY, ('red1', 't1', 'c1', -10, 'redeem', None, 'owner', 40))
        self.assertEqual(self.c.execute('SELECT points FROM customer_points').fetchone()[0], 0)
        with self.assertRaises(sqlite3.IntegrityError):
            self.c.execute(LOYALTY, ('red2', 't1', 'c1', -10, 'redeem', None, 'owner', 41))

    def test_practice_sessions_and_unknown_customers_earn_nothing(self):
        book(self.c, service='gdr', golf=250000)
        entry(self.c, amount=250000)
        book(self.c, id='b2', phone='0999999999')
        entry(self.c, id='e2', book='b2', amount=650000)
        self.assertEqual(self.c.execute('SELECT COUNT(*) FROM loyalty_ledger').fetchone()[0], 0)

    def test_package_paid_booking_also_earns_a_point(self):
        sell(self.c)
        book(self.c)
        redeem(self.c)
        self.c.execute(PAY_PKG, ('t1', 'b1', 650000))
        self.assertEqual(self.c.execute('SELECT points FROM customer_points').fetchone()[0], 1)


if __name__ == '__main__':
    unittest.main(verbosity=2)
