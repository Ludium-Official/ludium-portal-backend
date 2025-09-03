import {
  type Program as DBProgram,
  investmentTiers,
  programStatuses,
  programVisibilities,
} from '@/db/schemas';
import builder from '@/graphql/builder';
import { getApplicationsByProgramIdResolver } from '@/graphql/resolvers/applications';
import { getCommentsByCommentableResolver } from '@/graphql/resolvers/comments';
import { getLinksByProgramIdResolver } from '@/graphql/resolvers/links';
import {
  acceptProgramResolver,
  addProgramKeywordResolver,
  assignUserTierResolver,
  assignValidatorToProgramResolver,
  createProgramResolver,
  deleteProgramResolver,
  getProgramKeywordsByProgramIdResolver,
  getProgramKeywordsResolver,
  getProgramResolver,
  getProgramsResolver,
  getSupportersWithTiersResolver,
  getUserTierAssignmentResolver,
  inviteUserToProgramResolver,
  publishProgramResolver,
  reclaimProgramResolver,
  rejectProgramResolver,
  removeProgramKeywordResolver,
  removeUserFromProgramResolver,
  removeUserTierResolver,
  removeValidatorFromProgramResolver,
  updateProgramResolver,
  updateUserTierResolver,
} from '@/graphql/resolvers/programs';
import {
  getInvitedBuildersByProgramIdResolver,
  getUserResolver,
  getValidatorsByProgramIdResolver,
} from '@/graphql/resolvers/users';
import { ApplicationType } from '@/graphql/types/applications';
import { CommentType } from '@/graphql/types/comments';
import { KeywordType, PaginationInput } from '@/graphql/types/common';
import { SupporterType } from '@/graphql/types/investments';
import { Link, LinkInput } from '@/graphql/types/links';
import { ProgramRef } from '@/graphql/types/shared-refs';
import { User } from '@/graphql/types/users';
import { getProgramDetailedStatus } from '@/utils/program-status';
import BigNumber from 'bignumber.js';

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */
export const ProgramStatusEnum = builder.enumType('ProgramStatus', {
  values: programStatuses,
});

export const ProgramVisibilityEnum = builder.enumType('ProgramVisibility', {
  values: programVisibilities,
});

export const InvestmentTierEnum = builder.enumType('InvestmentTier', {
  values: investmentTiers,
});

export const ProgramTypeEnum = builder.enumType('ProgramType', {
  values: ['regular', 'funding'] as const,
});

export const FundingConditionEnum = builder.enumType('FundingCondition', {
  values: ['open', 'tier'] as const,
});

// Type for user's tier assignment with investment tracking
export const UserTierAssignmentType = builder
  .objectRef<{
    userId: string;
    tier: string;
    maxInvestmentAmount: string;
    currentInvestment: string;
    remainingCapacity: string;
    createdAt: Date;
  }>('UserTierAssignment')
  .implement({
    fields: (t) => ({
      userId: t.exposeID('userId'),
      tier: t.exposeString('tier'),
      maxInvestmentAmount: t.exposeString('maxInvestmentAmount'),
      currentInvestment: t.exposeString('currentInvestment'),
      remainingCapacity: t.exposeString('remainingCapacity'),
      createdAt: t.field({
        type: 'DateTime',
        resolve: (assignment) => assignment.createdAt,
      }),
    }),
  });

