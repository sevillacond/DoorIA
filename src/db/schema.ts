import { pgTable, serial, text, varchar, timestamp, boolean, integer, json } from 'drizzle-orm/pg-core';

export const units = pgTable('units', {
  id: serial('id').primaryKey(),
  number: varchar('number', { length: 10 }).notNull().unique(),
  block: varchar('block', { length: 50 }),
  ownerName: text('owner_name').notNull(),
  sipExtension: varchar('sip_extension', { length: 20 }),
  financialStatus: varchar('financial_status', { length: 20 }).default('em_dia'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  role: varchar('role', { length: 50 }).notNull(),
  email: varchar('email', { length: 255 }).unique(),
  unitId: integer('unit_id').references(() => units.id),
  createdAt: timestamp('created_at').defaultNow(),
});

export const gates = pgTable('gates', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  relayPin: varchar('relay_pin', { length: 20 }),
  status: varchar('status', { length: 20 }).default('fechado'),
  lastOpenedAt: timestamp('last_opened_at'),
  lastOpenedBy: text('last_opened_by'),
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  actorName: text('actor_name').notNull(),
  actorRole: varchar('actor_role', { length: 50 }),
  action: varchar('action', { length: 100 }).notNull(),
  target: text('target'),
  result: varchar('result', { length: 50 }),
  details: json('details'),
  reason: text('reason'),
  createdAt: timestamp('created_at').defaultNow(),
});
