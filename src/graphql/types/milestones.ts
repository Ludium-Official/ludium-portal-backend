import { type Milestone as DBMilestone, milestoneStatuses } from '@/db/schemas';
import builder from '@/graphql/builder';
import { getCommentsByCommentableResolver } from '@/graphql/resolvers/comments';
import { getLinksByMilestoneIdResolver } from '@/graphql/resolvers/links';
import {
  checkMilestoneResolver,
  getMilestoneResolver,
  getMilestonesResolver,
  reclaimMilestoneResolver,
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
    summary: t.exposeString('summary', { nullable: true }),
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
      type: 'DateTime',
      resolve: (milestone) => (milestone.deadline ? new Date(milestone.deadline) : null),
    }),
    // Reclaim fields for unpaid milestones
    reclaimed: t.exposeBoolean('reclaimed', { nullable: true }),
    reclaimTxHash: t.exposeString('reclaimTxHash', { nullable: true }),
    reclaimedAt: t.field({
      type: 'DateTime',
      nullable: true,
      resolve: (milestone) => milestone.reclaimedAt,
    }),
    canReclaim: t.boolean({
      description: 'Whether this milestone can be reclaimed (unpaid past deadline)',
      resolve: (milestone) => {
        // Milestone can be reclaimed if:
        // 1. It's past deadline
        // 2. It hasn't been reclaimed yet
        // 3. It's not completed or rejected
        if (milestone.reclaimed) return false;
        if (milestone.status === 'completed' || milestone.status === 'rejected') return false;

        const now = new Date();
        const deadline = milestone.deadline ? new Date(milestone.deadline) : null;
        if (!deadline || deadline > now) return false;

        return true;
      },
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
    description: t.string({ required: true }),
    summary: t.string({ required: true }),
    percentage: t.string({
      required: true,
      validate: {
        refine(value) {
          if (!value) return true; // Allow undefined/null for optional field
          const percentage = new BigNumber(value);
          return percentage.isGreaterThan(0) && percentage.isLessThanOrEqualTo(100);
        },
      },
    }),
    currency: t.string({ required: true, defaultValue: 'ETH' }),
    links: t.field({ type: [LinkInput], required: false }),
    deadline: t.field({ type: 'DateTime', required: true }),
  }),
});

export const UpdateMilestoneInput = builder.inputType('UpdateMilestoneInput', {
  fields: (t) => ({
    id: t.string({ required: true }),
    title: t.string(),
    description: t.string(),
    summary: t.string(),
    percentage: t.string({
      validate: {
        refine(value) {
          if (!value) return true; // Allow undefined/null for optional field
          const percentage = new BigNumber(value);
          return percentage.isGreaterThan(0) && percentage.isLessThanOrEqualTo(100);
        },
      },
    }),
    currency: t.string(),
    status: t.field({ type: MilestoneStatusEnum }),
    links: t.field({ type: [LinkInput] }),
    deadline: t.field({ type: 'DateTime' }),
  }),
});

export const CheckMilestoneStatusEnum = builder.enumType('CheckMilestoneStatus', {
  values: ['completed', 'rejected'] as const,
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
    authScopes: { user: true },
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
  // Reclaim mutation for unpaid milestones
  reclaimMilestone: t.field({
    type: MilestoneType,
    description: 'Reclaim funds from an unpaid milestone past its deadline',
    authScopes: { user: true },
    args: {
      milestoneId: t.arg.id({ required: true }),
      txHash: t.arg.string({ required: false }),
    },
    resolve: reclaimMilestoneResolver,
  }),
}));
