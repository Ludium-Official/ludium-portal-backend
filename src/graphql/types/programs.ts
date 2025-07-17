import {
  type Program as DBProgram,
  fundingConditions,
  investmentTiers,
  programStatuses,
  programTypes,
  programVisibilities,
  programsTable,
  userTierAssignmentsTable,
} from '@/db/schemas';
import builder from '@/graphql/builder';
import { getApplicationsByProgramIdResolver } from '@/graphql/resolvers/applications';
import { getCommentsByCommentableResolver } from '@/graphql/resolvers/comments';
import { getLinksByProgramIdResolver } from '@/graphql/resolvers/links';
import {
  acceptProgramResolver,
  assignValidatorToProgramResolver,
  createProgramResolver,
  deleteProgramResolver,
  getProgramKeywordsByProgramIdResolver,
  getProgramKeywordsResolver,
  getProgramResolver,
  getProgramsResolver,
  inviteUserToProgramResolver,
  publishProgramResolver,
  rejectProgramResolver,
  removeValidatorFromProgramResolver,
  updateProgramResolver,
} from '@/graphql/resolvers/programs';
import {
  getInvitedBuildersByProgramIdResolver,
  getUserResolver,
  getValidatorsByProgramIdResolver,
} from '@/graphql/resolvers/users';
import { ApplicationType } from '@/graphql/types/applications';
import { CommentType } from '@/graphql/types/comments';
import { KeywordType, PaginationInput } from '@/graphql/types/common';
import { Link, LinkInput } from '@/graphql/types/links';
import { User } from '@/graphql/types/users';
import BigNumber from 'bignumber.js';
import { and, eq } from 'drizzle-orm';

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */
export const ProgramStatusEnum = builder.enumType('ProgramStatus', {
  values: programStatuses,
});

export const ProgramVisibilityEnum = builder.enumType('ProgramVisibility', {
  values: programVisibilities,
});

export const ProgramTypeEnum = builder.enumType('ProgramType', {
  values: programTypes,
});

export const FundingConditionEnum = builder.enumType('FundingCondition', {
  values: fundingConditions,
});

export const InvestmentTierEnum = builder.enumType('InvestmentTier', {
  values: investmentTiers,
});

// Define tier config object reference first
export const TierConfigType = builder.objectRef<{
  enabled: boolean;
  maxAmount: string;
}>('TierConfig');

TierConfigType.implement({
  fields: (t) => ({
    enabled: t.exposeBoolean('enabled'),
    maxAmount: t.exposeString('maxAmount'),
  }),
});

// Tier settings for funding programs
export const TierSettingsType = builder.objectRef<{
  bronze?: { enabled: boolean; maxAmount: string };
  silver?: { enabled: boolean; maxAmount: string };
  gold?: { enabled: boolean; maxAmount: string };
  platinum?: { enabled: boolean; maxAmount: string };
}>('TierSettings');

TierSettingsType.implement({
  fields: (t) => ({
    bronze: t.field({
      type: TierConfigType,
      nullable: true,
      resolve: (parent) => parent.bronze || null,
    }),
    silver: t.field({
      type: TierConfigType,
      nullable: true,
      resolve: (parent) => parent.silver || null,
    }),
    gold: t.field({
      type: TierConfigType,
      nullable: true,
      resolve: (parent) => parent.gold || null,
    }),
    platinum: t.field({
      type: TierConfigType,
      nullable: true,
      resolve: (parent) => parent.platinum || null,
    }),
  }),
});

export const ProgramType = builder.objectRef<DBProgram>('Program').implement({
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
      type: 'Date',
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

    // New funding/investment fields
    type: t.field({
      type: ProgramTypeEnum,
      resolve: (program) => program.type,
    }),
    applicationStartDate: t.field({
      type: 'Date',
      nullable: true,
      resolve: (program) => program.applicationStartDate,
    }),
    applicationEndDate: t.field({
      type: 'Date',
      nullable: true,
      resolve: (program) => program.applicationEndDate,
    }),
    fundingStartDate: t.field({
      type: 'Date',
      nullable: true,
      resolve: (program) => program.fundingStartDate,
    }),
    fundingEndDate: t.field({
      type: 'Date',
      nullable: true,
      resolve: (program) => program.fundingEndDate,
    }),
    fundingCondition: t.field({
      type: FundingConditionEnum,
      nullable: true,
      resolve: (program) => program.fundingCondition,
    }),
    maxFundingAmount: t.exposeString('maxFundingAmount'),
    feePercentage: t.exposeInt('feePercentage'),
    customFeePercentage: t.exposeInt('customFeePercentage'),
    tierSettings: t.field({
      type: TierSettingsType,
      nullable: true,
      resolve: (program) => program.tierSettings,
    }),
    contractAddress: t.exposeString('contractAddress'),
    terms: t.exposeString('terms'),

    // Tier assignments for funding programs
    tierAssignments: t.field({
      type: [UserTierAssignmentType],
      resolve: async (program, _args, ctx) => {
        if (program.type !== 'funding') return [];

        const assignments = await ctx.db
          .select()
          .from(userTierAssignmentsTable)
          .where(eq(userTierAssignmentsTable.programId, program.id));

        return assignments;
      },
    }),
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

// User tier assignment for funding programs
export const UserTierAssignmentType = builder.objectRef<{
  id: string;
  programId: string;
  userId: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  maxInvestmentAmount: string;
  createdAt: Date;
}>('UserTierAssignment');

UserTierAssignmentType.implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    programId: t.exposeString('programId'),
    userId: t.exposeString('userId'),
    tier: t.field({
      type: InvestmentTierEnum,
      resolve: (assignment) => assignment.tier,
    }),
    maxInvestmentAmount: t.exposeString('maxInvestmentAmount'),
    user: t.field({
      type: User,
      resolve: async (assignment, _args, ctx) =>
        getUserResolver({}, { id: assignment.userId }, ctx),
    }),
    program: t.field({
      type: ProgramType,
      resolve: async (assignment, _args, ctx) =>
        getProgramResolver({}, { id: assignment.programId }, ctx),
    }),
    createdAt: t.field({
      type: 'Date',
      resolve: (assignment) => assignment.createdAt,
    }),
  }),
});

