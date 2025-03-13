import { relations, sql } from 'drizzle-orm';
import { jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { milestonesTable } from './milestones';
import { programsTable } from './programs';
import { usersTable } from './users';

export const applicationStatusEnum = pgEnum('application_status', [
  'pending', // Initial state when submitted
  'approved', // Application approved by validator
  'rejected', // Application rejected by validator
  'completed', // Work completed and verified
  'withdrawn', // Application withdrawn by applicant
]);

// Applications table
export const applicationsTable = pgTable('applications', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Relationship with program
  programId: uuid('program_id')
    .notNull()
    .references(() => programsTable.id, { onDelete: 'cascade' }),

  // Relationship with user (builder)
  applicantId: uuid('applicant_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),

  // Application status
  status: applicationStatusEnum('status').default('pending').notNull(),

  // Application content
  content: text('content'),

  // Additional metadata
  metadata: jsonb('metadata'),

  // Timestamps
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => sql`now()`),
});

// Application relations
export const applicationRelations = relations(applicationsTable, ({ one, many }) => ({
  program: one(programsTable, {
    fields: [applicationsTable.programId],
    references: [programsTable.id],
  }),
  applicant: one(usersTable, {
    fields: [applicationsTable.applicantId],
    references: [usersTable.id],
  }),
  milestones: many(milestonesTable),
}));

// Types for use in code
export type Application = typeof applicationsTable.$inferSelect;
export type NewApplication = typeof applicationsTable.$inferInsert;
