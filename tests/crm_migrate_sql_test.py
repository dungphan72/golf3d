"""One-time import of the old CRM leads into the CRM module (scripts/crm-legacy-to-crm2.sql, -undo.sql, -verify.sql)."""
import hashlib, json, pathlib, sqlite3, unittest
from finance_sql_test import connection, DDL

ROOT = pathlib.Path(__file__).resolve().parents[1]
MIGRATE = (ROOT / 'scripts/crm-legacy-to-crm2.sql').read_text(encoding='utf8')
UNDO = (ROOT / 'scripts/crm-legacy-undo.sql').read_text(encoding='utf8')
VERIFY = (ROOT / 'scripts/crm-legacy-verify.sql').read_text(encoding='utf8')
NOW = 1_800_000_000_000  # 2027-01-15 08:00 UTC = 15:00 in Vietnam
MIN = 60_000
DAY = 86_400_000


def old_lead(c, id, tenant='t1', phone='0912345678', source='website', need='swing', message='', assignee=None,
             preferred=None, queued=False, name='An'):
    """The old table only accepts status queued/assigned on insert; later states come from UPDATE."""
    c.execute(
        "INSERT INTO crm_leads(id,tenant,customer_id,name,phone,email,zalo_id,source,campaign,channel_ref,need,guests,preferred_start,"
        "message,status,assignee,assigned_at,due_at,first_call_at,escalations,tried,received_at,updated,closed_at,lost_reason) "
        "VALUES (?,?,NULL,?,?,'a@b.vn','',?, '', ?,?,0,?,?,?,?,?,?,NULL,0,'[]',?,?,NULL,'')",
        (id, tenant, name, phone, source, 'ref-' + id, need, preferred, message,
         'queued' if queued else 'assigned', None if queued else assignee, None if queued else NOW,
         NOW + 5 * MIN, NOW, NOW + 10),
    )


def contact(c, id, lead_id, message='', source='website', campaign='', tenant='t1'):
    c.execute(
        "INSERT INTO crm_lead_contacts(id,tenant,lead_id,source,campaign,ext_key,message,received_at) VALUES (?,?,?,?,?,?,?,?)",
        (id, tenant, lead_id, source, campaign, 'key-' + id, message, NOW),
    )


def event(c, id, lead_id, kind, detail='{}', actor=None, tenant='t1'):
    c.execute(
        "INSERT INTO crm_lead_events(id,tenant,lead_id,customer_id,kind,actor,detail,created,ukey) VALUES (?,?,?,NULL,?,?,?,?,?)",
        (id, tenant, lead_id, kind, actor, detail, NOW + 1, 'uk-' + id),
    )


def seed(c):
    old_lead(c, 'l1', assignee='u1', message='Muốn học swing', preferred=NOW + DAY)
    old_lead(c, 'l2', phone='0987654321', source='facebook', queued=True, name='Bình')
    old_lead(c, 'l3', phone='', source='zalo', need='9', assignee='u2', name='')
    c.execute("UPDATE crm_leads SET status='contacted',stage='qualified',tags='[\"VIP\"]',first_call_at=?,next_at=?,next_note='Gọi lại thứ bảy',"
              "note='Khách hay đi nhóm',missed=2 WHERE id='l3'", (NOW + 20 * MIN, NOW + 2 * DAY))
    old_lead(c, 'l4', phone='0900000004', source='ads', need='group', assignee='u1', name='Dũng')
    c.execute("UPDATE crm_leads SET status='lost',stage='lost',lost_reason='Không liên lạc được',closed_at=? WHERE id='l4'", (NOW + DAY,))
    old_lead(c, 'l5', phone='0900000005', source='manual', need='18', assignee='u2', name='Em')
    c.execute("UPDATE crm_leads SET status='booked',stage='won',deal_value=5000000,closed_at=?,first_call_at=? WHERE id='l5'", (NOW + 3 * DAY, NOW + 3 * MIN))
    old_lead(c, 'x1', tenant='t2', phone='0911111111', assignee='u9')
    contact(c, 'c1', 'l1', 'Muốn học swing')
    contact(c, 'c2', 'l1', 'Gửi lại lần hai')
    contact(c, 'c3', 'l2', source='facebook', campaign='thang-11')
    event(c, 'e1', 'l1', 'received')
    event(c, 'e2', 'l1', 'assigned', '{"to":"u1"}')
    event(c, 'e3', 'l3', 'call', '{"result":"answered"}', actor='u2')
    event(c, 'e4', 'l3', 'stage', '{"from":"new","to":"qualified"}', actor='u2')
    event(c, 'e5', 'l3', 'contact')
    event(c, 'e6', 'l4', 'overdue', '{"attempt":1}')


def digest(c, table):
    rows = c.execute('SELECT * FROM ' + table + ' ORDER BY id').fetchall()
    return hashlib.sha256(json.dumps([list(r) for r in rows], default=str).encode()).hexdigest()


def scalar(c, sql, *args):
    return c.execute(sql, args).fetchone()[0]


