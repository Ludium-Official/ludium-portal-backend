import { pgEnum, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { programsTable } from './programs';
import { usersTable } from './users';

// Fee status enum
export const feeStatusEnum = pgEnum('fee_status', ['pending', 'claimed', 'failed']);

// Fees table for tracking program fee claims
export const feesTable = pgTable('fees', {
  id: uuid('id').primaryKey().defaultRandom(),

  // The program this fee is for
  programId: uuid('program_id')
    .notNull()
    .references(() => programsTable.id, { onDelete: 'cascade' }),

  // The user who claimed the fee (program host)
  claimedBy: uuid('claimed_by')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),

  // Fee amount (stored as string for precision)
  amount: varchar('amount', { length: 256 }).notNull(),

  // Blockchain transaction hash for the claim
  txHash: varchar('tx_hash', { length: 256 }),

  // Status of the fee claim
  status: feeStatusEnum('status').notNull().default('pending'),

  // When the fee was claimed
  claimedAt: timestamp('claimed_at'),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type Fee = typeof feesTable.$inferSelect;
export type NewFee = typeof feesTable.$inferInsert;
