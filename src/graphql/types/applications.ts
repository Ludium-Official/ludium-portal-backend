import type { Application as DBApplication, Milestone as DBMilestone } from '@/db/schemas';
import builder from '@/graphql/builder';
import {
  createApplicationResolver,
  createMilestonesResolver,
  getApplicationResolver,
  getApplicationsResolver,
  getMilestoneResolver,
  getMilestonesByApplicationIdResolver,
  getMilestonesResolver,
  updateApplicationResolver,
  updateMilestoneResolver,
} from '@/graphql/resolvers/applications';
import { getUserResolver } from '@/graphql/resolvers/users';
import { User } from '@/graphql/types/users';
import { PaginationInput } from './common';

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

export const MilestoneStatusEnum = builder.enumType('MilestoneStatus', {
  values: ['pending', 'completed', 'failed', 'revision_requested'] as const,
});

export const MilestoneType = builder.objectRef<DBMilestone>('Milestone').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    title: t.exposeString('title'),
    description: t.exposeString('description', { nullable: true }),
    price: t.exposeString('price'),
    currency: t.exposeString('currency'),
    status: t.field({
      type: MilestoneStatusEnum,
      resolve: (milestone) => milestone.status,
    }),
  }),
});

export const PaginatedMilestonesType = builder
  .objectRef<{ data: DBMilestone[]; count: number }>('PaginatedMilestones')
  .implement({
    fields: (t) => ({
      data: t.field({ type: [MilestoneType], resolve: (parent) => parent.data }),
      count: t.field({ type: 'Int', resolve: (parent) => parent.count }),
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
    status: t.field({ type: ApplicationStatusEnum }),
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
    status: t.field({ type: MilestoneStatusEnum }),
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
  milestone: t.field({
    type: MilestoneType,
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: getMilestoneResolver,
  }),
  milestones: t.field({
    type: PaginatedMilestonesType,
    args: {
      applicationId: t.arg.id({ required: true }),
      pagination: t.arg({ type: PaginationInput, required: false }),
    },
    resolve: getMilestonesResolver,
  }),
}));

builder.mutationFields((t) => ({
  createApplication: t.field({
    type: ApplicationType,
    authScopes: { builder: true },
    args: {
      input: t.arg({ type: CreateApplicationInput, required: true }),
    },
    resolve: createApplicationResolver,
  }),
  updateApplication: t.field({
    type: ApplicationType,
    authScopes: { sponsor: true, validator: true, builder: true },
    args: {
      input: t.arg({ type: UpdateApplicationInput, required: true }),
    },
    resolve: updateApplicationResolver,
  }),
  createMilestones: t.field({
    type: [MilestoneType],
    authScopes: { builder: true },
    args: {
      input: t.arg({ type: [CreateMilestoneInput], required: true }),
    },
    resolve: createMilestonesResolver,
  }),
  updateMilestone: t.field({
    type: MilestoneType,
    authScopes: { validator: true, builder: true },
    args: {
      input: t.arg({ type: UpdateMilestoneInput, required: true }),
    },
    resolve: updateMilestoneResolver,
  }),
}));
