import { relations } from 'drizzle-orm';
import { integer, jsonb, pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { programsV2Table } from './programs';
import { smartContractsTable } from './smart-contracts';
import { usersV2Table } from './users';

export const contractsTable = pgTable('contracts', {
  id: serial('id').primaryKey(),
  programId: integer('program_id')
    .notNull()
    .references(() => programsV2Table.id, { onDelete: 'cascade' }),
  sponsorId: integer('sponsor_id')
    .notNull()
    .references(() => usersV2Table.id, { onDelete: 'cascade' }),
  applicantId: integer('applicant_id')
    .notNull()
    .references(() => usersV2Table.id, { onDelete: 'cascade' }),
  smartContractId: integer('smart_contract_id')
    .notNull()
    .references(() => smartContractsTable.id, { onDelete: 'cascade' }),
  onchainContractId: integer('onchain_contract_id'), // nullable - set after contract execution
  contract_snapshot_cotents: jsonb('contract_snapshot_cotents'), // snapshot of the contract in JSON format
  contract_snapshot_hash: varchar('contract_snapshot_hash', { length: 66 }), // SHA-256 hex hash: 0x + 64 hex chars
  builder_signature: text('builder_signature'), // signature of the builder
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// Relations
export const contractsRelations = relations(contractsTable, ({ one }) => ({
  program: one(programsV2Table, {
    fields: [contractsTable.programId],
    references: [programsV2Table.id],
  }),
  applicant: one(usersV2Table, {
    fields: [contractsTable.applicantId],
    references: [usersV2Table.id],
  }),
  sponsor: one(usersV2Table, {
    fields: [contractsTable.sponsorId],
    references: [usersV2Table.id],
  }),
  smartContract: one(smartContractsTable, {
    fields: [contractsTable.smartContractId],
    references: [smartContractsTable.id],
  }),
}));

export type Contracts = typeof contractsTable.$inferSelect;
export type NewContracts = typeof contractsTable.$inferInsert;
