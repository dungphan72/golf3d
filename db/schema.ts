import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
export const settings = sqliteTable('settings', {
  tenant: text('tenant').primaryKey(),
  value: text('value').notNull(),
});
export const bookings = sqliteTable(
  'bookings',
  {
    id: text('id').primaryKey(),
    tenant: text('tenant').notNull(),
    room: text('room').notNull(),
    customer: text('customer').notNull(),
    phone: text('phone').notNull(),
    service: text('service').notNull(),
    people: integer('people').notNull(),
    start: integer('start').notNull(),
    end: integer('end').notNull(),
    status: text('status').notNull(),
    foodTotal: integer('food_total').notNull().default(0),
    golfAmount: integer('golf_amount'),
    segments: text('segments').notNull(),
    started: integer('started'),
    finished: integer('finished'),
    amount: integer('amount'),
    payment: text('payment'),
    price: text('price').notNull(),
    created: integer('created').notNull(),
  },
  (t) => [index('booking_room_time').on(t.tenant, t.room, t.start, t.end)],
);
export const requests = sqliteTable('requests', {
  id: text('id').primaryKey(),
  tenant: text('tenant').notNull(),
  booking: text('booking').notNull(),
  kind: text('kind').notNull(),
  status: text('status').notNull(),
  created: integer('created').notNull(),
});
export const audit = sqliteTable('audit', {
  id: text('id').primaryKey(),
  tenant: text('tenant').notNull(),
  action: text('action').notNull(),
  detail: text('detail').notNull(),
  created: integer('created').notNull(),
});

export const shifts = sqliteTable(
  'shifts',
  {
    id: text('id').primaryKey(),
    tenant: text('tenant').notNull(),
    name: text('name').notNull(),
    status: text('status').notNull(),
    openedBy: text('opened_by').notNull(),
    openedAt: integer('opened_at').notNull(),
    openingCash: integer('opening_cash').notNull(),
    version: integer('version').notNull().default(0),
    closedBy: text('closed_by'),
    closedAt: integer('closed_at'),
    countedCash: integer('counted_cash'),
    countedTransfer: integer('counted_transfer'),
    countedCard: integer('counted_card'),
    expectedCash: integer('expected_cash'),
    expectedTransfer: integer('expected_transfer'),
    expectedCard: integer('expected_card'),
    note: text('note'),
  },
  (t) => [
    uniqueIndex('one_open_shift_per_tenant')
      .on(t.tenant)
      .where(sql`${t.status} = 'open'`),
    index('shift_tenant_time').on(t.tenant, t.openedAt),
  ],
);
export const financeEntries = sqliteTable(
  'finance_entries',
  {
    id: text('id').primaryKey(),
    tenant: text('tenant').notNull(),
    shiftId: text('shift_id')
      .notNull()
      .references(() => shifts.id),
    kind: text('kind').notNull(),
    method: text('method').notNull(),
    amount: integer('amount').notNull(),
    bookingId: text('booking_id').references(() => bookings.id),
    requestId: text('request_id').notNull(),
    note: text('note').notNull(),
    actor: text('actor').notNull(),
    created: integer('created').notNull(),
    packageId: text('package_id'),
    // Wallet top-up this payment collected (wallet_ledger row of reason 'topup').
    walletId: text('wallet_id'),
    // 1 = one part of a split payment (several methods for one bill); 0 = the whole bill at once.
    part: integer('part').notNull().default(0),
  },
  (t) => [
    uniqueIndex('finance_request_once').on(t.tenant, t.requestId),
    uniqueIndex('booking_paid_once')
      .on(t.tenant, t.bookingId)
      .where(sql`${t.bookingId} IS NOT NULL AND ${t.part} = 0`),
    uniqueIndex('booking_part_method_once')
      .on(t.tenant, t.bookingId, t.method)
      .where(sql`${t.bookingId} IS NOT NULL AND ${t.part} = 1`),
    index('finance_shift_time').on(t.tenant, t.shiftId, t.created),
    uniqueIndex('wallet_paid_once')
      .on(t.tenant, t.walletId)
      .where(sql`${t.walletId} IS NOT NULL`),
  ],
);

