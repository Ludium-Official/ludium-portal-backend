import { boolean, integer, pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { usersV2Table } from './users';

export const portfoliosV2Table = pgTable('portfolios_v2', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => usersV2Table.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 256 }).notNull(),
  isLudiumProject: boolean('is_ludium_project').default(false).notNull(),
  role: varchar('role', { length: 256 }),
  description: varchar('description', { length: 1000 }),
  images: text('images').array(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
  deletedAt: timestamp('deleted_at', { mode: 'date' }),
});

export type PortfolioV2 = typeof portfoliosV2Table.$inferSelect;
export type NewPortfolioV2 = typeof portfoliosV2Table.$inferInsert;