export const ProgramType = ProgramRef.implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    name: t.exposeString('name'),
    summary: t.exposeString('summary'),
    description: t.exposeString('description'),
    price: t.exposeString('price'),
    currency: t.exposeString('currency'),
    educhainProgramId: t.exposeInt('educhainProgramId'),
    txHash: t.exposeString('txHash'),
    network: t.exposeString('network'),
    rejectionReason: t.exposeString('rejectionReason'),
    deadline: t.field({
      type: 'DateTime',
      resolve: (program) => (program.deadline ? new Date(program.deadline) : null),
    }),
    keywords: t.field({
      type: [KeywordType],
      resolve: async (program, _args, ctx) =>
        getProgramKeywordsByProgramIdResolver({}, { programId: program.id }, ctx),
    }),
    links: t.field({
      type: [Link],
      resolve: async (program, _args, ctx) =>
        getLinksByProgramIdResolver({}, { programId: program.id }, ctx),
    }),
    // PRD-compliant status information for funding programs
    detailedStatus: t.field({
      type: 'JSON',
      nullable: true,
      resolve: (program) => {
        // Only for funding programs
        if (program.type !== 'funding') return null;
        const status = getProgramDetailedStatus(program);
        // Convert to plain JSON object
        return JSON.parse(JSON.stringify(status));
      },
    }),
    status: t.field({
      type: ProgramStatusEnum,
      resolve: (program) => program.status,
    }),
    visibility: t.field({
      type: ProgramVisibilityEnum,
      resolve: (program) => program.visibility,
    }),
    creator: t.field({
      type: User,
      resolve: async (program, _args, ctx) => getUserResolver({}, { id: program.creatorId }, ctx),
    }),
    validators: t.field({
      type: [User],
      resolve: async (program, _args, ctx) =>
        getValidatorsByProgramIdResolver({}, { programId: program.id }, ctx),
    }),
    // Reclaim fields for recruitment programs
    reclaimed: t.exposeBoolean('reclaimed', { nullable: true }),
    reclaimTxHash: t.exposeString('reclaimTxHash', { nullable: true }),
    reclaimedAt: t.field({
      type: 'DateTime',
      nullable: true,
      resolve: (program) => program.reclaimedAt,
    }),
    canReclaim: t.boolean({
      description: 'Whether this program can be reclaimed (unused past deadline)',
      resolve: (program) => {
        // Program can be reclaimed if:
        // 1. It's a regular (recruitment) program
        // 2. It's past deadline
        // 3. It hasn't been reclaimed yet
        // 4. It has no accepted applications
        if (program.type === 'funding' || program.reclaimed) return false;

        const now = new Date();
        const deadline = program.deadline ? new Date(program.deadline) : null;
        if (!deadline || deadline > now) return false;

        // TODO: Check if program has any accepted applications
        // This would require querying applications table
        return true;
      },
    }),
    invitedBuilders: t.field({
      type: [User],
      resolve: async (program, _args, ctx) =>
        getInvitedBuildersByProgramIdResolver({}, { programId: program.id }, ctx),
    }),
    applications: t.field({
      type: [ApplicationType],
      resolve: async (program, _args, ctx) =>
        getApplicationsByProgramIdResolver({}, { programId: program.id }, ctx),
    }),
    comments: t.field({
      type: [CommentType],
      resolve: async (program, _args, ctx) =>
        getCommentsByCommentableResolver(
          {},
          { commentableType: 'program', commentableId: program.id },
          ctx,
        ),
    }),
    image: t.exposeString('image'),

    // Investment/Funding fields
    type: t.field({
      type: ProgramTypeEnum,
      resolve: (program) => program.type,
    }),
    applicationStartDate: t.field({
      type: 'DateTime',
      resolve: (program) => program.applicationStartDate,
    }),
    applicationEndDate: t.field({
      type: 'DateTime',
      resolve: (program) => program.applicationEndDate,
    }),
    fundingStartDate: t.field({
      type: 'DateTime',
      resolve: (program) => program.fundingStartDate,
    }),
    fundingEndDate: t.field({
      type: 'DateTime',
      resolve: (program) => program.fundingEndDate,
    }),
    fundingCondition: t.field({
      type: FundingConditionEnum,
      resolve: (program) => program.fundingCondition,
    }),
    tierSettings: t.field({
      type: 'JSON',
      nullable: true,
      resolve: (program) =>
        program.tierSettings ? JSON.parse(JSON.stringify(program.tierSettings)) : null,
    }),
    feePercentage: t.exposeInt('feePercentage'),
    customFeePercentage: t.exposeInt('customFeePercentage'),

    // Get supporters with their tiers for funding programs
    supporters: t.field({
      type: [SupporterType],
      nullable: true,
      resolve: async (program, _args, ctx) => {
        const result = await getSupportersWithTiersResolver({}, { programId: program.id }, ctx);
        return result || [];
      },
    }),
    // Get current user's tier assignment for funding programs
    userTierAssignment: t.field({
      type: UserTierAssignmentType,
      nullable: true,
      resolve: (program, _args, ctx) =>
        getUserTierAssignmentResolver({}, { programId: program.id }, ctx),
    }),
    contractAddress: t.exposeString('contractAddress'),
  }),
});

