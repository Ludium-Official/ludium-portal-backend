import { boolean, integer, pgTable, serial, varchar, timestamp } from 'drizzle-orm/pg-core';
import { usersV2Table } from './users';

export const workExperiencesV2Table = pgTable('work_experiences_v2', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => usersV2Table.id, { onDelete: 'cascade' }),
  company: varchar('company', { length: 256 }).notNull(),
  role: varchar('role', { length: 256 }).notNull(),
  employmentType: varchar('employment_type', { length: 50 }), // 'full-time', 'part-time', etc.
  currentWork: boolean('current_work').default(false),
  startYear: integer('start_year'),
  startMonth: varchar('start_month', { length: 50 }), // 'January', 'February', etc.
  endYear: integer('end_year'),
  endMonth: varchar('end_month', { length: 50 }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
  deletedAt: timestamp('deleted_at', { mode: 'date' }),
});

export type WorkExperienceV2 = typeof workExperiencesV2Table.$inferSelect;
export type NewWorkExperienceV2 = typeof workExperiencesV2Table.$inferInsert;
