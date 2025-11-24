import builder from '@/graphql/builder';
import {
  getMilestoneV2Resolver,
  getMilestonesInProgressV2Resolver,
  getMilestonesV2Resolver,
} from '@/graphql/v2/resolvers/milestones';
import { MilestonesV2QueryInput } from '../inputs/milestones';
import { MilestoneV2Type, PaginatedMilestonesV2Type } from '../types/milestones';

builder.queryFields((t) => ({
  milestoneV2: t.field({
    type: MilestoneV2Type,
    authScopes: { userV2: true },
    args: {
      id: t.arg.id({
        required: true,
        description: 'Milestone ID',
      }),
    },
    resolve: getMilestoneV2Resolver,
    description: 'Get a single milestone by ID',
  }),
  milestonesV2: t.field({
    type: PaginatedMilestonesV2Type,
    authScopes: { userV2: true },
    args: {
      query: t.arg({
        type: MilestonesV2QueryInput,
        description: 'Query options including pagination and filtering',
      }),
    },
    resolve: getMilestonesV2Resolver,
    description: 'Get paginated list of milestones with filtering options',
  }),
  milestonesInProgressV2: t.field({
    type: PaginatedMilestonesV2Type,
    authScopes: { userV2: true },
    args: {
      query: t.arg({
        type: MilestonesV2QueryInput,
        description: 'Query options including pagination and filtering',
      }),
    },
    resolve: getMilestonesInProgressV2Resolver,
    description: 'Get paginated list of milestones with status in_progress',
  }),
}));
