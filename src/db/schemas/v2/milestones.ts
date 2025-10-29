import { relations } from 'drizzle-orm';
import { integer, pgEnum, pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { programsV2Table } from './programs';
import { usersV2Table } from './users';

// V2 status enum per renewed spec

// TODO: Add annotation for English description
export const milestoneStatusV2Values = [
  'draft', // 초깃값, 스폰서가 마일스톤을 작성 중일 때
  'progress', // 마일스톤 작성 완료 후 빌더가 개발을 시작할 때, 온체인에 create contract 과 함께 업데이트
  'finished', // 빌더가 개발을 완료했을 때, 스폰서에게 리뷰 요청
  'reviewed', // 스폰서가 빌더의 작업을 리뷰를 마쳤을 때, 릴레이어가 해당 상태에서만 paid 업데이트 가능
  'completed', // 최종적으로 마일스톤을 완료 후, 릴레이어가 payout 까지 마쳤을 때 tx까지 같이 업데이트
] as const;
export const milestoneStatusV2Enum = pgEnum('milestone_status_v2', milestoneStatusV2Values);

export const milestonesV2Table = pgTable('milestones_v2', {
  id: serial('id').primaryKey(),
  programId: integer('program_id')
    .notNull()
    .references(() => programsV2Table.id, { onDelete: 'cascade' }),
  // user_id
  applicantId: integer('sponsor_id')
    .notNull()
    .references(() => usersV2Table.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 256 }).notNull(),
  description: text('description').notNull(),
  // TODO: change length 256-18=238
  payout: varchar('price', { length: 238 }).notNull(),
  deadline: timestamp('deadline', {
    mode: 'date',
    withTimezone: true,
  }).notNull(),
  files: text('files').array(),
  status: milestoneStatusV2Enum('status').default('draft').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
});

// Relations
export const milestonesV2Relations = relations(milestonesV2Table, ({ one }) => ({
  program: one(programsV2Table, {
    fields: [milestonesV2Table.programId],
    references: [programsV2Table.id],
  }),
  applicant: one(usersV2Table, {
    fields: [milestonesV2Table.applicantId],
    references: [usersV2Table.id],
  }),
}));

export type MilestoneV2 = typeof milestonesV2Table.$inferSelect;
export type NewMilestoneV2 = typeof milestonesV2Table.$inferInsert;
