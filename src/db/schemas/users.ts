import { relations } from 'drizzle-orm';
import { jsonb, pgTable, primaryKey, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { applicationsTable } from './applications';
import { filesTable } from './files';
import { linksTable } from './links';
import { programsTable } from './programs';
import { rolesTable } from './roles';
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
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
});

export const userRelations = relations(usersTable, ({ many, one }) => ({
  roles: many(usersToRolesTable),
  files: many(filesTable),
  createdPrograms: many(programsTable, { relationName: 'program_creator' }),
  validatedPrograms: many(programsTable, { relationName: 'program_validator' }),
  applications: many(applicationsTable),
  wallet: one(walletTable, {
    fields: [usersTable.id],
    references: [walletTable.userId],
  }),
}));

// Roles
export const usersToRolesTable = pgTable(
  'users_to_roles',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id')
      .notNull()
      .references(() => rolesTable.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.roleId] })],
);

export const usersToRolesRelations = relations(usersToRolesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [usersToRolesTable.userId],
    references: [usersTable.id],
  }),
  role: one(rolesTable, {
    fields: [usersToRolesTable.roleId],
    references: [rolesTable.id],
  }),
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
export type Role = typeof rolesTable.$inferSelect;
export type NewRole = typeof rolesTable.$inferInsert;