export const AssignUserTierInput = builder.inputType('AssignUserTierInput', {
  fields: (t) => ({
    programId: t.id({ required: true }),
    userId: t.id({ required: true }),
    tier: t.field({ type: InvestmentTierEnum, required: true }),
    maxInvestmentAmount: t.string({ required: true }),
  }),
});

/* -------------------------------------------------------------------------- */
/*                                   Inputs                                   */
/* -------------------------------------------------------------------------- */

export const TierConfigInput = builder.inputType('TierConfigInput', {
  fields: (t) => ({
    enabled: t.boolean({ required: true }),
    maxAmount: t.string({ required: true }),
  }),
});

export const TierSettingsInput = builder.inputType('TierSettingsInput', {
  fields: (t) => ({
    bronze: t.field({ type: TierConfigInput, required: false }),
    silver: t.field({ type: TierConfigInput, required: false }),
    gold: t.field({ type: TierConfigInput, required: false }),
    platinum: t.field({ type: TierConfigInput, required: false }),
  }),
});

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
    deadline: t.string({ required: true }),
    keywords: t.idList(),
    links: t.field({ type: [LinkInput] }),
    network: t.string(),
    visibility: t.field({ type: ProgramVisibilityEnum }),
    image: t.field({ type: 'Upload' }),

    // New funding/investment fields
    type: t.field({ type: ProgramTypeEnum, required: false }),
    applicationStartDate: t.field({ type: 'Date', required: false }),
    applicationEndDate: t.field({ type: 'Date', required: false }),
    fundingStartDate: t.field({ type: 'Date', required: false }),
    fundingEndDate: t.field({ type: 'Date', required: false }),
    fundingCondition: t.field({ type: FundingConditionEnum, required: false }),
    maxFundingAmount: t.string({ required: false }),
    feePercentage: t.int({ required: false }),
    customFeePercentage: t.int({ required: false }),
    tierSettings: t.field({ type: TierSettingsInput, required: false }),
    contractAddress: t.string({ required: false }),
    terms: t.string({ required: false }),
    validatorIds: t.idList({ required: false }), // For funding programs
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
    deadline: t.string(),
    keywords: t.idList(),
    links: t.field({ type: [LinkInput] }),
    status: t.field({ type: ProgramStatusEnum }),
    visibility: t.field({ type: ProgramVisibilityEnum }),
    network: t.string(),
    image: t.field({ type: 'Upload' }),

    // New funding/investment fields
    type: t.field({ type: ProgramTypeEnum, required: false }),
    applicationStartDate: t.field({ type: 'Date', required: false }),
    applicationEndDate: t.field({ type: 'Date', required: false }),
    fundingStartDate: t.field({ type: 'Date', required: false }),
    fundingEndDate: t.field({ type: 'Date', required: false }),
    fundingCondition: t.field({ type: FundingConditionEnum, required: false }),
    maxFundingAmount: t.string({ required: false }),
    feePercentage: t.int({ required: false }),
    customFeePercentage: t.int({ required: false }),
    tierSettings: t.field({ type: TierSettingsInput, required: false }),
    contractAddress: t.string({ required: false }),
    terms: t.string({ required: false }),
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
    },
    resolve: inviteUserToProgramResolver,
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
  assignUserTier: t.field({
    type: UserTierAssignmentType,
    authScopes: (_, args) => ({
      programSponsor: { programId: args.input.programId },
      admin: true,
    }),
    args: {
      input: t.arg({ type: AssignUserTierInput, required: true }),
    },
    resolve: async (_root, args, ctx) => {
      const { programId, userId, tier, maxInvestmentAmount } = args.input;

      // Check if program exists and is a funding program
      const [program] = await ctx.db
        .select()
        .from(programsTable)
        .where(eq(programsTable.id, programId));

      if (!program) {
        throw new Error('Program not found');
      }

      if (program.type !== 'funding') {
        throw new Error('Tier assignments are only available for funding programs');
      }

      // Check if user already has a tier assignment for this program
      const [existingAssignment] = await ctx.db
        .select()
        .from(userTierAssignmentsTable)
        .where(
          and(
            eq(userTierAssignmentsTable.programId, programId),
            eq(userTierAssignmentsTable.userId, userId),
          ),
        );

      if (existingAssignment) {
        // Update existing assignment
        const [updatedAssignment] = await ctx.db
          .update(userTierAssignmentsTable)
          .set({ tier, maxInvestmentAmount })
          .where(eq(userTierAssignmentsTable.id, existingAssignment.id))
          .returning();

        return updatedAssignment;
      }

      // Create new assignment
      const [newAssignment] = await ctx.db
        .insert(userTierAssignmentsTable)
        .values({ programId, userId, tier, maxInvestmentAmount })
        .returning();

      return newAssignment;
    },
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
    resolve: async (_root, args, ctx) => {
      await ctx.db
        .delete(userTierAssignmentsTable)
        .where(
          and(
            eq(userTierAssignmentsTable.programId, args.programId),
            eq(userTierAssignmentsTable.userId, args.userId),
          ),
        );

      return true;
    },
  }),
}));
