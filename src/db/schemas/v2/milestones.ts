import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { programsV2Table } from './programs';
import { usersV2Table } from './users';

// V2 status enum per renewed spec

export const milestonesV2Table = pgTable('milestones_v2', {
  id: serial('id').primaryKey(),
  programId: integer('program_id')
    .notNull()
    .references(() => programsV2Table.id, { onDelete: 'cascade' }),
  // user_id
  applicantId: integer('applicant_id')
    .notNull()
    .references(() => usersV2Table.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 256 }).notNull(),
  description: text('description').notNull(),
  payout: varchar('price', { length: 64 }).notNull(),
  deadline: timestamp('deadline', {
    mode: 'date',
    withTimezone: true,
  }).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
});

// Relations
export const milestonesV2Relations = relations(milestonesV2Table, ({ one }) => ({
  program: one(programsV2Table, {
    fields: [milestonesV2Table.programId],
    references: [programsV2Table.id],
  }),
  applicant: one(usersV2Table, {
    fields: [milestonesV2Table.applicantId],
    references: [usersV2Table.id],
  }),
}));

export type MilestoneV2 = typeof milestonesV2Table.$inferSelect;
export type NewMilestoneV2 = typeof milestonesV2Table.$inferInsert;
