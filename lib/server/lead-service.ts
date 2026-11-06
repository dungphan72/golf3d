import { db, loadConfig, audit, type ServiceResult } from './common';
import { normalizePhone, validPhone } from '../member';
import { CREATE_CUSTOMER_SQL } from '../package-sql';
import { rooms, money, type Booking } from '../club';
import { planBooking } from '../booking';
import { lineSizes } from '../online';
import { can, type Role } from '../auth/permissions';
import {
  SLA_MS,
  NEED_LABELS,
  SOURCE_LABELS,
  CALL_RESULT_LABELS,
  nextStep,
  pickAgent,
  leadLink,
  staffLeadMessage,
  managerMessage,
  bookingInfoMessage,
  reminderMessage,
  cancelMessage,
  noShowMessage,
  receiptMessage,
  thanksMessage,
  bookingLinkMessage,
  type AgentRow,
  type LeadAction,
  type LeadInput,
  type LeadSource,
  type Need,
} from '../leads';
import { enqueue, cancelPending, dispatchDue, type Msg } from './outbox-service';

type R = ServiceResult;
const reply = (body: Record<string, unknown>, status = 200): R => ({ status, body });
const error = (message: string, status = 400): R => reply({ error: message }, status);
const DAY = 86_400_000;
const VN = 7 * 3_600_000;

export type Lead = {
  id: string;
  customer_id: string | null;
  name: string;
  phone: string;
  email: string;
  zalo_id: string;
  source: LeadSource;
  campaign: string;
  channel_ref: string;
  need: string;
  guests: number;
  preferred_start: number | null;
  message: string;
  status: 'queued' | 'assigned' | 'contacted' | 'booked' | 'lost';
  assignee: string | null;
  assigned_at: number | null;
  due_at: number | null;
  first_call_at: number | null;
  escalations: number;
  tried: string;
  received_at: number;
  updated: number;
  lost_reason: string;
  stage: string;
  interest: string;
  budget: number;
  tags: string;
  note: string;
  deal_value: number;
  next_at: number | null;
  next_note: string;
  missed: number;
};

type StaffRow = AgentRow & {
  name: string;
  email: string;
  role: Role;
  agent_email: string;
  zalo_id: string;
};

// ---------------------------------------------------------------- staff and agents

export async function staffRows(tenant: string): Promise<StaffRow[]> {
  const rows = (
    await db()
      .prepare(
        `SELECT m.user_id,u.name,u.email,m.role,COALESCE(a.receives_leads,0) AS receives_leads,COALESCE(a.on_duty,0) AS on_duty,a.duty_since,a.last_assigned,COALESCE(a.zalo_id,'') AS zalo_id,COALESCE(a.email,'') AS agent_email
         FROM memberships m JOIN users u ON u.id=m.user_id AND u.active=1
         LEFT JOIN crm_agents a ON a.tenant=m.tenant AND a.user_id=m.user_id WHERE m.tenant=? ORDER BY u.name`,
      )
      .bind(tenant)
      .all<StaffRow>()
  ).results;
  return rows.filter((r) => can(r.role, 'crm.work'));
}

const staffMessages = (
  agent: Pick<StaffRow, 'user_id' | 'email' | 'agent_email' | 'zalo_id'>,
  ukey: string,
  subject: string,
  body: string,
  kind: string,
  leadId: string,
  customerId: string | null,
): Msg[] => {
  const base = { subject, body, kind, audience: 'staff' as const, leadId, customerId };
  return [
    {
      ...base,
      ukey: `${ukey}:${agent.user_id}:email`,
      channel: 'email',
      recipient: agent.agent_email || agent.email,
    },
    { ...base, ukey: `${ukey}:${agent.user_id}:zalo`, channel: 'zalo', recipient: agent.zalo_id },
  ];
};

export async function setAgent(
  tenant: string,
  actor: { id: string; role: Role },
  input: {
    userId: string;
    receivesLeads?: boolean;
    onDuty?: boolean;
    zaloId?: string;
    email?: string;
  },
  base: string,
  now = Date.now(),
): Promise<R> {
  const own = input.userId === actor.id;
  const manager = can(actor.role, 'crm.manage');
  if (!manager && !(own && input.receivesLeads === undefined))
    return error('Bạn không có quyền thực hiện thao tác này', 403);
  const staff = (await staffRows(tenant)).find((s) => s.user_id === input.userId);
  if (!staff) return error('Không tìm thấy nhân viên hoặc nhân viên không dùng CRM', 404);
  const d = db();
  const receives = input.receivesLeads ?? staff.receives_leads === 1;
  const duty = input.onDuty ?? staff.on_duty === 1;
  if (duty && !receives) return error('Bật "nhận lead" cho nhân viên trước khi vào ca trực');
  await d
    .prepare(
      `INSERT INTO crm_agents(tenant,user_id,receives_leads,on_duty,duty_since,last_assigned,zalo_id,email,updated) VALUES (?,?,?,?,?,NULL,?,?,?)
       ON CONFLICT(tenant,user_id) DO UPDATE SET receives_leads=excluded.receives_leads,on_duty=excluded.on_duty,
       duty_since=CASE WHEN excluded.on_duty=1 AND crm_agents.on_duty=0 THEN excluded.duty_since WHEN excluded.on_duty=0 THEN NULL ELSE crm_agents.duty_since END,
       zalo_id=excluded.zalo_id,email=excluded.email,updated=excluded.updated`,
    )
    .bind(
      tenant,
      input.userId,
      receives ? 1 : 0,
      duty ? 1 : 0,
      duty ? now : null,
      input.zaloId ?? staff.zalo_id,
      input.email ?? staff.agent_email,
      now,
    )
    .run();
  await audit(
    tenant,
    'CRM lead',
    `${staff.name}: nhận lead=${receives ? 'có' : 'không'}, trực=${duty ? 'có' : 'không'}`,
  );
  // Someone coming on duty takes what waited in the queue.
  if (duty) await sweepLeads(tenant, base, now);
  return reply({ ok: true });
}

// ---------------------------------------------------------------- customers

type CustomerRow = {
  id: string;
  name: string;
  phone: string;
  email: string;
  zalo_id: string;
  marketing_consent: number;
};

