"""CRM: automatic task generation (idempotent), customer statistics and the CRM tables (migration 0016)."""
import pathlib, re, sqlite3, unittest
from finance_sql_test import connection, DDL

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = (ROOT / 'lib/crm-sql.ts').read_text(encoding='utf8')
DAY = 86_400_000
NOW = 1_800_000_000_000  # 2027-01-15 08:00 UTC, i.e. 15:00 in Vietnam


def const(name):
    return re.search(r'const ' + name + r" = `([^`]+)`;", SOURCE).group(1)


PHONE = re.search(r"const PHONE = `([^`]+)`;", SOURCE).group(1)
NORM = re.search(r"const NORM = `([^`]+)`;", SOURCE).group(1).replace('${PHONE}', PHONE)
ID = 'lower(hex(randomblob(16)))'
COLUMNS = re.search(r"const TASK_COLUMNS =\s*'([^']+)'", SOURCE).group(1)


def sql(name):
    s = const(name)
    s = s.replace('${NORM}', NORM).replace('${ID}', ID).replace('${TASK_COLUMNS}', COLUMNS).replace('${BALANCES}', BALANCES)
    s = re.sub(r"\$\{dateOf\('([a-z.]+)'\)\}", lambda m: "strftime('%d/%m/%Y',(" + m.group(1) + "+25200000)/1000,'unixepoch')", s)
    s = s.replace('${DAY_MS}', str(DAY))
    return s


BALANCES = re.search(r"const BALANCES = `([^`]+)`;", SOURCE).group(1)
ENSURE = sql('CRM_ENSURE_CUSTOMERS_SQL')
WELCOME = sql('CRM_WELCOME_SQL')
THANKS = sql('CRM_THANKS_SQL')
COMEBACK = sql('CRM_COMEBACK_SQL')
EXPIRING = sql('CRM_PKG_EXPIRING_SQL')
LOW = sql('CRM_PKG_LOW_SQL')
POINTS = sql('CRM_POINTS_SQL')
CUSTOMERS = sql('CRM_CUSTOMERS_SQL')
TASKS = sql('CRM_TASKS_SQL')
BIRTHDAY = re.search(r"crmBirthdaySql = \(days: number\) => `([^`]+)`", SOURCE).group(1).replace('${ID}', ID).replace('${TASK_COLUMNS}', COLUMNS)


def birthday_sql(n):
    return BIRTHDAY.replace("${Array.from({ length: days }, () => '?').join(',')}", ','.join('?' * n))


def customer(c, id='c1', phone='0912345678', name='Khách A', created=NOW - 100 * DAY, birthday=''):
    c.execute("INSERT INTO customers(id,tenant,name,phone,note,created,birthday) VALUES (?,'t1',?,?,'',?,?)", (id, name, phone, created, birthday))


def paid(c, id, phone='0912345678', finished=NOW - DAY, amount=500_000, name='Khách A', service='18'):
    c.execute(
        "INSERT INTO bookings(id,tenant,room,customer,phone,service,people,start,end,status,segments,golf_amount,food_total,amount,finished,payment,price,created) VALUES (?,'t1','line-1',?,?,?,1,0,1,'paid','[]',?,0,?,?, 'cash','{}',0)",
        (id, name, phone, service, amount, amount, finished),
    )


def tasks(c, rule=None):
    rows = c.execute('SELECT * FROM crm_tasks' + (" WHERE rule='%s'" % rule if rule else '') + ' ORDER BY created').fetchall()
    return rows


