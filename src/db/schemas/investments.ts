import { relations } from 'drizzle-orm';
import { pgEnum, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { applicationsTable } from './applications';
import { investmentTierEnum } from './programs';
import { usersTable } from './users';

export const investmentStatuses = ['pending', 'confirmed', 'failed', 'refunded'] as const;
export const investmentStatusEnum = pgEnum('investment_status', investmentStatuses);

// Investments table to track individual investments in projects
export const investmentsTable = pgTable('investments', {
  id: uuid('id').primaryKey().defaultRandom(),

  // The project (application) being invested in
  applicationId: uuid('application_id')
    .notNull()
    .references(() => applicationsTable.id, { onDelete: 'cascade' }),

  // The user who is investing (supporter)
  userId: uuid('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),

  // Investment amount (stored as string for precision with large numbers)
  amount: varchar('amount', { length: 256 }).notNull(),

  // Investment tier (if tier-based funding)
  tier: investmentTierEnum('tier'),

  // Blockchain transaction hash
  txHash: varchar('tx_hash', { length: 256 }),

  // Investment status
  status: investmentStatusEnum('status').default('pending').notNull(),

  // Refund tracking
  reclaimTxHash: varchar('reclaim_tx_hash', { length: 256 }),
  reclaimedAt: timestamp('reclaimed_at', { mode: 'date' }),

  // Timestamps
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
});

// Investment relations
export const investmentRelations = relations(investmentsTable, ({ one }) => ({
  application: one(applicationsTable, {
    fields: [investmentsTable.applicationId],
    references: [applicationsTable.id],
    relationName: 'application_investments',
  }),
  user: one(usersTable, {
    fields: [investmentsTable.userId],
    references: [usersTable.id],
    relationName: 'user_investments',
  }),
}));

// Types for use in code
export type Investment = typeof investmentsTable.$inferSelect;
export type NewInvestment = typeof investmentsTable.$inferInsert;
export type InvestmentStatusEnum = (typeof investmentStatuses)[number];
