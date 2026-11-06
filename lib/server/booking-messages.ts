import { db, loadConfig } from './common';
import { normalizePhone } from '../member';
import { normalizePhone as leadPhone } from '../../modules/crm/core/phone';
import { rooms, money, type Booking } from '../club';
import {
  bookingInfoMessage,
  reminderMessage,
  cancelMessage,
  noShowMessage,
  receiptMessage,
  thanksMessage,
} from '../leads';
import { enqueue, cancelPending, dispatchDue, type Msg } from './outbox-service';
import { addActivity, addTask } from '../../modules/crm/server/store';
import { legacyBooked, legacyNoShowTask } from './lead-service';

// Customer messages that follow a booking: details and reminders, cancel / no-show notice, receipt and thank-you.
// They go through the shared outbox, so each is sent once, and cancelling a booking stops its reminders.

const DAY = 86_400_000;

type BookingBrief = { id: string; room: string; start: number; service: string; people: number };
const SERVICE_TEXT: Record<string, string> = {
  gdr: 'Luyện tập',
  '9': 'Game 9 hố',
  '18': 'Game 18 hố',
};
const roomName = (id: string) => rooms.find((r) => r.id === id)?.name ?? id;
const whenText = (ms: number) =>
  new Date(ms).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

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

/** The CRM module's open lead for this phone, if any; a booking is the sale, so it closes as won. */
async function crmBooked(tenant: string, phone: string, first: BookingBrief, now: number) {
  const norm = leadPhone(phone);
  if (!norm) return null;
  const lead = await db()
    .prepare(
      "SELECT id FROM crm2_leads WHERE tenant=? AND phone_norm=? AND stage NOT IN ('WON','LOST') ORDER BY created DESC LIMIT 1",
    )
    .bind(tenant, norm)
    .first<{ id: string }>();
  if (!lead) return null;
  const r = await db()
    .prepare(
      "UPDATE crm2_leads SET stage='WON',status_id='da-mua',won_at=?,next_action='NONE',next_due=NULL,updated=? WHERE tenant=? AND id=? AND stage NOT IN ('WON','LOST')",
    )
    .bind(now, now, tenant, lead.id)
    .run();
  if (!r.meta.changes) return null;
  await db()
    .prepare('UPDATE crm2_tasks SET done_at=? WHERE tenant=? AND lead_id=? AND done_at IS NULL')
    .bind(now, tenant, lead.id)
    .run();
  await addActivity(
    tenant,
    lead.id,
    'STAGE',
    `Khách đã đặt lịch ${whenText(first.start)}`,
    'Hệ thống',
    now,
    { bookingId: first.id },
  );
  return lead.id;
}

/** After the receptionist confirms an online request: booking details now, reminders before the game. */
export async function onBookingConfirmed(
  tenant: string,
  who: { name: string; phone: string },
  bookings: BookingBrief[],
  now = Date.now(),
) {
  const config = await loadConfig(tenant);
  const customer = await customerChannels(tenant, who.phone);
  const first = bookings[0];
  const legacyId = await legacyBooked(tenant, who.phone, bookings, now);
  const leadId = (await crmBooked(tenant, who.phone, first, now)) ?? legacyId;
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
    ...customerMsgs(customer, `bkinfo:${first.id}`, info, 'booking_info', now, leadId),
  ];
  if (first.start - DAY > now + 3_600_000)
    msgs.push(
      ...customerMsgs(customer, `remind24:${first.id}`, rem, 'reminder', first.start - DAY, leadId),
    );
  if (first.start - 2 * 3_600_000 > now)
    msgs.push(
      ...customerMsgs(
        customer,
        `remind2:${first.id}`,
        rem,
        'reminder',
        first.start - 2 * 3_600_000,
        leadId,
      ),
    );
  await enqueue(tenant, msgs, now);
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
    await legacyNoShowTask(tenant, customer, b.id, whenText(b.start), now);
    const norm = leadPhone(b.phone);
    const lead = norm
      ? await db()
          .prepare(
            'SELECT id FROM crm2_leads WHERE tenant=? AND phone_norm=? ORDER BY created DESC LIMIT 1',
          )
          .bind(tenant, norm)
          .first<{ id: string }>()
      : null;
    await addTask(
      tenant,
      {
        leadId: lead?.id ?? null,
        title: `Liên hệ ${customer.name} không đến lịch ${whenText(b.start)}, hẹn lại`,
        type: 'CALL',
        dueAt: now,
        assignee: null,
        createdBy: 'Hệ thống',
        ukey: `noshow:${b.id}`,
      },
      now,
    );
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
