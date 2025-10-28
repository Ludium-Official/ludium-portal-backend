import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, varchar } from 'drizzle-orm/pg-core';
import { programsV2Table } from './programs';

export const programOnchainInfoV2Table = pgTable('program_onchain_info_v2', {
  id: serial('id').primaryKey(),
  programId: integer('program_id')
    .notNull()
    .references(() => programsV2Table.id, { onDelete: 'cascade' }),
  contractAddress: varchar('contract_address', { length: 256 }).notNull(),
  transactionHash: varchar('transaction_hash', { length: 256 }).notNull(),
  blockNumber: varchar('block_number', { length: 256 }).notNull(),
  chainId: varchar('chain_id', { length: 256 }).notNull(),
});

export const programOnchainInfoV2Relations = relations(programOnchainInfoV2Table, ({ one }) => ({
  program: one(programsV2Table, {
    fields: [programOnchainInfoV2Table.programId],
    references: [programsV2Table.id],
  }),
}));

export type ProgramOnchainInfoV2 = typeof programOnchainInfoV2Table.$inferSelect;
export type NewProgramOnchainInfoV2 = typeof programOnchainInfoV2Table.$inferInsert;
