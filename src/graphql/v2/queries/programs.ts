import builder from '@/graphql/builder';
import { PaginationInput } from '@/graphql/types/common';
import { getProgramV2Resolver, getProgramsV2Resolver } from '@/graphql/v2/resolvers/programs';
import { PaginatedProgramV2Type, ProgramV2Type } from '../types/programs';

builder.queryFields((t) => ({
  programsV2: t.field({
    type: PaginatedProgramV2Type,
    args: {
      pagination: t.arg({ type: PaginationInput, required: false }),
    },
    resolve: getProgramsV2Resolver,
  }),
  programV2: t.field({
    type: ProgramV2Type,
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: getProgramV2Resolver,
  }),
}));