export async function ensureCustomer(
  tenant: string,
  c: { name: string; phone: string; email?: string; zaloId?: string; consent?: boolean },
  now: number,
): Promise<string | null> {
  const d = db();
  let row: CustomerRow | null = null;
  if (c.phone)
    row = await d
      .prepare(
        'SELECT id,name,phone,email,zalo_id,marketing_consent FROM customers WHERE tenant=? AND phone=?',
      )
      .bind(tenant, c.phone)
      .first<CustomerRow>();
  if (!row && c.zaloId)
    row = await d
      .prepare(
        'SELECT id,name,phone,email,zalo_id,marketing_consent FROM customers WHERE tenant=? AND zalo_id=?',
      )
      .bind(tenant, c.zaloId)
      .first<CustomerRow>();
  if (!row) {
    if (!c.phone) return null;
    const id = crypto.randomUUID();
    const name = c.name.trim().length >= 2 ? c.name.trim() : 'Khách ' + c.phone.slice(-4);
    try {
      await d.prepare(CREATE_CUSTOMER_SQL).bind(id, tenant, name, c.phone, 'Từ lead', now).run();
    } catch {
      row = await d
        .prepare(
          'SELECT id,name,phone,email,zalo_id,marketing_consent FROM customers WHERE tenant=? AND phone=?',
        )
        .bind(tenant, c.phone)
        .first<CustomerRow>();
      if (!row) throw new Error('Không tạo được hồ sơ khách');
      return row.id;
    }
    row = { id, name, phone: c.phone, email: '', zalo_id: '', marketing_consent: 0 };
  }
  const updates: string[] = [];
  const binds: unknown[] = [];
  if (c.email && !row.email) {
    updates.push('email=?');
    binds.push(c.email);
  }
  if (c.zaloId && !row.zalo_id) {
    updates.push('zalo_id=?');
    binds.push(c.zaloId);
  }
  if (c.consent && !row.marketing_consent) {
    updates.push('marketing_consent=1', 'consent_at=?');
    binds.push(now);
  }
  if (updates.length)
    await d
      .prepare(`UPDATE customers SET ${updates.join(',')} WHERE tenant=? AND id=?`)
      .bind(...binds, tenant, row.id)
      .run();
  return row.id;
}

// ---------------------------------------------------------------- events

async function addEvent(
  tenant: string,
  lead: { id: string; customer_id: string | null },
  kind: string,
  detail: Record<string, unknown>,
  now: number,
  actor: string | null = null,
  ukey: string | null = null,
) {
  await db()
    .prepare(
      'INSERT OR IGNORE INTO crm_lead_events(id,tenant,lead_id,customer_id,kind,actor,detail,created,ukey) VALUES (?,?,?,?,?,?,?,?,?)',
    )
    .bind(
      crypto.randomUUID(),
      tenant,
      lead.id,
      lead.customer_id,
      kind,
      actor,
      JSON.stringify(detail),
      now,
      ukey,
    )
    .run();
}

const factsOf = (l: Lead) => ({
  name: l.name,
  phone: l.phone,
  need: NEED_LABELS[l.need as Need] ?? l.need,
  message: l.message,
  source: SOURCE_LABELS[l.source] ?? l.source,
  campaign: l.campaign,
  guests: l.guests,
});

async function getLead(tenant: string, id: string) {
  return db()
    .prepare('SELECT * FROM crm_leads WHERE tenant=? AND id=?')
    .bind(tenant, id)
    .first<Lead>();
}

async function managersOf(tenant: string) {
  const rows = (
    await db()
      .prepare(
        `SELECT m.user_id,u.name,u.email,m.role,COALESCE(a.zalo_id,'') AS zalo_id,COALESCE(a.email,'') AS agent_email
         FROM memberships m JOIN users u ON u.id=m.user_id AND u.active=1 LEFT JOIN crm_agents a ON a.tenant=m.tenant AND a.user_id=m.user_id
         WHERE m.tenant=? AND m.role IN ('owner','manager')`,
      )
      .bind(tenant)
      .all<{
        user_id: string;
        name: string;
        email: string;
        role: string;
        zalo_id: string;
        agent_email: string;
      }>()
  ).results;
  return rows;
}

/** A message to every owner and manager (for example a complaint). One per event thanks to the key. */
export async function alertManagers(
  tenant: string,
  ukey: string,
  subject: string,
  body: string,
  kind: string,
  customerId: string | null,
  now = Date.now(),
) {
  const managers = await managersOf(tenant);
  await enqueue(
    tenant,
    managers.flatMap((m) => staffMessages(m, ukey, subject, body, kind, '', customerId)),
    now,
  );
  await dispatchDue(tenant, now);
}

async function notifyManagers(
  tenant: string,
  lead: Lead,
  kind: 'overdue' | 'queued',
  attempt: number,
  base: string,
  agentName: string | undefined,
  now: number,
) {
  const msg = managerMessage(
    kind,
    { ...factsOf(lead), agent: agentName },
    leadLink(base, lead.id, lead.customer_id),
  );
  const managers = await managersOf(tenant);
  await enqueue(
    tenant,
    managers.flatMap((m) =>
      staffMessages(
        m,
        `mgr-${kind}:${lead.id}:${attempt}`,
        msg.subject,
        msg.body,
        `manager_${kind}`,
        lead.id,
        lead.customer_id,
      ),
    ),
    now,
  );
}

// ---------------------------------------------------------------- assignment

/**
 * Gives the lead to the next on-duty agent: the previous owner first (when allowed), otherwise the
 * agent who has waited longest. Nobody on duty puts the lead in the queue and alerts the managers.
 * Every step is guarded by the lead's escalation counter, so running it twice changes nothing.
 */