class CrmSQL(unittest.TestCase):
    def setUp(self):
        self.c = connection()
        self.c.executescript(DDL)

    def run_all(self):
        self.c.execute(ENSURE, (NOW, 't1'))
        self.c.execute(THANKS, (24, NOW, 't1', NOW - 3 * DAY, NOW - 7 * DAY))
        self.c.execute(COMEBACK, (NOW, NOW, NOW, 't1', NOW - 30 * DAY, NOW - 365 * DAY))

    def test_customer_records_are_created_from_paid_bookings_with_any_phone_format(self):
        paid(self.c, 'b1', phone='0912 345 678')
        paid(self.c, 'b2', phone='+84 912-345-678')  # same person, other format
        paid(self.c, 'b3', phone='0987654321', name='Khách B')
        paid(self.c, 'b4', phone='12ab')  # not a phone number: ignored
        self.c.execute(ENSURE, (NOW, 't1'))
        rows = self.c.execute('SELECT phone FROM customers ORDER BY phone').fetchall()
        self.assertEqual([r[0] for r in rows], ['0912345678', '0987654321'])
        self.c.execute(ENSURE, (NOW, 't1'))
        self.assertEqual(self.c.execute('SELECT COUNT(*) FROM customers').fetchone()[0], 2)
        visits = self.c.execute("SELECT COUNT(*) FROM crm_visits WHERE customer_id=(SELECT id FROM customers WHERE phone='0912345678')").fetchone()[0]
        self.assertEqual(visits, 2)

    def test_thanks_task_follows_the_latest_round_once_and_not_too_often(self):
        customer(self.c)
        paid(self.c, 'b1', finished=NOW - 2 * DAY)
        paid(self.c, 'b2', finished=NOW - DAY)
        self.run_all()
        t = tasks(self.c, 'thanks')
        self.assertEqual(len(t), 1)
        self.assertEqual(t[0]['key'], 'thanks:b2')
        self.assertEqual(t[0]['due'], NOW - DAY + 24 * 3_600_000)
        self.run_all()  # nothing new
        self.assertEqual(len(tasks(self.c, 'thanks')), 1)
        paid(self.c, 'b3', finished=NOW - 1000)  # another round within 7 days: no second thank-you
        self.run_all()
        self.assertEqual(len(tasks(self.c, 'thanks')), 1)

    def test_comeback_task_once_per_lapse(self):
        customer(self.c)
        paid(self.c, 'b1', finished=NOW - 45 * DAY)
        self.run_all()
        t = tasks(self.c, 'comeback')
        self.assertEqual(len(t), 1)
        self.assertIn('"so_ngay":45', t[0]['data'])
        self.run_all()
        self.assertEqual(len(tasks(self.c, 'comeback')), 1)
        # a customer who played recently, or long ago (> 1 year), gets nothing
        customer(self.c, 'c2', phone='0987654321')
        paid(self.c, 'b2', phone='0987654321', finished=NOW - 5 * DAY)
        customer(self.c, 'c3', phone='0977000111')
        paid(self.c, 'b3', phone='0977000111', finished=NOW - 400 * DAY)
        self.run_all()
        self.assertEqual(len(tasks(self.c, 'comeback')), 1)

    def test_welcome_task_for_new_customers_only(self):
        customer(self.c, created=NOW - 3 * DAY)
        customer(self.c, 'c2', phone='0987654321', created=NOW - 60 * DAY)
        self.c.execute(WELCOME, (0, NOW, 't1', NOW - 14 * DAY))
        self.c.execute(WELCOME, (0, NOW, 't1', NOW - 14 * DAY))
        t = tasks(self.c, 'welcome')
        self.assertEqual([x['customer_id'] for x in t], ['c1'])

    def package(self, id='p1', expires=NOW + 3 * DAY, grants=(('gdr', 10),), used=0):
        self.c.execute(
            """INSERT INTO customer_packages(id,tenant,customer_id,type_id,name,source,price_paid,grants,perks,purchased,expires,actor,room) VALUES (?,'t1','c1',NULL,'Gói 10 giờ','sale',3000000,'[{"kind":"gdr","qty":10}]','',0,?,'u','any')""",
            (id, expires),
        )
        for kind, qty in grants:
            self.c.execute("INSERT INTO package_ledger(id,tenant,package_id,kind,delta,reason,booking_id,actor,note,created) VALUES (?,'t1',?,?,?,'grant',NULL,'u','',0)", (id + kind, id, kind, qty))
        if used:
            self.c.execute("INSERT INTO package_ledger(id,tenant,package_id,kind,delta,reason,booking_id,actor,note,created) VALUES (?,'t1',?,'gdr',?,'adjust',NULL,'u','dùng thử',0)", (id + 'u', id, -used))

    def test_package_flows(self):
        customer(self.c)
        self.package('p1', expires=NOW + 3 * DAY, used=1)  # 9 left, expires soon
        self.package('p2', expires=NOW + 40 * DAY, used=9)  # 1 hour left, plenty of time
        self.package('p3', expires=NOW + 2 * DAY, used=10)  # empty: nothing to remind
        self.package('p4', expires=NOW - DAY, used=9)  # already expired
        for _ in range(2):
            self.c.execute(EXPIRING, (NOW, NOW, 't1', NOW, NOW + 7 * DAY))
            self.c.execute(LOW, (NOW, NOW, 't1', NOW, 2))
        self.assertEqual([x['key'] for x in tasks(self.c, 'pkg_expiring')], ['pkgexp:p1'])
        self.assertEqual([x['key'] for x in tasks(self.c, 'pkg_low')], ['pkglow:p2'])
        self.assertIn('"balances":[{"kind":"gdr","remaining":9}]', tasks(self.c, 'pkg_expiring')[0]['data'])

    def test_birthday_and_points_flows(self):
        # 2027-01-15 in Vietnam: birthday on the 16th is within the next 2 days, the 20th is not
        customer(self.c, birthday='1990-01-16')
        customer(self.c, 'c2', phone='0987654321', birthday='01-20')
        customer(self.c, 'c3', phone='0977000111', birthday='')
        for _ in range(2):
            self.c.execute(birthday_sql(3), ('2027', NOW, NOW, 't1', '01-15', '01-16', '01-17'))
        self.assertEqual([x['customer_id'] for x in tasks(self.c, 'birthday')], ['c1'])
        self.c.execute("INSERT INTO loyalty_ledger(id,tenant,customer_id,delta,reason,booking_id,actor,created) VALUES ('l1','t1','c1',12,'adjust',NULL,'u',0)")
        for _ in range(2):
            self.c.execute(POINTS, (10, NOW, NOW, 't1', 10))
        self.assertEqual([x['key'] for x in tasks(self.c, 'points')], ['points:c1:1'])

    def test_customer_statistics(self):
        customer(self.c, created=NOW - 10 * DAY)
        paid(self.c, 'b1', finished=NOW - 100 * DAY, amount=300_000)
        paid(self.c, 'b2', finished=NOW - 10 * DAY, amount=700_000)
        row = self.c.execute(CUSTOMERS, (NOW - 90 * DAY, 't1', '', '%', '%')).fetchone()
        self.assertEqual((row['visits'], row['last_visit'], row['spend'], row['recent_visits']), (2, NOW - 10 * DAY, 1_000_000, 1))
        self.assertEqual(len(self.c.execute(CUSTOMERS, (NOW, 't1', '0912', '%0912%', '%0912%')).fetchall()), 1)
        self.assertEqual(len(self.c.execute(CUSTOMERS, (NOW, 't1', 'zzz', '%zzz%', '%zzz%')).fetchall()), 0)

    def test_tenants_are_isolated(self):
        customer(self.c)
        self.c.execute("INSERT INTO bookings(id,tenant,room,customer,phone,service,people,start,end,status,segments,golf_amount,food_total,amount,finished,payment,price,created) VALUES ('bx','t2','line-1','Khách X','0912345678','18',1,0,1,'paid','[]',1000,0,1000,?, 'cash','{}',0)", (NOW - DAY,))
        self.assertEqual(self.c.execute("SELECT COUNT(*) FROM crm_visits WHERE tenant='t1'").fetchone()[0], 0)