export const PaginatedProgramsType = builder
  .objectRef<{ data: DBProgram[]; count: number }>('PaginatedPrograms')
  .implement({
    fields: (t) => ({
      data: t.field({
        type: [ProgramType],
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
export const CreateProgramInput = builder.inputType('CreateProgramInput', {
  fields: (t) => ({
    name: t.string({ required: true }),
    summary: t.string(),
    description: t.string(),
    price: t.string({
      required: true,
      validate: {
        refine(value) {
          return new BigNumber(value).isPositive();
        },
      },
    }),
    currency: t.string(),
    deadline: t.field({ type: 'DateTime', required: true }),
    keywords: t.stringList({ required: true }),
    links: t.field({ type: [LinkInput] }),
    network: t.string({ required: true }),
    visibility: t.field({ type: ProgramVisibilityEnum }),
    status: t.field({ type: ProgramStatusEnum, defaultValue: 'pending' }),
    image: t.field({ type: 'Upload', required: true }),

    // Investment/Funding fields
    type: t.field({ type: ProgramTypeEnum, defaultValue: 'regular' }),
    applicationStartDate: t.field({ type: 'DateTime' }),
    applicationEndDate: t.field({ type: 'DateTime' }),
    fundingStartDate: t.field({ type: 'DateTime' }),
    fundingEndDate: t.field({ type: 'DateTime' }),
    fundingCondition: t.field({ type: FundingConditionEnum }),
    tierSettings: t.field({ type: 'JSON' }),
    feePercentage: t.int(),
    customFeePercentage: t.int(),
    contractAddress: t.string(),
  }),
});

export const UpdateProgramInput = builder.inputType('UpdateProgramInput', {
  fields: (t) => ({
    id: t.id({ required: true }),
    name: t.string(),
    summary: t.string(),
    description: t.string(),
    price: t.string({
      validate: {
        refine(value) {
          return new BigNumber(value).isPositive();
        },
      },
    }),
    currency: t.string(),
    deadline: t.field({ type: 'DateTime' }),
    keywords: t.stringList(),
    links: t.field({ type: [LinkInput] }),
    status: t.field({ type: ProgramStatusEnum }),
    visibility: t.field({ type: ProgramVisibilityEnum }),
    network: t.string(),
    image: t.field({ type: 'Upload' }),

    // Investment/Funding fields
    type: t.field({ type: ProgramTypeEnum }),
    applicationStartDate: t.field({ type: 'DateTime' }),
    applicationEndDate: t.field({ type: 'DateTime' }),
    fundingStartDate: t.field({ type: 'DateTime' }),
    fundingEndDate: t.field({ type: 'DateTime' }),
    fundingCondition: t.field({ type: FundingConditionEnum }),
    tierSettings: t.field({ type: 'JSON' }),
    feePercentage: t.int(),
    customFeePercentage: t.int(),
  }),
});

// Input for assigning users to investment tiers
export const AssignUserTierInput = builder.inputType('AssignUserTierInput', {
  fields: (t) => ({
    programId: t.id({ required: true }),
    userId: t.id({ required: true }),
    tier: t.field({ type: InvestmentTierEnum, required: true }),
    maxInvestmentAmount: t.string({
      required: true,
      validate: {
        refine(value) {
          return new BigNumber(value).isPositive();
        },
      },
    }),
  }),
});

// Input for bulk tier assignments
export const BulkAssignTiersInput = builder.inputType('BulkAssignTiersInput', {
  fields: (t) => ({
    programId: t.id({ required: true }),
    assignments: t.field({
      type: [AssignUserTierInput],
      required: true,
    }),
  }),
});

/* -------------------------------------------------------------------------- */
/*                            Queries and mutations                           */
/* -------------------------------------------------------------------------- */
builder.queryFields((t) => ({
  programs: t.field({
    type: PaginatedProgramsType,
    args: {
      pagination: t.arg({ type: PaginationInput, required: false }),
    },
    resolve: getProgramsResolver,
  }),
  program: t.field({
    type: ProgramType,
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: getProgramResolver,
  }),
  keywords: t.field({
    type: [KeywordType],
    authScopes: { user: true },
    resolve: getProgramKeywordsResolver,
  }),
}));

builder.mutationFields((t) => ({
  createProgram: t.field({
    type: ProgramType,
    authScopes: { user: true },
    args: {
      input: t.arg({ type: CreateProgramInput, required: true }),
    },
    resolve: createProgramResolver,
  }),
  updateProgram: t.field({
    type: ProgramType,
    authScopes: (_, args) => ({
      programSponsor: { programId: args.input.id },
      admin: true,
    }),
    args: {
      input: t.arg({ type: UpdateProgramInput, required: true }),
    },
    resolve: updateProgramResolver,
  }),
  deleteProgram: t.field({
    type: 'Boolean',
    authScopes: (_, args) => ({
      programSponsor: { programId: args.id },
      admin: true,
    }),
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: deleteProgramResolver,
  }),
  acceptProgram: t.field({
    type: ProgramType,
    authScopes: { user: true },
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: acceptProgramResolver,
  }),
  rejectProgram: t.field({
    type: ProgramType,
    authScopes: { user: true },
    args: {
      id: t.arg.id({ required: true }),
      rejectionReason: t.arg.string({ required: false }),
    },
    resolve: rejectProgramResolver,
  }),
  submitProgram: t.field({
    type: ProgramType,
    authScopes: (_, args) => ({
      programSponsor: { programId: args.id },
      admin: true,
    }),
    args: {
      id: t.arg.id({ required: true }),
      educhainProgramId: t.arg.int({ required: true }),
      txHash: t.arg.string({ required: true }),
    },
    resolve: publishProgramResolver,
  }),
  inviteUserToProgram: t.field({
    type: ProgramType,
    authScopes: (_, args) => ({
      programSponsor: { programId: args.programId },
      admin: true,
    }),
    args: {
      programId: t.arg.id({ required: true }),
      userId: t.arg.id({ required: true }),
      // Optional tier assignment for funding programs
      tier: t.arg({ type: InvestmentTierEnum, required: false }),
      maxInvestmentAmount: t.arg.string({ required: false }),
    },
    resolve: inviteUserToProgramResolver,
  }),
  removeUserFromProgram: t.field({
    type: ProgramType,
    authScopes: (_, args) => ({
      programSponsor: { programId: args.programId },
      admin: true,
    }),
    args: {
      programId: t.arg.id({ required: true }),
      userId: t.arg.id({ required: true }),
    },
    resolve: removeUserFromProgramResolver,
  }),
  assignValidatorToProgram: t.field({
    type: ProgramType,
    authScopes: (_, args) => ({
      programSponsor: { programId: args.programId },
      admin: true,
    }),
    args: {
      programId: t.arg.id({ required: true }),
      validatorId: t.arg.id({ required: true }),
    },
    resolve: assignValidatorToProgramResolver,
  }),
  removeValidatorFromProgram: t.field({
    type: ProgramType,
    authScopes: (_, args) => ({
      programSponsor: { programId: args.programId },
      admin: true,
    }),
    args: {
      programId: t.arg.id({ required: true }),
      validatorId: t.arg.id({ required: true }),
    },
    resolve: removeValidatorFromProgramResolver,
  }),
  addProgramKeyword: t.field({
    type: KeywordType,
    authScopes: (_, args) => ({
      programSponsor: { programId: args.programId },
      admin: true,
    }),
    args: {
      programId: t.arg.id({ required: true }),
      keyword: t.arg.string({ required: true }),
    },
    resolve: addProgramKeywordResolver,
  }),
  removeProgramKeyword: t.field({
    type: 'Boolean',
    authScopes: (_, args) => ({
      programSponsor: { programId: args.programId },
      admin: true,
    }),
    args: {
      programId: t.arg.id({ required: true }),
      keyword: t.arg.string({ required: true }),
    },
    resolve: removeProgramKeywordResolver,
  }),

  // Tier assignment mutations
  assignUserTier: t.field({
    type: UserTierAssignmentType,
    authScopes: (_, args) => ({
      programSponsor: { programId: args.input.programId },
      admin: true,
    }),
    args: {
      input: t.arg({ type: AssignUserTierInput, required: true }),
    },
    resolve: assignUserTierResolver,
  }),

  updateUserTier: t.field({
    type: UserTierAssignmentType,
    authScopes: (_, args) => ({
      programSponsor: { programId: args.input.programId },
      admin: true,
    }),
    args: {
      input: t.arg({ type: AssignUserTierInput, required: true }),
    },
    resolve: updateUserTierResolver,
  }),

  removeUserTier: t.field({
    type: 'Boolean',
    authScopes: (_, args) => ({
      programSponsor: { programId: args.programId },
      admin: true,
    }),
    args: {
      programId: t.arg.id({ required: true }),
      userId: t.arg.id({ required: true }),
    },
    resolve: removeUserTierResolver,
  }),
  // Reclaim mutations for recruitment programs
  reclaimProgram: t.field({
    type: ProgramType,
    authScopes: { user: true },
    args: {
      programId: t.arg.id({ required: true }),
      txHash: t.arg.string({ required: false }),
    },
    resolve: reclaimProgramResolver,
  }),
}));
