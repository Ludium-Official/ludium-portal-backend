// @src/db/schemas/v2/tokens.ts

import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, varchar } from 'drizzle-orm/pg-core';
import { networksTable } from './networks';

export const tokensTable = pgTable('tokens', {
  id: serial('id').primaryKey(), // EN: Primary key for token / KR: 토큰의 기본 키

  // EN: Foreign key linking to the network
  // KR: 네트워크를 연결하는 외래 키
  chainInfoId: integer('chain_info_id')
    .notNull()
    .references(() => networksTable.id, { onDelete: 'cascade' }),

  // EN: Token name (e.g., USDC, ETH, WETH)
  // KR: 토큰 이름 (예: USDC, ETH, WETH)
  tokenName: varchar('token_name', { length: 10 }).notNull(),

  // EN: Token contract address on the blockchain
  // KR: 블록체인상의 토큰 컨트랙트 주소
  tokenAddress: varchar('token_address', { length: 42 }).notNull(),
  decimals: integer('decimals').notNull(),
});

export const tokensRelations = relations(tokensTable, ({ one }) => ({
  // EN: Relation back to the network
  // KR: 네트워크로 돌아가는 관계
  network: one(networksTable, {
    fields: [tokensTable.chainInfoId],
    references: [networksTable.id],
  }),
}));

export type TokenType = typeof tokensTable.$inferSelect;
export type NewTokenType = typeof tokensTable.$inferInsert;
