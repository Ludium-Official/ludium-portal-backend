import {
  type Application as DBApplication,
  applicationStatuses,
  applicationsTable,
  investmentsTable,
} from '@/db/schemas';
import builder from '@/graphql/builder';
import {
  acceptApplicationResolver,
  createApplicationResolver,
  getApplicationResolver,
  getApplicationsResolver,
  rejectApplicationResolver,
  updateApplicationResolver,
} from '@/graphql/resolvers/applications';
import { getLinksByApplicationIdResolver } from '@/graphql/resolvers/links';
import { getMilestonesByApplicationIdResolver } from '@/graphql/resolvers/milestones';
import { getUserResolver } from '@/graphql/resolvers/users';
import { PaginationInput } from '@/graphql/types/common';
import { Link, LinkInput } from '@/graphql/types/links';
import { CreateMilestoneInput, MilestoneType } from '@/graphql/types/milestones';
import { User } from '@/graphql/types/users';
import BigNumber from 'bignumber.js';
import { and, desc, eq, sql } from 'drizzle-orm';
import { ApplicationRef, InvestmentRef } from './shared-refs';

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */
export const ApplicationStatusEnum = builder.enumType('ApplicationStatus', {
  values: applicationStatuses,
});

export const ApplicationType = ApplicationRef.implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    status: t.field({
      type: ApplicationStatusEnum,
      resolve: (application) => application.status,
    }),
    name: t.exposeString('name', { nullable: true }),
    content: t.exposeString('content', { nullable: true }),
    summary: t.exposeString('summary', { nullable: true }),
    price: t.exposeString('price'),
    rejectionReason: t.exposeString('rejectionReason', { nullable: true }),
    metadata: t.field({
      type: 'JSON',
      nullable: true,
      resolve: (application) => application.metadata as JSON,
    }),
    applicant: t.field({
      type: User,
      resolve: async (application, _args, ctx) =>
        getUserResolver({}, { id: application.applicantId }, ctx),
    }),
    milestones: t.field({
      type: [MilestoneType],
      resolve: async (application, _args, ctx) =>
        getMilestonesByApplicationIdResolver({}, { applicationId: application.id }, ctx),
    }),
    links: t.field({
      type: [Link],
      resolve: async (application, _args, ctx) =>
        getLinksByApplicationIdResolver({}, { applicationId: application.id }, ctx),
    }),
    // Investment-specific fields
    fundingTarget: t.exposeString('fundingTarget', { nullable: true }),
    walletAddress: t.exposeString('walletAddress', { nullable: true }),
    fundingSuccessful: t.exposeBoolean('fundingSuccessful', { nullable: true }),
    investmentTerms: t.field({
      type: 'JSON',
      nullable: true,
      resolve: (application) => application.investmentTerms as unknown as JSON,
    }),
    currentFunding: t.field({
      type: 'String',
      nullable: true,
      resolve: async (application, _args, ctx) => {
        // Calculate current funding from investments
        const result = await ctx.db
          .select({
            total: sql<string>`COALESCE(SUM(CAST(amount AS NUMERIC)), 0)`,
          })
          .from(investmentsTable)
          .where(
            and(
              eq(investmentsTable.applicationId, application.id),
              eq(investmentsTable.status, 'confirmed'),
            ),
          );
        return result[0]?.total || '0';
      },
    }),
    investments: t.field({
      type: [InvestmentRef],
      nullable: true,
      resolve: async (application, _args, ctx) => {
        const investments = await ctx.db
          .select()
          .from(investmentsTable)
          .where(eq(investmentsTable.applicationId, application.id))
          .orderBy(desc(investmentsTable.createdAt));
        return investments;
      },
    }),
  }),
});

export const PaginatedApplicationsType = builder
  .objectRef<{ data: DBApplication[]; count: number }>('PaginatedApplications')
  .implement({
    fields: (t) => ({
      data: t.field({
        type: [ApplicationType],
        resolve: (parent) => parent.data,
      }),
      count: t.field({
        type: 'Int',
        resolve: (parent) => parent.count,
      }),
    }),
  });

