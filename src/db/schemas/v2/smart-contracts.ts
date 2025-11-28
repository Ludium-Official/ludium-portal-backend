// @src/db/schemas/v2/smart-contracts.ts

import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, varchar } from 'drizzle-orm/pg-core';
import { networksTable } from './networks';

/**
 * Smart Contracts Table
 * Stores deployed smart contract information
 */
export const smartContractsTable = pgTable('smart_contracts', {
  id: serial('id').primaryKey(), // EN: Primary key for smart contract / KR: 스마트 컨트랙트의 기본 키

  // EN: Reference to the network/chain where this contract is deployed
  // KR: 이 컨트랙트가 배포된 네트워크/체인에 대한 참조
  chainInfoId: integer('chain_info_id')
    .notNull()
    .references(() => networksTable.id, { onDelete: 'cascade' }),

  // EN: Smart contract address (e.g., 0x followed by 40 hex characters = 42 total)
  // KR: 스마트 컨트랙트 주소 (예: 0x로 시작하고 40자 hex 문자 = 총 42자)
  address: varchar('address', { length: 42 }).notNull(), // 0x + 64 hex chars (supports longer formats)

  // EN: Human-readable name for this contract
  // KR: 이 컨트랙트의 사람이 읽기 쉬운 이름
  name: varchar('name', { length: 256 }).notNull(),
});

/**
 * Relations
 */
export const smartContractsRelations = relations(smartContractsTable, ({ one }) => ({
  // EN: Network where this contract is deployed
  // KR: 이 컨트랙트가 배포된 네트워크
  network: one(networksTable, {
    fields: [smartContractsTable.chainInfoId],
    references: [networksTable.id],
  }),
}));

/**
 * Reverse relations (defined here to avoid circular dependencies)
 */
// Networks → Smart Contracts
export const networksSmartContractsRelation = relations(networksTable, ({ many }) => ({
  smartContracts: many(smartContractsTable),
}));

/**
 * Type exports
 */
export type SmartContract = typeof smartContractsTable.$inferSelect;
export type NewSmartContract = typeof smartContractsTable.$inferInsert;
