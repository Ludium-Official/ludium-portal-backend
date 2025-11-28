// @src/db/schemas/v2/networks.ts

import { boolean, integer, pgTable, serial, varchar } from 'drizzle-orm/pg-core';

export const networksTable = pgTable('networks', {
  id: serial('id').primaryKey(), // EN: Primary key for network / KR: 네트워크의 기본 키

  // EN: Chain ID (e.g., 1 for Ethereum mainnet, 11155111 for Sepolia)
  // KR: 체인 ID (예: 이더리움 메인넷은 1, Sepolia는 11155111)
  chainId: integer('chain_id').notNull().unique(),

  // EN: Human-readable chain name
  // KR: 사람이 읽기 쉬운 체인 이름
  chainName: varchar('chain_name', { length: 100 }).notNull(),

  // EN: Whether this is a mainnet (true) or testnet (false)
  // KR: 메인넷(true)인지 테스트넷(false)인지 여부
  mainnet: boolean('mainnet').notNull().default(false),

  // EN: Block explorer URL for this network
  // KR: 이 네트워크의 블록 익스플로러 URL
  exploreUrl: varchar('explore_url', { length: 256 }),
});

export type NetworkType = typeof networksTable.$inferSelect;
export type NewNetworkType = typeof networksTable.$inferInsert;