export const menuItems = sqliteTable(
  'menu_items',
  {
    id: text('id').primaryKey(),
    tenant: text('tenant').notNull(),
    name: text('name').notNull(),
    category: text('category').notNull(),
    unit: text('unit').notNull(),
    price: integer('price').notNull(),
    feeBps: integer('fee_bps').notNull(),
    vatBps: integer('vat_bps').notNull(),
    active: integer('active').notNull(),
    version: integer('version').notNull().default(0),
    created: integer('created').notNull(),
  },
  (t) => [index('menu_tenant').on(t.tenant, t.active)],
);
export const foodOrders = sqliteTable(
  'food_orders',
  {
    id: text('id').primaryKey(),
    tenant: text('tenant').notNull(),
    bookingId: text('booking_id')
      .notNull()
      .references(() => bookings.id),
    requestId: text('request_id').notNull(),
    requestData: text('request_data').notNull(),
    items: text('items').notNull(),
    subtotal: integer('subtotal').notNull(),
    fee: integer('fee').notNull(),
    vat: integer('vat').notNull(),
    total: integer('total').notNull(),
    note: text('note').notNull(),
    status: text('status').notNull(),
    version: integer('version').notNull().default(0),
    actor: text('actor').notNull(),
    created: integer('created').notNull(),
    updated: integer('updated').notNull(),
    reason: text('reason').notNull().default(''),
  },
  (t) => [
    uniqueIndex('food_order_request_once').on(t.tenant, t.requestId),
    index('food_order_booking').on(t.tenant, t.bookingId),
    index('food_order_status').on(t.tenant, t.status),
  ],
);
export const stockItems = sqliteTable('stock_items', {
  itemId: text('item_id')
    .primaryKey()
    .references(() => menuItems.id),
  tenant: text('tenant').notNull(),
  lowLevel: integer('low_level').notNull(),
  created: integer('created').notNull(),
});
export const stockMovements = sqliteTable(
  'stock_movements',
  {
    id: text('id').primaryKey(),
    tenant: text('tenant').notNull(),
    itemId: text('item_id')
      .notNull()
      .references(() => menuItems.id),
    itemName: text('item_name').notNull(),
    unit: text('unit').notNull(),
    kind: text('kind').notNull(),
    qty: integer('qty').notNull(),
    delta: integer('delta').notNull(),
    requestId: text('request_id').notNull(),
    signature: text('signature').notNull(),
    orderId: text('order_id').references(() => foodOrders.id),
    note: text('note').notNull(),
    actor: text('actor').notNull(),
    created: integer('created').notNull(),
  },
  (t) => [
    uniqueIndex('stock_request_once').on(t.tenant, t.requestId),
    index('stock_item_time').on(t.tenant, t.itemId, t.created),
  ],
);

// ---- Authentication & staff access ----
export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    name: text('name').notNull(),
    passwordHash: text('password_hash').notNull(),
    mustChange: integer('must_change').notNull().default(0),
    failedCount: integer('failed_count').notNull().default(0),
    lockedUntil: integer('locked_until').notNull().default(0),
    active: integer('active').notNull().default(1),
    created: integer('created').notNull(),
  },
  (t) => [uniqueIndex('users_email').on(t.email)],
);
export const memberships = sqliteTable(
  'memberships',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    tenant: text('tenant').notNull(),
    role: text('role').notNull(),
    created: integer('created').notNull(),
  },
  (t) => [
    uniqueIndex('membership_user_tenant').on(t.userId, t.tenant),
    index('membership_tenant').on(t.tenant),
  ],
);
export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(), // SHA-256 of the cookie token; the raw token is never stored
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    tenant: text('tenant').notNull(),
    expires: integer('expires').notNull(),
    created: integer('created').notNull(),
  },
  (t) => [index('sessions_user').on(t.userId)],
);

