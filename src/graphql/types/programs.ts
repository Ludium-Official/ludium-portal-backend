import type { Program as DBProgram, Keyword as DBProgramKeyword } from '@/db/schemas';
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
import { PaginationInput } from '@/graphql/types/common';
import { Link, LinkInput } from '@/graphql/types/links';
import { User } from '@/graphql/types/users';
import { formatPrice } from '@/utils';

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */
export const ProgramType = builder.objectRef<DBProgram>('Program').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    name: t.exposeString('name'),
    summary: t.exposeString('summary'),
    description: t.exposeString('description'),
    price: t.field({
      type: 'String',
      resolve: (program) => formatPrice(program.price),
    }),
    currency: t.exposeString('currency'),
    educhainProgramId: t.exposeInt('educhainProgramId'),
    deadline: t.field({
      type: 'Date',
      resolve: (program) => (program.deadline ? new Date(program.deadline) : null),
    }),
    keywords: t.field({
      type: [ProgramKeywordType],
      resolve: async (program, _args, ctx) =>
        getProgramKeywordsByProgramIdResolver({}, { programId: program.id }, ctx),
    }),
    links: t.field({
      type: [Link],
      resolve: async (program, _args, ctx) =>
        getLinksByProgramIdResolver({}, { programId: program.id }, ctx),
    }),
    status: t.exposeString('status'),
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

export const ProgramKeywordType = builder.objectRef<DBProgramKeyword>('ProgramKeyword').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    name: t.exposeString('name'),
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
    price: t.string(),
    currency: t.string(),
    deadline: t.string(),
    keywords: t.idList(),
    links: t.field({ type: [LinkInput] }),
    validatorId: t.id({ required: true }),
  }),
});

export const UpdateProgramInput = builder.inputType('UpdateProgramInput', {
  fields: (t) => ({
    id: t.id({ required: true }),
    name: t.string(),
    summary: t.string(),
    description: t.string(),
    price: t.string(),
    currency: t.string(),
    deadline: t.string(),
    keywords: t.idList(),
    links: t.field({ type: [LinkInput] }),
    status: t.string(),
    validatorId: t.id(),
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
    type: [ProgramKeywordType],
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
