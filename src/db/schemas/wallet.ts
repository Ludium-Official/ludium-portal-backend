import { pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { usersTable } from './users';
export const walletTable = pgTable('wallet', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  walletId: varchar('wallet_id', { length: 256 }).notNull().unique(),
  address: varchar('address', { length: 256 }).notNull().unique(),
  balance: varchar('balance', { length: 256 }).default('0'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
});
