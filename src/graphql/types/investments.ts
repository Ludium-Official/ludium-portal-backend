import { type Investment as DbInvestment, investmentStatuses } from '@/db/schemas';
import {
  createInvestmentResolver,
  getInvestmentCanReclaimResolver,
  getInvestmentProjectResolver,
  getInvestmentResolver,
  getInvestmentSupporterResolver,
  getInvestmentsResolver,
  reclaimInvestmentResolver,
} from '@/graphql/resolvers/investments';
import type { Investor, Supporter } from '@/types';
import builder from '../builder';
import { PaginationInput } from './common';
import { ApplicationRef, InvestmentRef } from './shared-refs';
import { User } from './users';

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

export const InvestmentStatusEnum = builder.enumType('InvestmentStatus', {
  values: investmentStatuses,
});

export const InvestmentType = InvestmentRef.implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    amount: t.exposeString('amount', { nullable: true }),
    tier: t.exposeString('tier', { nullable: true }),
    txHash: t.exposeString('txHash', { nullable: true }),
    status: t.field({
      type: InvestmentStatusEnum,
      resolve: (investment) => investment.status,
    }),
    reclaimed: t.boolean({
      resolve: (investment) => investment.status === 'refunded',
    }),
    reclaimTxHash: t.exposeString('reclaimTxHash', { nullable: true }),
    reclaimedAt: t.field({
      type: 'Date',
      nullable: true,
      resolve: (investment) => investment.reclaimedAt,
    }),
    canReclaim: t.boolean({
      resolve: getInvestmentCanReclaimResolver,
    }),
    project: t.field({
      type: ApplicationRef,
      nullable: true,
      resolve: getInvestmentProjectResolver,
    }),
    supporter: t.field({
      type: User,
      nullable: true,
      resolve: getInvestmentSupporterResolver,
    }),
  }),
});

export const PaginatedInvestmentsType = builder
  .objectRef<{
    data: DbInvestment[];
    count: number;
  }>('PaginatedInvestments')
  .implement({
    fields: (t) => ({
      data: t.field({
        type: [InvestmentType],
        resolve: (parent) => parent.data,
      }),
      count: t.int({
        resolve: (parent) => parent.count,
      }),
    }),
  });

export const InvestorType = builder.objectRef<Investor>('Investor').implement({
  fields: (t) => ({
    userId: t.exposeID('userId'),
    email: t.exposeString('email', { nullable: true }),
    firstName: t.exposeString('firstName', { nullable: true }),
    lastName: t.exposeString('lastName', { nullable: true }),
    amount: t.exposeString('amount'),
    tier: t.exposeString('tier', { nullable: true }),
    maxInvestmentAmount: t.exposeString('maxInvestmentAmount', { nullable: true }),
    investmentStatus: t.exposeString('investmentStatus'),
    createdAt: t.field({
      type: 'String',
      resolve: (investor) => investor.createdAt.toISOString(),
    }),
  }),
});

export const SupporterType = builder.objectRef<Supporter>('Supporter').implement({
  fields: (t) => ({
    userId: t.exposeID('userId'),
    email: t.exposeString('email', { nullable: true }),
    firstName: t.exposeString('firstName', { nullable: true }),
    lastName: t.exposeString('lastName', { nullable: true }),
    tier: t.exposeString('tier', { nullable: true }),
    maxInvestmentAmount: t.exposeString('maxInvestmentAmount', { nullable: true }),
  }),
});

/* -------------------------------------------------------------------------- */
/*                                   Inputs                                   */
/* -------------------------------------------------------------------------- */

export const CreateInvestmentInput = builder.inputType('CreateInvestmentInput', {
  fields: (t) => ({
    projectId: t.id({ required: true }),
    amount: t.string({ required: true }),
    investmentTermId: t.id({ required: false }), // Optional - only for open programs with terms
    txHash: t.string({ required: false }),
  }),
});

export const ReclaimInvestmentInput = builder.inputType('ReclaimInvestmentInput', {
  fields: (t) => ({
    investmentId: t.id({ required: true }),
    txHash: t.string({ required: true }),
  }),
});

/* -------------------------------------------------------------------------- */
/*                            Queries and mutations                           */
/* -------------------------------------------------------------------------- */

builder.queryFields((t) => ({
  investments: t.field({
    type: PaginatedInvestmentsType,
    args: {
      pagination: t.arg({ type: PaginationInput, required: false }),
      projectId: t.arg.id({ required: false }),
      supporterId: t.arg.id({ required: false }),
    },
    resolve: getInvestmentsResolver,
  }),
  investment: t.field({
    type: InvestmentType,
    nullable: true,
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: getInvestmentResolver,
  }),
}));

builder.mutationFields((t) => ({
  createInvestment: t.field({
    type: InvestmentType,
    authScopes: { user: true },
    args: {
      input: t.arg({ type: CreateInvestmentInput, required: true }),
    },
    resolve: createInvestmentResolver,
  }),
  reclaimInvestment: t.field({
    type: InvestmentType,
    authScopes: { user: true },
    args: {
      input: t.arg({ type: ReclaimInvestmentInput, required: true }),
    },
    resolve: reclaimInvestmentResolver,
  }),
}));
