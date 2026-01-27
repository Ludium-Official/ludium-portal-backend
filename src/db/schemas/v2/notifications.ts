import { relations } from 'drizzle-orm';
import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { usersV2Table } from './users';

export const notificationV2Types = [
  'program',
  'application',
  'milestone',
  'contract',
  'article',
  'thread',
  'system',
] as const;

export const notificationV2TypeEnum = pgEnum('notification_v2_type', notificationV2Types);

export const notificationV2Actions = [
  'created',
  'accepted',
  'rejected',
  'submitted',
  'completed',
  'broadcast',
  'invited',
  'updated',
  'deleted',
] as const;

export const notificationV2ActionEnum = pgEnum('notification_v2_action', notificationV2Actions);

export const notificationsV2Table = pgTable('notifications_v2', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: notificationV2TypeEnum('type').notNull(),
  action: notificationV2ActionEnum('action').notNull(),

  // V2 user reference
  recipientId: integer('recipient_id')
    .references(() => usersV2Table.id, { onDelete: 'cascade' })
    .notNull(),

  // Entity can be UUID (programs) or serial (applications, milestones)
  entityId: varchar('entity_id', { length: 256 }).notNull(),

  title: varchar('title', { length: 255 }),
  content: text('content'),
  metadata: jsonb('metadata'),

  readAt: timestamp('read_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
});

export const notificationV2Relations = relations(notificationsV2Table, ({ one }) => ({
  recipient: one(usersV2Table, {
    fields: [notificationsV2Table.recipientId],
    references: [usersV2Table.id],
  }),
}));

export type NotificationV2 = typeof notificationsV2Table.$inferSelect;
export type NotificationV2Insert = typeof notificationsV2Table.$inferInsert;
export type NotificationV2TypeEnum = (typeof notificationV2Types)[number];
export type NotificationV2ActionEnum = (typeof notificationV2Actions)[number];