export async function assignLead(
  tenant: string,
  leadId: string,
  base: string,
  now: number,
  kind: 'new' | 'reassigned' | 'again',
  prefer: string | null = null,
): Promise<{ assignee: string | null }> {
  const d = db();
  const lead = await getLead(tenant, leadId);
  if (!lead || !['queued', 'assigned'].includes(lead.status) || lead.first_call_at != null)
    return { assignee: lead?.assignee ?? null };
  const tried: string[] = JSON.parse(lead.tried || '[]');
  const staff = await staffRows(tenant);
  const pick = pickAgent(staff, { exclude: kind === 'reassigned' ? tried : [], prefer, now });
  const attempt = lead.escalations;
  if (!pick) {
    if (lead.status !== 'queued') {
      const r = await d
        .prepare(
          "UPDATE crm_leads SET status='queued',assignee=NULL,updated=? WHERE id=? AND tenant=? AND status='assigned' AND first_call_at IS NULL AND escalations=?",
        )
        .bind(now, lead.id, tenant, attempt)
        .run();
      if (!r.meta.changes) return { assignee: null };
    }
    await addEvent(
      tenant,
      lead,
      'queued',
      { reason: 'Không có nhân viên đang trực nhận lead' },
      now,
      null,
      `queue:${lead.id}:${attempt}`,
    );
    await notifyManagers(tenant, lead, 'queued', attempt, base, undefined, now);
    return { assignee: null };
  }
  const due = (kind === 'new' ? lead.received_at : now) + SLA_MS;
  const r = await d
    .prepare(
      "UPDATE crm_leads SET status='assigned',assignee=?,assigned_at=?,due_at=?,tried=?,updated=? WHERE id=? AND tenant=? AND status IN ('queued','assigned') AND first_call_at IS NULL AND escalations=? AND (assignee IS NOT ? OR status='queued')",
    )
    .bind(
      pick.user_id,
      now,
      due,
      JSON.stringify([...new Set([...tried, pick.user_id])]),
      now,
      lead.id,
      tenant,
      attempt,
      pick.user_id,
    )
    .run();
  if (!r.meta.changes) return { assignee: lead.assignee };
  await d
    .prepare('UPDATE crm_agents SET last_assigned=? WHERE tenant=? AND user_id=?')
    .bind(now, tenant, pick.user_id)
    .run();
  const url = leadLink(base, lead.id, lead.customer_id);
  const msg = staffLeadMessage(factsOf(lead), url, kind);
  const agent = staff.find((s) => s.user_id === pick.user_id)!;
  await addEvent(
    tenant,
    lead,
    'assigned',
    { to: agent.name, userId: agent.user_id, due, mode: kind },
    now,
    null,
    `assign:${lead.id}:${attempt}`,
  );
  const queued = await enqueue(
    tenant,
    staffMessages(
      agent,
      `notify:${lead.id}:${attempt}`,
      msg.subject,
      msg.body,
      'lead_assigned',
      lead.id,
      lead.customer_id,
    ),
    now,
  );
  if (!queued && agent.email === '' && agent.zalo_id === '' && agent.agent_email === '')
    await addEvent(
      tenant,
      lead,
      'notify_gap',
      { to: agent.name, reason: 'Nhân viên chưa có email hoặc Zalo để nhận thông báo' },
      now,
      null,
      `gap:${lead.id}:${attempt}`,
    );
  return { assignee: agent.user_id };
}

// ---------------------------------------------------------------- ingest

export async function ingestLead(
  tenant: string,
  input: LeadInput,
  base: string,
  now = Date.now(),
): Promise<{
  leadId: string | null;
  duplicate: boolean;
  merged: boolean;
  assignee: string | null;
  status: string;
}> {
  const d = db();
  const dup = await d
    .prepare('SELECT lead_id FROM crm_lead_contacts WHERE tenant=? AND ext_key=?')
    .bind(tenant, input.extKey)
    .first<{ lead_id: string }>();
  if (dup) {
    const lead = await getLead(tenant, dup.lead_id);
    return {
      leadId: dup.lead_id,
      duplicate: true,
      merged: false,
      assignee: lead?.assignee ?? null,
      status: lead?.status ?? 'lost',
    };
  }
  const customerId = await ensureCustomer(
    tenant,
    {
      name: input.name,
      phone: input.phone,
      email: input.email,
      zaloId: input.zaloId,
      consent: input.consent,
    },
    now,
  );
  // An open lead that nobody has called yet absorbs the new contact; otherwise this is a new case.
  const open = input.phone
    ? await d
        .prepare(
          "SELECT * FROM crm_leads WHERE tenant=? AND phone=? AND status IN ('queued','assigned') LIMIT 1",
        )
        .bind(tenant, input.phone)
        .first<Lead>()
    : input.channelRef
      ? await d
          .prepare(
            "SELECT * FROM crm_leads WHERE tenant=? AND channel_ref=? AND status IN ('queued','assigned') LIMIT 1",
          )
          .bind(tenant, input.channelRef)
          .first<Lead>()
      : null;
  const contact = (leadId: string) =>
    d
      .prepare(
        'INSERT INTO crm_lead_contacts(id,tenant,lead_id,source,campaign,ext_key,message,received_at) VALUES (?,?,?,?,?,?,?,?)',
      )
      .bind(
        crypto.randomUUID(),
        tenant,
        leadId,
        input.source,
        input.campaign,
        input.extKey,
        input.message,
        now,
      );

  if (open) {
    await d.batch([
      contact(open.id),
      d
        .prepare(
          "UPDATE crm_leads SET name=CASE WHEN name='' THEN ? ELSE name END,need=CASE WHEN need='' THEN ? ELSE need END,guests=MAX(guests,?),message=CASE WHEN message='' THEN ? ELSE message END,email=CASE WHEN email='' THEN ? ELSE email END,zalo_id=CASE WHEN zalo_id='' THEN ? ELSE zalo_id END,customer_id=COALESCE(customer_id,?),updated=? WHERE id=? AND tenant=?",
        )
        .bind(
          input.name,
          input.need,
          input.guests,
          input.message,
          input.email,
          input.zaloId,
          customerId,
          now,
          open.id,
          tenant,
        ),
    ]);
    const fresh = (await getLead(tenant, open.id))!;
    await addEvent(
      tenant,
      fresh,
      'contact',
      { source: input.source, campaign: input.campaign, message: input.message },
      now,
      null,
      `contact:${input.extKey}`,
    );
    const staff = await staffRows(tenant);
    const owner = staff.find((s) => s.user_id === fresh.assignee);
    if (fresh.status === 'assigned' && owner && pickAgent([owner], { now })) {
      // The same person keeps the lead and is told the customer wrote again.
      const msg = staffLeadMessage(
        factsOf(fresh),
        leadLink(base, fresh.id, fresh.customer_id),
        'again',
      );
      await enqueue(
        tenant,
        staffMessages(
          owner,
          `again:${input.extKey}`,
          msg.subject,
          msg.body,
          'lead_again',
          fresh.id,
          fresh.customer_id,
        ),
        now,
      );
    } else {
      await assignLead(tenant, fresh.id, base, now, 'new');
    }
    const after = (await getLead(tenant, open.id))!;
    return {
      leadId: open.id,
      duplicate: false,
      merged: true,
      assignee: after.assignee,
      status: after.status,
    };
  }

  // A new case: the customer's previous owner gets the first chance.
  const previous = customerId
    ? await d
        .prepare(
          'SELECT assignee FROM crm_leads WHERE tenant=? AND customer_id=? AND assignee IS NOT NULL ORDER BY received_at DESC LIMIT 1',
        )
        .bind(tenant, customerId)
        .first<{ assignee: string }>()
    : null;
  const id = crypto.randomUUID();
  try {
    await d.batch([
      d
        .prepare(
          "INSERT INTO crm_leads(id,tenant,customer_id,name,phone,email,zalo_id,source,campaign,channel_ref,need,guests,preferred_start,message,status,assignee,assigned_at,due_at,first_call_at,escalations,tried,received_at,updated,closed_at,lost_reason) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,'queued',NULL,NULL,NULL,NULL,0,'[]',?,?,NULL,'')",
        )
        .bind(
          id,
          tenant,
          customerId,
          input.name,
          input.phone,
          input.email,
          input.zaloId,
          input.source,
          input.campaign,
          input.channelRef,
          input.need,
          input.guests,
          input.preferredStart,
          input.message,
          now,
          now,
        ),
      contact(id),
    ]);
  } catch (e) {
    // A concurrent request created the lead first: retry as a merge.
    if (String(e).includes('crm_lead_open_phone') || String(e).includes('crm_contact_key'))
      return ingestLead(tenant, input, base, now);
    throw e;
  }
  const lead = (await getLead(tenant, id))!;
  await addEvent(
    tenant,
    lead,
    'received',
    {
      source: input.source,
      campaign: input.campaign,
      message: input.message,
      phone: input.phone || null,
    },
    now,
    null,
    `received:${id}`,
  );
  const result = await assignLead(tenant, id, base, now, 'new', previous?.assignee ?? null);
  const after = (await getLead(tenant, id))!;
  return {
    leadId: id,
    duplicate: false,
    merged: false,
    assignee: result.assignee,
    status: after.status,
  };
}

