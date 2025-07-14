import { type Milestone as DBMilestone, milestoneStatuses } from '@/db/schemas';
import builder from '@/graphql/builder';
import { getCommentsByCommentableResolver } from '@/graphql/resolvers/comments';
import { getLinksByMilestoneIdResolver } from '@/graphql/resolvers/links';
import {
  checkMilestoneResolver,
  getMilestoneResolver,
  getMilestonesResolver,
  submitMilestoneResolver,
  updateMilestoneResolver,
} from '@/graphql/resolvers/milestones';
import { CommentType } from '@/graphql/types/comments';
import { PaginationInput } from '@/graphql/types/common';
import { Link, LinkInput } from '@/graphql/types/links';
import BigNumber from 'bignumber.js';

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */
export const MilestoneStatusEnum = builder.enumType('MilestoneStatus', {
  values: milestoneStatuses,
});

export const MilestoneType = builder.objectRef<DBMilestone>('Milestone').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    title: t.exposeString('title'),
    description: t.exposeString('description', { nullable: true }),
    price: t.exposeString('price'),
    percentage: t.exposeString('percentage'),
    currency: t.exposeString('currency'),
    rejectionReason: t.exposeString('rejectionReason', { nullable: true }),
    status: t.field({
      type: MilestoneStatusEnum,
      resolve: (milestone) => milestone.status,
    }),
    links: t.field({
      type: [Link],
      resolve: async (milestone, _args, ctx) =>
        getLinksByMilestoneIdResolver({}, { milestoneId: milestone.id }, ctx),
    }),
    comments: t.field({
      type: [CommentType],
      resolve: async (milestone, _args, ctx) =>
        getCommentsByCommentableResolver(
          {},
          { commentableType: 'milestone', commentableId: milestone.id },
          ctx,
        ),
    }),
    file: t.exposeString('file', { nullable: true }),
    deadline: t.field({
      type: 'Date',
      resolve: (milestone) => (milestone.deadline ? new Date(milestone.deadline) : null),
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
    title: t.string({ required: true }),
    description: t.string(),
    percentage: t.string({
      required: true,
      validate: {
        refine(value) {
          const percentage = new BigNumber(value);
          return percentage.isGreaterThan(0) && percentage.isLessThanOrEqualTo(100);
        },
      },
    }),
    price: t.string({
      required: true,
      validate: {
        refine(value) {
          return new BigNumber(value).isPositive();
        },
      },
    }),
    currency: t.string({ required: true, defaultValue: 'ETH' }),
    links: t.field({ type: [LinkInput] }),
    deadline: t.field({ type: 'Date', required: true }),
  }),
});

export const UpdateMilestoneInput = builder.inputType('UpdateMilestoneInput', {
  fields: (t) => ({
    id: t.string({ required: true }),
    title: t.string(),
    description: t.string(),
    percentage: t.string({
      validate: {
        refine(value) {
          const percentage = new BigNumber(value);
          return percentage.isGreaterThan(0) && percentage.isLessThanOrEqualTo(100);
        },
      },
    }),
    price: t.string(),
    currency: t.string(),
    status: t.field({ type: MilestoneStatusEnum }),
    links: t.field({ type: [LinkInput] }),
    deadline: t.field({ type: 'Date' }),
  }),
});

export const CheckMilestoneStatusEnum = builder.enumType('CheckMilestoneStatus', {
  values: ['pending', 'completed'] as const,
});

export const CheckMilestoneInput = builder.inputType('CheckMilestoneInput', {
  fields: (t) => ({
    id: t.string({ required: true }),
    status: t.field({ type: CheckMilestoneStatusEnum, required: true }),
    rejectionReason: t.string(),
  }),
});

export const SubmitMilestoneStatusEnum = builder.enumType('SubmitMilestoneStatus', {
  values: ['draft', 'submitted'] as const,
});

export const SubmitMilestoneInput = builder.inputType('SubmitMilestoneInput', {
  fields: (t) => ({
    id: t.string({ required: true }),
    status: t.field({ type: SubmitMilestoneStatusEnum, required: true }),
    description: t.string(),
    links: t.field({ type: [LinkInput] }),
    file: t.field({ type: 'Upload' }),
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
  updateMilestone: t.field({
    type: MilestoneType,
    authScopes: async (_, args) => ({
      admin: true,
      milestoneBuilder: { milestoneId: args.input.id },
    }),
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
