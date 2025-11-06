import {
  type ApplicationV2 as DBApplicationV2,
  applicationStatusV2Values,
} from '@/db/schemas/v2/applications';
import { programsV2Table } from '@/db/schemas/v2/programs';
import { usersV2Table } from '@/db/schemas/v2/users';
import builder from '@/graphql/builder';
import type { Context } from '@/types';
import { eq } from 'drizzle-orm';
import { ProgramV2Type } from './programs';
import { UserV2Type } from './users';

/* -------------------------------------------------------------------------- */
/*                                  Enums                                     */
/* -------------------------------------------------------------------------- */

export const ApplicationStatusV2Enum = builder.enumType('ApplicationStatusV2', {
  values: applicationStatusV2Values,
});

/* -------------------------------------------------------------------------- */
/*                                  Types                                     */
/* -------------------------------------------------------------------------- */

/**
 * Application V2 GraphQL type
 * Represents an application entity with all its properties
 */
export const ApplicationV2Type = builder.objectRef<DBApplicationV2>('ApplicationV2').implement({
  fields: (t) => ({
    id: t.exposeID('id', {
      description: 'Application unique identifier',
    }),
    programId: t.exposeID('programId', {
      description: 'ID of the program this application is for',
    }),
    applicantId: t.exposeID('applicantId', {
      description: 'ID of the user who submitted this application',
    }),
    status: t.field({
      type: ApplicationStatusV2Enum,
      resolve: (application) => application.status,
      description: 'Application status',
    }),
    title: t.exposeString('title', {
      description: 'Title of the application',
    }),
    content: t.exposeString('content', {
      description: 'Content of the application submitted by the applicant',
    }),
    rejectedReason: t.exposeString('rejectedReason', {
      description: 'Reason for rejection if the application was rejected',
    }),
    picked: t.exposeBoolean('picked', {
      description: 'Whether this application has been picked',
    }),
    chatroomMessageId: t.exposeString('chatroomMessageId', {
      nullable: true,
      description: 'Chatroom message ID for this application (set by program sponsor)',
    }),
    createdAt: t.field({
      type: 'DateTime',
      resolve: (application) => application.createdAt,
      description: 'Application creation timestamp',
    }),
    updatedAt: t.field({
      type: 'DateTime',
      resolve: (application) => application.updatedAt,
      description: 'Application last update timestamp',
    }),
    // Relations
    program: t.field({
      type: ProgramV2Type,
      description: 'Program this application is for',
      resolve: async (application, _args, ctx: Context) => {
        const [program] = await ctx.db
          .select()
          .from(programsV2Table)
          .where(eq(programsV2Table.id, application.programId));
        if (!program) {
          throw new Error('Program not found');
        }
        return program;
      },
    }),
    applicant: t.field({
      type: UserV2Type,
      description: 'User who submitted this application',
      resolve: async (application, _args, ctx: Context) => {
        const [applicant] = await ctx.db
          .select()
          .from(usersV2Table)
          .where(eq(usersV2Table.id, application.applicantId));
        if (!applicant) {
          throw new Error('Applicant not found');
        }
        return applicant;
      },
    }),
  }),
});

/**
 * Paginated applications response type
 * Contains applications list with pagination metadata
 */
export const PaginatedApplicationsV2Type = builder
  .objectRef<{
    data: DBApplicationV2[];
    count: number;
    totalPages: number;
    currentPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  }>('PaginatedApplicationsV2')
  .implement({
    fields: (t) => ({
      data: t.field({
        type: [ApplicationV2Type],
        resolve: (parent) => parent.data,
        description: 'List of applications for the current page',
      }),
      count: t.field({
        type: 'Int',
        resolve: (parent) => parent.count,
        description: 'Total number of applications matching the query',
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
