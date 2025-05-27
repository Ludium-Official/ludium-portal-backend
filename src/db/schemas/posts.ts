import { relations } from 'drizzle-orm';
import { pgTable, primaryKey, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { commentsTable } from './comments';
import { keywordsTable } from './keywords';
import { usersTable } from './users';

export const postsTable = pgTable('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 256 }).notNull(),
  authorId: uuid('author_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  summary: varchar('summary', { length: 512 }).notNull(),
  image: varchar('image', { length: 512 }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
});

export const postsRelations = relations(postsTable, ({ one, many }) => ({
  author: one(usersTable, {
    fields: [postsTable.authorId],
    references: [usersTable.id],
  }),
  comments: many(commentsTable),
  postsToKeywords: many(postsToKeywordsTable),
}));

// Keywords
export const postsToKeywordsTable = pgTable(
  'posts_to_keywords',
  {
    postId: uuid('post_id')
      .notNull()
      .references(() => postsTable.id, { onDelete: 'cascade' }),
    keywordId: uuid('keyword_id')
      .notNull()
      .references(() => keywordsTable.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.postId, t.keywordId] })],
);

export const postsToKeywordsRelations = relations(postsToKeywordsTable, ({ one }) => ({
  post: one(postsTable, {
    fields: [postsToKeywordsTable.postId],
    references: [postsTable.id],
  }),
  keyword: one(keywordsTable, {
    fields: [postsToKeywordsTable.keywordId],
    references: [keywordsTable.id],
  }),
}));

export type Post = typeof postsTable.$inferSelect;
export type NewPost = typeof postsTable.$inferInsert;
