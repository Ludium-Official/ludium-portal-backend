import { relations } from 'drizzle-orm';
import {
  date,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { applicationsTable } from './applications';
import { commentsTable } from './comments';
import { keywordsTable } from './keywords';
import { linksTable } from './links';
import { usersTable } from './users';

export const programStatuses = [
  'draft',
  'payment_required',
  'published',
  'closed',
  'completed',
  'cancelled',
] as const;
export const programStatusEnum = pgEnum('program_status', programStatuses);

export const programVisibilities = ['private', 'restricted', 'public'] as const;
export const programVisibilityEnum = pgEnum('program_visibility', programVisibilities);

export const programsTable = pgTable('programs', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 256 }).notNull().notNull(),
  summary: text('summary'),
  description: text('description'),
  price: varchar('price', { length: 256 }).notNull(),
  currency: varchar('currency', { length: 10 }).default('ETH').notNull(),
  deadline: date('deadline').notNull(),
  creatorId: uuid('creator_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  validatorId: uuid('validator_id').references(() => usersTable.id, { onDelete: 'set null' }),
  status: programStatusEnum('status').default('draft'),
  visibility: programVisibilityEnum('visibility').default('public'),
  educhainProgramId: integer('educhain_id'),
  txHash: varchar('tx_hash', { length: 256 }),
  network: varchar('network', { length: 256 }).default('educhain'),
  rejectionReason: text('rejection_reason'),
  image: varchar('image', { length: 512 }),

  // Timestamps
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
});

// Program relations
export const programRelations = relations(programsTable, ({ one, many }) => ({
  creator: one(usersTable, {
    fields: [programsTable.creatorId],
    references: [usersTable.id],
    relationName: 'program_creator',
  }),
  validator: one(usersTable, {
    fields: [programsTable.validatorId],
    references: [usersTable.id],
    relationName: 'program_validator',
  }),
  applications: many(applicationsTable),
  programsToKeywords: many(programsToKeywordsTable),
  userRoles: many(programUserRolesTable),
  comments: many(commentsTable),
}));

// Keywords
export const programsToKeywordsTable = pgTable(
  'programs_to_keywords',
  {
    programId: uuid('program_id')
      .notNull()
      .references(() => programsTable.id, { onDelete: 'cascade' }),
    keywordId: uuid('keyword_id')
      .notNull()
      .references(() => keywordsTable.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.programId, t.keywordId] })],
);

export const programsToKeywordsRelations = relations(programsToKeywordsTable, ({ one }) => ({
  program: one(programsTable, {
    fields: [programsToKeywordsTable.programId],
    references: [programsTable.id],
  }),
  keyword: one(keywordsTable, {
    fields: [programsToKeywordsTable.keywordId],
    references: [keywordsTable.id],
  }),
}));

// Links
export const programsToLinksTable = pgTable(
  'programs_to_links',
  {
    programId: uuid('program_id')
      .notNull()
      .references(() => programsTable.id, { onDelete: 'cascade' }),
    linkId: uuid('link_id')
      .notNull()
      .references(() => linksTable.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.programId, t.linkId] })],
);

export const programsToLinksRelations = relations(programsToLinksTable, ({ one }) => ({
  program: one(programsTable, {
    fields: [programsToLinksTable.programId],
    references: [programsTable.id],
  }),
  link: one(linksTable, {
    fields: [programsToLinksTable.linkId],
    references: [linksTable.id],
  }),
}));

// Program role types
export const programRoleEnum = pgEnum('program_role_type', [
  'sponsor', // Program creator
  'validator', // Assigned validator
  'builder', // Approved applicant
]);

// Program user roles table
export const programUserRolesTable = pgTable('program_user_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  programId: uuid('program_id')
    .notNull()
    .references(() => programsTable.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  roleType: programRoleEnum('role_type').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
});

// Add relations
export const programUserRolesRelations = relations(programUserRolesTable, ({ one }) => ({
  program: one(programsTable, {
    fields: [programUserRolesTable.programId],
    references: [programsTable.id],
  }),
  user: one(usersTable, {
    fields: [programUserRolesTable.userId],
    references: [usersTable.id],
  }),
}));

// Types for use in code
export type Program = typeof programsTable.$inferSelect;
export type NewProgram = typeof programsTable.$inferInsert;
export type ProgramUserRole = typeof programUserRolesTable.$inferSelect;
export type NewProgramUserRole = typeof programUserRolesTable.$inferInsert;
export type ProgramStatusEnum = (typeof programStatuses)[number];
export type ProgramVisibilityEnum = (typeof programVisibilities)[number];
