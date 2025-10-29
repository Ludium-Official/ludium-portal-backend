// @src/db/schemas/v2/onchain-program-info.ts

import { relations } from 'drizzle-orm';
import { integer, pgEnum, pgTable, serial, timestamp, varchar } from 'drizzle-orm/pg-core';
import { programsV2Table } from './programs';
import { smartContractsTable } from './smart-contracts';

// V2 status enum for onchain program info
export const onchainProgramStatusValues = ['active', 'paused', 'completed', 'cancelled'] as const;
export const onchainProgramStatusEnum = pgEnum(
  'onchain_program_status',
  onchainProgramStatusValues,
);

export const onchainProgramInfoTable = pgTable('onchain_program_info', {
  id: serial('id').primaryKey(),
  programId: integer('program_id')
    .notNull()
    .references(() => programsV2Table.id, { onDelete: 'cascade' }),
  smartContractId: integer('smart_contract_id')
    .notNull()
    .references(() => smartContractsTable.id, { onDelete: 'cascade' }),
  onchainProgramId: integer('onchain_program_id').notNull(),
  status: onchainProgramStatusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  tx: varchar('tx', { length: 66 }).notNull(), // 0x + 64 hex chars
});

// Relations
export const onchainProgramInfoRelations = relations(onchainProgramInfoTable, ({ one }) => ({
  program: one(programsV2Table, {
    fields: [onchainProgramInfoTable.programId],
    references: [programsV2Table.id],
  }),
  smartContract: one(smartContractsTable, {
    fields: [onchainProgramInfoTable.smartContractId],
    references: [smartContractsTable.id],
  }),
}));

// Reverse relations
export const programsV2OnchainProgramInfoRelation = relations(programsV2Table, ({ many }) => ({
  onchainProgramInfos: many(onchainProgramInfoTable),
}));
export const smartContractsOnchainProgramInfoRelation = relations(
  smartContractsTable,
  ({ many }) => ({
    onchainProgramInfos: many(onchainProgramInfoTable),
  }),
);

export type OnchainProgramInfo = typeof onchainProgramInfoTable.$inferSelect;
export type NewOnchainProgramInfo = typeof onchainProgramInfoTable.$inferInsert;