// ---- Customers, prepaid packages, loyalty (see docs/MEMBERSHIP-DESIGN.md) ----
export const customers = sqliteTable(
  'customers',
  {
    id: text('id').primaryKey(),
    tenant: text('tenant').notNull(),
    name: text('name').notNull(),
    phone: text('phone').notNull(), // normalised: digits only, leading 0
    note: text('note').notNull().default(''),
    // 'YYYY-MM-DD' or 'MM-DD' (year unknown); empty when not given. Used by the CRM birthday flow.
    birthday: text('birthday').notNull().default(''),
    email: text('email').notNull().default(''),
    zaloId: text('zalo_id').notNull().default(''), // Zalo OA user id, to message the customer
    // The customer agreed to receive promotions; service messages (booking, receipt, thanks) do not need it.
    marketingConsent: integer('marketing_consent').notNull().default(0),
    consentAt: integer('consent_at'),
    created: integer('created').notNull(),
  },
  (t) => [uniqueIndex('customer_phone').on(t.tenant, t.phone)],
);
export const packageTypes = sqliteTable(
  'package_types',
  {
    id: text('id').primaryKey(),
    tenant: text('tenant').notNull(),
    name: text('name').notNull(),
    price: integer('price').notNull(),
    grants: text('grants').notNull(), // JSON [{kind:'holes9'|'holes18'|'gdr', qty}]
    validDays: integer('valid_days').notNull(),
    perks: text('perks').notNull().default(''),
    // Heading the package is listed under on the price page; empty = grouped automatically.
    section: text('section').notNull().default(''),
    // Which rooms the package pays for: any | standard | vip (a standard package cannot pay for VIP).
    room: text('room').notNull().default('any'),
    active: integer('active').notNull().default(1),
    created: integer('created').notNull(),
  },
  (t) => [index('package_type_tenant').on(t.tenant)],
);
export const customerPackages = sqliteTable(
  'customer_packages',
  {
    id: text('id').primaryKey(),
    tenant: text('tenant').notNull(),
    customerId: text('customer_id')
      .notNull()
      .references(() => customers.id),
    typeId: text('type_id'),
    name: text('name').notNull(),
    source: text('source').notNull(), // sale | loyalty
    pricePaid: integer('price_paid').notNull(),
    grants: text('grants').notNull(),
    perks: text('perks').notNull().default(''),
    room: text('room').notNull().default('any'),
    purchased: integer('purchased').notNull(),
    expires: integer('expires').notNull(),
    actor: text('actor').notNull(),
    // Card term (migration 0028). Rows are immutable except expires/activated_at (see the trigger).
    // A monthly card must be activated within 30 days of purchase (activate_by); until then
    // activated_at is NULL and expires is only an upper bound. activated_at is set on first use,
    // by staff/customer, or automatically on activate_by. validDays is the length of the card.
    validDays: integer('valid_days').notNull().default(0),
    activatedAt: integer('activated_at'),
    activateBy: integer('activate_by'),
    // The expired hour card this one replaced (its leftover hours were carried over).
    renewedFrom: text('renewed_from'),
    // Reminder flags, so the daily job tells each customer once.
    remindedExpiry: integer('reminded_expiry'),
    remindedActivate: integer('reminded_activate'),
  },
  (t) => [index('customer_package_customer').on(t.tenant, t.customerId)],
);
// Absence notices for monthly cards: each one pushes the card's expiry out by its day count.
export const packageAbsences = sqliteTable(
  'package_absences',
  {
    id: text('id').primaryKey(),
    tenant: text('tenant').notNull(),
    packageId: text('package_id')
      .notNull()
      .references(() => customerPackages.id),
    startDay: text('start_day').notNull(), // 'YYYY-MM-DD' (club-local), inclusive
    endDay: text('end_day').notNull(), // inclusive
    days: integer('days').notNull(),
    status: text('status').notNull().default('active'), // active | cancelled
    source: text('source').notNull(), // customer | staff
    actor: text('actor').notNull(),
    note: text('note').notNull().default(''),
    created: integer('created').notNull(),
    cancelledAt: integer('cancelled_at'),
  },
  (t) => [index('package_absence_package').on(t.tenant, t.packageId)],
);
export const packageLedger = sqliteTable(
  'package_ledger',
  {
    id: text('id').primaryKey(),
    tenant: text('tenant').notNull(),
    packageId: text('package_id')
      .notNull()
      .references(() => customerPackages.id),
    kind: text('kind').notNull(),
    delta: integer('delta').notNull(),
    reason: text('reason').notNull(), // grant | use | adjust
    bookingId: text('booking_id'),
    actor: text('actor').notNull(),
    note: text('note').notNull().default(''),
    created: integer('created').notNull(),
  },
  (t) => [index('package_ledger_package').on(t.tenant, t.packageId)],
);
// Prepaid money wallet per customer: append-only, balance = SUM(delta). Top-ups and their bonus
// are credited here; a finished bill is paid from it with a 'spend' row.
export const walletLedger = sqliteTable(
  'wallet_ledger',
  {
    id: text('id').primaryKey(),
    tenant: text('tenant').notNull(),
    customerId: text('customer_id')
      .notNull()
      .references(() => customers.id),
    delta: integer('delta').notNull(),
    reason: text('reason').notNull(), // topup | bonus | spend | adjust
    bookingId: text('booking_id'),
    actor: text('actor').notNull(),
    note: text('note').notNull().default(''),
    created: integer('created').notNull(),
  },
  (t) => [
    index('wallet_ledger_customer').on(t.tenant, t.customerId, t.created),
    uniqueIndex('wallet_spend_once')
      .on(t.tenant, t.bookingId)
      .where(sql`${t.reason} = 'spend'`),
  ],
);
export const packageRedemptions = sqliteTable(
  'package_redemptions',
  {
    id: text('id').primaryKey(),
    tenant: text('tenant').notNull(),
    bookingId: text('booking_id')
      .notNull()
      .references(() => bookings.id),
    packageId: text('package_id')
      .notNull()
      .references(() => customerPackages.id),
    kind: text('kind').notNull(),
    covered: integer('covered').notNull(),
    // Units taken from the package: hours of play for hourly packages, 1 for a hole round.
    units: integer('units').notNull().default(1),
    actor: text('actor').notNull(),
    created: integer('created').notNull(),
  },
  (t) => [uniqueIndex('redemption_once').on(t.tenant, t.bookingId)],
);
export const loyaltyLedger = sqliteTable(
  'loyalty_ledger',
  {
    id: text('id').primaryKey(),
    tenant: text('tenant').notNull(),
    customerId: text('customer_id')
      .notNull()
      .references(() => customers.id),
    delta: integer('delta').notNull(),
    reason: text('reason').notNull(), // earn | redeem | adjust
    bookingId: text('booking_id'),
    actor: text('actor').notNull(),
    created: integer('created').notNull(),
  },
  (t) => [
    index('loyalty_customer').on(t.tenant, t.customerId),
    uniqueIndex('loyalty_earn_once')
      .on(t.tenant, t.bookingId)
      .where(sql`${t.reason} = 'earn'`),
  ],
);

