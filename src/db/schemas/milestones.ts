import { relations, sql } from 'drizzle-orm';
import { boolean, decimal, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { applicationsTable } from './applications';

// Milestones table
export const milestonesTable = pgTable('milestones', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Relationship with application
  applicationId: uuid('application_id')
    .notNull()
    .references(() => applicationsTable.id, { onDelete: 'cascade' }),

  // Milestone details
  title: varchar('title', { length: 256 }).notNull(),
  description: text('description'),
  price: decimal('price', { precision: 38, scale: 18 }),
  currency: varchar('currency', { length: 10 }).default('ETH'),
  completed: boolean('completed').default(false).notNull(),

  // Timestamps
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => sql`now()`),
});

// Milestone relations
export const milestoneRelations = relations(milestonesTable, ({ one }) => ({
  application: one(applicationsTable, {
    fields: [milestonesTable.applicationId],
    references: [applicationsTable.id],
  }),
}));

// Types for use in code
export type Milestone = typeof milestonesTable.$inferSelect;
export type NewMilestone = typeof milestonesTable.$inferInsert;
