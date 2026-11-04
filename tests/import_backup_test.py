"""Round trip: data -> /api/export JSON -> scripts/import-backup.mjs -> fresh database."""
import json, pathlib, subprocess, sqlite3, tempfile, unittest
from finance_sql_test import connection, DDL, opening, entry, booking
from package_sql_test import customer, sell, book, redeem, PAY_PKG
from online_sql_test import submit

ROOT = pathlib.Path(__file__).resolve().parents[1]
TABLES = ['settings', 'bookings', 'requests', 'audit', 'shifts', 'finance_entries', 'menu_items', 'food_orders',
          'stock_items', 'stock_movements', 'customers', 'package_types', 'customer_packages', 'package_ledger',
          'package_redemptions', 'loyalty_ledger', 'booking_requests', 'coaches', 'lessons', 'bank_transactions']


def export(c, tenant='t1'):
    data = {}
    for table in TABLES:
        rows = c.execute(f'SELECT * FROM {table} WHERE tenant=?', (tenant,)).fetchall()
        data[table] = [dict(r) for r in rows]
    return {'format': 'golf3d-export/1', 'exportedAt': 1, 'data': data}


def dump(c, table):
    return [tuple(r) for r in c.execute(f'SELECT * FROM {table} ORDER BY 1,2').fetchall()]


class ImportBackup(unittest.TestCase):
    def build_source(self):
        c = connection()
        c.executescript(DDL)
        opening(c)
        customer(c, phone="0912345678")
        c.execute("INSERT INTO settings VALUES ('t1', ?)", (json.dumps({'name': "Golf3D 'quote'", 'vat': 8}),))
        sell(c)  # package sale through the shift ledger
        book(c, id='b1')
        redeem(c, booking_id='b1')
        c.execute(PAY_PKG, ('t1', 'b1', 650000))
        booking(c, id='b2', amount=300000)
        entry(c, id='e2', book='b2', amount=300000, method='cash')
        submit(c, id='r1', phone='0933444555')
        c.execute("INSERT INTO coaches(id,tenant,user_id,name,phone,active,created) VALUES ('k1','t1',NULL,'HLV Một','0900000001',1,1)")
        c.execute("INSERT INTO lessons(id,tenant,coach_id,customer_id,customer_name,phone,start,minutes,room,status,price,note,coach_note,actor,request_id,created) VALUES ('l1','t1','k1',NULL,'Học viên','0912345678',3000000000000,60,NULL,'scheduled',500000,'','','u','r-l1',1)")
        c.commit()
        return c

    def run_import(self, backup):
        with tempfile.TemporaryDirectory() as tmp:
            src = pathlib.Path(tmp) / 'backup.json'
            src.write_text(json.dumps(backup, ensure_ascii=False), encoding='utf8')
            result = subprocess.run(['node', 'scripts/import-backup.mjs', str(src)], cwd=ROOT, capture_output=True,
                                    text=True, encoding='utf8', timeout=120)
        self.assertEqual(result.returncode, 0, result.stderr)
        return result.stdout

    def test_round_trip_restores_all_rows_and_triggers(self):
        source = self.build_source()
        sql = self.run_import(export(source))
        target = connection()
        target.executescript(DDL)
        target.executescript(sql)
        for table in TABLES:
            self.assertEqual(dump(target, table), dump(source, table), table)
        triggers = lambda c: sorted(r[0] for r in c.execute("SELECT name FROM sqlite_master WHERE type='trigger'"))
        self.assertEqual(triggers(target), triggers(source))
        # Rules are enforced again after import: ledgers are immutable, paid bookings cannot change.
        with self.assertRaises(sqlite3.IntegrityError):
            target.execute('UPDATE package_ledger SET delta=99')
        with self.assertRaises(sqlite3.IntegrityError):
            target.execute("UPDATE bookings SET amount=1 WHERE id='b2'")
        with self.assertRaises(sqlite3.IntegrityError):
            target.execute('DELETE FROM finance_entries')

    def test_import_does_not_duplicate_audit_rows(self):
        source = self.build_source()
        target = connection()
        target.executescript(DDL)
        target.executescript(self.run_import(export(source)))
        self.assertEqual(target.execute('SELECT COUNT(*) FROM audit').fetchone()[0],
                         source.execute('SELECT COUNT(*) FROM audit').fetchone()[0])

    def test_rejects_unknown_format_and_tables(self):
        for bad in [{'format': 'other', 'data': {}}, {'format': 'golf3d-export/1', 'data': {'users': []}}]:
            with tempfile.TemporaryDirectory() as tmp:
                src = pathlib.Path(tmp) / 'b.json'
                src.write_text(json.dumps(bad), encoding='utf8')
                result = subprocess.run(['node', 'scripts/import-backup.mjs', str(src)], cwd=ROOT,
                                        capture_output=True, text=True, encoding='utf8')
            self.assertNotEqual(result.returncode, 0)

    def test_create_owner_sql_loads_and_logs_in_with_the_hash(self):
        env = {**__import__('os').environ, 'OWNER_PASSWORD': 'chu-golf-2026'}
        result = subprocess.run(['node', 'scripts/create-owner.mjs', '--tenant', 'local_seedy', '--email',
                                 'Chu@Golf3D.test', '--name', "Chủ O'Neil"], cwd=ROOT, capture_output=True,
                                text=True, encoding='utf8', env=env, timeout=60)
        self.assertEqual(result.returncode, 0, result.stderr)
        c = connection()
        c.executescript(DDL)
        c.executescript(result.stdout)
        row = c.execute("SELECT u.email,u.name,u.password_hash,m.tenant,m.role FROM users u JOIN memberships m ON m.user_id=u.id").fetchone()
        self.assertEqual((row['email'], row['name'], row['tenant'], row['role']), ('chu@golf3d.test', "Chủ O'Neil", 'local_seedy', 'owner'))
        self.assertTrue(row['password_hash'].startswith('pbkdf2$100000$'))
        self.assertNotIn('chu-golf-2026', result.stdout)

    def test_create_owner_refuses_weak_password(self):
        env = {**__import__('os').environ, 'OWNER_PASSWORD': 'short'}
        result = subprocess.run(['node', 'scripts/create-owner.mjs', '--tenant', 't', '--email', 'a@b.vn', '--name', 'Chủ'],
                                cwd=ROOT, capture_output=True, text=True, encoding='utf8', env=env)
        self.assertNotEqual(result.returncode, 0)


if __name__ == '__main__':
    unittest.main(verbosity=2)
