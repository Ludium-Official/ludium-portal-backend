import { relations } from 'drizzle-orm';
import {
  date,
  decimal,
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
import { keywordsTable } from './keywords';
import { linksTable } from './links';
import { usersTable } from './users';

export const programStatusEnum = pgEnum('program_status', [
  'draft',
  'payment_required',
  'published',
  'closed',
  'completed',
  'cancelled',
]);

export const programsTable = pgTable('programs', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 256 }).notNull().notNull(),
  summary: text('summary'),
  description: text('description'),

  /* 38 total digits provides sufficient range for any cryptocurrency value
     18 decimal places matches common ERC-20 token precision */
  price: decimal('price', { precision: 38, scale: 18 }).notNull(),
  currency: varchar('currency', { length: 10 }).default('ETH').notNull(),
  deadline: date('deadline').notNull(),
  creatorId: uuid('creator_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  validatorId: uuid('validator_id').references(() => usersTable.id, { onDelete: 'set null' }),
  status: programStatusEnum('status').default('draft'),
  educhainProgramId: integer('educhain_id'),
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

// Types for use in code
export type Program = typeof programsTable.$inferSelect;
export type NewProgram = typeof programsTable.$inferInsert;
