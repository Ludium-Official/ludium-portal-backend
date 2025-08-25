import { relations } from 'drizzle-orm';
import { pgEnum, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { investmentsTable } from './investments';
import { milestonesTable } from './milestones';

export const payoutStatuses = ['pending', 'processing', 'completed', 'failed'] as const;
export const payoutStatusEnum = pgEnum('payout_status', payoutStatuses);

// Milestone payouts table - tracks payouts to investors when milestones are completed
export const milestonePayoutsTable = pgTable('milestone_payouts', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Relationships
  milestoneId: uuid('milestone_id')
    .notNull()
    .references(() => milestonesTable.id, { onDelete: 'cascade' }),
  investmentId: uuid('investment_id')
    .notNull()
    .references(() => investmentsTable.id, { onDelete: 'cascade' }),

  // Payout details
  amount: varchar('amount', { length: 256 }).notNull(), // Amount to be paid out
  percentage: varchar('percentage', { length: 10 }).notNull(), // Milestone percentage
  status: payoutStatusEnum('status').default('pending').notNull(),
  txHash: varchar('tx_hash', { length: 256 }), // Transaction hash when processed
  errorMessage: varchar('error_message', { length: 512 }), // Error if failed

  // Timestamps
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  processedAt: timestamp('processed_at', { mode: 'date' }), // When payout was processed
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
});

// Relations
export const milestonePayoutRelations = relations(milestonePayoutsTable, ({ one }) => ({
  milestone: one(milestonesTable, {
    fields: [milestonePayoutsTable.milestoneId],
    references: [milestonesTable.id],
  }),
  investment: one(investmentsTable, {
    fields: [milestonePayoutsTable.investmentId],
    references: [investmentsTable.id],
  }),
}));

// Types for use in code
export type MilestonePayout = typeof milestonePayoutsTable.$inferSelect;
export type NewMilestonePayout = typeof milestonePayoutsTable.$inferInsert;
export type PayoutStatusEnum = (typeof payoutStatuses)[number];
