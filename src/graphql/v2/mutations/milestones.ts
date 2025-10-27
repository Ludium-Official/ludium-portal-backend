import builder from '@/graphql/builder';
import {
  createMilestoneV2Resolver,
  deleteMilestoneV2Resolver,
  updateMilestoneV2Resolver,
} from '@/graphql/v2/resolvers/milestones';
import { CreateMilestoneV2Input, UpdateMilestoneV2Input } from '../inputs/milestones';
import { MilestoneV2Type } from '../types/milestones';

builder.mutationFields((t) => ({
  createMilestoneV2: t.field({
    type: MilestoneV2Type,
    args: {
      input: t.arg({
        type: CreateMilestoneV2Input,
        required: true,
        description: 'Milestone creation data',
      }),
    },
    resolve: createMilestoneV2Resolver,
    description: 'Create a new milestone',
  }),
}));

builder.mutationFields((t) => ({
  updateMilestoneV2: t.field({
    type: MilestoneV2Type,
    args: {
      id: t.arg.id({
        required: true,
        description: 'Milestone ID',
      }),
      input: t.arg({
        type: UpdateMilestoneV2Input,
        required: true,
        description: 'Milestone update data',
      }),
    },
    resolve: updateMilestoneV2Resolver,
    description: 'Update an existing milestone',
  }),
}));

builder.mutationFields((t) => ({
  deleteMilestoneV2: t.field({
    type: MilestoneV2Type,
    args: {
      id: t.arg.id({
        required: true,
        description: 'Milestone ID',
      }),
    },
    resolve: deleteMilestoneV2Resolver,
    description: 'Delete a milestone by ID',
  }),
}));
