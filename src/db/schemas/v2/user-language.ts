import { integer, pgTable, serial, varchar } from 'drizzle-orm/pg-core';
import { usersV2Table } from './users';

export const languagesV2Table = pgTable('languages_v2', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => usersV2Table.id, { onDelete: 'cascade' }),
  language: varchar('language', { length: 100 }).notNull(),
  proficiency: varchar('proficiency', { length: 50 }).notNull(), // 'native', 'fluent', 'intermediate', etc.
});

export type LanguageV2 = typeof languagesV2Table.$inferSelect;
export type NewLanguageV2 = typeof languagesV2Table.$inferInsert;
