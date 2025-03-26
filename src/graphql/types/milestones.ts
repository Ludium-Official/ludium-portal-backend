import type { Milestone as DBMilestone } from '@/db/schemas';
import builder from '@/graphql/builder';
import { getLinksByMilestoneIdResolver } from '@/graphql/resolvers/links';
import {
  createMilestonesResolver,
  getMilestoneResolver,
  getMilestonesResolver,
  updateMilestoneResolver,
} from '@/graphql/resolvers/milestones';
import { PaginationInput } from '@/graphql/types/common';
import { Link, LinkInput } from '@/graphql/types/links';

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */
export const MilestoneStatusEnum = builder.enumType('MilestoneStatus', {
  values: ['pending', 'completed', 'failed', 'revision_requested'] as const,
});

export const MilestoneType = builder.objectRef<DBMilestone>('Milestone').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    title: t.exposeString('title'),
    description: t.exposeString('description', { nullable: true }),
    price: t.exposeString('price'),
    currency: t.exposeString('currency'),
    status: t.field({
      type: MilestoneStatusEnum,
      resolve: (milestone) => milestone.status,
    }),
    links: t.field({
      type: [Link],
      resolve: async (milestone, _args, ctx) =>
        getLinksByMilestoneIdResolver({}, { milestoneId: milestone.id }, ctx),
    }),
  }),
});

export const PaginatedMilestonesType = builder
  .objectRef<{ data: DBMilestone[]; count: number }>('PaginatedMilestones')
  .implement({
    fields: (t) => ({
      data: t.field({ type: [MilestoneType], resolve: (parent) => parent.data }),
      count: t.field({ type: 'Int', resolve: (parent) => parent.count }),
    }),
  });

/* -------------------------------------------------------------------------- */
/*                                   Inputs                                   */
/* -------------------------------------------------------------------------- */
export const CreateMilestoneInput = builder.inputType('CreateMilestoneInput', {
  fields: (t) => ({
    applicationId: t.string({ required: true }),
    title: t.string({ required: true }),
    description: t.string(),
    price: t.string({ required: true }),
    currency: t.string({ required: true, defaultValue: 'ETH' }),
    links: t.field({ type: [LinkInput] }),
  }),
});

export const UpdateMilestoneInput = builder.inputType('UpdateMilestoneInput', {
  fields: (t) => ({
    id: t.string({ required: true }),
    title: t.string(),
    description: t.string(),
    price: t.string(),
    currency: t.string(),
    status: t.field({ type: MilestoneStatusEnum }),
    links: t.field({ type: [LinkInput] }),
  }),
});

/* -------------------------------------------------------------------------- */
/*                            Queries and mutations                           */
/* -------------------------------------------------------------------------- */
builder.queryFields((t) => ({
  milestone: t.field({
    type: MilestoneType,
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: getMilestoneResolver,
  }),
  milestones: t.field({
    type: PaginatedMilestonesType,
    args: {
      applicationId: t.arg.id({ required: true }),
      pagination: t.arg({ type: PaginationInput, required: false }),
    },
    resolve: getMilestonesResolver,
  }),
}));

builder.mutationFields((t) => ({
  createMilestones: t.field({
    type: [MilestoneType],
    authScopes: { builder: true },
    args: {
      input: t.arg({ type: [CreateMilestoneInput], required: true }),
    },
    resolve: createMilestonesResolver,
  }),
  updateMilestone: t.field({
    type: MilestoneType,
    authScopes: { validator: true, builder: true },
    args: {
      input: t.arg({ type: UpdateMilestoneInput, required: true }),
    },
    resolve: updateMilestoneResolver,
  }),
}));
