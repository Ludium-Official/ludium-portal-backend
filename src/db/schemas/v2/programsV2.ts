import { relations } from 'drizzle-orm';
import { integer, pgEnum, pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { usersV2Table } from './usersV2';

// V2 status enum per renewed spec
export const programStatusV2Values = ['under_review', 'open', 'closed', 'draft'] as const;
export const programStatusV2Enum = pgEnum('program_status_v2', programStatusV2Values);

export const programVisibilityV2Values = ['private', 'restricted', 'public'] as const;
export const programVisibilityV2Enum = pgEnum('program_visibility_v2', programVisibilityV2Values);
export type ProgramVisibilityV2Enum = (typeof programVisibilityV2Values)[number];

// Note: The renewed spec keeps visibility as a free-form string in the mock.
// We model it as varchar for now to avoid coupling to previous enum semantics.

export const programsV2Table = pgTable('programs_v2', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 256 }).notNull(),
  description: text('description').notNull(),
  skills: text('skills').array().notNull(),
  deadline: timestamp('deadline', {
    mode: 'date',
    withTimezone: true,
  }).notNull(),
  invitedMembers: text('invited_members').array(), // TODO: who?
  status: programStatusV2Enum('status').default('draft').notNull(),
  visibility: programVisibilityV2Enum('visibility').notNull(),
  network: varchar('network', { length: 64 }).notNull(),
  price: varchar('price', { length: 64 }).notNull(),
  currency: varchar('currency', { length: 16 }).notNull(),

  // Creator reference (who created this program)
  creatorId: integer('creator_id')
    .notNull()
    .references(() => usersV2Table.id, { onDelete: 'cascade' }),

  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
});

// Relations
export const programV2Relations = relations(programsV2Table, ({ one }) => ({
  creator: one(usersV2Table, {
    fields: [programsV2Table.creatorId],
    references: [usersV2Table.id],
  }),
}));

// User relations (defined here to avoid circular dependency)
export const userV2Relations = relations(usersV2Table, ({ many }) => ({
  createdPrograms: many(programsV2Table),
}));

// EN: The type for selecting/querying data from the database. It includes all fields, including auto-generated ones like 'id' and 'createdAt'.
// KR: 데이터베이스에서 데이터를 조회할 때 사용되는 타입입니다. 'id'나 'createdAt'처럼 자동으로 생성되는 필드를 포함한 모든 필드를 가집니다.
export type ProgramV2 = typeof programsV2Table.$inferSelect;

// EN: The type for inserting new data into the database. Fields that are auto-generated or have default values (e.g., 'id', 'status', 'createdAt') are optional.
// KR: 데이터베이스에 새로운 데이터를 삽입할 때 사용되는 타입입니다. 'id', 'status', 'createdAt'처럼 자동 생성되거나 기본값이 있는 필드는 선택적(optional)입니다.
export type NewProgramV2 = typeof programsV2Table.$inferInsert;
