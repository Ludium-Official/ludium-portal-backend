import { relations } from 'drizzle-orm';
import { jsonb, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { commentsTable } from './comments';
import { linksTable } from './links';
import { milestonesTable } from './milestones';
import { programsTable } from './programs';
import { usersTable } from './users';

export const applicationStatuses = [
  'pending',
  'accepted',
  'rejected',
  'completed',
  'submitted',
] as const;
export const applicationStatusEnum = pgEnum('application_status', applicationStatuses);

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
  status: applicationStatusEnum('status').default('pending').notNull(),
  name: text('name').notNull(),
  content: text('content'),
  summary: varchar('summary', { length: 512 }),
  metadata: jsonb('metadata'),
  price: varchar('price', { length: 256 }).default('0').notNull(),
  rejectionReason: text('rejection_reason'),

  // Timestamps
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
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
  comments: many(commentsTable),
}));

// Links
export const applicationsToLinksTable = pgTable('applications_to_links', {
  applicationId: uuid('application_id')
    .notNull()
    .references(() => applicationsTable.id, { onDelete: 'cascade' }),
  linkId: uuid('link_id')
    .notNull()
    .references(() => linksTable.id, { onDelete: 'cascade' }),
});

export const applicationsToLinksRelations = relations(applicationsToLinksTable, ({ one }) => ({
  application: one(applicationsTable, {
    fields: [applicationsToLinksTable.applicationId],
    references: [applicationsTable.id],
  }),
  link: one(linksTable, {
    fields: [applicationsToLinksTable.linkId],
    references: [linksTable.id],
  }),
}));

// Types for use in code
export type Application = typeof applicationsTable.$inferSelect;
export type NewApplication = typeof applicationsTable.$inferInsert;
export type ApplicationUpdate = Omit<
  Application,
  'id' | 'createdAt' | 'updatedAt' | 'programId' | 'applicantId'
>;
export type ApplicationStatusEnum = (typeof applicationStatuses)[number];
