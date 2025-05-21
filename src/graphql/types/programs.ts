import { type Program as DBProgram, programStatuses } from '@/db/schemas';
import builder from '@/graphql/builder';
import { getApplicationsByProgramIdResolver } from '@/graphql/resolvers/applications';
import { getLinksByProgramIdResolver } from '@/graphql/resolvers/links';
import {
  acceptProgramResolver,
  createProgramResolver,
  deleteProgramResolver,
  getProgramKeywordsByProgramIdResolver,
  getProgramKeywordsResolver,
  getProgramResolver,
  getProgramsResolver,
  publishProgramResolver,
  rejectProgramResolver,
  updateProgramResolver,
} from '@/graphql/resolvers/programs';
import { getUserResolver } from '@/graphql/resolvers/users';
import { ApplicationType } from '@/graphql/types/applications';
import { KeywordType, PaginationInput } from '@/graphql/types/common';
import { Link, LinkInput } from '@/graphql/types/links';
import { User } from '@/graphql/types/users';
import BigNumber from 'bignumber.js';

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */
export const ProgramStatusEnum = builder.enumType('ProgramStatus', {
  values: programStatuses,
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
    creator: t.field({
      type: User,
      resolve: async (program, _args, ctx) => getUserResolver({}, { id: program.creatorId }, ctx),
    }),
    validator: t.field({
      type: User,
      nullable: true,
      resolve: async (program, _args, ctx) =>
        getUserResolver({}, { id: program.validatorId ?? '' }, ctx),
    }),
    applications: t.field({
      type: [ApplicationType],
      resolve: async (program, _args, ctx) =>
        getApplicationsByProgramIdResolver({}, { programId: program.id }, ctx),
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
    deadline: t.string({ required: true }),
    keywords: t.idList(),
    links: t.field({ type: [LinkInput] }),
    validatorId: t.id({ required: true }),
    network: t.string(),
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
    validatorId: t.id(),
    network: t.string(),
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
    },
    resolve: rejectProgramResolver,
  }),
  publishProgram: t.field({
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
}));
