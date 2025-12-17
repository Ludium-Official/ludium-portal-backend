import { integer, pgTable, serial, timestamp, varchar, boolean } from 'drizzle-orm/pg-core';
import { usersV2Table } from './users';

export const emailVerificationsV2Table = pgTable('email_verifications_v2', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => usersV2Table.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 256 }).notNull(),
  verificationCode: varchar('verification_code', { length: 10 }).notNull(),
  verified: boolean('verified').default(false).notNull(),
  expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export type EmailVerificationV2 = typeof emailVerificationsV2Table.$inferSelect;
export type NewEmailVerificationV2 = typeof emailVerificationsV2Table.$inferInsert;
