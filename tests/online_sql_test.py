"""Online booking requests: validation, rate limits and the state machine in migration 0006."""
import sqlite3, pathlib, re, unittest
from finance_sql_test import connection, DDL

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = (ROOT / 'lib/online-sql.ts').read_text()


def sql(name):
    return re.search(r'export const ' + name + r' = `([^`]+)`;', SOURCE).group(1)


INSERT = sql('INSERT_REQUEST_SQL')
CLAIM = sql('CLAIM_REQUEST_SQL')
RELEASE = sql('RELEASE_REQUEST_SQL')
CONFIRM = sql('CONFIRM_REQUEST_SQL')
REJECT = sql('REJECT_REQUEST_SQL')
CANCEL = sql('CANCEL_REQUEST_SQL')
BY_CODE = sql('REQUEST_BY_CODE_SQL')
LIST = sql('LIST_REQUESTS_SQL')
NOW = 1_000_000_000_000
HOUR = 3_600_000
CODE = 'c' * 44


def submit(c, id='r1', tenant='t1', code=None, phone='0912345678', start=NOW + 2 * HOUR, service='18', people=1,
           ip='ip1', created=NOW, name='Khách A', minutes=0, vip=0, note=''):
    return c.execute(INSERT, (id, tenant, code or ('h' + id) * 12, name, phone, service, vip, people, start, minutes,
                              note, '{"total":650000}', ip, created))


def status(c, id='r1'):
    return c.execute('SELECT status,room,booking_id,handled_by FROM booking_requests WHERE id=?', (id,)).fetchone()[:]


class OnlineSQL(unittest.TestCase):
    def setUp(self):
        self.c = connection()
        self.c.executescript(DDL)

    def test_valid_request_starts_pending_and_is_found_by_code(self):
        submit(self.c, code=CODE)
        self.assertEqual(status(self.c), ('pending', None, None, None))
        self.assertEqual(self.c.execute(BY_CODE, (CODE,)).fetchone()['status'], 'pending')
        self.assertIsNone(self.c.execute(BY_CODE, ('x' * 44,)).fetchone())

    def test_invalid_inputs_are_rejected(self):
        bad = [dict(phone='123'), dict(phone='+84912345678'), dict(service='vip'), dict(people=0), dict(people=5),
               dict(name='A'), dict(start=NOW - 10 * HOUR), dict(minutes=1000), dict(note='x' * 301)]
        for i, kw in enumerate(bad):
            with self.subTest(kw=kw), self.assertRaises(sqlite3.IntegrityError):
                submit(self.c, id=f'b{i}', **kw)

    def test_cannot_insert_in_a_non_pending_state(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.c.execute("INSERT INTO booking_requests(id,tenant,code_hash,name,phone,service,vip,people,start,minutes,note,quote,status,ip_hash,created) VALUES ('x','t1','" + 'h' * 30 + "','Khách','0912345678','18',0,1,2000000000000,0,'','{}','confirmed','ip',1)")

    def test_per_phone_pending_limit_and_duplicate_guard(self):
        for i in range(3):
            submit(self.c, id=f'p{i}', start=NOW + (2 + i) * HOUR)
        with self.assertRaises(sqlite3.IntegrityError):
            submit(self.c, id='p3', start=NOW + 9 * HOUR)
        submit(self.c, id='q1', phone='0999999999', start=NOW + 2 * HOUR, ip='ip2')
        with self.assertRaises(sqlite3.IntegrityError):
            submit(self.c, id='q2', phone='0999999999', start=NOW + 2 * HOUR, ip='ip3')

    def test_ip_rate_limit_is_per_hour(self):
        for i in range(10):
            submit(self.c, id=f'i{i}', phone=f'09000000{i:02d}', ip='same')
        with self.assertRaises(sqlite3.IntegrityError):
            submit(self.c, id='i10', phone='0900000099', ip='same')
        submit(self.c, id='i11', phone='0900000098', ip='same', created=NOW + 2 * HOUR, start=NOW + 5 * HOUR)

    def test_confirm_flow_requires_claim_room_and_booking(self):
        submit(self.c)
        self.assertEqual(self.c.execute(CLAIM, ('u1', NOW, 't1', 'r1')).rowcount, 1)
        self.assertEqual(self.c.execute(CLAIM, ('u2', NOW, 't1', 'r1')).rowcount, 0)  # already claimed
        self.assertEqual(self.c.execute(REJECT, ('Hết chỗ', 'u2', NOW, 't1', 'r1')).rowcount, 0)  # cannot reject while claimed
        self.assertEqual(self.c.execute(CANCEL, ('hr1' * 12,)).rowcount, 0)  # nor cancel
        self.assertEqual(self.c.execute(CONFIRM, ('line-1', 'bk1', 'u1', NOW, 't1', 'r1', 'u2')).rowcount, 0)  # wrong claimant
        self.assertEqual(self.c.execute(CONFIRM, ('line-1', 'bk1', 'u1', NOW, 't1', 'r1', 'u1')).rowcount, 1)
        self.assertEqual(status(self.c), ('confirmed', 'line-1', 'bk1', 'u1'))
        self.assertEqual(self.c.execute("SELECT COUNT(*) FROM audit WHERE id='request:r1'").fetchone()[0], 1)

    def test_release_allows_another_staff_member_to_retry(self):
        submit(self.c)
        self.c.execute(CLAIM, ('u1', NOW, 't1', 'r1'))
        self.c.execute(RELEASE, ('t1', 'r1'))
        self.assertEqual(self.c.execute(CLAIM, ('u2', NOW, 't1', 'r1')).rowcount, 1)

    def test_confirmation_without_room_or_booking_is_invalid(self):
        submit(self.c)
        with self.assertRaises(sqlite3.IntegrityError):
            self.c.execute("UPDATE booking_requests SET status='confirmed',handled_by='u1',handled_at=1")

    def test_rejection_needs_reason_and_closes_the_request(self):
        submit(self.c)
        with self.assertRaises(sqlite3.IntegrityError):
            self.c.execute(REJECT, ('', 'u1', NOW, 't1', 'r1'))
        self.assertEqual(self.c.execute(REJECT, ('Hết chỗ giờ đó', 'u1', NOW, 't1', 'r1')).rowcount, 1)
        for statement in ["UPDATE booking_requests SET status='pending'", "UPDATE booking_requests SET people=2", 'DELETE FROM booking_requests']:
            with self.assertRaises(sqlite3.IntegrityError):
                self.c.execute(statement)
        self.assertEqual(self.c.execute(CANCEL, ('hr1' * 12,)).rowcount, 0)

    def test_customer_can_cancel_only_while_unclaimed_pending(self):
        submit(self.c)
        self.assertEqual(self.c.execute(CANCEL, ('hr1' * 12,)).rowcount, 1)
        self.assertEqual(status(self.c)[0], 'cancelled')
        self.assertEqual(self.c.execute(CANCEL, ('hr1' * 12,)).rowcount, 0)

    def test_requests_are_scoped_by_tenant_and_pending_listed_first(self):
        submit(self.c, id='a', tenant='t1', start=NOW + 5 * HOUR)
        submit(self.c, id='b', tenant='t1', phone='0911111111', start=NOW + 3 * HOUR, ip='ip2')
        submit(self.c, id='c', tenant='t2', phone='0922222222', ip='ip3')
        self.c.execute(REJECT, ('Hết chỗ', 'u1', NOW, 't1', 'a'))
        rows = self.c.execute(LIST, ('t1',)).fetchall()
        self.assertEqual([r['id'] for r in rows], ['b', 'a'])


if __name__ == '__main__':
    unittest.main(verbosity=2)
