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
  },
  (t) => [
    uniqueIndex('finance_request_once').on(t.tenant, t.requestId),
    uniqueIndex('booking_paid_once')
      .on(t.tenant, t.bookingId)
      .where(sql`${t.bookingId} IS NOT NULL`),
    index('finance_shift_time').on(t.tenant, t.shiftId, t.created),
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
    purchased: integer('purchased').notNull(),
    expires: integer('expires').notNull(),
    actor: text('actor').notNull(),
  },
  (t) => [index('customer_package_customer').on(t.tenant, t.customerId)],
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
