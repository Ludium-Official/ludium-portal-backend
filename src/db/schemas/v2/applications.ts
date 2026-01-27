import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { programsV2Table } from './programs';
import { usersV2Table } from './users';

// V2 application lifecycle statuses
// submitted: builder submitted the application
// pending_signature: sponsor requested a contract signature
// in_progress: contract has been created and is active
// completed: all milestones have been completed and the contract is closed
export const applicationStatusV2Values = [
  'submitted',
  'pending_signature',
  'in_progress',
  'completed',
] as const;
export const applicationStatusV2Enum = pgEnum('application_status_v2', applicationStatusV2Values);

export const applicationsV2Table = pgTable('applications_v2', {
  id: serial('id').primaryKey(),
  programId: uuid('program_id')
    .notNull()
    .references(() => programsV2Table.id, { onDelete: 'cascade' }),
  // user_id
  applicantId: integer('applicant_id')
    .notNull()
    .references(() => usersV2Table.id, { onDelete: 'cascade' }),
  status: applicationStatusV2Enum('status').default('submitted').notNull(),
  title: text('title').default(''),
  content: text('content').default(''),
  portfolioIds: integer('portfolio_ids').array(),

  rejectedReason: text('rejected_reason').default(''),
  picked: boolean('picked').default(false).notNull(),
  // chatroom message id
  chatroomMessageId: uuid('chatroom_message_id').unique(),
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
