import type { Program as DBProgram, Keyword as DBProgramKeyword } from '@/db/schemas';
import builder from '@/graphql/builder';
import {
  createProgramResolver,
  deleteProgramResolver,
  getProgramKeywordsResolver,
  getProgramResolver,
  getProgramsResolver,
  updateProgramResolver,
} from '@/graphql/resolvers/programs';
import { getUserResolver } from '@/graphql/resolvers/users';
import { Link, LinkInput, User } from '@/graphql/types/users';
import type { Context } from '@/types';

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
      args: {
        id: t.arg.string({ required: true }),
      },
      resolve: getProgramKeywordsResolver,
    }),
    status: t.exposeString('status'),
    creator: t.field({
      type: User,
      resolve: async (program) => getUserResolver({}, { id: program.creatorId }, {} as Context),
    }),
    validator: t.field({
      type: User,
      nullable: true,
      resolve: async (program) =>
        getUserResolver({}, { id: program.validatorId ?? '' }, {} as Context),
    }),
    links: t.field({
      type: [Link],
      nullable: true,
      resolve: (program) => program.links || [],
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
    authScopes: { user: true },
    type: [ProgramType],
    resolve: getProgramsResolver,
  }),
  program: t.field({
    type: ProgramType,
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: getProgramResolver,
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
