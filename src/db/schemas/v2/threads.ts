import { relations } from 'drizzle-orm';
import { integer, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { usersV2Table } from './users';

// Threads table
export const threadsTable = pgTable('threads', {
  id: uuid('id').primaryKey().defaultRandom(),
  content: text('content').notNull(),
  authorId: integer('author_id')
    .notNull()
    .references(() => usersV2Table.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
});

// Thread reactions table (like/dislike)
export const threadReactionsTable = pgTable('thread_reactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  threadId: uuid('thread_id')
    .notNull()
    .references(() => threadsTable.id, { onDelete: 'cascade' }),
  userId: integer('user_id')
    .notNull()
    .references(() => usersV2Table.id, { onDelete: 'cascade' }),
  reaction: varchar('reaction', { length: 10 }).notNull(), // 'like' or 'dislike'
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// Thread comments table
export const threadCommentsTable = pgTable('thread_comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  threadId: uuid('thread_id')
    .notNull()
    .references(() => threadsTable.id, { onDelete: 'cascade' }),
  authorId: integer('author_id')
    .notNull()
    .references(() => usersV2Table.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  parentId: uuid('parent_id'), // For nested comments
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
  deletedAt: timestamp('deleted_at', { mode: 'date' }),
});

// Comment reactions table
export const threadCommentReactionsTable = pgTable('thread_comment_reactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  commentId: uuid('comment_id')
    .notNull()
    .references(() => threadCommentsTable.id, { onDelete: 'cascade' }),
  userId: integer('user_id')
    .notNull()
    .references(() => usersV2Table.id, { onDelete: 'cascade' }),
  reaction: varchar('reaction', { length: 10 }).notNull(), // 'like' or 'dislike'
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const threadRelations = relations(threadsTable, ({ one, many }) => ({
  author: one(usersV2Table, {
    fields: [threadsTable.authorId],
    references: [usersV2Table.id],
  }),
  reactions: many(threadReactionsTable),
  comments: many(threadCommentsTable),
}));

export const threadReactionRelations = relations(threadReactionsTable, ({ one }) => ({
  thread: one(threadsTable, {
    fields: [threadReactionsTable.threadId],
    references: [threadsTable.id],
  }),
  user: one(usersV2Table, {
    fields: [threadReactionsTable.userId],
    references: [usersV2Table.id],
  }),
}));

export const threadCommentRelations = relations(threadCommentsTable, ({ one }) => ({
  thread: one(threadsTable, {
    fields: [threadCommentsTable.threadId],
    references: [threadsTable.id],
  }),
  author: one(usersV2Table, {
    fields: [threadCommentsTable.authorId],
    references: [usersV2Table.id],
  }),
  parent: one(threadCommentsTable, {
    fields: [threadCommentsTable.parentId],
    references: [threadCommentsTable.id],
    relationName: 'commentParent',
  }),
}));

export const threadCommentReactionRelations = relations(threadCommentReactionsTable, ({ one }) => ({
  comment: one(threadCommentsTable, {
    fields: [threadCommentReactionsTable.commentId],
    references: [threadCommentsTable.id],
  }),
  user: one(usersV2Table, {
    fields: [threadCommentReactionsTable.userId],
    references: [usersV2Table.id],
  }),
}));

export type Thread = typeof threadsTable.$inferSelect;
export type ThreadReaction = typeof threadReactionsTable.$inferSelect;
export type ThreadComment = typeof threadCommentsTable.$inferSelect;
export type ThreadCommentReaction = typeof threadCommentReactionsTable.$inferSelect;
