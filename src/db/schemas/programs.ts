import { relations, sql } from 'drizzle-orm';
import {
  date,
  decimal,
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
import { keywordsTable } from './program-keywords';
import { usersTable } from './users';

export const programStatusEnum = pgEnum('program_status', [
  'draft',
  'published',
  'closed',
  'completed',
  'cancelled',
]);

export const programsTable = pgTable('programs', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 256 }).notNull(),
  summary: text('summary'),
  description: text('description'),

  /* 38 total digits provides sufficient range for any cryptocurrency value
     18 decimal places matches common ERC-20 token precision */
  price: decimal('price', { precision: 38, scale: 18 }),
  currency: varchar('currency', { length: 10 }).default('ETH'),

  deadline: date('deadline'),

  // Relationship with creator (sponsor)
  creatorId: uuid('creator_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),

  // Relationship with validator
  validatorId: uuid('validator_id').references(() => usersTable.id, { onDelete: 'set null' }),

  // Additional links
  links: jsonb('links').$type<{ url: string; title: string }[]>(),

  // Program status
  status: programStatusEnum('status').default('draft'),

  // Timestamps
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => sql`now()`),
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

// Junction table for programs to keywords (many-to-many)
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

// Types for use in code
export type Program = typeof programsTable.$inferSelect;
export type NewProgram = typeof programsTable.$inferInsert;
