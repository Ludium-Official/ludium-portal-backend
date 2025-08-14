import { relations } from 'drizzle-orm';
import { pgTable, primaryKey, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { postsTable } from './posts';
import { usersTable } from './users';

// Track individual post views
export const postViewsTable = pgTable(
  'post_views',
  {
    postId: uuid('post_id')
      .notNull()
      .references(() => postsTable.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => usersTable.id, { onDelete: 'cascade' }),
    ipAddress: varchar('ip_address', { length: 45 }), // For anonymous views (IPv6 max length is 45)
    viewedAt: timestamp('viewed_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (t) => [
    primaryKey({
      columns: [t.postId, t.userId, t.ipAddress],
      name: 'post_views_pkey',
    }),
  ],
);

export const postViewsRelations = relations(postViewsTable, ({ one }) => ({
  post: one(postsTable, {
    fields: [postViewsTable.postId],
    references: [postsTable.id],
  }),
  user: one(usersTable, {
    fields: [postViewsTable.userId],
    references: [usersTable.id],
  }),
}));

export type PostView = typeof postViewsTable.$inferSelect;
export type NewPostView = typeof postViewsTable.$inferInsert;
