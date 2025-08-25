import { relations } from 'drizzle-orm';
import { integer, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { applicationsTable } from './applications';

// Investment Terms table
export const investmentTermsTable = pgTable('investment_terms', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Relationship with application
  applicationId: uuid('application_id')
    .notNull()
    .references(() => applicationsTable.id, { onDelete: 'cascade' }),

  // Term details
  title: varchar('title', { length: 256 }).notNull(),
  description: text('description'),
  price: varchar('price', { length: 256 }).notNull(),
  purchaseLimit: integer('purchase_limit'),

  // Timestamps
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
});

// Investment Terms relations
export const investmentTermsRelations = relations(investmentTermsTable, ({ one }) => ({
  application: one(applicationsTable, {
    fields: [investmentTermsTable.applicationId],
    references: [applicationsTable.id],
  }),
}));

// Types for use in code
export type InvestmentTerm = typeof investmentTermsTable.$inferSelect;
export type NewInvestmentTerm = typeof investmentTermsTable.$inferInsert;
export type InvestmentTermUpdate = Omit<
  InvestmentTerm,
  'id' | 'createdAt' | 'updatedAt' | 'applicationId'
>;
