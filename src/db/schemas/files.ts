import { relations } from 'drizzle-orm';
import { pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { usersTable } from './users';

export const filesTable = pgTable('files', {
  id: uuid('id').primaryKey().defaultRandom(),
  fileName: varchar('file_name', { length: 256 }).notNull(),
  originalName: varchar('original_name', { length: 256 }).notNull(),
  mimeType: varchar('mime_type', { length: 128 }).notNull(),
  path: varchar('path', { length: 512 }).notNull(),
  uploadedById: uuid('uploaded_by_id').references(() => usersTable.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
});

export const fileRelations = relations(filesTable, ({ one }) => ({
  uploadedBy: one(usersTable, {
    fields: [filesTable.uploadedById],
    references: [usersTable.id],
  }),
}));

export type File = typeof filesTable.$inferSelect;
export type NewFile = typeof filesTable.$inferInsert;
