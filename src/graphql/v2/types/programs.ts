import { networksTable } from '@/db/schemas/v2/networks';
import type { OnchainProgramInfo as DBOnchainProgramInfo } from '@/db/schemas/v2/onchain-program-info';
import type { ProgramV2 as DBProgramV2 } from '@/db/schemas/v2/programs';
import { programStatusV2Values, programVisibilityV2Values } from '@/db/schemas/v2/programs';
import { tokensTable } from '@/db/schemas/v2/tokens';
import { usersV2Table } from '@/db/schemas/v2/users';
import builder from '@/graphql/builder';
import type { Context } from '@/types';
import { eq } from 'drizzle-orm';
import { OnchainProgramInfoV2Type } from '../types/onchain-program-info';
import { NetworkV2Ref } from './networks';
import { TokenV2Ref } from './tokens';
import { UserV2Ref } from './users';

export const ProgramVisibilityEnum = builder.enumType('ProgramVisibilityV2', {
  values: programVisibilityV2Values,
});

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */
export const ProgramV2StatusEnum = builder.enumType('ProgramStatusV2', {
  values: programStatusV2Values,
});

export const ProgramV2Ref = builder.objectRef<DBProgramV2>('ProgramV2');

export const ProgramV2Type = ProgramV2Ref.implement({
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
  }),
});

export const PaginatedProgramV2Type = builder
  .objectRef<{ data: DBProgramV2[]; count: number }>('PaginatedProgramsV2')
  .implement({
    fields: (t) => ({
      data: t.field({
        type: [ProgramV2Type],
        resolve: (parent) => parent.data,
      }),
      count: t.field({
        type: 'Int',
        resolve: (parent) => parent.count,
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
