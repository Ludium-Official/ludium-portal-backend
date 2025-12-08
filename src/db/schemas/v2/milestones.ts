import { relations } from 'drizzle-orm';
import {
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { applicationsV2Table } from './applications';
import { programsV2Table } from './programs';
import { usersV2Table } from './users';

// V2 status enum per renewed spec

export const milestoneStatusV2Values = [
  'draft', // Initial status before milestone is published, visible only to sponsor, not visible to builder
  'under_review', // Status after milestone is published, content for contract creation
  'in_progress', // Status after contract is created
  'completed', // Status when builder completes and submits the milestone
  'update', // Status for milestone update
] as const;
export const milestoneStatusV2Enum = pgEnum('milestone_status_v2', milestoneStatusV2Values);

export const milestonesV2Table = pgTable('milestones_v2', {
  id: serial('id').primaryKey(),
  programId: uuid('program_id')
    .notNull()
    .references(() => programsV2Table.id, { onDelete: 'cascade' }),
  // user_id
  applicationId: integer('application_id')
    .notNull()
    .references(() => applicationsV2Table.id, { onDelete: 'cascade' }),
  sponsorId: integer('sponsor_id')
    .notNull()
    .references(() => usersV2Table.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 256 }),
  description: text('description'),
  // TODO: change length 256-18=238
  payout: varchar('price', { length: 238 }),
  deadline: timestamp('deadline', {
    mode: 'date',
    withTimezone: true,
  }),
  files: text('files').array(),
  status: milestoneStatusV2Enum('status').default('draft'),
  // NOTE: after payout is completed, we need to store the payout tx in the milestone table by relayer
  payout_tx: varchar('payout_tx', { length: 66 }),
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
  sponsor: one(usersV2Table, {
    fields: [milestonesV2Table.sponsorId],
    references: [usersV2Table.id],
  }),
}));

export type MilestoneV2 = typeof milestonesV2Table.$inferSelect;
export type NewMilestoneV2 = typeof milestonesV2Table.$inferInsert;
