"""CRM module: remembered webhook events and the chat channel reference on leads (migration 0020)."""
import sqlite3, unittest
from finance_sql_test import connection, DDL

NOW = 1_800_000_000_000


def lead(c, id, tenant='t1', channel_ref=None):
    cols = 'id,tenant,full_name,phone,created,updated' + (',channel_ref' if channel_ref is not None else '')
    marks = '?,?,?,?,?,?' + (',?' if channel_ref is not None else '')
    args = [id, tenant, 'Khách Zalo', '', NOW, NOW] + ([channel_ref] if channel_ref is not None else [])
    c.execute(f'INSERT INTO crm2_leads({cols}) VALUES ({marks})', args)


class CrmInbound(unittest.TestCase):
    def setUp(self):
        self.c = connection()
        self.c.executescript(DDL)

    def remember(self, key, lead_id='l1', tenant='t1'):
        return self.c.execute(
            'INSERT OR IGNORE INTO crm2_inbound(tenant,ext_key,lead_id,created) VALUES (?,?,?,?)', (tenant, key, lead_id, NOW)
        ).rowcount

    def test_an_event_is_remembered_once_per_club(self):
        self.assertEqual(self.remember('zalo:m1'), 1)
        self.assertEqual(self.remember('zalo:m1', 'other-lead'), 0)  # a retry does not overwrite or repeat
        self.assertEqual(self.c.execute("SELECT lead_id FROM crm2_inbound WHERE ext_key='zalo:m1'").fetchone()[0], 'l1')
        self.assertEqual(self.remember('zalo:m1', 'l9', tenant='t2'), 1)  # another club may see the same id
        self.assertEqual(self.c.execute('SELECT COUNT(*) FROM crm2_inbound').fetchone()[0], 2)

    def test_a_plain_insert_of_a_repeated_event_is_refused(self):
        self.remember('zalo:m1')
        with self.assertRaises(sqlite3.IntegrityError):
            self.c.execute("INSERT INTO crm2_inbound(tenant,ext_key,lead_id,created) VALUES ('t1','zalo:m1','l2',1)")

    def test_leads_have_no_channel_reference_unless_given(self):
        lead(self.c, 'a')
        lead(self.c, 'b', channel_ref='zalo:u1')
        rows = dict(self.c.execute('SELECT id,channel_ref FROM crm2_leads').fetchall())
        self.assertEqual(rows, {'a': '', 'b': 'zalo:u1'})

    def test_the_reference_is_stamped_only_while_empty(self):
        lead(self.c, 'a')
        stamp = "UPDATE crm2_leads SET channel_ref=? WHERE tenant='t1' AND id='a' AND channel_ref=''"
        self.assertEqual(self.c.execute(stamp, ('zalo:u1',)).rowcount, 1)
        self.assertEqual(self.c.execute(stamp, ('zalo:u2',)).rowcount, 0)  # never replaced afterwards
        self.assertEqual(self.c.execute("SELECT channel_ref FROM crm2_leads WHERE id='a'").fetchone()[0], 'zalo:u1')

    def test_finding_the_open_lead_of_a_chat_customer(self):
        lead(self.c, 'old', channel_ref='zalo:u1')
        self.c.execute("UPDATE crm2_leads SET stage='WON' WHERE id='old'")
        lead(self.c, 'open', channel_ref='zalo:u1')
        lead(self.c, 'other-club', tenant='t2', channel_ref='zalo:u1')
        found = self.c.execute(
            "SELECT id FROM crm2_leads WHERE tenant='t1' AND channel_ref='zalo:u1' AND stage<>'WON' ORDER BY created DESC LIMIT 1"
        ).fetchone()
        self.assertEqual(found[0], 'open')


if __name__ == '__main__':
    unittest.main()
