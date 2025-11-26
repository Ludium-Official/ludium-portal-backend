import builder from '@/graphql/builder';
import { PaginationInput } from '@/graphql/types/common';
import {
  checkCompleteProgramResolver,
  getInProgressProgramsV2Resolver,
  getProgramV2Resolver,
  getProgramsByBuilderV2Resolver,
  getProgramsBysponsorIdV2Resolver,
  getProgramsV2Resolver,
  getProgramsWithFilterV2Resolver,
} from '@/graphql/v2/resolvers/programs';
import { ProgramsV2QueryInput } from '../inputs/programs';
import {
  CheckCompleteProgramResponse,
  PaginatedProgramV2Type,
  ProgramV2Type,
} from '../types/programs';

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
  programsWithFilterV2: t.field({
    type: PaginatedProgramV2Type,
    description: 'Get all programs with filtering options (status, pagination).',
    args: {
      query: t.arg({
        type: ProgramsV2QueryInput,
        required: false,
        description:
          'Query options: limit (default: 10), page (default: 1), and status filter. Supports sorting and filtering.',
      }),
    },
    resolve: getProgramsWithFilterV2Resolver,
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
  programsInProgressV2: t.field({
    type: PaginatedProgramV2Type,
    description:
      'Get all programs that are currently in progress (status: open) with pagination. Default page is 1, default limit is 10.',
    args: {
      query: t.arg({
        type: ProgramsV2QueryInput,
        required: false,
        description: 'Query options including pagination (page and limit)',
      }),
    },
    resolve: getInProgressProgramsV2Resolver,
  }),
  checkCompleteProgram: t.field({
    type: CheckCompleteProgramResponse,
    description: 'Check if a program can be completed (i.e., all applications are completed).',
    authScopes: { relayer: true },
    args: {
      programId: t.arg.id({
        required: true,
        description: 'The ID of the program to check.',
      }),
    },
    resolve: checkCompleteProgramResolver,
  }),
}));
