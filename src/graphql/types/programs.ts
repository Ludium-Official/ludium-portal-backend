import type { Program as DBProgram, Keyword as DBProgramKeyword } from '@/db/schemas';
import builder from '@/graphql/builder';
import {
  createProgramResolver,
  deleteProgramResolver,
  getProgramKeywordsByProgramIdResolver,
  getProgramKeywordsResolver,
  getProgramResolver,
  getProgramsResolver,
  updateProgramResolver,
} from '@/graphql/resolvers/programs';
import { getUserResolver } from '@/graphql/resolvers/users';
import { Link, LinkInput, User } from '@/graphql/types/users';
import { PaginationInput } from './common';

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
      resolve: (program) => program.price?.toString() ?? '',
    }),
    currency: t.exposeString('currency'),
    deadline: t.field({
      type: 'Date',
      resolve: (program) => (program.deadline ? new Date(program.deadline) : null),
    }),
    keywords: t.field({
      type: [ProgramKeywordType],
      resolve: async (program, _args, ctx) =>
        getProgramKeywordsByProgramIdResolver({}, { programId: program.id }, ctx),
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
    links: t.field({
      type: [Link],
      nullable: true,
      resolve: (program) => program.links || [],
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
    validatorId: t.id({ required: false }),
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
    authScopes: { sponsor: true },
    resolve: getProgramKeywordsResolver,
  }),
}));

builder.mutationFields((t) => ({
  createProgram: t.field({
    type: ProgramType,
    authScopes: { sponsor: true },
    args: {
      input: t.arg({ type: CreateProgramInput, required: true }),
    },
    resolve: createProgramResolver,
  }),
  updateProgram: t.field({
    type: ProgramType,
    authScopes: { sponsor: true },
    args: {
      input: t.arg({ type: UpdateProgramInput, required: true }),
    },
    resolve: updateProgramResolver,
  }),
  deleteProgram: t.field({
    type: 'Boolean',
    authScopes: { sponsor: true },
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: deleteProgramResolver,
  }),
}));