class CrmLegacyMigration(unittest.TestCase):
    def setUp(self):
        self.c = connection()
        self.c.executescript(DDL)
        seed(self.c)

    def run_migration(self):
        self.c.executescript(MIGRATE)

    def lead(self, id):
        return self.c.execute('SELECT * FROM crm2_leads WHERE id=?', ('mig-' + id,)).fetchone()

    def test_every_old_lead_arrives_once_with_its_tenant(self):
        self.run_migration()
        self.assertEqual(scalar(self.c, "SELECT COUNT(*) FROM crm2_leads WHERE id LIKE 'mig-%'"), 6)
        self.assertEqual(scalar(self.c, "SELECT tenant FROM crm2_leads WHERE id='mig-x1'"), 't2')
        self.assertEqual(scalar(self.c, "SELECT COUNT(*) FROM crm2_leads WHERE tenant='t1'"), 5)

    def test_fields_of_an_assigned_lead(self):
        self.run_migration()
        r = self.lead('l1')
        self.assertEqual((r['full_name'], r['phone'], r['phone_norm'], r['email']), ('An', '0912345678', '0912345678', 'a@b.vn'))
        self.assertEqual((r['source'], r['target_service'], r['notes']), ('Website', 'Luyện swing', 'Muốn học swing'))
        self.assertEqual((r['stage'], r['status_id'], r['owner'], r['owned_at'], r['pooled_at']), ('NEW', 'khach-moi', 'u1', NOW, None))
        self.assertEqual((r['next_action'], r['next_due']), ('NEW', NOW + 5 * MIN))
        self.assertEqual((r['created'], r['updated']), (NOW, NOW + 10))
        # 15:00 in Vietnam, one day later
        self.assertEqual((r['preferred_date'], r['preferred_time']), ('2027-01-16', '15:00'))
        self.assertEqual(r['inquiry_count'], 2)  # two contacts
        self.assertIn('CRM cũ', json.loads(r['labels']))

    def test_queued_lead_goes_to_the_pool(self):
        self.run_migration()
        r = self.lead('l2')
        self.assertEqual((r['owner'], r['owned_at'], r['pooled_at']), (None, None, NOW))
        self.assertEqual((r['source'], r['full_name'], r['inquiry_count']), ('Facebook', 'Bình', 1))

    def test_contacted_lead_keeps_follow_up_notes_tags_and_first_response(self):
        self.run_migration()
        r = self.lead('l3')
        self.assertEqual((r['full_name'], r['phone'], r['phone_norm'], r['source'], r['target_service']),
                         ('Khách chưa có tên', '', '', 'Zalo OA', 'Game 9 hố'))
        self.assertEqual((r['stage'], r['status_id'], r['next_action'], r['next_due']), ('QUALIFIED', 'goi-lai-1', 'FOLLOW_UP', NOW + 2 * DAY))
        self.assertEqual(r['notes'], 'Khách hay đi nhóm\nViệc tiếp theo: Gọi lại thứ bảy')
        self.assertEqual(json.loads(r['labels']), ['VIP', 'CRM cũ'])
        self.assertEqual((r['call_attempts'], r['first_response_at'], r['first_response_by'], r['first_response_min']),
                         (2, NOW + 20 * MIN, 'u2', 20))

    def test_closed_leads(self):
        self.run_migration()
        lost, won = self.lead('l4'), self.lead('l5')
        self.assertEqual((lost['stage'], lost['status_id'], lost['lost_reason'], lost['next_action'], lost['next_due'], lost['won_at']),
                         ('LOST', 'khong-lien-lac-duoc', 'Không liên lạc được', 'NONE', None, None))
        self.assertEqual((lost['source'], lost['target_service']), ('Quảng cáo', 'Nhóm / sự kiện'))
        self.assertEqual((won['stage'], won['status_id'], won['expected_value'], won['won_at'], won['source']),
                         ('WON', 'da-mua', 5_000_000, NOW + 3 * DAY, 'Nhập tay'))

    def test_history_becomes_activities(self):
        self.run_migration()
        got = {r['id']: (r['lead_id'], r['type']) for r in self.c.execute("SELECT * FROM crm2_activities WHERE id LIKE 'mig-%'")}
        # three customer messages, event rows except received/contact, one origin line per lead
        self.assertEqual({k: v for k, v in got.items() if k.startswith('mig-c-')},
                         {'mig-c-c1': ('mig-l1', 'INQUIRY'), 'mig-c-c2': ('mig-l1', 'INQUIRY'), 'mig-c-c3': ('mig-l2', 'INQUIRY')})
        self.assertEqual({k: v for k, v in got.items() if k.startswith('mig-e-')},
                         {'mig-e-e2': ('mig-l1', 'ASSIGN'), 'mig-e-e3': ('mig-l3', 'CALL'),
                          'mig-e-e4': ('mig-l3', 'STAGE'), 'mig-e-e6': ('mig-l4', 'SYSTEM')})
        self.assertEqual(len([k for k in got if k.startswith('mig-s-')]), 6)
        call = self.c.execute("SELECT * FROM crm2_activities WHERE id='mig-e-e3'").fetchone()
        self.assertEqual(json.loads(call['meta'])['detail'], {'result': 'answered'})
        self.assertEqual(call['actor'], 'u2')
        other = self.c.execute("SELECT content,meta FROM crm2_activities WHERE id='mig-e-e6'").fetchone()
        self.assertEqual(other['content'], 'Quá hạn gọi (CRM cũ)')
        self.assertEqual(scalar(self.c, "SELECT content FROM crm2_activities WHERE id='mig-e-e3'"), 'Cuộc gọi: đã nghe máy, đã tư vấn (CRM cũ)')
        self.assertEqual(scalar(self.c, "SELECT content FROM crm2_activities WHERE id='mig-e-e4'"), 'Chuyển giai đoạn: Mới → Có nhu cầu (CRM cũ)')
        self.assertEqual(scalar(self.c, "SELECT content FROM crm2_activities WHERE id='mig-e-e2'"), 'Giao cho nhân viên (CRM cũ)')
        self.assertEqual(json.loads(other['meta']), {'legacy': 'event', 'kind': 'overdue', 'detail': {'attempt': 1}})
        self.assertEqual(scalar(self.c, "SELECT content FROM crm2_activities WHERE id='mig-c-c3'"), 'Liên hệ qua facebook')

    def test_running_twice_changes_nothing(self):
        self.run_migration()
        first = (digest(self.c, 'crm2_leads'), digest(self.c, 'crm2_activities'))
        self.run_migration()
        self.assertEqual((digest(self.c, 'crm2_leads'), digest(self.c, 'crm2_activities')), first)

    def test_a_second_run_picks_up_leads_added_meanwhile_without_touching_edited_ones(self):
        self.run_migration()
        # staff worked on an imported lead in the new CRM
        self.c.execute("UPDATE crm2_leads SET owner='u7', stage='CONTACTED', status_id='da-lien-he' WHERE id='mig-l1'")
        old_lead(self.c, 'l9', phone='0900000009', assignee='u1', name='Mới')
        self.run_migration()
        self.assertEqual(scalar(self.c, "SELECT COUNT(*) FROM crm2_leads WHERE id LIKE 'mig-%'"), 7)
        r = self.lead('l1')
        self.assertEqual((r['owner'], r['stage']), ('u7', 'CONTACTED'))  # the edit survived

    def test_old_tables_are_never_changed(self):
        before = {t: digest(self.c, t) for t in ('crm_leads', 'crm_lead_contacts', 'crm_lead_events')}
        self.run_migration()
        self.c.executescript(UNDO)
        self.assertEqual({t: digest(self.c, t) for t in before}, before)

    def test_undo_removes_only_imported_rows(self):
        self.run_migration()
        self.c.execute("INSERT INTO crm2_leads(id,tenant,full_name,phone,created,updated) VALUES ('native-1','t1','Khách mới','0900000001',1,1)")
        self.c.execute("INSERT INTO crm2_activities(id,tenant,lead_id,type,created) VALUES ('native-a','t1','native-1','NOTE',1)")
        self.c.executescript(UNDO)
        self.assertEqual(scalar(self.c, "SELECT COUNT(*) FROM crm2_leads WHERE id LIKE 'mig-%'"), 0)
        self.assertEqual(scalar(self.c, "SELECT COUNT(*) FROM crm2_activities WHERE id LIKE 'mig-%'"), 0)
        self.assertEqual(scalar(self.c, "SELECT COUNT(*) FROM crm2_leads WHERE id='native-1'"), 1)
        self.assertEqual(scalar(self.c, "SELECT COUNT(*) FROM crm2_activities WHERE id='native-a'"), 1)
        self.run_migration()  # and it can be imported again
        self.assertEqual(scalar(self.c, "SELECT COUNT(*) FROM crm2_leads WHERE id LIKE 'mig-%'"), 6)

    def test_an_empty_old_crm_imports_nothing(self):
        c = connection()
        c.executescript(DDL)
        c.executescript(MIGRATE)
        self.assertEqual(scalar(c, 'SELECT COUNT(*) FROM crm2_leads'), 0)
        self.assertEqual(scalar(c, 'SELECT COUNT(*) FROM crm2_activities'), 0)

    def test_verification_queries_agree_with_the_import(self):
        self.run_migration()
        statements = [s.strip() for s in VERIFY.split(';') if 'SELECT' in s]
        self.assertEqual(len(statements), 7)
        results = [self.c.execute(s).fetchall() for s in statements]
        # 1. old against imported per tenant
        self.assertEqual({(r[0], r[1], r[2]) for r in results[0]}, {('t1', 5, 5), ('t2', 1, 1)})
        self.assertEqual(results[1], [])  # 2. nothing missing
        self.assertEqual(tuple(results[2][0]), (3, 3))  # 3. contacts
        self.assertEqual(results[3], [])  # 4. no orphans
        self.assertEqual(sum(r[2] for r in results[4]), 6)  # 5. all leads landed somewhere
        self.assertEqual(results[5], [])  # 6. every open lead has an owner or sits in the pool
        self.assertEqual([r[0] for r in results[6]], ['mig-l3'])  # 7. only the nameless Zalo lead needs a look


if __name__ == '__main__':
    unittest.main()
