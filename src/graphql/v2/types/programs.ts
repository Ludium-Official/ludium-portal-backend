import type { ApplicationV2 as DBApplicationV2 } from '@/db/schemas';
import { applicationsV2Table } from '@/db/schemas';
import { networksTable } from '@/db/schemas/v2/networks';
import type { OnchainProgramInfo as DBOnchainProgramInfo } from '@/db/schemas/v2/onchain-program-info';
import { onchainProgramInfoTable } from '@/db/schemas/v2/onchain-program-info';
import type { ProgramV2 as DBProgramV2 } from '@/db/schemas/v2/programs';
import { programStatusV2Values, programVisibilityV2Values } from '@/db/schemas/v2/programs';
import { tokensTable } from '@/db/schemas/v2/tokens';
import { usersV2Table } from '@/db/schemas/v2/users';
import builder from '@/graphql/builder';
import type { Context } from '@/types';
import { and, eq } from 'drizzle-orm';
import { OnchainProgramInfoV2Type } from '../types/onchain-program-info';
import { ApplicationV2Type } from './applications';
import { NetworkV2Ref } from './networks';
import { TokenV2Ref } from './tokens';
import { UserV2Ref } from './users';

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */
export const ProgramVisibilityEnum = builder.enumType('ProgramVisibilityV2', {
  values: programVisibilityV2Values,
});

export const ProgramV2StatusEnum = builder.enumType('ProgramStatusV2', {
  values: programStatusV2Values,
});

// export const ProgramV2Ref = builder.objectRef<DBProgramV2>("ProgramV2");
export const ProgramV2Ref = builder.objectRef<
  DBProgramV2 & {
    applicationCount?: number;
    myApplication?: DBApplicationV2;
  }
>('ProgramV2');

export const ProgramV2Type: ReturnType<typeof ProgramV2Ref.implement> = ProgramV2Ref.implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    title: t.exposeString('title'),
    description: t.exposeString('description'),
    skills: t.exposeStringList('skills'),
    deadline: t.field({
      type: 'DateTime',
      resolve: (program) => program.deadline,
    }),
    invitedMembers: t.exposeStringList('invitedMembers', { nullable: true }),
    status: t.field({
      type: ProgramV2StatusEnum,
      resolve: (program) => program.status,
    }),
    visibility: t.field({
      type: ProgramVisibilityEnum,
      resolve: (program) => program.visibility,
    }),
    networkId: t.exposeInt('networkId'),
    price: t.exposeString('price'),
    token_id: t.exposeInt('token_id'),
    createdAt: t.field({
      type: 'DateTime',
      resolve: (program) => program.createdAt,
    }),
    updatedAt: t.field({
      type: 'DateTime',
      resolve: (program) => program.updatedAt,
    }),
    sponsor: t.field({
      // Use exported UserV2Ref to reference UserV2 type
      // This avoids circular dependency as UserV2Ref is defined before UserV2Type
      type: UserV2Ref,
      description: 'The sponsor (creator) of this program',
      resolve: async (program, _args, ctx: Context) => {
        const [sponsor] = await ctx.db
          .select()
          .from(usersV2Table)
          .where(eq(usersV2Table.id, program.sponsorId));

        if (!sponsor) {
          throw new Error(`Sponsor with id ${program.sponsorId} not found`);
        }

        return sponsor;
      },
    }),
    network: t.field({
      type: NetworkV2Ref,
      description: 'The network associated with this program',
      resolve: async (program, _args, ctx: Context) => {
        const [network] = await ctx.db
          .select()
          .from(networksTable)
          .where(eq(networksTable.id, program.networkId));

        if (!network) {
          throw new Error(`Network with id ${program.networkId} not found`);
        }

        return network;
      },
    }),
    token: t.field({
      type: TokenV2Ref,
      description: 'The token associated with this program',
      resolve: async (program, _args, ctx: Context) => {
        const [token] = await ctx.db
          .select()
          .from(tokensTable)
          .where(eq(tokensTable.id, program.token_id));

        if (!token) {
          throw new Error(`Token with id ${program.token_id} not found`);
        }

        return token;
      },
    }),
    onchain: t.field({
      type: OnchainProgramInfoV2Type,
      nullable: true,
      description: 'The onchain program information associated with this program',
      resolve: async (program, _args, ctx: Context) => {
        const [onchain] = await ctx.db
          .select()
          .from(onchainProgramInfoTable)
          .where(eq(onchainProgramInfoTable.programId, program.id))
          .limit(1);

        return onchain || null;
      },
    }),
    applicationCount: t.field({
      type: 'Int',
      description: 'The number of applications submitted by builders for this program',
      resolve: (program) => {
        // applicationCount is added by the service layer
        return (program as DBProgramV2 & { applicationCount?: number }).applicationCount ?? 0;
      },
    }),
    hasApplied: t.field({
      type: 'Boolean',
      description: 'Whether the currently authenticated builder has applied to this program',
      resolve: async (program, _args, ctx: Context) => {
        if (!ctx.userV2) return false;

        // Check if the current user has applied to this program
        const [application] = await ctx.db
          .select()
          .from(applicationsV2Table)
          .where(
            and(
              eq(applicationsV2Table.programId, program.id),
              eq(applicationsV2Table.applicantId, ctx.userV2.id),
            ),
          )
          .limit(1);

        return !!application;
      },
    }),
    myApplication: t.field({
      type: ApplicationV2Type,
      nullable: true,
      description:
        "The current builder's application to this program (only available in getProgramsByBuilderV2)",
      resolve: async (program, _args, ctx: Context): Promise<DBApplicationV2 | null> => {
        const programWithApp = program as DBProgramV2 & {
          myApplication?: DBApplicationV2;
        };

        if (programWithApp.myApplication) {
          return programWithApp.myApplication;
        }

        if (!ctx.userV2) return null;

        const [application] = await ctx.db
          .select()
          .from(applicationsV2Table)
          .where(
            and(
              eq(applicationsV2Table.programId, program.id),
              eq(applicationsV2Table.applicantId, ctx.userV2.id),
            ),
          )
          .limit(1);

        return application || null;
      },
    }),
    hasInProgressApplication: t.field({
      type: 'Boolean',
      description: 'Whether this program has at least one application with in_progress status',
      resolve: async (program, _args, ctx: Context) => {
        const [application] = await ctx.db
          .select()
          .from(applicationsV2Table)
          .where(
            and(
              eq(applicationsV2Table.programId, program.id),
              eq(applicationsV2Table.status, 'in_progress'),
            ),
          )
          .limit(1);
        return !!application;
      },
    }),
  }),
});

