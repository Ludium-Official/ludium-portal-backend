import type { Milestone as DBMilestone } from '@/db/schemas';
import builder from '@/graphql/builder';
import { getLinksByMilestoneIdResolver } from '@/graphql/resolvers/links';
import {
  checkMilestoneResolver,
  createMilestonesResolver,
  getMilestoneResolver,
  getMilestonesResolver,
  submitMilestoneResolver,
  updateMilestoneResolver,
} from '@/graphql/resolvers/milestones';
import { PaginationInput } from '@/graphql/types/common';
import { Link, LinkInput } from '@/graphql/types/links';
import { formatPrice } from '@/utils';

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
    price: t.field({
      type: 'String',
      resolve: (milestone) => formatPrice(milestone.price),
    }),
    currency: t.exposeString('currency'),
    educhainMilestoneId: t.exposeInt('educhainMilestoneId', { nullable: true }),
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
    educhainApplicationId: t.int({ required: true }),
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

export const CheckMilestoneStatusEnum = builder.enumType('CheckMilestoneStatus', {
  values: ['pending', 'completed'] as const,
});

export const CheckMilestoneInput = builder.inputType('CheckMilestoneInput', {
  fields: (t) => ({
    id: t.string({ required: true }),
    status: t.field({ type: CheckMilestoneStatusEnum, required: true }),
  }),
});

export const SubmitMilestoneInput = builder.inputType('SubmitMilestoneInput', {
  fields: (t) => ({
    id: t.string({ required: true }),
    description: t.string(),
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
    authScopes: { user: true },
    args: {
      input: t.arg({ type: [CreateMilestoneInput], required: true }),
    },
    resolve: createMilestonesResolver,
  }),
  updateMilestone: t.field({
    type: MilestoneType,
    authScopes: { admin: true },
    args: {
      input: t.arg({ type: UpdateMilestoneInput, required: true }),
    },
    resolve: updateMilestoneResolver,
  }),
  submitMilestone: t.field({
    type: MilestoneType,
    authScopes: { user: true },
    args: {
      input: t.arg({ type: SubmitMilestoneInput, required: true }),
    },
    resolve: submitMilestoneResolver,
  }),
  checkMilestone: t.field({
    type: MilestoneType,
    authScopes: { user: true },
    args: {
      input: t.arg({ type: CheckMilestoneInput, required: true }),
    },
    resolve: checkMilestoneResolver,
  }),
}));
