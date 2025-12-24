import { integer, pgTable, serial, varchar, timestamp } from 'drizzle-orm/pg-core';
import { usersV2Table } from './users';

export const educationsV2Table = pgTable('educations_v2', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => usersV2Table.id, { onDelete: 'cascade' }),
  school: varchar('school', { length: 256 }).notNull(),
  degree: varchar('degree', { length: 100 }), // 'Bachelor', 'Master', 'PhD', etc.
  study: varchar('study', { length: 256 }), // Major
  attendedStartDate: integer('attended_start_date'),
  attendedEndDate: integer('attended_end_date'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
  deletedAt: timestamp('deleted_at', { mode: 'date' }),
});

export type EducationV2 = typeof educationsV2Table.$inferSelect;
export type NewEducationV2 = typeof educationsV2Table.$inferInsert;