// ---------------------------------------------------------------- sweeping (overdue, queue, outbox)

/**
 * The periodic pass: leads whose 5 minutes ran out go to the next on-duty agent and alert the
 * managers, waiting leads are given to whoever is now on duty, forgotten duty switches turn off, and
 * due messages are sent. Safe to run as often as wanted.
 */
export async function sweepLeads(tenant: string, base: string, now = Date.now()) {
  const d = db();
  await d
    .prepare(
      'UPDATE crm_agents SET on_duty=0,duty_since=NULL,updated=? WHERE tenant=? AND on_duty=1 AND duty_since IS NOT NULL AND duty_since<?',
    )
    .bind(now, tenant, now - 12 * 3_600_000)
    .run();
  const overdue = (
    await d
      .prepare(
        "SELECT * FROM crm_leads WHERE tenant=? AND status='assigned' AND first_call_at IS NULL AND due_at<? LIMIT 50",
      )
      .bind(tenant, now)
      .all<Lead>()
  ).results;
  const staff = await staffRows(tenant);
  for (const lead of overdue) {
    const claimed = await d
      .prepare(
        "UPDATE crm_leads SET escalations=escalations+1,updated=? WHERE id=? AND tenant=? AND status='assigned' AND first_call_at IS NULL AND due_at<? AND escalations=?",
      )
      .bind(now, lead.id, tenant, now, lead.escalations)
      .run();
    if (!claimed.meta.changes) continue;
    const who = staff.find((s) => s.user_id === lead.assignee)?.name;
    await addEvent(
      tenant,
      lead,
      'overdue',
      { agent: who ?? null, dueAt: lead.due_at },
      now,
      null,
      `overdue:${lead.id}:${lead.escalations}`,
    );
    await notifyManagers(tenant, lead, 'overdue', lead.escalations, base, who, now);
    await assignLead(tenant, lead.id, base, now, 'reassigned');
  }
  const waiting = (
    await d
      .prepare(
        "SELECT id FROM crm_leads WHERE tenant=? AND status='queued' AND first_call_at IS NULL LIMIT 50",
      )
      .bind(tenant)
      .all<{ id: string }>()
  ).results;
  if (waiting.length && pickAgent(staff, { now }))
    // Never hand a waiting lead back to someone who already missed it: it waits for a different agent.
    for (const w of waiting) await assignLead(tenant, w.id, base, now, 'reassigned');
  await dispatchDue(tenant, now);
}

// ---------------------------------------------------------------- staff actions on a lead

/** Ends a lead: booked means the service was sold or scheduled, lost needs a reason. */
async function closeLead(
  tenant: string,
  lead: Lead,
  outcome: 'booked' | 'lost',
  detail: Record<string, unknown>,
  now: number,
  actor: string | null,
) {
  await db()
    .prepare(
      "UPDATE crm_leads SET status=?,stage=?,closed_at=?,lost_reason=?,next_at=NULL,next_note='',updated=? WHERE id=? AND tenant=?",
    )
    .bind(
      outcome,
      outcome === 'booked' ? 'won' : 'lost',
      now,
      outcome === 'lost' ? String(detail.reason ?? '') : '',
      now,
      lead.id,
      tenant,
    )
    .run();
  await addEvent(tenant, lead, outcome, detail, now, actor);
}

