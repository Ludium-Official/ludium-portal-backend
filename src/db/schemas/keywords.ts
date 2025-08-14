import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { postsToKeywordsTable } from './posts';
import { programsToKeywordsTable } from './programs';
import { usersToKeywordsTable } from './users';

// Keywords table
export const keywordsTable = pgTable('keywords', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),

  // Timestamps
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
});

// Keyword relations
export const keywordRelations = relations(keywordsTable, ({ many }) => ({
  programsToKeywords: many(programsToKeywordsTable),
  postsToKeywords: many(postsToKeywordsTable),
  usersToKeywords: many(usersToKeywordsTable),
}));

// Types for use in code
export type Keyword = typeof keywordsTable.$inferSelect;
export type NewKeyword = typeof keywordsTable.$inferInsert;
