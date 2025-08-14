import { relations } from 'drizzle-orm';
import {
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
import { filesTable } from './files';
import { keywordsTable } from './keywords';
import { linksTable } from './links';
import { postsTable } from './posts';
import { programUserRolesTable, programsTable } from './programs';

export const userRoles = ['user', 'admin', 'superadmin'] as const;
export const userRolesEnum = pgEnum('user_roles', userRoles);

export const usersTable = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  firstName: varchar('first_name', { length: 256 }),
  lastName: varchar('last_name', { length: 256 }),
  email: varchar('email', { length: 256 }).unique(),
  walletAddress: varchar('wallet_address', { length: 256 }).unique(),
  organizationName: varchar('organization_name', { length: 256 }),
  image: varchar('image', { length: 512 }),
  about: text('about'),
  summary: varchar('summary', { length: 512 }),
  links: jsonb('links').$type<{ url: string; title: string }[]>(),
  loginType: varchar('login_type', { length: 256 }),
  role: userRolesEnum('role').default('user'),

  // Timestamps
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
});

export const userRelations = relations(usersTable, ({ many }) => ({
  files: many(filesTable),
  createdPrograms: many(programsTable, { relationName: 'program_creator' }),
  applications: many(applicationsTable),
  programRoles: many(programUserRolesTable),
  posts: many(postsTable),
  usersToKeywords: many(usersToKeywordsTable),
}));

// Links
export const usersToLinksTable = pgTable(
  'users_to_links',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    linkId: uuid('link_id')
      .notNull()
      .references(() => linksTable.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.linkId] })],
);

export const usersToLinksRelations = relations(usersToLinksTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [usersToLinksTable.userId],
    references: [usersTable.id],
  }),
  link: one(linksTable, {
    fields: [usersToLinksTable.linkId],
    references: [linksTable.id],
  }),
}));

// Keywords
export const usersToKeywordsTable = pgTable(
  'users_to_keywords',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    keywordId: uuid('keyword_id')
      .notNull()
      .references(() => keywordsTable.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.keywordId] })],
);

export const usersToKeywordsRelations = relations(usersToKeywordsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [usersToKeywordsTable.userId],
    references: [usersTable.id],
  }),
  keyword: one(keywordsTable, {
    fields: [usersToKeywordsTable.keywordId],
    references: [keywordsTable.id],
  }),
}));

export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
