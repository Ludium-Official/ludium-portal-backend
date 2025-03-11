import { relations, sql } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { programsToKeywordsTable } from './programs';

// Keywords table
export const keywordsTable = pgTable('keywords', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),

  // Timestamps
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => sql`now()`),
});

// Keyword relations
export const keywordRelations = relations(keywordsTable, ({ many }) => ({
  programsToKeywords: many(programsToKeywordsTable),
}));

// Types for use in code
export type Keyword = typeof keywordsTable.$inferSelect;
export type NewKeyword = typeof keywordsTable.$inferInsert;
