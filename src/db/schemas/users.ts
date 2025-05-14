import { relations } from 'drizzle-orm';
import {
  boolean,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { applicationsTable } from './applications';
import { filesTable } from './files';
import { linksTable } from './links';
import { postsTable } from './posts';
import { programUserRolesTable, programsTable } from './programs';
import { walletTable } from './wallet';

export const usersTable = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  firstName: varchar('first_name', { length: 256 }),
  lastName: varchar('last_name', { length: 256 }),
  email: varchar('email', { length: 256 }).notNull().unique(),
  organizationName: varchar('organization_name', { length: 256 }),
  image: varchar('image', { length: 512 }),
  about: text('about'),
  links: jsonb('links').$type<{ url: string; title: string }[]>(),
  externalId: varchar('external_id', { length: 256 }),
  isAdmin: boolean('is_admin').default(false),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
});

export const userRelations = relations(usersTable, ({ many, one }) => ({
  files: many(filesTable),
  createdPrograms: many(programsTable, { relationName: 'program_creator' }),
  validatedPrograms: many(programsTable, { relationName: 'program_validator' }),
  applications: many(applicationsTable),
  programRoles: many(programUserRolesTable),
  wallet: one(walletTable, {
    fields: [usersTable.id],
    references: [walletTable.userId],
  }),
  posts: many(postsTable),
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

export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
