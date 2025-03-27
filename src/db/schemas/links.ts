import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { applicationsToLinksTable } from './applications';
import { milestonesToLinksTable } from './milestones';
import { programsToLinksTable } from './programs';
import { usersToLinksTable } from './users';

export const linksTable = pgTable('links', {
  id: uuid('id').primaryKey().defaultRandom(),
  url: text('url').notNull(),
  title: text('title'),

  // Timestamps
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
});

export const linksRelations = relations(linksTable, ({ many }) => ({
  usersToLinks: many(usersToLinksTable),
  programsToLinks: many(programsToLinksTable),
  milestonesToLinks: many(milestonesToLinksTable),
  applicationsToLinks: many(applicationsToLinksTable),
}));

// Types for use in code
export type Link = typeof linksTable.$inferSelect;
export type NewLink = typeof linksTable.$inferInsert;
