import {sql} from 'drizzle-orm';
import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
export const settings = sqliteTable('settings', {tenant:text('tenant').primaryKey(), value:text('value').notNull()});
export const bookings = sqliteTable('bookings', {
 id:text('id').primaryKey(), tenant:text('tenant').notNull(), room:text('room').notNull(), customer:text('customer').notNull(), phone:text('phone').notNull(),
 service:text('service').notNull(), people:integer('people').notNull(), start:integer('start').notNull(), end:integer('end').notNull(), status:text('status').notNull(),
 foodTotal:integer('food_total').notNull().default(0),golfAmount:integer('golf_amount'),
 segments:text('segments').notNull(), started:integer('started'), finished:integer('finished'), amount:integer('amount'), payment:text('payment'), price:text('price').notNull(), created:integer('created').notNull()
},t=>[index('booking_room_time').on(t.tenant,t.room,t.start,t.end)]);
export const requests = sqliteTable('requests',{id:text('id').primaryKey(),tenant:text('tenant').notNull(),booking:text('booking').notNull(),kind:text('kind').notNull(),status:text('status').notNull(),created:integer('created').notNull()});
export const audit = sqliteTable('audit',{id:text('id').primaryKey(),tenant:text('tenant').notNull(),action:text('action').notNull(),detail:text('detail').notNull(),created:integer('created').notNull()});

export const shifts = sqliteTable('shifts', {
 id:text('id').primaryKey(),tenant:text('tenant').notNull(),name:text('name').notNull(),status:text('status').notNull(),
 openedBy:text('opened_by').notNull(),openedAt:integer('opened_at').notNull(),openingCash:integer('opening_cash').notNull(),version:integer('version').notNull().default(0),
 closedBy:text('closed_by'),closedAt:integer('closed_at'),countedCash:integer('counted_cash'),countedTransfer:integer('counted_transfer'),countedCard:integer('counted_card'),
 expectedCash:integer('expected_cash'),expectedTransfer:integer('expected_transfer'),expectedCard:integer('expected_card'),note:text('note')
},t=>[uniqueIndex('one_open_shift_per_tenant').on(t.tenant).where(sql`${t.status} = 'open'`),index('shift_tenant_time').on(t.tenant,t.openedAt)]);
export const financeEntries = sqliteTable('finance_entries', {
 id:text('id').primaryKey(),tenant:text('tenant').notNull(),shiftId:text('shift_id').notNull().references(()=>shifts.id),kind:text('kind').notNull(),method:text('method').notNull(),
 amount:integer('amount').notNull(),bookingId:text('booking_id').references(()=>bookings.id),requestId:text('request_id').notNull(),note:text('note').notNull(),actor:text('actor').notNull(),created:integer('created').notNull()
},t=>[uniqueIndex('finance_request_once').on(t.tenant,t.requestId),uniqueIndex('booking_paid_once').on(t.tenant,t.bookingId).where(sql`${t.bookingId} IS NOT NULL`),index('finance_shift_time').on(t.tenant,t.shiftId,t.created)]);

export const menuItems=sqliteTable('menu_items',{
 id:text('id').primaryKey(),tenant:text('tenant').notNull(),name:text('name').notNull(),category:text('category').notNull(),unit:text('unit').notNull(),
 price:integer('price').notNull(),feeBps:integer('fee_bps').notNull(),vatBps:integer('vat_bps').notNull(),active:integer('active').notNull(),version:integer('version').notNull().default(0),created:integer('created').notNull()
},t=>[index('menu_tenant').on(t.tenant,t.active)]);
export const foodOrders=sqliteTable('food_orders',{
 id:text('id').primaryKey(),tenant:text('tenant').notNull(),bookingId:text('booking_id').notNull().references(()=>bookings.id),requestId:text('request_id').notNull(),requestData:text('request_data').notNull(),
 items:text('items').notNull(),subtotal:integer('subtotal').notNull(),fee:integer('fee').notNull(),vat:integer('vat').notNull(),total:integer('total').notNull(),note:text('note').notNull(),
 status:text('status').notNull(),version:integer('version').notNull().default(0),actor:text('actor').notNull(),created:integer('created').notNull(),updated:integer('updated').notNull(),reason:text('reason').notNull().default('')
},t=>[uniqueIndex('food_order_request_once').on(t.tenant,t.requestId),index('food_order_booking').on(t.tenant,t.bookingId),index('food_order_status').on(t.tenant,t.status)]);
