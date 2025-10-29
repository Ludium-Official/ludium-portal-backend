import { relations } from 'drizzle-orm';
import { integer, pgEnum, pgTable, serial, timestamp, varchar } from 'drizzle-orm/pg-core';
import { programsV2Table } from './programs';
import { usersV2Table } from './users';

// V2 status enum for onchain contract info
export const onchainContractStatusValues = [
  'active', // 스폰서가 create_contract 실행
  'canceled', // 스폰서가 cancel 실행
  'updated', // 컨트랙트 업데이트
  'paused', // 컨트랙트 일시정지
  'completed', // 컨트랙트 완료
] as const;
export const onchainContractStatusEnum = pgEnum(
  'onchain_contract_status',
  onchainContractStatusValues,
);

export const onchainContractInfoTable = pgTable('onchain_contract_info', {
  id: serial('id').primaryKey(),
  programId: integer('program_id')
    .notNull()
    .references(() => programsV2Table.id, { onDelete: 'cascade' }),
  applicantId: integer('applicant_id')
    .notNull()
    .references(() => usersV2Table.id, { onDelete: 'cascade' }),
  contentHash: varchar('content_hash', { length: 66 }).notNull(), // 0x + 64 hex chars
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  status: onchainContractStatusEnum('status').default('active').notNull(),
  tx: varchar('tx', { length: 66 }).notNull(), // Transaction hash: 0x + 64 hex chars
});

// Relations
export const onchainContractInfoRelations = relations(onchainContractInfoTable, ({ one }) => ({
  program: one(programsV2Table, {
    fields: [onchainContractInfoTable.programId],
    references: [programsV2Table.id],
  }),
  applicant: one(usersV2Table, {
    fields: [onchainContractInfoTable.applicantId],
    references: [usersV2Table.id],
  }),
}));

// Reverse relations (defined here to avoid circular dependencies)
// Programs → Onchain Contract Info
export const programsV2OnchainContractInfoRelation = relations(programsV2Table, ({ many }) => ({
  onchainContractInfos: many(onchainContractInfoTable),
}));

// Users → Onchain Contract Info
export const usersV2OnchainContractInfoRelation = relations(usersV2Table, ({ many }) => ({
  onchainContractInfos: many(onchainContractInfoTable),
}));

export type OnchainContractInfo = typeof onchainContractInfoTable.$inferSelect;
export type NewOnchainContractInfo = typeof onchainContractInfoTable.$inferInsert;
