import { pgEnum, pgTable, serial, varchar } from 'drizzle-orm/pg-core';

export const rolesEnum = pgEnum('roles', ['admin', 'user']);

export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  firstName: varchar('first_name', { length: 256 }),
  lastName: varchar('last_name', { length: 256 }),
  email: varchar('email', { length: 256 }).notNull().unique(),
  role: rolesEnum('role').default('user'),
});

export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
