import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const settings = sqliteTable('settings', {tenant:text('tenant').primaryKey(), value:text('value').notNull()});
export const bookings = sqliteTable('bookings', {
 id:text('id').primaryKey(), tenant:text('tenant').notNull(), room:text('room').notNull(), customer:text('customer').notNull(), phone:text('phone').notNull(),
 service:text('service').notNull(), people:integer('people').notNull(), start:integer('start').notNull(), end:integer('end').notNull(), status:text('status').notNull(),
 segments:text('segments').notNull(), started:integer('started'), finished:integer('finished'), amount:integer('amount'), payment:text('payment'), price:text('price').notNull(), created:integer('created').notNull()
},t=>[index('booking_room_time').on(t.tenant,t.room,t.start,t.end)]);
export const requests = sqliteTable('requests',{id:text('id').primaryKey(),tenant:text('tenant').notNull(),booking:text('booking').notNull(),kind:text('kind').notNull(),status:text('status').notNull(),created:integer('created').notNull()});
export const audit = sqliteTable('audit',{id:text('id').primaryKey(),tenant:text('tenant').notNull(),action:text('action').notNull(),detail:text('detail').notNull(),created:integer('created').notNull()});
