import { relations } from 'drizzle-orm';
import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { applicationsTable } from './applications';
import { linksTable } from './links';

export const milestoneStatuses = ['pending', 'completed', 'rejected', 'submitted'] as const;
export const milestoneStatusEnum = pgEnum('milestone_status', milestoneStatuses);

// Milestones table
export const milestonesTable = pgTable('milestones', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Relationship with application
  applicationId: uuid('application_id')
    .notNull()
    .references(() => applicationsTable.id, { onDelete: 'cascade' }),

  // Milestone details
  title: varchar('title', { length: 256 }).notNull(),
  description: text('description'),
  price: varchar('price', { length: 256 }).notNull(),
  currency: varchar('currency', { length: 10 }).default('ETH'),
  status: milestoneStatusEnum('status').default('pending').notNull(),
  links: jsonb('links').$type<{ url: string; title: string }[]>(),
  sortOrder: integer('sort_order').notNull().default(0),
  rejectionReason: text('rejection_reason'),

  // Timestamps
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
});

// Milestone relations
export const milestoneRelations = relations(milestonesTable, ({ one }) => ({
  application: one(applicationsTable, {
    fields: [milestonesTable.applicationId],
    references: [applicationsTable.id],
  }),
}));

// Links
export const milestonesToLinksTable = pgTable(
  'milestones_to_links',
  {
    milestoneId: uuid('milestone_id')
      .notNull()
      .references(() => milestonesTable.id, { onDelete: 'cascade' }),
    linkId: uuid('link_id')
      .notNull()
      .references(() => linksTable.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.milestoneId, t.linkId] })],
);

export const milestonesToLinksRelations = relations(milestonesToLinksTable, ({ one }) => ({
  milestone: one(milestonesTable, {
    fields: [milestonesToLinksTable.milestoneId],
    references: [milestonesTable.id],
  }),
  link: one(linksTable, {
    fields: [milestonesToLinksTable.linkId],
    references: [linksTable.id],
  }),
}));

// Types for use in code
export type Milestone = typeof milestonesTable.$inferSelect;
export type NewMilestone = typeof milestonesTable.$inferInsert;
export type MilestoneUpdate = Omit<Milestone, 'id' | 'createdAt' | 'updatedAt' | 'applicationId'>;
export type MilestoneStatusEnum = (typeof milestoneStatuses)[number];
