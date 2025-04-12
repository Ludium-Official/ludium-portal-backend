import { pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { usersTable } from './users';

export const walletTable = pgTable('wallet', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  walletId: varchar('wallet_id', { length: 256 }).notNull().unique(),
  network: varchar('network', { length: 256 }).default('Ethereum'),
  address: varchar('address', { length: 256 }).unique(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
});

export type Wallet = typeof walletTable.$inferSelect;
export type NewWallet = typeof walletTable.$inferInsert;