export async function applyLeadAction(
  tenant: string,
  actor: { id: string; role: Role },
  input: LeadAction,
  base: string,
  now = Date.now(),
): Promise<R> {
  const d = db();
  try {
    if (input.action === 'create') {
      const phone = normalizePhone(input.phone);
      if (input.phone && !validPhone(phone)) return error('Số điện thoại không hợp lệ');
      const r = await ingestLead(
        tenant,
        {
          source: 'manual',
          campaign: '',
          extKey: 'manual:' + crypto.randomUUID(),
          name: input.name,
          phone,
          email: '',
          zaloId: '',
          need: input.need ?? '',
          guests: 0,
          preferredStart: null,
          message: input.message,
          consent: false,
          channelRef: phone ? '' : 'manual:' + crypto.randomUUID(),
        },
        base,
        now,
      );
      return reply({ ok: true, ...r });
    }
    const lead = await getLead(tenant, input.id);
    if (!lead) return error('Không tìm thấy lead', 404);
    const mine = lead.assignee === actor.id;
    if (!mine && !can(actor.role, 'crm.manage') && input.action !== 'claim')
      return error('Lead đang do nhân viên khác phụ trách', 403);
    if (['booked', 'lost'].includes(lead.status)) return error('Lead đã đóng', 409);

    if (input.action === 'claim') {
      if (lead.first_call_at != null && lead.assignee)
        return error('Lead đã có người phụ trách và đã gọi', 409);
      const r = await d
        .prepare(
          "UPDATE crm_leads SET status='assigned',assignee=?,assigned_at=?,due_at=?,updated=? WHERE id=? AND tenant=? AND status IN ('queued','assigned') AND first_call_at IS NULL",
        )
        .bind(actor.id, now, now + SLA_MS, now, lead.id, tenant)
        .run();
      if (!r.meta.changes) return error('Lead đã được xử lý', 409);
      await addEvent(tenant, lead, 'claimed', { by: actor.id }, now, actor.id);
      return reply({ ok: true });
    }
    if (input.action === 'call' || input.action === 'replied') {
      const first = lead.first_call_at == null;
      const step =
        input.action === 'call'
          ? nextStep(input.result, { now, missed: lead.missed, at: input.at })
          : null;
      if (step && 'error' in step) return error(step.error);
      const reached = input.action === 'replied' || (step?.reached ?? false);
      const newStage =
        step?.stage ?? (input.action === 'replied' && lead.stage === 'new' ? 'contacted' : '');
      await d
        .prepare(
          "UPDATE crm_leads SET first_call_at=COALESCE(first_call_at,?),status=CASE WHEN ?=1 THEN 'contacted' ELSE status END,stage=CASE WHEN ?='' THEN stage WHEN stage IN ('deposit','won','lost') THEN stage ELSE ? END,missed=?,next_at=?,next_note=?,updated=? WHERE id=? AND tenant=? AND status IN ('queued','assigned','contacted')",
        )
        .bind(
          now,
          reached ? 1 : 0,
          newStage,
          newStage,
          step ? (step.reached ? 0 : step.missed) : lead.missed,
          step ? step.nextAt : lead.next_at,
          step ? step.nextNote : lead.next_note,
          now,
          lead.id,
          tenant,
        )
        .run();
      const label =
        input.action === 'call'
          ? CALL_RESULT_LABELS[input.result]
          : `Đã trả lời qua ${input.channel}`;
      await addEvent(
        tenant,
        lead,
        input.action === 'call' ? 'call' : 'replied',
        {
          result: input.action === 'call' ? input.result : 'replied',
          label,
          note: input.note,
          withinSla: first ? lead.due_at == null || now <= lead.due_at : null,
          seconds: first ? Math.round((now - lead.received_at) / 1000) : null,
          ...(step && !('error' in step) && step.nextAt ? { nextAt: step.nextAt } : {}),
        },
        now,
        actor.id,
      );
      if (lead.customer_id)
        await d
          .prepare(
            'INSERT INTO crm_interactions(id,tenant,customer_id,task_id,channel,content,actor,created) VALUES (?,?,?,NULL,?,?,?,?)',
          )
          .bind(
            crypto.randomUUID(),
            tenant,
            lead.customer_id,
            input.action === 'call' ? 'call' : 'zalo',
            `${label}${input.note ? '. ' + input.note : ''}`,
            actor.id,
            now,
          )
          .run();
      if (step && !('error' in step) && step.lost)
        await closeLead(tenant, lead, 'lost', { reason: step.lost }, now, actor.id);
      return reply({ ok: true, firstResponse: first });
    }
    if (input.action === 'stage') {
      if (input.stage === 'lost') {
        if (input.reason.length < 2) return error('Chọn lý do không thành');
        await closeLead(tenant, lead, 'lost', { reason: input.reason }, now, actor.id);
        return reply({ ok: true });
      }
      if (input.stage === 'won') {
        if (input.dealValue <= 0) return error('Nhập giá trị dịch vụ đã chốt');
        await d
          .prepare('UPDATE crm_leads SET deal_value=? WHERE id=? AND tenant=?')
          .bind(input.dealValue, lead.id, tenant)
          .run();
        await closeLead(tenant, lead, 'booked', { dealValue: input.dealValue }, now, actor.id);
        return reply({ ok: true });
      }
      if (input.stage === 'trial' && (input.at == null || input.at <= now))
        return error('Chọn ngày giờ trải nghiệm ở tương lai');
      const nextAt = input.stage === 'trial' ? (input.at ?? null) : lead.next_at;
      await d
        .prepare(
          "UPDATE crm_leads SET stage=?,next_at=?,next_note=?,updated=?,first_call_at=COALESCE(first_call_at,CASE WHEN ?<>'new' THEN ? END) WHERE id=? AND tenant=?",
        )
        .bind(
          input.stage,
          nextAt,
          input.stage === 'trial' ? 'Buổi trải nghiệm' : lead.next_note,
          now,
          input.stage,
          now,
          lead.id,
          tenant,
        )
        .run();
      await addEvent(tenant, lead, 'stage', { from: lead.stage, to: input.stage }, now, actor.id);
      return reply({ ok: true });
    }
    if (input.action === 'profile') {
      await d
        .prepare(
          'UPDATE crm_leads SET interest=?,budget=?,tags=?,note=?,updated=? WHERE id=? AND tenant=?',
        )
        .bind(
          input.interest,
          input.budget,
          JSON.stringify([...new Set(input.tags)]),
          input.note,
          now,
          lead.id,
          tenant,
        )
        .run();
      return reply({ ok: true });
    }
    if (input.action === 'booked' || input.action === 'lost') {
      await closeLead(
        tenant,
        lead,
        input.action,
        input.action === 'lost' ? { reason: input.reason } : { note: input.note },
        now,
        actor.id,
      );
      return reply({ ok: true });
    }
    if (input.action === 'send-link')
      return sendBookingLink(tenant, lead, input, base, now, actor.id);
    return error('Thao tác không được hỗ trợ');
  } catch (e) {
    console.error('lead action', e);
    return error('Chưa xác minh được kết quả. Tải lại trước khi thử tiếp.', 500);
  }
}

// ---------------------------------------------------------------- consultation: availability, quote, link

const pad = (n: number) => String(n).padStart(2, '0');
export const localInput = (ms: number) => {
  const x = new Date(ms + VN);
  return `${x.getUTCFullYear()}-${pad(x.getUTCMonth() + 1)}-${pad(x.getUTCDate())}T${pad(x.getUTCHours())}:${pad(x.getUTCMinutes())}`;
};
const whenText = (ms: number) =>
  new Date(ms).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

