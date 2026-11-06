"""CRM leads: tables, uniqueness (no duplicate lead, contact, event or message) and one-way rules (migration 0017)."""
import sqlite3, unittest
from finance_sql_test import connection, DDL

NOW = 1_800_000_000_000
LEAD_COLS = (
    "id,tenant,customer_id,name,phone,email,zalo_id,source,campaign,channel_ref,need,guests,preferred_start,message,status,"
    "assignee,assigned_at,due_at,first_call_at,escalations,tried,received_at,updated,closed_at,lost_reason"
)


def lead(c, id='l1', phone='0912345678', source='website', status='queued', channel_ref='', tenant='t1'):
    return c.execute(
        "INSERT INTO crm_leads(" + LEAD_COLS + ") VALUES (?,?,NULL,'An',?,'','',?, '', ?, 'swing',0,NULL,'',?,NULL,NULL,NULL,NULL,0,'[]',?,?,NULL,'')",
        (id, tenant, phone, source, channel_ref, status, NOW, NOW),
    ).rowcount


def contact(c, id, lead_id='l1', key='website:1'):
    return c.execute(
        "INSERT INTO crm_lead_contacts(id,tenant,lead_id,source,campaign,ext_key,message,received_at) VALUES (?,'t1',?,'website','',?,'',?)",
        (id, lead_id, key, NOW),
    ).rowcount


def event(c, id, ukey=None, kind='assigned', detail='{}'):
    return c.execute(
        "INSERT OR IGNORE INTO crm_lead_events(id,tenant,lead_id,customer_id,kind,actor,detail,created,ukey) VALUES (?,'t1','l1',NULL,?,NULL,?,?,?)",
        (id, kind, detail, NOW, ukey),
    ).rowcount


def message(c, id, ukey='notify:l1:0:u1:email', channel='email', body='Lead mới', status='pending'):
    return c.execute(
        "INSERT OR IGNORE INTO crm_outbox(id,tenant,ukey,channel,recipient,subject,body,kind,audience,lead_id,customer_id,send_at,status,attempts,last_error,created,sent_at) VALUES (?,'t1',?,?,'a@b.vn','s',?,'lead_assigned','staff','l1',NULL,?,?,0,'',?,NULL)",
        (id, ukey, channel, body, NOW, status, NOW),
    ).rowcount


