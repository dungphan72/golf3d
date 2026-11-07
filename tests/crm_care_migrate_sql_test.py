"""One-time import of the old CRM's customer care data into the CRM module (scripts/crm-care-to-crm2.sql, -undo.sql)."""
import json, pathlib, unittest
from finance_sql_test import connection, DDL

ROOT = pathlib.Path(__file__).resolve().parents[1]
MIGRATE = (ROOT / 'scripts/crm-care-to-crm2.sql').read_text(encoding='utf8')
UNDO = (ROOT / 'scripts/crm-care-undo.sql').read_text(encoding='utf8')
NOW = 1_800_000_000_000
DAY = 86_400_000


def scalar(c, sql, *args):
    return c.execute(sql, args).fetchone()[0]


def seed(c):
    c.execute("INSERT INTO users(id,email,name,password_hash,created) VALUES ('u1','a@x.vn','Thu Ngân','h',0),('u2','b@x.vn','Sale','h',0)")
    for cid, tenant, phone in (('c1', 't1', '0911111111'), ('c2', 't1', '0922222222'), ('c3', 't2', '0933333333')):
        c.execute("INSERT INTO customers(id,tenant,name,phone,note,created) VALUES (?,?,?,?,'',?)", (cid, tenant, 'Khách ' + cid, phone, NOW))
    task = ("INSERT INTO crm_tasks(id,tenant,customer_id,rule,key,title,data,due,status,assignee,channel,note,created,handled_by,handled_at) "
            "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
    c.execute(task, ('k1', 't1', 'c1', 'welcome', 'welcome:c1', 'Chào mừng khách mới', '{"ten":"A"}', NOW + DAY, 'open', None, None, '', NOW, None, None))
    # The old table only accepts open tasks on insert; they are closed afterwards, as the app did.
    c.execute(task, ('k2', 't1', 'c1', 'thanks', 'thanks:b9', 'Cảm ơn sau buổi chơi', '{}', NOW, 'open', 'u1', None, '', NOW - DAY, None, None))
    c.execute("UPDATE crm_tasks SET status='done',channel='zalo',note='Khách hẹn thứ 7',handled_by='u1',handled_at=? WHERE id='k2'", (NOW + 5,))
    c.execute(task, ('k3', 't1', 'c2', 'comeback', 'comeback:c2:1', 'Mời khách quay lại', '{}', NOW, 'open', None, None, '', NOW - DAY, None, None))
    c.execute("UPDATE crm_tasks SET status='skipped',note='Khách đã chuyển nhà',handled_by='u2',handled_at=? WHERE id='k3'", (NOW + 9,))
    c.execute(task, ('k4', 't2', 'c3', 'birthday', 'bday:c3:2027', 'Chúc mừng sinh nhật', '{}', NOW, 'open', 'u2', None, '', NOW, None, None))
    inter = "INSERT INTO crm_interactions(id,tenant,customer_id,task_id,channel,content,actor,created) VALUES (?,?,?,?,?,?,?,?)"
    c.execute(inter, ('i1', 't1', 'c1', 'k2', 'zalo', 'Khách hẹn thứ 7', 'u1', NOW + 5))
    c.execute(inter, ('i2', 't1', 'c2', None, 'note', 'Phản hồi 2/5 sao', 'u-da-xoa', NOW + 6))
    care = {'rules': {'comeback': {'enabled': False, 'value': 45}}, 'templates': {'welcome': 'Chào {ten}, mời ghé {cs}'}, 'vipSpend': 5000000}
    c.execute("INSERT INTO settings(tenant,value) VALUES ('t1',?)", (json.dumps({'name': 'CLB', 'crm': care}),))
    c.execute("INSERT INTO settings(tenant,value) VALUES ('t2',?)", (json.dumps({'name': 'CLB 2'}),))
    ag = "INSERT INTO crm_agents(tenant,user_id,receives_leads,on_duty,duty_since,last_assigned,zalo_id,email,updated) VALUES (?,?,?,?,NULL,NULL,?,?,?)"
    c.execute(ag, ('t1', 'u1', 1, 1, 'zalo-u1', 'u1@mail.vn', NOW))
    c.execute(ag, ('t1', 'u2', 0, 0, '', '', NOW))


class CrmCareMigration(unittest.TestCase):
    def setUp(self):
        self.c = connection()
        self.c.executescript(DDL)
        seed(self.c)

    def run_migration(self):
        self.c.executescript(MIGRATE)

    def task(self, id):
        return self.c.execute('SELECT * FROM crm2_tasks WHERE id=?', ('mig-' + id,)).fetchone()

    def test_every_task_arrives_once_in_its_club_and_open_or_closed(self):
        self.run_migration()
        self.assertEqual(scalar(self.c, "SELECT COUNT(*) FROM crm2_tasks WHERE id LIKE 'mig-%'"), 4)
        self.assertEqual(scalar(self.c, "SELECT tenant FROM crm2_tasks WHERE id='mig-k4'"), 't2')
        open_ = self.task('k1')
        self.assertEqual((open_['rule'], open_['customer_id'], open_['done_at'], open_['outcome'], open_['lead_id']),
                         ('welcome', 'c1', None, '', None))
        self.assertEqual((open_['ukey'], open_['due_at'], open_['title']), ('welcome:c1', NOW + DAY, 'Chào mừng khách mới'))
        done = self.task('k2')
        self.assertEqual((done['outcome'], done['channel'], done['note'], done['done_at'], done['assignee']),
                         ('done', 'zalo', 'Khách hẹn thứ 7', NOW + 5, 'u1'))
        skipped = self.task('k3')
        self.assertEqual((skipped['outcome'], skipped['note'], skipped['done_at'], skipped['assignee']),
                         ('skipped', 'Khách đã chuyển nhà', NOW + 9, 'u2'))

    def test_the_old_task_key_blocks_the_cron_from_making_the_task_again(self):
        self.run_migration()
        again = ("INSERT OR IGNORE INTO crm2_tasks(id,tenant,lead_id,title,type,ukey,created,customer_id,rule) "
                 "VALUES ('new1','t1',NULL,'Chào mừng khách mới','CALL','welcome:c1',?, 'c1','welcome')")
        self.assertEqual(self.c.execute(again, (NOW,)).rowcount, 0)

    def test_notes_keep_their_task_and_show_a_name(self):
        self.run_migration()
        n1 = self.c.execute("SELECT * FROM crm2_customer_notes WHERE id='mig-i1'").fetchone()
        self.assertEqual((n1['task_id'], n1['actor'], n1['channel'], n1['content']), ('mig-k2', 'Thu Ngân', 'zalo', 'Khách hẹn thứ 7'))
        n2 = self.c.execute("SELECT * FROM crm2_customer_notes WHERE id='mig-i2'").fetchone()
        self.assertEqual((n2['task_id'], n2['actor']), (None, ''))  # an unknown user id never leaks into the text

    def test_care_settings_move_over_without_touching_clubs_that_never_set_them(self):
        self.run_migration()
        value = json.loads(scalar(self.c, "SELECT value FROM crm2_settings WHERE tenant='t1'"))
        self.assertEqual(value['care']['rules']['comeback'], {'enabled': False, 'value': 45})
        self.assertEqual(value['care']['vipSpend'], 5000000)
        self.assertEqual(scalar(self.c, "SELECT COUNT(*) FROM crm2_settings WHERE tenant='t2'"), 0)

    def test_settings_already_in_the_module_are_not_overwritten(self):
        mine = json.dumps({'care': {'vipSpend': 1}, 'slaMinutes': 7})
        self.c.execute("INSERT INTO crm2_settings(tenant,value,updated) VALUES ('t1',?,0)", (mine,))
        self.run_migration()
        value = json.loads(scalar(self.c, "SELECT value FROM crm2_settings WHERE tenant='t1'"))
        self.assertEqual(value['care'], {'vipSpend': 1})
        self.assertEqual(value['slaMinutes'], 7)

    def test_agents_bring_zalo_id_email_and_the_not_receiving_list(self):
        self.run_migration()
        row = self.c.execute("SELECT zalo_id,notify_email FROM crm2_staff WHERE tenant='t1' AND user_id='u1'").fetchone()
        self.assertEqual((row['zalo_id'], row['notify_email']), ('zalo-u1', 'u1@mail.vn'))
        value = json.loads(scalar(self.c, "SELECT value FROM crm2_settings WHERE tenant='t1'"))
        self.assertEqual(value['distribution']['paused'], ['u2'])  # u2 never received leads
        self.assertEqual(value['care']['vipSpend'], 5000000)  # the care settings survive the second step

    def test_staff_details_typed_in_the_module_are_kept(self):
        self.c.execute("INSERT INTO crm2_staff(tenant,user_id,team,is_leader,extension,zalo_id,notify_email,updated) VALUES ('t1','u1','Tổ A',1,'101','zalo-moi','',0)")
        self.run_migration()
        row = self.c.execute("SELECT * FROM crm2_staff WHERE tenant='t1' AND user_id='u1'").fetchone()
        self.assertEqual((row['team'], row['is_leader'], row['zalo_id'], row['notify_email']), ('Tổ A', 1, 'zalo-moi', 'u1@mail.vn'))

    def test_running_twice_changes_nothing(self):
        self.run_migration()
        before = [self.c.execute(f'SELECT * FROM {t} ORDER BY 1').fetchall() for t in ('crm2_tasks', 'crm2_customer_notes', 'crm2_staff')]
        settings = scalar(self.c, "SELECT value FROM crm2_settings WHERE tenant='t1'")
        self.run_migration()
        after = [self.c.execute(f'SELECT * FROM {t} ORDER BY 1').fetchall() for t in ('crm2_tasks', 'crm2_customer_notes', 'crm2_staff')]
        self.assertEqual([[tuple(r) for r in t] for t in before], [[tuple(r) for r in t] for t in after])
        self.assertEqual(settings, scalar(self.c, "SELECT value FROM crm2_settings WHERE tenant='t1'"))

    def test_old_tables_are_not_changed(self):
        before = [self.c.execute(f'SELECT * FROM {t} ORDER BY 1').fetchall() for t in ('crm_tasks', 'crm_interactions', 'crm_agents')]
        self.run_migration()
        after = [self.c.execute(f'SELECT * FROM {t} ORDER BY 1').fetchall() for t in ('crm_tasks', 'crm_interactions', 'crm_agents')]
        self.assertEqual([[tuple(r) for r in t] for t in before], [[tuple(r) for r in t] for t in after])

    def test_undo_removes_only_imported_tasks_and_notes(self):
        self.c.execute("INSERT INTO crm2_tasks(id,tenant,lead_id,title,type,ukey,created,customer_id,rule) VALUES ('own1','t1',NULL,'Việc tạo trong module','CALL','own',?, 'c1','manual')", (NOW,))
        self.c.execute("INSERT INTO crm2_customer_notes(id,tenant,customer_id,task_id,channel,content,actor,created) VALUES ('own-n','t1','c1',NULL,'note','Ghi chú riêng','',?)", (NOW,))
        self.run_migration()
        self.c.executescript(UNDO)
        self.assertEqual(scalar(self.c, "SELECT COUNT(*) FROM crm2_tasks WHERE id LIKE 'mig-%'"), 0)
        self.assertEqual(scalar(self.c, "SELECT COUNT(*) FROM crm2_customer_notes WHERE id LIKE 'mig-%'"), 0)
        self.assertEqual(scalar(self.c, "SELECT COUNT(*) FROM crm2_tasks WHERE id='own1'"), 1)
        self.assertEqual(scalar(self.c, "SELECT COUNT(*) FROM crm2_customer_notes WHERE id='own-n'"), 1)
        self.run_migration()  # and it can be imported again
        self.assertEqual(scalar(self.c, "SELECT COUNT(*) FROM crm2_tasks WHERE id LIKE 'mig-%'"), 4)


if __name__ == '__main__':
    unittest.main()
