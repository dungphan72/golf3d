"""Coaches and lessons: overlap prevention, status machine and tenant isolation (migration 0007)."""
import sqlite3, pathlib, re, unittest
from finance_sql_test import connection, DDL
from package_sql_test import customer

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = (ROOT / 'lib/coaching-sql.ts').read_text()


def sql(name):
    return re.search(r'export const ' + name + r' = `([^`]+)`;', SOURCE).group(1)


COACH = sql('CREATE_COACH_SQL')
UPDATE_COACH = sql('UPDATE_COACH_SQL')
LESSON = sql('CREATE_LESSON_SQL')
RESCHEDULE = sql('RESCHEDULE_LESSON_SQL')
STATUS = sql('SET_LESSON_STATUS_SQL')
NOTE = sql('NOTE_LESSON_SQL')
LIST = sql('LIST_LESSONS_SQL')
HOUR = 3_600_000
NOW = 1_000_000_000_000


def coach(c, id='k1', tenant='t1', user=None, active=1):
    c.execute(COACH, (id, tenant, user, 'HLV Một', '0900000001', active, NOW))


def lesson(c, id='l1', coach_id='k1', tenant='t1', start=NOW + 2 * HOUR, minutes=60, customer_id=None,
           phone='0912345678', created=NOW, request=None):
    c.execute(LESSON, (id, tenant, coach_id, customer_id, 'Học viên A', phone, start, minutes, None, 500000, '',
                       'staff', request or 'req-' + id, created))


def state(c, id='l1'):
    return c.execute('SELECT status,coach_note FROM lessons WHERE id=?', (id,)).fetchone()[:]