class LeadSQL(unittest.TestCase):
    def setUp(self):
        self.c = connection()
        self.c.executescript(DDL)

    def test_lead_validation(self):
        self.assertEqual(lead(self.c), 1)
        for kw in [dict(id='x1', phone='123', status='queued'), dict(id='x2', phone='0912345679', source='tiktok'), dict(id='x3', phone='0912345670', status='contacted'), dict(id='x4', phone='+84912345671')]:
            with self.assertRaises(sqlite3.IntegrityError, msg=str(kw)):
                lead(self.c, **kw)

    def test_one_open_lead_per_phone_but_a_closed_one_does_not_block(self):
        lead(self.c)
        with self.assertRaises(sqlite3.IntegrityError):
            lead(self.c, 'l2')
        self.c.execute("UPDATE crm_leads SET status='contacted' WHERE id='l1'")  # contacted is no longer "waiting": a new inquiry is a new case
        self.assertEqual(lead(self.c, 'l2'), 1)
        self.c.execute("UPDATE crm_leads SET status='booked',closed_at=1 WHERE id='l1'")

    def test_leads_without_a_phone_do_not_collide(self):
        self.assertEqual(lead(self.c, 'z1', phone='', source='zalo', channel_ref='zalo:u1'), 1)
        self.assertEqual(lead(self.c, 'z2', phone='', source='zalo', channel_ref='zalo:u2'), 1)

    def test_lead_rules_are_one_way(self):
        lead(self.c)
        for stmt in ["UPDATE crm_leads SET phone='0987654321'", "UPDATE crm_leads SET source='ads'", "UPDATE crm_leads SET received_at=1", "UPDATE crm_leads SET status='nope'", 'DELETE FROM crm_leads']:
            with self.assertRaises(sqlite3.IntegrityError, msg=stmt):
                self.c.execute(stmt)
        self.c.execute("UPDATE crm_leads SET status='assigned',assignee='u1',due_at=?,first_call_at=?", (NOW + 300_000, NOW + 1000))
        with self.assertRaises(sqlite3.IntegrityError):  # the first call time never changes once recorded
            self.c.execute("UPDATE crm_leads SET first_call_at=NULL")
        self.c.execute("UPDATE crm_leads SET escalations=1")
        with self.assertRaises(sqlite3.IntegrityError):
            self.c.execute("UPDATE crm_leads SET escalations=0")
        self.c.execute("UPDATE crm_leads SET status='lost',closed_at=5,lost_reason='Giá cao'")
        with self.assertRaises(sqlite3.IntegrityError):  # closed leads are final
            self.c.execute("UPDATE crm_leads SET status='assigned'")

    def test_the_same_webhook_event_is_never_stored_twice(self):
        lead(self.c)
        self.assertEqual(contact(self.c, 'k1'), 1)
        with self.assertRaises(sqlite3.IntegrityError):
            contact(self.c, 'k2')
        self.assertEqual(contact(self.c, 'k3', key='website:2'), 1)
        for stmt in ["UPDATE crm_lead_contacts SET message='x'", 'DELETE FROM crm_lead_contacts']:
            with self.assertRaises(sqlite3.IntegrityError):
                self.c.execute(stmt)

    def test_system_steps_are_idempotent_by_key(self):
        lead(self.c)
        self.assertEqual(event(self.c, 'e1', ukey='assign:l1:0'), 1)
        self.assertEqual(event(self.c, 'e2', ukey='assign:l1:0'), 0, 'running the step again records nothing')
        self.assertEqual(event(self.c, 'e3', ukey='assign:l1:1'), 1)
        self.assertEqual(event(self.c, 'e4'), 1)
        self.assertEqual(event(self.c, 'e5'), 1, 'events without a key (calls) may repeat')
        with self.assertRaises(sqlite3.IntegrityError):
            event(self.c, 'e6', kind='x')
        with self.assertRaises(sqlite3.IntegrityError):
            event(self.c, 'e7', detail='not json')
        for stmt in ["UPDATE crm_lead_events SET kind='x'", 'DELETE FROM crm_lead_events']:
            with self.assertRaises(sqlite3.IntegrityError):
                self.c.execute(stmt)

    def test_a_message_is_queued_once_and_a_sent_one_is_final(self):
        self.assertEqual(message(self.c, 'm1'), 1)
        self.assertEqual(message(self.c, 'm2'), 0, 'same key: ignored')
        self.assertEqual(message(self.c, 'm3', ukey='notify:l1:0:u1:zalo', channel='zalo'), 1)
        for kw in [dict(id='b1', ukey='k-bad1', channel='sms'), dict(id='b2', ukey='k-bad2', body=''), dict(id='b3', ukey='k-bad3', status='sent')]:
            with self.assertRaises(sqlite3.IntegrityError, msg=str(kw)):
                message(self.c, **kw)
        self.c.execute("UPDATE crm_outbox SET attempts=1 WHERE id='m1'")
        self.c.execute("UPDATE crm_outbox SET status='sent',sent_at=5 WHERE id='m1'")
        for stmt in ["UPDATE crm_outbox SET status='pending' WHERE id='m1'", "UPDATE crm_outbox SET body='x' WHERE id='m3'", 'DELETE FROM crm_outbox']:
            with self.assertRaises(sqlite3.IntegrityError, msg=stmt):
                self.c.execute(stmt)

    def test_agents_and_consent_are_validated(self):
        ins = "INSERT INTO crm_agents(tenant,user_id,receives_leads,on_duty,duty_since,last_assigned,zalo_id,email,updated) VALUES ('t1',?,?,?,NULL,NULL,'','',0)"
        self.c.execute(ins, ('u1', 1, 1))
        with self.assertRaises(sqlite3.IntegrityError):
            self.c.execute(ins, ('u1', 1, 0))  # one row per staff member
        with self.assertRaises(sqlite3.IntegrityError):
            self.c.execute(ins, ('u2', 2, 0))
        self.c.execute("INSERT INTO customers(id,tenant,name,phone,note,created) VALUES ('c1','t1','An','0912345678','',0)")
        self.c.execute('UPDATE customers SET marketing_consent=1,consent_at=5')
        with self.assertRaises(sqlite3.IntegrityError):
            self.c.execute('UPDATE customers SET marketing_consent=2')


if __name__ == '__main__':
    unittest.main()
