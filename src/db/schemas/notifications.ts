import { relations } from 'drizzle-orm';
import { jsonb, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { usersTable } from './users';

export const notificationTypes = [
  'program',
  'application',
  'milestone',
  'comment',
  'system',
] as const;
export const notificationTypeEnum = pgEnum('notification_type', notificationTypes);

export const notificationActions = [
  'created',
  'accepted',
  'rejected',
  'submitted',
  'completed',
  'broadcast',
] as const;
export const notificationActionEnum = pgEnum('notification_action', notificationActions);

export const notificationsTable = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: notificationTypeEnum('type').notNull(),
  action: notificationActionEnum('action').notNull(),
  recipientId: uuid('recipient_id')
    .references(() => usersTable.id)
    .notNull(),
  entityId: uuid('entity_id').notNull(),
  title: varchar('title', { length: 255 }),
  content: text('content'),
  metadata: jsonb('metadata'),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
});

export const notificationsRelations = relations(notificationsTable, ({ one }) => ({
  recipient: one(usersTable, {
    fields: [notificationsTable.recipientId],
    references: [usersTable.id],
  }),
}));

export type Notification = typeof notificationsTable.$inferSelect;
export type NotificationInsert = typeof notificationsTable.$inferInsert;
export type NotificationTypeEnum = (typeof notificationTypes)[number];
export type NotificationActionEnum = (typeof notificationActions)[number];
