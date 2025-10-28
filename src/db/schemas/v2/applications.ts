import { relations } from 'drizzle-orm';
import { boolean, integer, pgEnum, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { programsV2Table } from './programs';
import { usersV2Table } from './users';

// V2 status enum per renewed spec
export const applicationStatusV2Values = ['applied', 'accepted', 'rejected', 'deleted'] as const;
export const applicationStatusV2Enum = pgEnum('application_status_v2', applicationStatusV2Values);

export const applicationsV2Table = pgTable('applications_v2', {
  id: serial('id').primaryKey(),
  programId: integer('program_id')
    .notNull()
    .references(() => programsV2Table.id, { onDelete: 'cascade' }),
  // user_id
  applicantId: integer('applicant_id')
    .notNull()
    .references(() => usersV2Table.id, { onDelete: 'cascade' }),
  status: applicationStatusV2Enum('status').default('applied').notNull(),
  content: text('content').default(''),
  rejectedReason: text('rejected_reason').default(''),
  picked: boolean('picked').default(false).notNull(),
  // metadata
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
});

// Relations
export const applicationV2Relations = relations(applicationsV2Table, ({ one }) => ({
  program: one(programsV2Table, {
    fields: [applicationsV2Table.programId],
    references: [programsV2Table.id],
  }),
  applicant: one(usersV2Table, {
    fields: [applicationsV2Table.applicantId],
    references: [usersV2Table.id],
  }),
}));

// Reverse relations (defined here to avoid circular dependencies)
// Programs → Applications
export const programsV2ApplicationsRelation = relations(programsV2Table, ({ many }) => ({
  applications: many(applicationsV2Table),
}));

// Users → Applications
export const usersV2ApplicationsRelation = relations(usersV2Table, ({ many }) => ({
  applications: many(applicationsV2Table),
}));

export type ApplicationV2 = typeof applicationsV2Table.$inferSelect;
export type NewApplicationV2 = typeof applicationsV2Table.$inferInsert;
