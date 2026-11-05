"""Member web accounts: migration 0012 (validation, rate limit, immutability, one account per phone)."""
import sqlite3, unittest
from finance_sql_test import connection, DDL

NOW = 1_000_000_000_000
HASH = 'pbkdf2$100000$' + 'a' * 30


def customer(c, id='c1', tenant='t1', phone='0912345678'):
    c.execute("INSERT INTO customers(id,tenant,name,phone,note,created) VALUES (?,?,?,?,?,?)", (id, tenant, 'Khách', phone, '', 0))


def account(c, id='a1', tenant='t1', cust='c1', phone='0912345678', created=NOW, verified=0, email='', pw=HASH):
    return c.execute(
        "INSERT INTO member_accounts(id,tenant,customer_id,phone,email,password_hash,verified,failed_count,locked_until,created) VALUES (?,?,?,?,?,?,?,0,0,?)",
        (id, tenant, cust, phone, email, pw, verified, created),
    ).rowcount


class MemberAccountSQL(unittest.TestCase):
    def setUp(self):
        self.c = connection()
        self.c.executescript(DDL)
        customer(self.c)

    def test_account_starts_unverified_and_must_match_its_customer(self):
        self.assertEqual(account(self.c), 1)
        with self.assertRaises(sqlite3.IntegrityError):
            account(self.c, 'a2', verified=1, phone='0987654321')
        customer(self.c, 'c2', phone='0911111111')
        with self.assertRaises(sqlite3.IntegrityError):  # phone differs from the customer's
            account(self.c, 'a3', cust='c2', phone='0922222222')
        with self.assertRaises(sqlite3.IntegrityError):  # other tenant's customer
            account(self.c, 'a4', tenant='t2')

    def test_bad_values_are_rejected(self):
        for kw in [dict(phone='123'), dict(phone='+84912345678'), dict(pw='short')]:
            with self.assertRaises(sqlite3.IntegrityError, msg=str(kw)):
                account(self.c, **kw)

    def test_one_account_per_phone(self):
        account(self.c)
        with self.assertRaises(sqlite3.IntegrityError):
            account(self.c, 'a2')

    def test_registration_rate_limit(self):
        for i in range(30):
            customer(self.c, f'x{i}', phone=f'09000000{i:02d}')
            account(self.c, f'r{i}', cust=f'x{i}', phone=f'09000000{i:02d}', created=NOW + i)
        customer(self.c, 'x99', phone='0999999999')
        with self.assertRaises(sqlite3.IntegrityError):
            account(self.c, 'r99', cust='x99', phone='0999999999', created=NOW + 100)
        self.assertEqual(account(self.c, 'r100', cust='x99', phone='0999999999', created=NOW + 2 * 3_600_000), 1)

    def test_identity_is_immutable_and_verification_one_way(self):
        account(self.c)
        for stmt in [
            "UPDATE member_accounts SET phone='0900000009'",
            "UPDATE member_accounts SET customer_id='zz'",
            "UPDATE member_accounts SET verified=2",
        ]:
            with self.assertRaises(sqlite3.IntegrityError, msg=stmt):
                self.c.execute(stmt)
        self.c.execute("UPDATE member_accounts SET verified=1")
        self.c.execute("UPDATE member_accounts SET email='a@b.vn'")
        with self.assertRaises(sqlite3.IntegrityError):
            self.c.execute("UPDATE member_accounts SET verified=0")


if __name__ == '__main__':
    unittest.main()