/* -------------------------------------------------------------------------- */
/*                                   Inputs                                   */
/* -------------------------------------------------------------------------- */
export const CreateApplicationInput = builder.inputType('CreateApplicationInput', {
  fields: (t) => ({
    programId: t.string({ required: true }),
    name: t.string({ required: true }),
    content: t.string({ required: true }),
    summary: t.string(),
    metadata: t.field({ type: 'JSON' }),
    links: t.field({ type: [LinkInput], required: false }),
    price: t.string({
      required: true,
      validate: {
        refine(value) {
          return new BigNumber(value).isPositive();
        },
      },
    }),
    milestones: t.field({ type: [CreateMilestoneInput], required: true }),
    status: t.field({ type: ApplicationStatusEnum, required: true }),
    // Investment-specific fields
    fundingTarget: t.string({ required: false }),
    walletAddress: t.string({ required: false }),
    investmentTerms: t.field({ type: 'JSON', required: false }),
  }),
});

export const UpdateApplicationInput = builder.inputType('UpdateApplicationInput', {
  fields: (t) => ({
    id: t.string({ required: true }),
    name: t.string(),
    content: t.string(),
    summary: t.string(),
    metadata: t.field({ type: 'JSON' }),
    status: t.field({ type: ApplicationStatusEnum }),
    links: t.field({ type: [LinkInput] }),
    // Investment-specific fields
    fundingTarget: t.string({ required: false }),
    walletAddress: t.string({ required: false }),
    investmentTerms: t.field({ type: 'JSON', required: false }),
    fundingSuccessful: t.boolean({ required: false }),
  }),
});

/* -------------------------------------------------------------------------- */
/*                            Queries and mutations                           */
/* -------------------------------------------------------------------------- */
builder.queryFields((t) => ({
  applications: t.field({
    type: PaginatedApplicationsType,
    args: {
      pagination: t.arg({ type: PaginationInput, required: false }),
    },
    resolve: getApplicationsResolver,
  }),
  application: t.field({
    type: ApplicationType,
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: getApplicationResolver,
  }),
}));

builder.mutationFields((t) => ({
  createApplication: t.field({
    type: ApplicationType,
    authScopes: { user: true },
    args: {
      input: t.arg({ type: CreateApplicationInput, required: true }),
    },
    resolve: createApplicationResolver,
  }),
  updateApplication: t.field({
    type: ApplicationType,
    authScopes: (_, args) => ({
      admin: true,
      programBuilder: { applicationId: args.input.id },
    }),
    args: {
      input: t.arg({ type: UpdateApplicationInput, required: true }),
    },
    resolve: updateApplicationResolver,
  }),
  acceptApplication: t.field({
    type: ApplicationType,
    authScopes: async (_, args, ctx) => {
      const applicationId = args.id;
      const [application] = await ctx.db
        .select()
        .from(applicationsTable)
        .where(eq(applicationsTable.id, applicationId));
      if (!application?.programId) {
        throw new Error('Program not found');
      }

      return {
        programValidator: { programId: application.programId },
        admin: true,
      };
    },
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: acceptApplicationResolver,
  }),
  rejectApplication: t.field({
    type: ApplicationType,
    authScopes: async (_, args, ctx) => {
      const applicationId = args.id;
      const [application] = await ctx.db
        .select()
        .from(applicationsTable)
        .where(eq(applicationsTable.id, applicationId));
      if (!application?.programId) {
        throw new Error('Program not found');
      }

      return {
        programValidator: { programId: application.programId },
        admin: true,
      };
    },
    args: {
      id: t.arg.id({ required: true }),
      rejectionReason: t.arg.string({ required: false }),
    },
    resolve: rejectApplicationResolver,
  }),
}));
