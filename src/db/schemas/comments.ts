import { relations } from 'drizzle-orm';
import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { milestonesTable } from './milestones';
import { postsTable } from './posts';
import { programsTable } from './programs';
import { usersTable } from './users';

// Define the commentable types
export const commentableTypes = ['post', 'program', 'milestone'] as const;
export const commentableTypeEnum = pgEnum('commentable_type', commentableTypes);

export const commentsTable = pgTable('comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  authorId: uuid('author_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  commentableType: commentableTypeEnum('commentable_type').notNull(),
  commentableId: uuid('commentable_id').notNull(),
  parentId: uuid('parent_id'),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
});

export const commentsRelations = relations(commentsTable, ({ one }) => ({
  author: one(usersTable, {
    fields: [commentsTable.authorId],
    references: [usersTable.id],
  }),
  post: one(postsTable, {
    fields: [commentsTable.commentableId],
    references: [postsTable.id],
  }),
  program: one(programsTable, {
    fields: [commentsTable.commentableId],
    references: [programsTable.id],
  }),
  milestone: one(milestonesTable, {
    fields: [commentsTable.commentableId],
    references: [milestonesTable.id],
  }),
  parent: one(commentsTable, {
    fields: [commentsTable.parentId],
    references: [commentsTable.id],
  }),
}));

export type Comment = typeof commentsTable.$inferSelect;
export type NewComment = typeof commentsTable.$inferInsert;
export type CommentableType = (typeof commentableTypes)[number];