export async function checkAvailability(
  tenant: string,
  q: { service: 'gdr' | '9' | '18'; start: number; guests: number; vip: boolean },
  now = Date.now(),
) {
  const c = await loadConfig(tenant);
  const sizes = lineSizes(Math.max(1, q.guests));
  const slotFree = async (start: number) => {
    const free: { id: string; name: string }[] = [];
    let end = 0;
    let error = '';
    for (const room of rooms.filter((r) => r.vip === q.vip)) {
      try {
        const plan = planBooking(
          {
            room: room.id,
            service: q.service,
            start,
            people: sizes[0],
            minutes: q.service === 'gdr' ? 60 : 0,
          },
          c,
          now,
        );
        const clean = (room.vip ? c.vipClean : c.clean) * 60_000;
        const clash = await db()
          .prepare(
            "SELECT 1 AS x FROM bookings WHERE tenant=? AND room=? AND status<>'cancelled' AND start<? AND end>? LIMIT 1",
          )
          .bind(tenant, room.id, plan.end + clean, start)
          .first();
        if (!clash) free.push({ id: room.id, name: room.name });
        end = plan.end;
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
        break;
      }
    }
    return { free, error, end };
  };
  const main = await slotFree(q.start);
  if (main.error && !main.free.length) return { ok: false as const, error: main.error };
  // Quote: every line of the group is priced on its own.
  let total = 0;
  for (const size of sizes) {
    const plan = planBooking(
      {
        room: rooms.find((r) => r.vip === q.vip)!.id,
        service: q.service,
        start: q.start,
        people: size,
        minutes: q.service === 'gdr' ? 60 : 0,
      },
      c,
      now,
    );
    total += plan.bill.total;
  }
  const alternatives: { start: number; label: string; free: number }[] = [];
  for (const step of [-120, -90, -60, -30, 30, 60, 90, 120]) {
    const s = q.start + step * 60_000;
    if (s < now + 3_600_000) continue;
    const r = await slotFree(s);
    if (!r.error && r.free.length >= sizes.length)
      alternatives.push({ start: s, label: whenText(s), free: r.free.length });
  }
  return {
    ok: true as const,
    lines: sizes.length,
    freeRooms: main.free,
    enough: main.free.length >= sizes.length,
    total,
    totalText: money(total),
    note:
      q.service === 'gdr'
        ? 'Báo giá cho 60 phút đầu, tính theo thời gian chơi thực tế.'
        : 'Giá trọn lượt theo số người, chưa gồm F&B.',
    alternatives,
  };
}

async function sendBookingLink(
  tenant: string,
  lead: Lead,
  input: Extract<LeadAction, { action: 'send-link' }>,
  base: string,
  now: number,
  actorId: string,
): Promise<R> {
  const config = await loadConfig(tenant);
  if (!config.onlineEnabled || !config.onlineSlug)
    return error('Chưa bật nhận đặt lịch online trong Cài đặt', 409);
  const avail = await checkAvailability(tenant, input, now);
  if (!avail.ok) return error(avail.error, 409);
  const params = new URLSearchParams({
    service: input.service,
    start: localInput(input.start),
    guests: String(input.guests),
    name: lead.name,
    phone: lead.phone,
    ...(input.vip ? { vip: '1' } : {}),
  });
  const url = `${base.replace(/\/$/, '')}/book/${config.onlineSlug}?${params}`;
  const msg = bookingLinkMessage(config.name, {
    name: lead.name || 'anh/chị',
    url,
    when: whenText(input.start),
    total: avail.totalText,
  });
  const customer = lead.customer_id
    ? await db()
        .prepare('SELECT email,zalo_id FROM customers WHERE tenant=? AND id=?')
        .bind(tenant, lead.customer_id)
        .first<{ email: string; zalo_id: string }>()
    : null;
  const to = { email: customer?.email || lead.email, zalo: customer?.zalo_id || lead.zalo_id };
  const queued = await enqueue(
    tenant,
    [
      {
        ukey: `link:${lead.id}:${input.start}:email`,
        channel: 'email',
        recipient: to.email,
        subject: msg.subject,
        body: msg.body,
        kind: 'booking_link',
        audience: 'customer',
        leadId: lead.id,
        customerId: lead.customer_id,
      },
      {
        ukey: `link:${lead.id}:${input.start}:zalo`,
        channel: 'zalo',
        recipient: to.zalo,
        subject: msg.subject,
        body: msg.body,
        kind: 'booking_link',
        audience: 'customer',
        leadId: lead.id,
        customerId: lead.customer_id,
      },
    ],
    now,
  );
  await addEvent(
    tenant,
    lead,
    'link_sent',
    { url, when: input.start, total: avail.total, queued, manual: queued === 0 },
    now,
    actorId,
    `link:${lead.id}:${input.start}`,
  );
  await dispatchDue(tenant, now);
  return reply({ ok: true, url, queued, total: avail.total, manual: queued === 0 });
}

// ---------------------------------------------------------------- booking lifecycle messages

type BookingBrief = { id: string; room: string; start: number; service: string; people: number };
const SERVICE_TEXT: Record<string, string> = {
  gdr: 'Luyện tập',
  '9': 'Game 9 hố',
  '18': 'Game 18 hố',
};
const roomName = (id: string) => rooms.find((r) => r.id === id)?.name ?? id;

async function customerChannels(tenant: string, phone: string) {
  const p = normalizePhone(phone);
  const c = await db()
    .prepare(
      'SELECT id,name,email,zalo_id,marketing_consent FROM customers WHERE tenant=? AND phone=?',
    )
    .bind(tenant, p)
    .first<{
      id: string;
      name: string;
      email: string;
      zalo_id: string;
      marketing_consent: number;
    }>();
  return c;
}

const customerMsgs = (
  c: { id: string; email: string; zalo_id: string },
  ukey: string,
  m: { subject: string; body: string },
  kind: string,
  sendAt: number,
  leadId: string | null = null,
): Msg[] => [
  {
    ukey: `${ukey}:email`,
    channel: 'email',
    recipient: c.email,
    subject: m.subject,
    body: m.body,
    kind,
    audience: 'customer',
    customerId: c.id,
    leadId,
    sendAt,
  },
  {
    ukey: `${ukey}:zalo`,
    channel: 'zalo',
    recipient: c.zalo_id,
    subject: m.subject,
    body: m.body,
    kind,
    audience: 'customer',
    customerId: c.id,
    leadId,
    sendAt,
  },
];