export const PaginatedProgramV2Type = builder
  .objectRef<{
    data: (DBProgramV2 & { applicationCount?: number })[];
    count: number;
    totalPages?: number;
    currentPage?: number;
    hasNextPage?: boolean;
    hasPreviousPage?: boolean;
  }>('PaginatedProgramsV2')
  .implement({
    fields: (t) => ({
      data: t.field({
        type: [ProgramV2Type],
        resolve: (parent) => parent.data,
        description: 'List of programs for the current page',
      }),
      count: t.field({
        type: 'Int',
        resolve: (parent) => parent.count,
        description: 'Total number of programs matching the query',
      }),
      totalPages: t.field({
        type: 'Int',
        nullable: true,
        resolve: (parent) => parent.totalPages,
        description: 'Total number of pages',
      }),
      currentPage: t.field({
        type: 'Int',
        nullable: true,
        resolve: (parent) => parent.currentPage,
        description: 'Current page number',
      }),
      hasNextPage: t.field({
        type: 'Boolean',
        nullable: true,
        resolve: (parent) => parent.hasNextPage,
        description: 'Whether there is a next page',
      }),
      hasPreviousPage: t.field({
        type: 'Boolean',
        nullable: true,
        resolve: (parent) => parent.hasPreviousPage,
        description: 'Whether there is a previous page',
      }),
    }),
  });

// Composite payload for creating program together with onchain info
export const CreateProgramWithOnchainV2Payload = builder
  .objectRef<{ program: DBProgramV2; onchain: DBOnchainProgramInfo }>(
    'CreateProgramWithOnchainV2Payload',
  )
  .implement({
    fields: (t) => ({
      program: t.field({ type: ProgramV2Type, resolve: (p) => p.program }),
      onchain: t.field({ type: OnchainProgramInfoV2Type, resolve: (p) => p.onchain }),
    }),
  });

export const CheckCompleteProgramResponse = builder
  .objectRef<{
    allCompleted: boolean;
    completedCount: number;
    totalCount: number;
  }>('CheckCompleteProgramResponse')
  .implement({
    fields: (t) => ({
      allCompleted: t.exposeBoolean('allCompleted'),
      completedCount: t.exposeInt('completedCount'),
      totalCount: t.exposeInt('totalCount'),
    }),
  });