class CoachingSQL(unittest.TestCase):
    def setUp(self):
        self.c = connection()
        self.c.executescript(DDL)
        coach(self.c)

    def test_lesson_is_scheduled_and_audited(self):
        lesson(self.c)
        self.assertEqual(state(self.c)[0], 'scheduled')
        self.assertEqual(self.c.execute("SELECT COUNT(*) FROM audit WHERE id='lesson:l1'").fetchone()[0], 1)

    def test_same_coach_cannot_be_double_booked_but_edges_touch(self):
        lesson(self.c)
        with self.assertRaises(sqlite3.IntegrityError):
            lesson(self.c, id='l2', start=NOW + 2 * HOUR + 30 * 60000)  # overlaps
        lesson(self.c, id='l3', start=NOW + 3 * HOUR)  # starts exactly when l1 ends
        lesson(self.c, id='l4', start=NOW + HOUR, minutes=60)  # ends exactly when l1 starts

    def test_other_coach_or_tenant_is_independent(self):
        coach(self.c, id='k2')
        coach(self.c, id='k3', tenant='t2')
        lesson(self.c)
        lesson(self.c, id='l2', coach_id='k2')
        lesson(self.c, id='l3', coach_id='k3', tenant='t2')

    def test_cancelled_lesson_frees_the_slot(self):
        lesson(self.c)
        self.c.execute(STATUS, ('cancelled', '', '', 't1', 'l1'))
        lesson(self.c, id='l2')

    def test_cross_tenant_and_inactive_coach_are_rejected(self):
        with self.assertRaises(sqlite3.IntegrityError):
            lesson(self.c, tenant='t2')
        coach(self.c, id='k9', active=0)
        with self.assertRaises(sqlite3.IntegrityError):
            lesson(self.c, id='l9', coach_id='k9')

    def test_invalid_lessons_are_rejected(self):
        for i, kw in enumerate([dict(minutes=10), dict(minutes=500), dict(minutes=50), dict(phone='123'),
                                dict(start=NOW - 10 * HOUR)]):
            with self.subTest(kw=kw), self.assertRaises(sqlite3.IntegrityError):
                lesson(self.c, id=f'b{i}', **kw)
        with self.assertRaises(sqlite3.IntegrityError):
            lesson(self.c, id='bc', customer_id='missing')

    def test_linked_customer_must_belong_to_tenant(self):
        customer(self.c, id='c1')
        lesson(self.c, customer_id='c1')
        customer(self.c, id='c2', tenant='t2', phone='0999999999')
        with self.assertRaises(sqlite3.IntegrityError):
            lesson(self.c, id='l2', start=NOW + 6 * HOUR, customer_id='c2')

    def test_status_machine_is_one_way_and_idempotent_by_guard(self):
        lesson(self.c)
        self.assertEqual(self.c.execute(STATUS, ('done', 'Cải thiện cú swing', 'Cải thiện cú swing', 't1', 'l1')).rowcount, 1)
        self.assertEqual(state(self.c), ('done', 'Cải thiện cú swing'))
        self.assertEqual(self.c.execute(STATUS, ('cancelled', '', '', 't1', 'l1')).rowcount, 0)  # already closed
        self.c.execute(NOTE, ('Bổ sung ghi chú', 't1', 'l1'))  # notes stay editable
        with self.assertRaises(sqlite3.IntegrityError):
            self.c.execute("UPDATE lessons SET status='scheduled'")
        with self.assertRaises(sqlite3.IntegrityError):
            self.c.execute('UPDATE lessons SET minutes=90')
        with self.assertRaises(sqlite3.IntegrityError):
            self.c.execute('DELETE FROM lessons')

    def test_reschedule_checks_overlap_and_only_while_scheduled(self):
        lesson(self.c)
        lesson(self.c, id='l2', start=NOW + 5 * HOUR)
        with self.assertRaises(sqlite3.IntegrityError):
            self.c.execute(RESCHEDULE, ('k1', NOW + 5 * HOUR + 1800000, 60, '', 't1', 'l1'))
        self.assertEqual(self.c.execute(RESCHEDULE, ('k1', NOW + 8 * HOUR, 90, 'Đổi giờ', 't1', 'l1')).rowcount, 1)
        self.c.execute(STATUS, ('no_show', '', '', 't1', 'l1'))
        self.assertEqual(self.c.execute(RESCHEDULE, ('k1', NOW + 9 * HOUR, 60, '', 't1', 'l1')).rowcount, 0)

    def test_identity_is_immutable(self):
        lesson(self.c)
        for statement in ["UPDATE lessons SET phone='0900000000'", "UPDATE lessons SET customer_name='X Y'", "UPDATE lessons SET tenant='t2'"]:
            with self.assertRaises(sqlite3.IntegrityError):
                self.c.execute(statement)

    def test_coach_user_link_requires_coach_membership_and_no_delete(self):
        self.c.execute("INSERT INTO users(id,email,name,password_hash,must_change,created) VALUES ('u1','h@x.vn','HLV','h',0,1),('u2','s@x.vn','Thu ngân','h',0,1)")
        self.c.execute("INSERT INTO memberships VALUES ('u1','t1','coach',1),('u2','t1','cashier',1)")
        coach(self.c, id='k5', user='u1')
        with self.assertRaises(sqlite3.IntegrityError):
            coach(self.c, id='k6', user='u2')
        self.assertEqual(self.c.execute(UPDATE_COACH, ('HLV Mới', '0900000002', 'u1', 1, 't1', 'k5')).rowcount, 1)
        with self.assertRaises(sqlite3.IntegrityError):
            self.c.execute('DELETE FROM coaches')

    def test_list_filters_by_range_and_coach(self):
        coach(self.c, id='k2')
        lesson(self.c, start=NOW + 2 * HOUR)
        lesson(self.c, id='l2', coach_id='k2', start=NOW + 3 * HOUR)
        lesson(self.c, id='l3', start=NOW + 30 * HOUR)
        rows = self.c.execute(LIST, ('t1', NOW, NOW + 24 * HOUR, '', '')).fetchall()
        self.assertEqual([r['id'] for r in rows], ['l1', 'l2'])
        rows = self.c.execute(LIST, ('t1', NOW, NOW + 48 * HOUR, 'k1', 'k1')).fetchall()
        self.assertEqual([r['id'] for r in rows], ['l1', 'l3'])


if __name__ == '__main__':
    unittest.main(verbosity=2)
