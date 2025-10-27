import type { MilestoneV2 as DBMilestoneV2 } from '@/db/schemas/v2/milestonesV2';
import { programsV2Table } from '@/db/schemas/v2/programsV2';
import { usersV2Table } from '@/db/schemas/v2/usersV2';
import builder from '@/graphql/builder';
import type { Context } from '@/types';
import { eq } from 'drizzle-orm';
import { ProgramV2Type } from './programs';
import { UserV2Type } from './users';

/* -------------------------------------------------------------------------- */
/*                                  Types                                     */
/* -------------------------------------------------------------------------- */

/**
 * Milestone V2 GraphQL type
 * Represents a milestone entity with all its properties
 */
export const MilestoneV2Type = builder.objectRef<DBMilestoneV2>('MilestoneV2').implement({
  fields: (t) => ({
    id: t.exposeID('id', {
      description: 'Milestone unique identifier',
    }),
    title: t.exposeString('title', {
      description: 'Milestone title',
    }),
    description: t.exposeString('description', {
      description: 'Milestone description',
    }),
    payout: t.exposeString('payout', {
      description: 'Milestone payout amount',
    }),
    deadline: t.field({
      type: 'DateTime',
      resolve: (milestone) => milestone.deadline,
      description: 'Milestone deadline',
    }),
    createdAt: t.field({
      type: 'DateTime',
      resolve: (milestone) => milestone.createdAt,
      description: 'Milestone creation timestamp',
    }),
    updatedAt: t.field({
      type: 'DateTime',
      resolve: (milestone) => milestone.updatedAt,
      description: 'Milestone last update timestamp',
    }),
    // Relations
    program: t.field({
      type: ProgramV2Type,
      description: 'Program this milestone belongs to',
      resolve: async (milestone, _args, ctx: Context) => {
        const [program] = await ctx.db
          .select()
          .from(programsV2Table)
          .where(eq(programsV2Table.id, milestone.programId));
        if (!program) {
          throw new Error('Program not found');
        }
        return program;
      },
    }),
    applicant: t.field({
      type: UserV2Type,
      description: 'User who owns this milestone',
      resolve: async (milestone, _args, ctx: Context) => {
        const [applicant] = await ctx.db
          .select()
          .from(usersV2Table)
          .where(eq(usersV2Table.id, milestone.applicantId));
        if (!applicant) {
          throw new Error('Applicant not found');
        }
        return applicant;
      },
    }),
  }),
});

/**
 * Paginated milestones response type
 * Contains milestones list with pagination metadata
 */
export const PaginatedMilestonesV2Type = builder
  .objectRef<{
    data: DBMilestoneV2[];
    count: number;
    totalPages: number;
    currentPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  }>('PaginatedMilestonesV2')
  .implement({
    fields: (t) => ({
      data: t.field({
        type: [MilestoneV2Type],
        resolve: (parent) => parent.data,
        description: 'List of milestones for the current page',
      }),
      count: t.field({
        type: 'Int',
        resolve: (parent) => parent.count,
        description: 'Total number of milestones matching the query',
      }),
      totalPages: t.field({
        type: 'Int',
        resolve: (parent) => parent.totalPages,
        description: 'Total number of pages',
      }),
      currentPage: t.field({
        type: 'Int',
        resolve: (parent) => parent.currentPage,
        description: 'Current page number',
      }),
      hasNextPage: t.field({
        type: 'Boolean',
        resolve: (parent) => parent.hasNextPage,
        description: 'Whether there is a next page',
      }),
      hasPreviousPage: t.field({
        type: 'Boolean',
        resolve: (parent) => parent.hasPreviousPage,
        description: 'Whether there is a previous page',
      }),
    }),
  });
