import type { Application as DBApplication, Milestone as DBMilestone } from '@/db/schemas';
import builder from '@/graphql/builder';
import {
  createApplicationResolver,
  createMilestoneResolver,
  getApplicationResolver,
  getApplicationsResolver,
  getMilestoneResolver,
  getMilestonesResolver,
  updateApplicationResolver,
  updateMilestoneResolver,
} from '@/graphql/resolvers/applications';
import { getProgramResolver } from '@/graphql/resolvers/programs';
import { getUserResolver } from '@/graphql/resolvers/users';
import { ProgramType } from '@/graphql/types/programs';
import { User } from '@/graphql/types/users';
import type { Context } from '@/types';

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */
export const ApplicationStatusEnum = builder.enumType('ApplicationStatus', {
  values: ['pending', 'approved', 'rejected', 'completed', 'withdrawn'] as const,
});

export const ApplicationType = builder.objectRef<DBApplication>('Application').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    status: t.field({
      type: ApplicationStatusEnum,
      resolve: (application) => application.status,
    }),
    content: t.exposeString('content', { nullable: true }),
    metadata: t.field({
      type: 'JSON',
      nullable: true,
      resolve: (application) => application.metadata as JSON,
    }),
    program: t.field({
      type: ProgramType,
      resolve: async (application) =>
        getProgramResolver({}, { id: application.programId }, {} as Context),
    }),
    applicant: t.field({
      type: User,
      resolve: async (application) =>
        getUserResolver({}, { id: application.applicantId }, {} as Context),
    }),
    milestones: t.field({
      type: [MilestoneType],
      resolve: async (application) =>
        getMilestonesResolver({}, { applicationId: application.id }, {} as Context),
    }),
  }),
});

export const MilestoneType = builder.objectRef<DBMilestone>('Milestone').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    title: t.exposeString('title'),
    description: t.exposeString('description', { nullable: true }),
    price: t.exposeString('price'),
    currency: t.exposeString('currency'),
    completed: t.exposeBoolean('completed'),
  }),
});

/* -------------------------------------------------------------------------- */
/*                                   Inputs                                   */
/* -------------------------------------------------------------------------- */
export const CreateApplicationInput = builder.inputType('CreateApplicationInput', {
  fields: (t) => ({
    programId: t.string({ required: true }),
    content: t.string({ required: true }),
    metadata: t.field({ type: 'JSON' }),
  }),
});

export const UpdateApplicationInput = builder.inputType('UpdateApplicationInput', {
  fields: (t) => ({
    id: t.string({ required: true }),
    content: t.string(),
    metadata: t.field({ type: 'JSON' }),
    status: t.string(),
  }),
});

export const CreateMilestoneInput = builder.inputType('CreateMilestoneInput', {
  fields: (t) => ({
    applicationId: t.string({ required: true }),
    title: t.string({ required: true }),
    description: t.string(),
    price: t.string({ required: true }),
    currency: t.string({ required: true, defaultValue: 'ETH' }),
  }),
});

export const UpdateMilestoneInput = builder.inputType('UpdateMilestoneInput', {
  fields: (t) => ({
    id: t.string({ required: true }),
    title: t.string(),
    description: t.string(),
    price: t.string(),
    currency: t.string(),
    completed: t.boolean(),
  }),
});

/* -------------------------------------------------------------------------- */
/*                            Queries and mutations                           */
/* -------------------------------------------------------------------------- */
builder.queryFields((t) => ({
  applications: t.field({
    authScopes: { user: true },
    type: [ApplicationType],
    args: {
      programId: t.arg.id(),
    },
    resolve: getApplicationsResolver,
  }),
  application: t.field({
    authScopes: { user: true },
    type: [ApplicationType],
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: getApplicationResolver,
  }),
  milestone: t.field({
    authScopes: { user: true },
    type: MilestoneType,
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: getMilestoneResolver,
  }),
  milestones: t.field({
    authScopes: { user: true },
    type: [MilestoneType],
    args: {
      applicationId: t.arg.id({ required: true }),
    },
    resolve: getMilestonesResolver,
  }),
}));

builder.mutationFields((t) => ({
  createApplication: t.field({
    type: ApplicationType,
    args: {
      input: t.arg({ type: CreateApplicationInput, required: true }),
    },
    resolve: createApplicationResolver,
  }),
  updateApplication: t.field({
    type: ApplicationType,
    args: {
      id: t.arg.string({ required: true }),
      input: t.arg({ type: UpdateApplicationInput, required: true }),
    },
    resolve: updateApplicationResolver,
  }),
  createMilestone: t.field({
    type: MilestoneType,
    args: {
      input: t.arg({ type: CreateMilestoneInput, required: true }),
    },
    resolve: createMilestoneResolver,
  }),
  updateMilestone: t.field({
    type: MilestoneType,
    args: {
      input: t.arg({ type: UpdateMilestoneInput, required: true }),
    },
    resolve: updateMilestoneResolver,
  }),
}));
