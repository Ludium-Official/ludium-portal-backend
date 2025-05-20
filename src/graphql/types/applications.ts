import type { Application as DBApplication } from '@/db/schemas';
import { applicationStatuses, applicationsTable } from '@/db/schemas';
import builder from '@/graphql/builder';
import {
  approveApplicationResolver,
  createApplicationResolver,
  denyApplicationResolver,
  getApplicationResolver,
  getApplicationsResolver,
  updateApplicationResolver,
} from '@/graphql/resolvers/applications';
import { getLinksByApplicationIdResolver } from '@/graphql/resolvers/links';
import { getMilestonesByApplicationIdResolver } from '@/graphql/resolvers/milestones';
import { getUserResolver } from '@/graphql/resolvers/users';
import { PaginationInput } from '@/graphql/types/common';
import { Link, LinkInput } from '@/graphql/types/links';
import { MilestoneType } from '@/graphql/types/milestones';
import { User } from '@/graphql/types/users';
import BigNumber from 'bignumber.js';
import { eq } from 'drizzle-orm';

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */
export const ApplicationStatusEnum = builder.enumType('ApplicationStatus', {
  values: applicationStatuses,
});

export const ApplicationType = builder.objectRef<DBApplication>('Application').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    status: t.field({
      type: ApplicationStatusEnum,
      resolve: (application) => application.status,
    }),
    name: t.exposeString('name', { nullable: true }),
    content: t.exposeString('content', { nullable: true }),
    price: t.exposeString('price'),
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
  }),
});

export const UpdateApplicationInput = builder.inputType('UpdateApplicationInput', {
  fields: (t) => ({
    id: t.string({ required: true }),
    name: t.string(),
    content: t.string(),
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
    authScopes: (_, args) => ({
      admin: true,
      programBuilder: { programId: args.input.id },
    }),
    args: {
      input: t.arg({ type: UpdateApplicationInput, required: true }),
    },
    resolve: updateApplicationResolver,
  }),
  approveApplication: t.field({
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
    resolve: approveApplicationResolver,
  }),
  denyApplication: t.field({
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
    resolve: denyApplicationResolver,
  }),
}));
