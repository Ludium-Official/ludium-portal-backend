import { relations } from 'drizzle-orm';
import {
  boolean,
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
import { commentsTable } from './comments';
import { keywordsTable } from './keywords';
import { linksTable } from './links';
import { usersTable } from './users';

export const programStatuses = [
  'pending',
  'payment_required',
  'rejected',
  'published',
  'closed',
  'completed',
  'cancelled',
] as const;
export const programStatusEnum = pgEnum('program_status', programStatuses);

export const programVisibilities = ['private', 'restricted', 'public'] as const;
export const programVisibilityEnum = pgEnum('program_visibility', programVisibilities);

// Program types: regular programs or funding programs
export const programTypes = ['regular', 'funding'] as const;
export const programTypeEnum = pgEnum('program_type', programTypes);

// Funding access conditions
export const fundingConditions = ['open', 'tier'] as const;
export const fundingConditionEnum = pgEnum('funding_condition', fundingConditions);

// Investment tiers
export const investmentTiers = ['bronze', 'silver', 'gold', 'platinum'] as const;
export const investmentTierEnum = pgEnum('investment_tier', investmentTiers);

export const programsTable = pgTable('programs', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 256 }).notNull(),
  summary: text('summary'),
  description: text('description'),
  price: varchar('price', { length: 256 }).notNull(),
  currency: varchar('currency', { length: 10 }).default('ETH').notNull(),
  deadline: timestamp('deadline').notNull(),
  creatorId: uuid('creator_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  status: programStatusEnum('status').default('pending'),
  visibility: programVisibilityEnum('visibility').default('public'),
  educhainProgramId: integer('educhain_id'),
  txHash: varchar('tx_hash', { length: 256 }),
  network: varchar('network', { length: 256 }).default('educhain'),
  rejectionReason: text('rejection_reason'),
  image: varchar('image', { length: 512 }),

  // New funding/investment specific fields
  type: programTypeEnum('type').default('regular').notNull(),

  // Funding program specific fields (only used when type = 'funding')
  applicationStartDate: timestamp('application_start_date', { mode: 'date' }),
  applicationEndDate: timestamp('application_end_date', { mode: 'date' }),
  fundingStartDate: timestamp('funding_start_date', { mode: 'date' }),
  fundingEndDate: timestamp('funding_end_date', { mode: 'date' }),

  // Funding conditions and settings
  fundingCondition: fundingConditionEnum('funding_condition').default('open'),
  maxFundingAmount: varchar('max_funding_amount', { length: 256 }), // Maximum funding for the project

  // Fee settings
  feePercentage: integer('fee_percentage').default(300), // 300 = 3%
  customFeePercentage: integer('custom_fee_percentage'), // Custom fee if different from default

  // Reclaim fields for recruitment programs
  reclaimed: boolean('reclaimed').default(false),
  reclaimTxHash: varchar('reclaim_tx_hash', { length: 256 }),
  reclaimedAt: timestamp('reclaimed_at', { mode: 'date' }),

  // Tier settings (JSONB for flexibility)
  tierSettings: jsonb('tier_settings').$type<{
    bronze?: { enabled: boolean; maxAmount: string };
    silver?: { enabled: boolean; maxAmount: string };
    gold?: { enabled: boolean; maxAmount: string };
    platinum?: { enabled: boolean; maxAmount: string };
  }>(),

  // Smart contract info (managed by frontend)
  contractAddress: varchar('contract_address', { length: 256 }),

  // Terms selection (like "ETH" dropdown in UI)
  terms: varchar('terms', { length: 256 }).default('ETH'),

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
  applications: many(applicationsTable),
  programsToKeywords: many(programsToKeywordsTable),
  userRoles: many(programUserRolesTable),
  comments: many(commentsTable),
  programsToLinks: many(programsToLinksTable),
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

// User tier assignments for funding programs
export const userTierAssignmentsTable = pgTable('user_tier_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  programId: uuid('program_id')
    .notNull()
    .references(() => programsTable.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  tier: investmentTierEnum('tier').notNull(),
  maxInvestmentAmount: varchar('max_investment_amount', { length: 256 }).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
});

export const userTierAssignmentsRelations = relations(userTierAssignmentsTable, ({ one }) => ({
  program: one(programsTable, {
    fields: [userTierAssignmentsTable.programId],
    references: [programsTable.id],
  }),
  user: one(usersTable, {
    fields: [userTierAssignmentsTable.userId],
    references: [usersTable.id],
  }),
}));

// Types for use in code
export type Program = typeof programsTable.$inferSelect;
export type NewProgram = typeof programsTable.$inferInsert;
export type ProgramUserRole = typeof programUserRolesTable.$inferSelect;
export type NewProgramUserRole = typeof programUserRolesTable.$inferInsert;
export type UserTierAssignment = typeof userTierAssignmentsTable.$inferSelect;
export type NewUserTierAssignment = typeof userTierAssignmentsTable.$inferInsert;
export type ProgramStatusEnum = (typeof programStatuses)[number];
export type ProgramVisibilityEnum = (typeof programVisibilities)[number];
export type ProgramTypeEnum = (typeof programTypes)[number];
export type FundingConditionEnum = (typeof fundingConditions)[number];
export type InvestmentTierEnum = (typeof investmentTiers)[number];