/** After the receptionist confirms an online request: booking details now, reminders before the game. */
export async function onBookingConfirmed(
  tenant: string,
  who: { name: string; phone: string },
  bookings: BookingBrief[],
  now = Date.now(),
) {
  const config = await loadConfig(tenant);
  const customer = await customerChannels(tenant, who.phone);
  const lead = await db()
    .prepare(
      "SELECT * FROM crm_leads WHERE tenant=? AND phone=? AND status IN ('queued','assigned','contacted') ORDER BY received_at DESC LIMIT 1",
    )
    .bind(tenant, normalizePhone(who.phone))
    .first<Lead>();
  const first = bookings[0];
  if (lead) {
    await db()
      .prepare(
        "UPDATE crm_leads SET status='booked',stage='won',next_at=NULL,closed_at=?,updated=?,first_call_at=COALESCE(first_call_at,?) WHERE id=? AND tenant=? AND status IN ('queued','assigned','contacted')",
      )
      .bind(now, now, now, lead.id, tenant)
      .run();
    await addEvent(
      tenant,
      lead,
      'booked',
      { bookingIds: bookings.map((b) => b.id), when: first.start },
      now,
      null,
      `booked:${first.id}`,
    );
  }
  if (!customer) return;
  const rooms_ = bookings.map((b) => roomName(b.room)).join(', ');
  const info = bookingInfoMessage(config.name, {
    name: customer.name,
    when: whenText(first.start),
    room: rooms_,
    service: SERVICE_TEXT[first.service] ?? first.service,
    people: bookings.reduce((n, b) => n + b.people, 0),
  });
  const rem = reminderMessage(config.name, {
    name: customer.name,
    when: whenText(first.start),
    room: rooms_,
  });
  const msgs: Msg[] = [
    ...customerMsgs(customer, `bkinfo:${first.id}`, info, 'booking_info', now, lead?.id ?? null),
  ];
  if (first.start - DAY > now + 3_600_000)
    msgs.push(
      ...customerMsgs(
        customer,
        `remind24:${first.id}`,
        rem,
        'reminder',
        first.start - DAY,
        lead?.id ?? null,
      ),
    );
  if (first.start - 2 * 3_600_000 > now)
    msgs.push(
      ...customerMsgs(
        customer,
        `remind2:${first.id}`,
        rem,
        'reminder',
        first.start - 2 * 3_600_000,
        lead?.id ?? null,
      ),
    );
  await enqueue(tenant, msgs, now);
  if (lead && !(customer.email || customer.zalo_id))
    await addEvent(
      tenant,
      lead,
      'notify_gap',
      { reason: 'Khách chưa có email/Zalo: lễ tân gửi thông tin lịch thủ công' },
      now,
      null,
      `gap-booking:${first.id}`,
    );
  await dispatchDue(tenant, now);
}

/** A cancelled or missed booking: its reminders stop and the customer is told once. */
export async function onBookingEnded(
  tenant: string,
  b: { id: string; customer: string; phone: string; start: number },
  kind: 'cancel' | 'no_show',
  now = Date.now(),
) {
  await cancelPending(tenant, `remind24:${b.id}`);
  await cancelPending(tenant, `remind2:${b.id}`);
  const config = await loadConfig(tenant);
  const customer = await customerChannels(tenant, b.phone);
  if (!customer) return;
  const m = (kind === 'cancel' ? cancelMessage : noShowMessage)(config.name, {
    name: customer.name,
    when: whenText(b.start),
  });
  await enqueue(
    tenant,
    customerMsgs(
      customer,
      `${kind}:${b.id}`,
      m,
      kind === 'cancel' ? 'booking_cancel' : 'no_show',
      now,
    ),
    now,
  );
  if (kind === 'no_show') {
    await db()
      .prepare(
        "INSERT OR IGNORE INTO crm_tasks(id,tenant,customer_id,rule,key,title,data,due,status,assignee,channel,note,created,handled_by,handled_at) VALUES (?,?,?,'noshow',?,?,?,?,'open',NULL,NULL,'',?,NULL,NULL)",
      )
      .bind(
        crypto.randomUUID(),
        tenant,
        customer.id,
        `noshow:${b.id}`,
        'Liên hệ khách không đến, hẹn lại lịch',
        JSON.stringify({ ten: customer.name, ngay: whenText(b.start) }),
        now,
        now,
      )
      .run();
  }
  await dispatchDue(tenant, now);
}

/** Payment confirmed: the receipt goes out, and the thank-you follows a day later. */
export async function onPaid(tenant: string, bookingIds: string[], base: string, now = Date.now()) {
  const d = db();
  const config = await loadConfig(tenant);
  for (const id of bookingIds) {
    const b = await d
      .prepare('SELECT * FROM bookings WHERE tenant=? AND id=?')
      .bind(tenant, id)
      .first<Booking>();
    if (!b || b.status !== 'paid') continue;
    const customer = await customerChannels(tenant, b.phone);
    if (!customer) continue;
    const entries = (
      await d
        .prepare(
          "SELECT method,amount FROM finance_entries WHERE tenant=? AND booking_id=? AND kind='payment'",
        )
        .bind(tenant, id)
        .all<{ method: string; amount: number }>()
    ).results;
    const discount = await d
      .prepare('SELECT amount,reason FROM bill_discounts WHERE tenant=? AND booking_id=?')
      .bind(tenant, id)
      .first<{ amount: number; reason: string }>();
    const methods: Record<string, string> = {
      cash: 'tiền mặt',
      transfer: 'chuyển khoản',
      card: 'thẻ',
      package: 'trừ gói',
      mixed: 'nhiều hình thức',
    };
    const lines = [
      `${SERVICE_TEXT[b.service] ?? b.service} · ${roomName(b.room)} · ${b.people} người`,
      ...(discount ? [`Giảm giá: -${money(discount.amount)} (${discount.reason})`] : []),
      ...entries.map((e) => `Đã thu ${methods[e.method] ?? e.method}: ${money(e.amount)}`),
    ];
    const receipt = receiptMessage(config.name, {
      name: customer.name,
      when: whenText(b.finished ?? now),
      lines,
      total: money(entries.reduce((n, e) => n + e.amount, 0) || (b.amount ?? 0)),
      method: methods[b.payment ?? ''] ?? b.payment ?? '',
    });
    const consent = customer.marketing_consent === 1;
    const thanks = thanksMessage(config.name, {
      name: customer.name,
      rebook:
        consent && config.onlineSlug && base
          ? `${base.replace(/\/$/, '')}/book/${config.onlineSlug}`
          : undefined,
    });
    await enqueue(
      tenant,
      [
        ...customerMsgs(customer, `receipt:${id}`, receipt, 'receipt', now),
        ...customerMsgs(customer, `thanks:${id}`, thanks, 'thanks', (b.finished ?? now) + DAY),
      ],
      now,
    );
  }
  await dispatchDue(tenant, now);
}

