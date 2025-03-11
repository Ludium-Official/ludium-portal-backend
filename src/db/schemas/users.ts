import { relations, sql } from 'drizzle-orm';
import { jsonb, pgTable, primaryKey, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { applicationsTable } from './applications';
import { filesTable } from './files';
import { programsTable } from './programs';

export const rolesTable = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => sql`now()`),
});

export const usersTable = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  firstName: varchar('first_name', { length: 256 }),
  lastName: varchar('last_name', { length: 256 }),
  email: varchar('email', { length: 256 }).notNull().unique(),
  organizationName: varchar('organization_name', { length: 256 }),
  image: varchar('image', { length: 512 }),
  about: text('about'),
  links: jsonb('links').$type<{ url: string; title: string }[]>(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => sql`now()`),
});

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

// Отношения для пользователей
export const userRelations = relations(usersTable, ({ many }) => ({
  roles: many(usersToRolesTable),
  files: many(filesTable),
  createdPrograms: many(programsTable, { relationName: 'program_creator' }),
  validatedPrograms: many(programsTable, { relationName: 'program_validator' }),
  applications: many(applicationsTable),
}));

// Отношения для ролей
export const roleRelations = relations(rolesTable, ({ many }) => ({
  users: many(usersToRolesTable),
}));

// Отношения для связи пользователей с ролями
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

export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type Role = typeof rolesTable.$inferSelect;
export type NewRole = typeof rolesTable.$inferInsert;