// ---- Online booking requests (customer submits, staff confirms) ----
export const bookingRequests = sqliteTable(
  'booking_requests',
  {
    id: text('id').primaryKey(),
    tenant: text('tenant').notNull(),
    codeHash: text('code_hash').notNull(), // SHA-256 of the status code given to the customer
    name: text('name').notNull(),
    phone: text('phone').notNull(), // normalised
    service: text('service').notNull(),
    vip: integer('vip').notNull().default(0),
    people: integer('people').notNull(),
    start: integer('start').notNull(),
    minutes: integer('minutes').notNull().default(0),
    note: text('note').notNull().default(''),
    quote: text('quote').notNull(), // indicative bill JSON at request time
    status: text('status').notNull(), // pending | confirmed | rejected | cancelled
    room: text('room'),
    bookingId: text('booking_id'),
    reason: text('reason').notNull().default(''),
    handledBy: text('handled_by'),
    handledAt: integer('handled_at'),
    ipHash: text('ip_hash').notNull(),
    created: integer('created').notNull(),
  },
  (t) => [
    uniqueIndex('booking_request_code').on(t.codeHash),
    index('booking_request_tenant').on(t.tenant, t.status, t.created),
    index('booking_request_ip').on(t.ipHash, t.created),
  ],
);

// ---- Coaching: coaches and scheduled lessons ----
export const coaches = sqliteTable(
  'coaches',
  {
    id: text('id').primaryKey(),
    tenant: text('tenant').notNull(),
    userId: text('user_id'), // optional link to a staff login (role coach) so they see their own lessons
    name: text('name').notNull(),
    phone: text('phone').notNull().default(''),
    active: integer('active').notNull().default(1),
    created: integer('created').notNull(),
  },
  (t) => [index('coach_tenant').on(t.tenant)],
);
export const lessons = sqliteTable(
  'lessons',
  {
    id: text('id').primaryKey(),
    tenant: text('tenant').notNull(),
    coachId: text('coach_id')
      .notNull()
      .references(() => coaches.id),
    customerId: text('customer_id'),
    customerName: text('customer_name').notNull(),
    phone: text('phone').notNull(),
    start: integer('start').notNull(),
    minutes: integer('minutes').notNull(),
    room: text('room'),
    status: text('status').notNull(), // scheduled | done | cancelled | no_show
    price: integer('price'), // informational; collected through normal payment flows
    note: text('note').notNull().default(''),
    coachNote: text('coach_note').notNull().default(''),
    actor: text('actor').notNull(),
    requestId: text('request_id').notNull(),
    created: integer('created').notNull(),
  },
  (t) => [
    index('lesson_coach_time').on(t.tenant, t.coachId, t.start),
    uniqueIndex('lesson_request_once').on(t.tenant, t.requestId),
  ],
);

// ---- Bank transfers (SePay webhook) ----
export const integrations = sqliteTable(
  'integrations',
  {
    tenant: text('tenant').notNull(),
    provider: text('provider').notNull(), // sepay
    keyHash: text('key_hash').notNull(), // SHA-256 of the API key SePay sends; the key itself is never stored
    updated: integer('updated').notNull(),
  },
  (t) => [
    uniqueIndex('integration_tenant_provider').on(t.tenant, t.provider),
    uniqueIndex('integration_key').on(t.provider, t.keyHash),
  ],
);
export const bankTransactions = sqliteTable(
  'bank_transactions',
  {
    id: text('id').primaryKey(),
    tenant: text('tenant').notNull(),
    externalId: text('external_id').notNull(), // SePay transaction id, unique per tenant (webhook retries)
    amount: integer('amount').notNull(),
    content: text('content').notNull(),
    account: text('account').notNull(),
    reference: text('reference').notNull().default(''),
    txTime: integer('tx_time').notNull(),
    code: text('code'), // payment code found in the content
    status: text('status').notNull(), // received | used | ignored
    bookingId: text('booking_id'),
    received: integer('received').notNull(),
  },
  (t) => [
    uniqueIndex('bank_tx_external').on(t.tenant, t.externalId),
    index('bank_tx_code').on(t.tenant, t.code),
    uniqueIndex('bank_tx_booking_once')
      .on(t.tenant, t.bookingId)
      .where(sql`${t.bookingId} IS NOT NULL`),
  ],
);

// ---- Member self-service accounts (website sign-up; staff verify the phone number) ----
export const memberAccounts = sqliteTable(
  'member_accounts',
  {
    id: text('id').primaryKey(),
    tenant: text('tenant').notNull(),
    customerId: text('customer_id')
      .notNull()
      .references(() => customers.id),
    phone: text('phone').notNull(), // normalised, same as the customer's
    email: text('email').notNull().default(''),
    passwordHash: text('password_hash').notNull(),
    // 0 until staff confirm the phone belongs to this person; only then are the card and play history shown.
    verified: integer('verified').notNull().default(0),
    failedCount: integer('failed_count').notNull().default(0),
    lockedUntil: integer('locked_until').notNull().default(0),
    created: integer('created').notNull(),
  },
  (t) => [
    uniqueIndex('member_account_phone').on(t.tenant, t.phone),
    index('member_account_customer').on(t.customerId),
  ],
);
export const memberSessions = sqliteTable(
  'member_sessions',
  {
    id: text('id').primaryKey(), // SHA-256 of the cookie token
    accountId: text('account_id')
      .notNull()
      .references(() => memberAccounts.id),
    expires: integer('expires').notNull(),
    created: integer('created').notNull(),
  },
  (t) => [index('member_session_account').on(t.accountId)],
);