// ---------------------------------------------------------------- reading for the screens

export async function loadLeads(
  tenant: string,
  userId: string,
  base: string,
  now = Date.now(),
): Promise<R> {
  try {
    await sweepLeads(tenant, base, now);
    const d = db();
    const leads = (
      await d
        .prepare(
          `SELECT l.*,u.name AS assignee_name,c.marketing_consent,
           (SELECT COUNT(*) FROM crm_lead_contacts k WHERE k.lead_id=l.id) AS contacts
           FROM crm_leads l LEFT JOIN users u ON u.id=l.assignee LEFT JOIN customers c ON c.id=l.customer_id AND c.tenant=l.tenant
           WHERE l.tenant=? AND (l.status IN ('queued','assigned','contacted') OR l.updated>?) ORDER BY l.status IN ('booked','lost'), COALESCE(l.next_at,l.due_at) IS NULL, COALESCE(l.next_at,l.due_at), l.received_at DESC LIMIT 200`,
        )
        .bind(tenant, now - 3 * DAY)
        .all()
    ).results;
    return reply({ leads, now, mine: userId, slaMs: SLA_MS });
  } catch (e) {
    console.error('load leads', e);
    return error('Chưa tải được lead. Kiểm tra migration 0018.', 503);
  }
}

/** Funnel, sources, lost reasons and agent speed for leads received in the last `days` days. */
export async function loadLeadReport(tenant: string, days: number, now = Date.now()): Promise<R> {
  try {
    const d = db();
    const since = now - Math.min(Math.max(days, 1), 365) * DAY;
    const all = async (sql: string) => (await d.prepare(sql).bind(tenant, since).all()).results;
    const [stages, sources, lost, agents, total] = await Promise.all([
      all(
        'SELECT stage,COUNT(*) AS n FROM crm_leads WHERE tenant=? AND received_at>=? GROUP BY stage',
      ),
      all(
        `SELECT source,COUNT(*) AS leads,SUM(stage='won') AS won,SUM(stage='lost') AS lost,COALESCE(SUM(deal_value),0) AS value
         FROM crm_leads WHERE tenant=? AND received_at>=? GROUP BY source ORDER BY leads DESC`,
      ),
      all(
        `SELECT lost_reason AS reason,COUNT(*) AS n FROM crm_leads
         WHERE tenant=? AND received_at>=? AND stage='lost' AND lost_reason<>'' GROUP BY lost_reason ORDER BY n DESC LIMIT 10`,
      ),
      all(
        `SELECT l.assignee AS user_id,COALESCE(u.name,'Chưa phân') AS name,COUNT(*) AS leads,
          SUM(l.first_call_at IS NOT NULL) AS called,SUM(l.stage='won') AS won,COALESCE(SUM(l.deal_value),0) AS value,
          AVG(CASE WHEN l.first_call_at IS NOT NULL THEN l.first_call_at-l.received_at END) AS avg_ms
         FROM crm_leads l LEFT JOIN users u ON u.id=l.assignee
         WHERE l.tenant=? AND l.received_at>=? GROUP BY l.assignee ORDER BY won DESC, leads DESC LIMIT 30`,
      ),
      all('SELECT COUNT(*) AS n FROM crm_leads WHERE tenant=? AND received_at>=?'),
    ]);
    return reply({
      days,
      total: (total[0] as { n: number } | undefined)?.n ?? 0,
      stages,
      sources,
      lost,
      agents,
    });
  } catch (e) {
    console.error('lead report', e);
    return error('Chưa tải được báo cáo lead.', 503);
  }
}

export async function loadLeadEvents(tenant: string, customerId: string) {
  const d = db();
  const [leads, events] = await Promise.all([
    d
      .prepare(
        `SELECT l.id,l.status,l.source,l.campaign,l.need,l.message,l.assignee,u.name AS assignee_name,l.due_at,l.first_call_at,l.received_at,l.phone
         FROM crm_leads l LEFT JOIN users u ON u.id=l.assignee WHERE l.tenant=? AND l.customer_id=? ORDER BY l.received_at DESC LIMIT 10`,
      )
      .bind(tenant, customerId)
      .all(),
    d
      .prepare(
        `SELECT e.id,e.lead_id,e.kind,e.detail,e.created,u.name AS actor_name FROM crm_lead_events e LEFT JOIN users u ON u.id=e.actor
         WHERE e.tenant=? AND e.customer_id=? ORDER BY e.created DESC LIMIT 80`,
      )
      .bind(tenant, customerId)
      .all(),
  ]);
  return { leads: leads.results, events: events.results };
}

export async function loadAgents(tenant: string): Promise<R> {
  const staff = await staffRows(tenant);
  return reply({
    agents: staff.map((s) => ({
      userId: s.user_id,
      name: s.name,
      email: s.email,
      role: s.role,
      receivesLeads: s.receives_leads === 1,
      onDuty: s.on_duty === 1,
      dutySince: s.duty_since,
      lastAssigned: s.last_assigned,
      zaloId: s.zalo_id,
      notifyEmail: s.agent_email,
    })),
  });
}

/** Customer messages that follow a change to a booking made on the dashboard. Never fails the action itself. */
export async function afterClubAction(
  tenant: string,
  input: { action: string; id?: string },
  result: { status: number; body: Record<string, unknown> },
  now: number,
) {
  if (result.status !== 200 || !input.id) return;
  try {
    const row = async (id: string) =>
      db()
        .prepare(
          'SELECT id,customer,phone,start,room,service,people FROM bookings WHERE tenant=? AND id=?',
        )
        .bind(tenant, id)
        .first<{
          id: string;
          customer: string;
          phone: string;
          start: number;
          room: string;
          service: string;
          people: number;
        }>();
    if (input.action === 'cancel' || input.action === 'no-show') {
      const b = await row(input.id);
      if (b) await onBookingEnded(tenant, b, input.action === 'cancel' ? 'cancel' : 'no_show', now);
    } else if (input.action === 'reschedule' && typeof result.body.id === 'string') {
      const old = await row(input.id);
      const next = await row(result.body.id);
      await cancelPending(tenant, `remind24:${input.id}`);
      await cancelPending(tenant, `remind2:${input.id}`);
      if (old && next)
        await onBookingConfirmed(tenant, { name: next.customer, phone: next.phone }, [next], now);
    }
  } catch (e) {
    console.error('booking follow-up', e);
  }
}