class CrmTables(unittest.TestCase):
    def setUp(self):
        self.c = connection()
        self.c.executescript(DDL)
        customer(self.c)

    def insert(self, key='key1', title='Việc thử', status='open', customer_id='c1', data='{}'):
        return self.c.execute(
            "INSERT INTO crm_tasks(" + COLUMNS + ") VALUES (?,'t1',?,'manual',?,?,?,?,?,NULL,NULL,'',0,NULL,NULL)",
            ('id-' + key, customer_id, key, title, data, NOW, status),
        ).rowcount

    def test_task_validation_and_uniqueness(self):
        self.assertEqual(self.insert(), 1)
        for kw in [dict(key='key2', status='done'), dict(key='key3', title='a'), dict(key='key4', customer_id='nope'), dict(key='key5', data='not json')]:
            with self.assertRaises(sqlite3.IntegrityError, msg=str(kw)):
                self.insert(**kw)
        with self.assertRaises(sqlite3.IntegrityError):  # the same event never makes two tasks
            self.c.execute(
                "INSERT INTO crm_tasks(" + COLUMNS + ") VALUES ('other','t1','c1','manual','key1','Việc',?,?,'open',NULL,NULL,'',0,NULL,NULL)",
                ('{}', NOW),
            )

    def test_task_lifecycle_is_one_way(self):
        self.insert()
        self.c.execute("UPDATE crm_tasks SET due=due+1000,assignee='u1' WHERE id='id-key1'")
        with self.assertRaises(sqlite3.IntegrityError):  # closing needs who and when
            self.c.execute("UPDATE crm_tasks SET status='done' WHERE id='id-key1'")
        self.c.execute("UPDATE crm_tasks SET status='done',channel='call',handled_by='u1',handled_at=5 WHERE id='id-key1'")
        for stmt in ["UPDATE crm_tasks SET status='open'", "UPDATE crm_tasks SET note='x'", 'DELETE FROM crm_tasks']:
            with self.assertRaises(sqlite3.IntegrityError, msg=stmt):
                self.c.execute(stmt)

    def test_task_identity_is_immutable(self):
        self.insert()
        for stmt in ["UPDATE crm_tasks SET title='Khác'", "UPDATE crm_tasks SET customer_id='c9'", "UPDATE crm_tasks SET key='key9'"]:
            with self.assertRaises(sqlite3.IntegrityError, msg=stmt):
                self.c.execute(stmt)

    def test_interactions_are_validated_and_immutable(self):
        ins = "INSERT INTO crm_interactions(id,tenant,customer_id,task_id,channel,content,actor,created) VALUES (?,'t1',?,NULL,?,?,'u1',1)"
        self.assertEqual(self.c.execute(ins, ('i1', 'c1', 'call', 'Đã gọi')).rowcount, 1)
        for args in [('i2', 'c1', 'fax', 'x'), ('i3', 'c1', 'call', ''), ('i4', 'nope', 'call', 'x')]:
            with self.assertRaises(sqlite3.IntegrityError, msg=str(args)):
                self.c.execute(ins, args)
        for stmt in ["UPDATE crm_interactions SET content='x'", 'DELETE FROM crm_interactions']:
            with self.assertRaises(sqlite3.IntegrityError):
                self.c.execute(stmt)

    def test_birthday_format(self):
        for ok in ['1990-05-17', '05-17', '']:
            self.c.execute('UPDATE customers SET birthday=? WHERE id=?', (ok, 'c1'))
        for bad in ['17/05/1990', 'abc', '1990-5-7']:
            with self.assertRaises(sqlite3.IntegrityError, msg=bad):
                self.c.execute('UPDATE customers SET birthday=? WHERE id=?', (bad, 'c1'))


if __name__ == '__main__':
    unittest.main()