// ---- Package purchase requests from the member page (staff sell the package and collect payment) ----
export const packageOrders = sqliteTable(
  'package_orders',
  {
    id: text('id').primaryKey(),
    tenant: text('tenant').notNull(),
    customerId: text('customer_id')
      .notNull()
      .references(() => customers.id),
    typeId: text('type_id').notNull(),
    name: text('name').notNull(), // package name and price as shown to the member
    price: integer('price').notNull(),
    status: text('status').notNull(), // pending | confirmed | rejected | cancelled
    packageId: text('package_id'),
    handledBy: text('handled_by'),
    handledAt: integer('handled_at'),
    created: integer('created').notNull(),
  },
  (t) => [index('package_order_customer').on(t.tenant, t.customerId, t.status)],
);

// ---- Bill discounts (one per bill, applied to a finished unpaid bill by a manager) ----
export const billDiscounts = sqliteTable(
  'bill_discounts',
  {
    id: text('id').primaryKey(),
    tenant: text('tenant').notNull(),
    bookingId: text('booking_id')
      .notNull()
      .references(() => bookings.id),
    amount: integer('amount').notNull(), // VND taken off the golf part of the bill
    reason: text('reason').notNull(),
    actor: text('actor').notNull(),
    created: integer('created').notNull(),
  },
  (t) => [uniqueIndex('bill_discount_once').on(t.tenant, t.bookingId)],
);

// ---- Sign-up and sign-in attempts of the member page, for per-IP limits (rows older than a day are purged) ----
export const memberAttempts = sqliteTable(
  'member_attempts',
  {
    id: text('id').primaryKey(),
    kind: text('kind').notNull(), // register | login_fail
    ipHash: text('ip_hash').notNull(),
    subject: text('subject').notNull().default(''), // hash of the phone number for logins
    created: integer('created').notNull(),
  },
  (t) => [
    index('member_attempt_ip').on(t.kind, t.ipHash, t.created),
    index('member_attempt_subject').on(t.kind, t.subject, t.created),
  ],
);

export const crmOutbox = sqliteTable(
  'crm_outbox',
  {
    id: text('id').primaryKey(),
    tenant: text('tenant').notNull(),
    ukey: text('ukey').notNull(), // one message per event and channel, even if the flow runs again
    channel: text('channel').notNull(), // email | zalo
    recipient: text('recipient').notNull(),
    subject: text('subject').notNull().default(''),
    body: text('body').notNull(),
    kind: text('kind').notNull(),
    audience: text('audience').notNull().default('staff'), // staff | customer
    leadId: text('lead_id'),
    customerId: text('customer_id'),
    sendAt: integer('send_at').notNull(),
    status: text('status').notNull(), // pending | sent | failed | cancelled | expired
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error').notNull().default(''),
    created: integer('created').notNull(),
    sentAt: integer('sent_at'),
  },
  (t) => [
    uniqueIndex('crm_outbox_key').on(t.tenant, t.ukey),
    index('crm_outbox_status').on(t.status, t.sendAt),
  ],
);

