import builder from '@/graphql/builder';
import { PaginationInput } from '@/graphql/types/common';
import {
  getProgramV2Resolver,
  getProgramsByBuilderV2Resolver,
  getProgramsBysponsorIdV2Resolver,
  getProgramsV2Resolver,
} from '@/graphql/v2/resolvers/programs';
import { PaginatedProgramV2Type, ProgramV2Type } from '../types/programs';

builder.queryFields((t) => ({
  programsV2: t.field({
    type: PaginatedProgramV2Type,
    description: 'Get all programs with pagination. Default limit is 10, default offset is 0.',
    args: {
      pagination: t.arg({
        type: PaginationInput,
        required: false,
        description:
          'Pagination options: limit (default: 10) and offset (default: 0). Supports sorting and filtering.',
      }),
    },
    resolve: getProgramsV2Resolver,
  }),
  programV2: t.field({
    type: ProgramV2Type,
    description: 'Get a single program by ID.',
    args: {
      id: t.arg.id({
        required: true,
        description: 'The ID of the program to fetch.',
      }),
    },
    resolve: getProgramV2Resolver,
  }),
  programsBysponsorIdV2: t.field({
    type: PaginatedProgramV2Type,
    authScopes: { userV2: true },
    description:
      'Get all programs by sponsor ID with pagination. Default limit is 10, default offset is 0. Returns all programs created by a specific sponsor.',
    args: {
      sponsorId: t.arg.id({
        required: true,
        description: 'The ID of the sponsor (user) to fetch programs for.',
      }),
      pagination: t.arg({
        type: PaginationInput,
        required: false,
        description:
          'Pagination options: limit (default: 10) and offset (default: 0). Supports sorting and filtering.',
      }),
    },
    resolve: getProgramsBysponsorIdV2Resolver,
  }),
  programsByBuilderIdV2: t.field({
    type: PaginatedProgramV2Type,
    authScopes: { userV2: true },
    description:
      "Get all programs that the current builder has applied to, with pagination. Each program includes the builder's application with appliedAt. Default limit is 10, default offset is 0.",
    args: {
      builderId: t.arg.id({
        required: true,
        description: 'The ID of the builder (user) to fetch programs for.',
      }),
      pagination: t.arg({
        type: PaginationInput,
        required: false,
        description:
          'Pagination options: limit (default: 10) and offset (default: 0). Supports sorting and filtering.',
      }),
    },
    resolve: getProgramsByBuilderV2Resolver,
  }),
}));
