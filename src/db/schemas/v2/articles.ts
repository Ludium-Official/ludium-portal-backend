import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { usersV2Table } from './users';

export const articleStatusValues = ['published', 'draft'] as const;
export const articleStatusEnum = pgEnum('article_status', articleStatusValues);

export const articleTypeValues = ['article', 'newsletter', 'campaign'] as const;
export const articleTypeEnum = pgEnum('article_type', articleTypeValues);

// Articles table
export const articlesTable = pgTable('articles', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 130 }).notNull(),
  description: text('description').notNull(),
  coverImage: text('cover_image').notNull(),
  status: articleStatusEnum('status').default('draft').notNull(),
  authorId: integer('author_id')
    .notNull()
    .references(() => usersV2Table.id, { onDelete: 'cascade' }),
  type: articleTypeEnum('type').default('article').notNull(),
  isPin: boolean('is_pin').default(false).notNull(),
  view: integer('view').default(0).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
});

// Article views table
export const articleViewsTable = pgTable('article_views', {
  id: uuid('id').primaryKey().defaultRandom(),
  articleId: uuid('article_id')
    .notNull()
    .references(() => articlesTable.id, { onDelete: 'cascade' }),
  userId: integer('user_id').references(() => usersV2Table.id, { onDelete: 'cascade' }), // nullable
  ipAddress: varchar('ip_address', { length: 45 }), // nullable (IPv6 지원)
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// Article likes table
export const articleLikesTable = pgTable('article_likes', {
  id: uuid('id').primaryKey().defaultRandom(),
  articleId: uuid('article_id')
    .notNull()
    .references(() => articlesTable.id, { onDelete: 'cascade' }),
  userId: integer('user_id')
    .notNull()
    .references(() => usersV2Table.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// Comments table (article-specific)
export const articleCommentsTable = pgTable('article_comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  articleId: uuid('article_id')
    .notNull()
    .references(() => articlesTable.id, { onDelete: 'cascade' }),
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

// Comment likes/dislikes table
export const articleCommentReactionsTable = pgTable('article_comment_reactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  commentId: uuid('comment_id')
    .notNull()
    .references(() => articleCommentsTable.id, { onDelete: 'cascade' }),
  userId: integer('user_id')
    .notNull()
    .references(() => usersV2Table.id, { onDelete: 'cascade' }),
  reaction: varchar('reaction', { length: 10 }).notNull(), // 'like' or 'dislike'
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const articleRelations = relations(articlesTable, ({ one, many }) => ({
  author: one(usersV2Table, {
    fields: [articlesTable.authorId],
    references: [usersV2Table.id],
  }),
  likes: many(articleLikesTable),
  comments: many(articleCommentsTable),
}));

export const articleViewRelations = relations(articleViewsTable, ({ one }) => ({
  article: one(articlesTable, {
    fields: [articleViewsTable.articleId],
    references: [articlesTable.id],
  }),
  user: one(usersV2Table, {
    fields: [articleViewsTable.userId],
    references: [usersV2Table.id],
  }),
}));

export const articleLikeRelations = relations(articleLikesTable, ({ one }) => ({
  article: one(articlesTable, {
    fields: [articleLikesTable.articleId],
    references: [articlesTable.id],
  }),
  user: one(usersV2Table, {
    fields: [articleLikesTable.userId],
    references: [usersV2Table.id],
  }),
}));

export const articleCommentRelations = relations(articleCommentsTable, ({ one }) => ({
  article: one(articlesTable, {
    fields: [articleCommentsTable.articleId],
    references: [articlesTable.id],
  }),
  author: one(usersV2Table, {
    fields: [articleCommentsTable.authorId],
    references: [usersV2Table.id],
  }),
  parent: one(articleCommentsTable, {
    fields: [articleCommentsTable.parentId],
    references: [articleCommentsTable.id],
    relationName: 'commentParent',
  }),
}));

export const articleCommentReactionRelations = relations(
  articleCommentReactionsTable,
  ({ one }) => ({
    comment: one(articleCommentsTable, {
      fields: [articleCommentReactionsTable.commentId],
      references: [articleCommentsTable.id],
    }),
    user: one(usersV2Table, {
      fields: [articleCommentReactionsTable.userId],
      references: [usersV2Table.id],
    }),
  }),
);

export type Article = typeof articlesTable.$inferSelect;
export type ArticleView = typeof articleViewsTable.$inferSelect;
export type ArticleLike = typeof articleLikesTable.$inferSelect;
export type ArticleComment = typeof articleCommentsTable.$inferSelect;
export type ArticleCommentReaction = typeof articleCommentReactionsTable.$inferSelect;
