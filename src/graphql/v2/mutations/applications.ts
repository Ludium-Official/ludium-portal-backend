import builder from '@/graphql/builder';
import {
  createApplicationV2Resolver,
  deleteApplicationV2Resolver,
  pickApplicationV2Resolver,
  reviewApplicationV2Resolver,
  updateApplicationV2Resolver,
} from '@/graphql/v2/resolvers/applications';
import {
  CreateApplicationV2Input,
  PickApplicationV2Input,
  ReviewApplicationV2Input,
  UpdateApplicationV2Input,
} from '../inputs/applications';
import { ApplicationV2Type } from '../types/applications';

builder.mutationFields((t) => ({
  createApplicationV2: t.field({
    type: ApplicationV2Type,
    authScopes: { userV2: true },
    args: {
      input: t.arg({
        type: CreateApplicationV2Input,
        required: true,
        description: 'Application creation data',
      }),
    },
    resolve: createApplicationV2Resolver,
    description: 'Create a new application',
  }),
}));

builder.mutationFields((t) => ({
  updateApplicationV2: t.field({
    type: ApplicationV2Type,
    authScopes: { userV2: true },
    args: {
      id: t.arg.id({
        required: true,
        description: 'Application ID',
      }),
      input: t.arg({
        type: UpdateApplicationV2Input,
        required: true,
        description: 'Application update data (only by applicant)',
      }),
    },
    resolve: updateApplicationV2Resolver,
    description: 'Update application content (only by applicant)',
  }),
  reviewApplicationV2: t.field({
    type: ApplicationV2Type,
    authScopes: { userV2: true },
    args: {
      id: t.arg.id({
        required: true,
        description: 'Application ID',
      }),
      input: t.arg({
        type: ReviewApplicationV2Input,
        required: true,
        description: 'Review decision data (only by program creator)',
      }),
    },
    resolve: reviewApplicationV2Resolver,
    description: 'Review and accept/reject application (only by program creator)',
  }),
  pickApplicationV2: t.field({
    type: ApplicationV2Type,
    authScopes: { userV2: true },
    args: {
      id: t.arg.id({
        required: true,
        description: 'Application ID',
      }),
      input: t.arg({
        type: PickApplicationV2Input,
        required: true,
        description: 'Pick/unpick data (bookmark, only by program creator)',
      }),
    },
    resolve: pickApplicationV2Resolver,
    description: 'Pick or unpick application (bookmark favorite, only by program creator)',
  }),
}));

builder.mutationFields((t) => ({
  deleteApplicationV2: t.field({
    type: ApplicationV2Type,
    authScopes: { userV2: true },
    args: {
      id: t.arg.id({
        required: true,
        description: 'Application ID',
      }),
    },
    resolve: deleteApplicationV2Resolver,
    description: 'Delete an application by ID (only by the applicant)',
  }),
}));
