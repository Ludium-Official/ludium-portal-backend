import { relations } from 'drizzle-orm';
import { integer, pgEnum, pgTable, serial, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { programsV2Table } from './programs';
import { smartContractsTable } from './smart-contracts';
import { usersV2Table } from './users';

// V2 status enum for onchain contract info
// enum ContractStatus { Active, Paused, Completed, Cancelled } from ILdRecruitment.sol
// event ContractUpdated(
//   uint256 indexed contractId,
//   uint256 newAmount,
//   uint256 newDeadline
// );
export const onchainContractStatusValues = [
  'active',
  'paused',
  'completed',
  'updated',
  'cancelled',
] as const;
export const onchainContractStatusEnum = pgEnum(
  'onchain_contract_status',
  onchainContractStatusValues,
);

export const onchainContractInfoTable = pgTable('onchain_contract_info', {
  id: serial('id').primaryKey(),
  programId: uuid('program_id')
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
  onchainContractId: integer('onchain_contract_id').notNull(),
  status: onchainContractStatusEnum('status').default('active').notNull(),
  tx: varchar('tx', { length: 66 }).notNull(), // Transaction hash: 0x + 64 hex chars
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// Relations
export const onchainContractInfoRelations = relations(onchainContractInfoTable, ({ one }) => ({
  program: one(programsV2Table, {
    fields: [onchainContractInfoTable.programId],
    references: [programsV2Table.id],
  }),
  sponsor: one(usersV2Table, {
    fields: [onchainContractInfoTable.sponsorId],
    references: [usersV2Table.id],
  }),
  applicant: one(usersV2Table, {
    fields: [onchainContractInfoTable.applicantId],
    references: [usersV2Table.id],
  }),
  smartContract: one(smartContractsTable, {
    fields: [onchainContractInfoTable.smartContractId],
    references: [smartContractsTable.id],
  }),
}));

export type OnchainContractInfo = typeof onchainContractInfoTable.$inferSelect;
export type NewOnchainContractInfo = typeof onchainContractInfoTable.$inferInsert;
