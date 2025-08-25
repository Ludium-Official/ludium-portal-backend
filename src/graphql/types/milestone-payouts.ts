import {
  type MilestonePayout as DbMilestonePayout,
  investmentsTable,
  milestonesTable,
  payoutStatuses,
} from '@/db/schemas';
import {
  getMilestonePayoutResolver,
  getMilestonePayoutsResolver,
  processMilestonePayoutsResolver,
} from '@/graphql/resolvers/milestone-payouts';
import { eq } from 'drizzle-orm';
import builder from '../builder';
import { PaginationInput } from './common';
import { MilestoneType } from './milestones';
import { InvestmentRef } from './shared-refs';

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

export const PayoutStatusEnum = builder.enumType('PayoutStatus', {
  values: payoutStatuses,
});

export const MilestonePayoutType = builder
  .objectRef<DbMilestonePayout>('MilestonePayout')
  .implement({
    fields: (t) => ({
      id: t.exposeID('id'),
      amount: t.exposeString('amount'),
      percentage: t.exposeString('percentage'),
      status: t.field({
        type: PayoutStatusEnum,
        resolve: (payout) => payout.status,
      }),
      txHash: t.exposeString('txHash', { nullable: true }),
      errorMessage: t.exposeString('errorMessage', { nullable: true }),
      processedAt: t.field({
        type: 'Date',
        nullable: true,
        resolve: (payout) => payout.processedAt,
      }),
      createdAt: t.field({
        type: 'Date',
        resolve: (payout) => payout.createdAt,
      }),
      milestone: t.field({
        type: MilestoneType,
        resolve: async (payout, _args, ctx) => {
          const [milestone] = await ctx.db
            .select()
            .from(milestonesTable)
            .where(eq(milestonesTable.id, payout.milestoneId));
          if (!milestone) {
            throw new Error('Milestone not found');
          }
          return milestone;
        },
      }),
      investment: t.field({
        type: InvestmentRef,
        resolve: async (payout, _args, ctx) => {
          const [investment] = await ctx.db
            .select()
            .from(investmentsTable)
            .where(eq(investmentsTable.id, payout.investmentId));
          if (!investment) {
            throw new Error('Investment not found');
          }
          return investment;
        },
      }),
    }),
  });

export const PaginatedMilestonePayoutsType = builder
  .objectRef<{
    data: DbMilestonePayout[];
    count: number;
  }>('PaginatedMilestonePayouts')
  .implement({
    fields: (t) => ({
      data: t.field({
        type: [MilestonePayoutType],
        resolve: (parent) => parent.data,
      }),
      count: t.int({
        resolve: (parent) => parent.count,
      }),
    }),
  });

/* -------------------------------------------------------------------------- */
/*                                   Inputs                                   */
/* -------------------------------------------------------------------------- */

export const ProcessPayoutsInput = builder.inputType('ProcessPayoutsInput', {
  fields: (t) => ({
    milestoneId: t.id({ required: true }),
    contractAddress: t.string({ required: true }),
  }),
});

/* -------------------------------------------------------------------------- */
/*                            Queries and mutations                           */
/* -------------------------------------------------------------------------- */

builder.queryFields((t) => ({
  milestonePayouts: t.field({
    type: PaginatedMilestonePayoutsType,
    args: {
      pagination: t.arg({ type: PaginationInput, required: false }),
      milestoneId: t.arg.id({ required: false }),
      investmentId: t.arg.id({ required: false }),
      status: t.arg({ type: PayoutStatusEnum, required: false }),
    },
    resolve: getMilestonePayoutsResolver,
  }),
  milestonePayout: t.field({
    type: MilestonePayoutType,
    nullable: true,
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: getMilestonePayoutResolver,
  }),
}));

builder.mutationFields((t) => ({
  processMilestonePayouts: t.field({
    type: [MilestonePayoutType],
    authScopes: { admin: true },
    args: {
      input: t.arg({ type: ProcessPayoutsInput, required: true }),
    },
    resolve: processMilestonePayoutsResolver,
  }),
}));
