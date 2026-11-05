"""Revenue report SQL: VN-day grouping, method split, tenant isolation, date range."""
import pathlib, re, unittest
from finance_sql_test import connection, DDL, opening, booking, entry

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = (ROOT / 'lib/report-sql.ts').read_text()


def sql(name):
    return re.search(r'export const ' + name + r' = `([^`]+)`;', SOURCE).group(1)


DAYS = sql('REPORT_DAYS_SQL')
SERVICES = sql('REPORT_SERVICES_SQL')
H = 3600_000
DAY0 = 1_700_000_000_000 - (1_700_000_000_000 + 7 * H) % (24 * H)  # 00:00 VN time of some day, in UTC ms


class ReportSQL(unittest.TestCase):
    def setUp(self):
        self.c = connection()
        self.c.executescript(DDL)
        opening(self.c, amount=500000)

    def pay(self, id, when, method='cash', amount=100000):
        booking(self.c, 'b' + id, amount=amount)
        entry(self.c, id, book='b' + id, method=method, amount=amount)

    def test_groups_by_vietnam_day_and_splits_methods(self):
        # created is fixed by the insert helper (10 ms), so verify against the epoch day in VN time
        self.pay('1', 0, 'cash', 100000)
        self.pay('2', 0, 'transfer', 250000)
        rows = [dict(r) for r in self.c.execute(DAYS, ('t1', 0, 24 * H)).fetchall()]
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['day'], '1970-01-01')
        self.assertEqual((rows[0]['cash'], rows[0]['transfer'], rows[0]['card']), (100000, 250000, 0))
        self.assertEqual(rows[0]['payments'], 2)

    def test_range_and_tenant_filters(self):
        self.pay('1', 0)
        self.assertEqual(self.c.execute(DAYS, ('t1', 1000, 2000)).fetchall(), [])  # entry at 10 ms is outside
        self.assertEqual(self.c.execute(DAYS, ('t2', 0, 24 * H)).fetchall(), [])

    def test_cash_out_is_counted_as_expense_not_revenue(self):
        entry(self.c, 'x1', kind='cash_out', book=None, amount=40000)
        row = dict(self.c.execute(DAYS, ('t1', 0, 24 * H)).fetchone())
        self.assertEqual((row['expenses'], row['cash'], row['payments']), (40000, 0, 0))

    def test_services_only_count_paid_rounds_in_range(self):
        self.pay('1', 0)
        self.c.execute("UPDATE bookings SET finished=5 WHERE id='b1'")
        rows = [dict(r) for r in self.c.execute(SERVICES, ('t1', 0, 100)).fetchall()]
        self.assertEqual(rows, [{'service': 'gdr', 'rounds': 1, 'revenue': 100000, 'food': 0}])
        self.assertEqual(self.c.execute(SERVICES, ('t1', 100, 200)).fetchall(), [])


if __name__ == '__main__':
    unittest.main(verbosity=2)