// ---- CRM module (modules/crm): service consultation from first inquiry to sale ----
export const crm2Settings = sqliteTable('crm2_settings', {
  tenant: text('tenant').primaryKey(),
  value: text('value').notNull(),
  updated: integer('updated').notNull(),
});
export const crm2Runtime = sqliteTable(
  'crm2_runtime',
  {
    tenant: text('tenant').notNull(),
    key: text('key').notNull(),
    value: text('value').notNull(),
    updated: integer('updated').notNull(),
  },
  (t) => [uniqueIndex('crm2_runtime_key').on(t.tenant, t.key)],
);
export const crm2Staff = sqliteTable(
  'crm2_staff',
  {
    tenant: text('tenant').notNull(),
    userId: text('user_id').notNull(),
    team: text('team').notNull().default(''),
    isLeader: integer('is_leader').notNull().default(0),
    extension: text('extension').notNull().default(''),
    zaloId: text('zalo_id').notNull().default(''), // Zalo OA user id to notify the person
    notifyEmail: text('notify_email').notNull().default(''), // overrides the login email for notices
    updated: integer('updated').notNull(),
  },
  (t) => [uniqueIndex('crm2_staff_user').on(t.tenant, t.userId)],
);
export const crm2Leads = sqliteTable(
  'crm2_leads',
  {
    id: text('id').primaryKey(),
    tenant: text('tenant').notNull(),
    fullName: text('full_name').notNull(),
    phone: text('phone').notNull(),
    phoneNorm: text('phone_norm').notNull().default(''),
    email: text('email').notNull().default(''),
    notes: text('notes').notNull().default(''),
    source: text('source').notNull().default(''),
    targetService: text('target_service').notNull().default(''), // service or package of interest
    preferredDate: text('preferred_date').notNull().default(''),
    preferredTime: text('preferred_time').notNull().default(''),
    stage: text('stage').notNull().default('NEW'),
    statusId: text('status_id').notNull().default('khach-moi'),
    owner: text('owner'), // user id; null = in the pool
    ownedAt: integer('owned_at'),
    claimedBy: text('claimed_by'),
    claimedAt: integer('claimed_at'),
    pooledAt: integer('pooled_at'),
    lostReason: text('lost_reason').notNull().default(''),
    expectedValue: integer('expected_value').notNull().default(0),
    budget: integer('budget').notNull().default(0),
    lastContactAt: integer('last_contact_at'),
    inquiryCount: integer('inquiry_count').notNull().default(1),
    nextAction: text('next_action').notNull().default('NEW'),
    nextDue: integer('next_due'),
    callAttempts: integer('call_attempts').notNull().default(0),
    lastResult: text('last_result').notNull().default(''),
    labels: text('labels').notNull().default('[]'),
    campaign: text('campaign').notNull().default(''), // marketing campaign that brought the lead (first touch)
    seeding: integer('seeding').notNull().default(0), // internal/test number: excluded from marketing KPIs
    slaAlertedAt: integer('sla_alerted_at'),
    staleTaskAt: integer('stale_task_at'),
    firstResponseAt: integer('first_response_at'),
    firstResponseBy: text('first_response_by'),
    firstResponseMin: integer('first_response_min'),
    firstResponseWorkMin: integer('first_response_work_min'),
    wonAt: integer('won_at'),
    channelRef: text('channel_ref').notNull().default(''), // who wrote on a chat channel, e.g. zalo:<user id>
    created: integer('created').notNull(),
    updated: integer('updated').notNull(),
  },
  (t) => [
    index('crm2_lead_phone').on(t.tenant, t.phoneNorm),
    index('crm2_lead_channel').on(t.tenant, t.channelRef),
    index('crm2_lead_owner').on(t.tenant, t.owner, t.nextAction, t.nextDue),
    index('crm2_lead_stage').on(t.tenant, t.stage),
  ],
);
export const crm2Activities = sqliteTable(
  'crm2_activities',
  {
    id: text('id').primaryKey(),
    tenant: text('tenant').notNull(),
    leadId: text('lead_id').notNull(),
    type: text('type').notNull(), // NOTE CALL ZALO EMAIL VISIT STAGE ASSIGN INQUIRY SYSTEM CHAT HOLD
    content: text('content').notNull().default(''),
    meta: text('meta').notNull().default('{}'),
    actor: text('actor').notNull().default(''),
    created: integer('created').notNull(),
  },
  (t) => [index('crm2_activity_lead').on(t.tenant, t.leadId, t.created)],
);
export const crm2Tasks = sqliteTable(
  'crm2_tasks',
  {
    id: text('id').primaryKey(),
    tenant: text('tenant').notNull(),
    leadId: text('lead_id'),
    title: text('title').notNull(),
    type: text('type').notNull().default('FOLLOW_UP'), // CALL VISIT FOLLOW_UP OTHER
    dueAt: integer('due_at'),
    doneAt: integer('done_at'),
    assignee: text('assignee'),
    createdBy: text('created_by').notNull().default(''),
    remindedAt: integer('reminded_at'),
    ukey: text('ukey'), // makes system tasks idempotent
    created: integer('created').notNull(),
    // Care tasks belong to a customer (members and walk-ins), not to a lead.
    customerId: text('customer_id'),
    rule: text('rule').notNull().default(''), // welcome thanks comeback pkg_expiring pkg_low birthday points manual
    data: text('data').notNull().default('{}'), // facts the message template fills in
    channel: text('channel').notNull().default(''), // how it was handled: call zalo sms visit email
    note: text('note').notNull().default(''), // result, or the reason it was skipped
    outcome: text('outcome').notNull().default(''), // '' while open, then done | skipped
  },
  (t) => [
    index('crm2_task_assignee').on(t.tenant, t.assignee, t.doneAt, t.dueAt),
    uniqueIndex('crm2_task_ukey').on(t.tenant, t.ukey),
    index('crm2_task_customer').on(t.tenant, t.customerId),
  ],
);
// What staff did or heard from a customer outside any lead: calls, Zalo chats, feedback.
export const crm2CustomerNotes = sqliteTable(
  'crm2_customer_notes',
  {
    id: text('id').primaryKey(),
    tenant: text('tenant').notNull(),
    customerId: text('customer_id').notNull(),
    taskId: text('task_id'),
    channel: text('channel').notNull(),
    content: text('content').notNull(),
    actor: text('actor').notNull().default(''),
    created: integer('created').notNull(),
  },
  (t) => [index('crm2_note_customer').on(t.tenant, t.customerId, t.created)],
);
/** One row per webhook event already turned into a lead or an inquiry: the provider retries, we never repeat. */
export const crm2Inbound = sqliteTable(
  'crm2_inbound',
  {
    tenant: text('tenant').notNull(),
    extKey: text('ext_key').notNull(),
    leadId: text('lead_id').notNull(),
    created: integer('created').notNull(),
  },
  (t) => [uniqueIndex('crm2_inbound_key').on(t.tenant, t.extKey)],
);
export const crm2BlockedPhones = sqliteTable(
  'crm2_blocked_phones',
  {
    tenant: text('tenant').notNull(),
    phoneNorm: text('phone_norm').notNull(),
    reason: text('reason').notNull().default(''),
    addedBy: text('added_by').notNull().default(''),
    created: integer('created').notNull(),
  },
  (t) => [uniqueIndex('crm2_blocked_key').on(t.tenant, t.phoneNorm)],
);
export const crm2Campaigns = sqliteTable(
  'crm2_campaigns',
  {
    id: text('id').primaryKey(),
    tenant: text('tenant').notNull(),
    name: text('name').notNull(),
    source: text('source').notNull().default(''), // lead source it feeds, e.g. Facebook, Website, Quảng cáo
    runner: text('runner').notNull().default(''), // who runs the ads
    budget: integer('budget').notNull().default(0),
    startsOn: text('starts_on').notNull().default(''),
    endsOn: text('ends_on').notNull().default(''),
    active: integer('active').notNull().default(1),
    created: integer('created').notNull(),
  },
  (t) => [uniqueIndex('crm2_campaign_name').on(t.tenant, t.name)],
);
export const crm2AdSpend = sqliteTable(
  'crm2_ad_spend',
  {
    id: text('id').primaryKey(),
    tenant: text('tenant').notNull(),
    campaignId: text('campaign_id').notNull(),
    day: text('day').notNull(), // YYYY-MM-DD, Vietnam time
    amount: integer('amount').notNull().default(0),
    impressions: integer('impressions').notNull().default(0),
    clicks: integer('clicks').notNull().default(0),
    updated: integer('updated').notNull(),
  },
  (t) => [uniqueIndex('crm2_spend_day').on(t.tenant, t.campaignId, t.day)],
);
export const crm2Seeding = sqliteTable(
  'crm2_seeding',
  {
    tenant: text('tenant').notNull(),
    phoneNorm: text('phone_norm').notNull(),
    note: text('note').notNull().default(''),
    created: integer('created').notNull(),
  },
  (t) => [uniqueIndex('crm2_seeding_key').on(t.tenant, t.phoneNorm)],
);
export const crm2ViewLog = sqliteTable(
  'crm2_view_log',
  {
    id: text('id').primaryKey(),
    tenant: text('tenant').notNull(),
    userId: text('user_id').notNull(),
    leadId: text('lead_id').notNull(),
    leadName: text('lead_name').notNull().default(''),
    kind: text('kind').notNull().default('lead'), // lead | export
    created: integer('created').notNull(),
  },
  (t) => [index('crm2_view_log_time').on(t.tenant, t.created), index('crm2_view_log_user').on(t.tenant, t.userId, t.leadId, t.created)],
);
export const crm2Appointments = sqliteTable(
  'crm2_appointments',
  {
    id: text('id').primaryKey(),
    tenant: text('tenant').notNull(),
    leadId: text('lead_id').notNull(),
    owner: text('owner'),
    service: text('service').notNull().default(''),
    at: integer('at').notNull(),
    status: text('status').notNull().default('CONFIRMED'),
    note: text('note').notNull().default(''),
    createdBy: text('created_by').notNull().default(''),
    approvedBy: text('approved_by'),
    decidedAt: integer('decided_at'),
    created: integer('created').notNull(),
    updated: integer('updated').notNull(),
  },
  (t) => [index('crm2_appt_at').on(t.tenant, t.at), index('crm2_appt_lead').on(t.tenant, t.leadId)],
);
export const crm2Products = sqliteTable(
  'crm2_products',
  {
    tenant: text('tenant').notNull(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    listPrice: integer('list_price').notNull().default(0),
    limited: integer('limited').notNull().default(0), // 1 = only one customer can hold it at a time
    active: integer('active').notNull().default(1),
    created: integer('created').notNull(),
  },
  (t) => [uniqueIndex('crm2_product_code').on(t.tenant, t.code)],
);
export const crm2Holds = sqliteTable(
  'crm2_holds',
  {
    id: text('id').primaryKey(),
    tenant: text('tenant').notNull(),
    productCode: text('product_code').notNull(),
    productName: text('product_name').notNull().default(''),
    limited: integer('limited').notNull().default(0),
    leadId: text('lead_id').notNull(),
    leadName: text('lead_name').notNull().default(''),
    kind: text('kind').notNull().default('HOLD'), // HOLD | DEPOSIT
    amount: integer('amount').notNull().default(0),
    status: text('status').notNull().default('ACTIVE'), // ACTIVE CONVERTED EXPIRED RELEASED CANCELLED
    expiresAt: integer('expires_at'),
    note: text('note').notNull().default(''),
    createdBy: text('created_by').notNull().default(''),
    created: integer('created').notNull(),
    updated: integer('updated').notNull(),
  },
  (t) => [
    index('crm2_hold_lead').on(t.tenant, t.leadId),
    uniqueIndex('crm2_hold_active')
      .on(t.tenant, t.productCode)
      .where(sql`status = 'ACTIVE' AND limited = 1`),
  ],
);
export const crm2Orders = sqliteTable(
  'crm2_orders',
  {
    id: text('id').primaryKey(),
    tenant: text('tenant').notNull(),
    code: text('code').notNull(), // BK2026-0001
    leadId: text('lead_id').notNull(),
    holdId: text('hold_id'),
    productCode: text('product_code').notNull().default(''),
    productName: text('product_name').notNull().default(''),
    limited: integer('limited').notNull().default(0),
    listPrice: integer('list_price').notNull().default(0),
    discount: integer('discount').notNull().default(0),
    price: integer('price').notNull(),
    status: text('status').notNull().default('ACTIVE'), // ACTIVE COMPLETED CANCELLED
    note: text('note').notNull().default(''),
    createdBy: text('created_by').notNull().default(''),
    cancelledAt: integer('cancelled_at'),
    cancelReason: text('cancel_reason').notNull().default(''),
    refundDue: integer('refund_due').notNull().default(0),
    created: integer('created').notNull(),
    updated: integer('updated').notNull(),
  },
  (t) => [
    uniqueIndex('crm2_order_code').on(t.tenant, t.code),
    index('crm2_order_lead').on(t.tenant, t.leadId),
    // A limited product has at most one live order.
    uniqueIndex('crm2_order_active')
      .on(t.tenant, t.productCode)
      .where(sql`status IN ('ACTIVE','COMPLETED') AND limited = 1`),
  ],
);
export const crm2OrderPayments = sqliteTable(
  'crm2_order_payments',
  {
    id: text('id').primaryKey(),
    tenant: text('tenant').notNull(),
    orderId: text('order_id').notNull(),
    kind: text('kind').notNull().default('INSTALLMENT'), // DEPOSIT INSTALLMENT FINAL
    label: text('label').notNull().default(''),
    amount: integer('amount').notNull(),
    paidAmount: integer('paid_amount').notNull().default(0),
    dueDate: text('due_date'),
    paidAt: integer('paid_at'),
    method: text('method').notNull().default(''),
    status: text('status').notNull().default('PLANNED'), // PLANNED PARTIAL PAID CANCELLED
    note: text('note').notNull().default(''),
    remindedAt: integer('reminded_at'),
    createdBy: text('created_by').notNull().default(''),
    created: integer('created').notNull(),
  },
  (t) => [index('crm2_payment_order').on(t.tenant, t.orderId, t.dueDate)],
);
export const crm2CustomerProfiles = sqliteTable(
  'crm2_customer_profiles',
  {
    tenant: text('tenant').notNull(),
    phoneNorm: text('phone_norm').notNull(),
    code: text('code').notNull(), // KH-000001
    birthday: text('birthday').notNull().default(''), // YYYY-MM-DD or MM-DD
    gender: text('gender').notNull().default(''),
    occupation: text('occupation').notNull().default(''),
    interests: text('interests').notNull().default('[]'),
    note: text('note').notNull().default(''),
    birthdayTaskYear: integer('birthday_task_year'),
    updatedBy: text('updated_by').notNull().default(''),
    created: integer('created').notNull(),
    updated: integer('updated').notNull(),
  },
  (t) => [
    uniqueIndex('crm2_profile_phone').on(t.tenant, t.phoneNorm),
    uniqueIndex('crm2_profile_code').on(t.tenant, t.code),
  ],
);

// ---- Staff phones that receive a push when a guest rings the service bell ----
export const pushSubscriptions = sqliteTable(
  'push_subscriptions',
  {
    endpoint: text('endpoint').primaryKey(),
    tenant: text('tenant').notNull(),
    userId: text('user_id').notNull(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
    created: integer('created').notNull(),
  },
  (t) => [index('push_sub_tenant').on(t.tenant)],
);
// One VAPID key pair per deployment, generated on first use (public key is handed to browsers).
export const pushKeys = sqliteTable('push_keys', {
  id: text('id').primaryKey(),
  publicKey: text('public_key').notNull(),
  privateJwk: text('private_jwk').notNull(),
  created: integer('created').notNull(),
});

/** A line or room taken out of service. Rows exist only while it is under maintenance. */
export const roomMaintenance = sqliteTable(
  'room_maintenance',
  {
    tenant: text('tenant').notNull(),
    room: text('room').notNull(),
    since: integer('since').notNull(),
    reason: text('reason').notNull().default(''),
    actor: text('actor').notNull(),
  },
  (t) => [uniqueIndex('room_maintenance_pk').on(t.tenant, t.room)],
);

/** News articles and events (tournaments) shown on the public site once published. */
export const posts = sqliteTable(
  'posts',
  {
    id: text('id').primaryKey(),
    tenant: text('tenant').notNull(),
    kind: text('kind').notNull(),
    title: text('title').notNull(),
    summary: text('summary').notNull().default(''),
    body: text('body').notNull().default(''),
    image: text('image').notNull().default(''),
    eventAt: integer('event_at'),
    place: text('place').notNull().default(''),
    status: text('status').notNull().default('draft'),
    created: integer('created').notNull(),
    updated: integer('updated').notNull(),
    actor: text('actor').notNull(),
  },
  (t) => [index('posts_public').on(t.tenant, t.status, t.kind, t.created)],
);

/** People who signed up for an event (tournament) from the public page. One row per phone number per event. */
export const eventSignups = sqliteTable(
  'event_signups',
  {
    id: text('id').primaryKey(),
    tenant: text('tenant').notNull(),
    postId: text('post_id').notNull(),
    name: text('name').notNull(),
    phone: text('phone').notNull(),
    note: text('note').notNull().default(''),
    created: integer('created').notNull(),
  },
  (t) => [
    uniqueIndex('event_signup_once').on(t.tenant, t.postId, t.phone),
    index('event_signup_list').on(t.tenant, t.postId, t.created),
  ],
);
