"""Regress SQL syntax that SQLite accepts but Wrangler's splitter misinterprets."""
import pathlib,subprocess,json,sqlite3,unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
class MigrationSplitter(unittest.TestCase):
 def test_all_migrations_execute_as_actual_wrangler_statements(self):
  result=subprocess.run(['node','scripts/migration-statements.mjs'],cwd=ROOT,capture_output=True,text=True,check=True,timeout=30)
  migrations=json.loads(result.stdout);db=sqlite3.connect(':memory:');db.execute('PRAGMA foreign_keys=ON')
  for migration in migrations:
   for i,statement in enumerate(migration['statements']):
    with self.subTest(migration=migration['name'],statement=i):db.execute(statement)
  self.assertEqual(db.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name IN ('menu_items','food_orders')").fetchone()[0],2)
if __name__=='__main__':unittest.main(verbosity=2)
