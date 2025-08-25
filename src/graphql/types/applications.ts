import {
  type Application as DBApplication,
  applicationStatuses,
  applicationsTable,
} from '@/db/schemas';
import builder from '@/graphql/builder';
import {
  acceptApplicationResolver,
  createApplicationResolver,
  getApplicationProgramResolver,
  getApplicationResolver,
  getApplicationsResolver,
  getCurrentFundingAmountResolver,
  getFundingProgressResolver,
  getInvestmentCountResolver,
  getInvestorsWithTiersResolver,
  rejectApplicationResolver,
  updateApplicationResolver,
} from '@/graphql/resolvers/applications';
import { getCommentsByCommentableResolver } from '@/graphql/resolvers/comments';
import { getInvestmentTermsByApplicationIdResolver } from '@/graphql/resolvers/investment-terms';
import { getLinksByApplicationIdResolver } from '@/graphql/resolvers/links';
import { getMilestonesByApplicationIdResolver } from '@/graphql/resolvers/milestones';
import { getUserResolver } from '@/graphql/resolvers/users';
import { CommentType } from '@/graphql/types/comments';
import { PaginationInput } from '@/graphql/types/common';
import { CreateInvestmentTermInput, InvestmentTermType } from '@/graphql/types/investment-terms';
import { InvestorType } from '@/graphql/types/investments';
import { Link, LinkInput } from '@/graphql/types/links';
import { CreateMilestoneInput, MilestoneType } from '@/graphql/types/milestones';
import { ApplicationRef, ProgramRef } from '@/graphql/types/shared-refs';
import { User } from '@/graphql/types/users';
import BigNumber from 'bignumber.js';
import { eq } from 'drizzle-orm';

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
    comments: t.field({
      type: [CommentType],
      resolve: async (application, _args, ctx) =>
        getCommentsByCommentableResolver(
          {},
          { commentableId: application.id, commentableType: 'application' },
          ctx,
        ),
    }),
    fundingTarget: t.exposeString('fundingTarget', { nullable: true }),
    walletAddress: t.exposeString('walletAddress', { nullable: true }),
    fundingSuccessful: t.exposeBoolean('fundingSuccessful', { nullable: true }),
    onChainProjectId: t.exposeInt('onChainProjectId', { nullable: true }),
    investmentTerms: t.field({
      type: [InvestmentTermType],
      resolve: async (application, _args, ctx) =>
        getInvestmentTermsByApplicationIdResolver({}, { applicationId: application.id }, ctx),
    }),
    currentFundingAmount: t.field({
      type: 'String',
      nullable: true,
      resolve: (application, _args, ctx) =>
        getCurrentFundingAmountResolver({}, { id: application.id }, ctx),
    }),
    fundingProgress: t.field({
      type: 'Float',
      nullable: true,
      resolve: (application, _args, ctx) =>
        getFundingProgressResolver({}, { id: application.id }, ctx),
    }),
    investmentCount: t.field({
      type: 'Int',
      nullable: true,
      resolve: (application, _args, ctx) =>
        getInvestmentCountResolver({}, { id: application.id }, ctx),
    }),
    // Get investors with their tiers for this application
    investors: t.field({
      type: [InvestorType],
      nullable: true,
      resolve: (application, _args, ctx) =>
        getInvestorsWithTiersResolver({}, { id: application.id }, ctx),
    }),
    // Get the program this application belongs to
    program: t.field({
      type: ProgramRef,
      nullable: true,
      resolve: (application, _args, ctx) => getApplicationProgramResolver(application, _args, ctx),
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
    summary: t.string({ required: true }),
    metadata: t.field({ type: 'JSON' }),
    links: t.field({ type: [LinkInput] }),
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
    fundingTarget: t.string(),
    walletAddress: t.string(),
    investmentTerms: t.field({ type: [CreateInvestmentTermInput] }),
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
    authScopes: { user: true },
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
      onChainProjectId: t.arg.int({ required: false }),
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
