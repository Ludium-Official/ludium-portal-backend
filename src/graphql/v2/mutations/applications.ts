import builder from '@/graphql/builder';
import {
  createApplicationV2Resolver,
  deleteApplicationV2Resolver,
  updateApplicationV2Resolver,
} from '@/graphql/v2/resolvers/applications';
import { CreateApplicationV2Input, UpdateApplicationV2Input } from '../inputs/applications';
import { ApplicationV2Type } from '../types/applications';

builder.mutationFields((t) => ({
  createApplicationV2: t.field({
    type: ApplicationV2Type,
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
    args: {
      id: t.arg.id({
        required: true,
        description: 'Application ID',
      }),
      input: t.arg({
        type: UpdateApplicationV2Input,
        required: true,
        description: 'Application update data',
      }),
    },
    resolve: updateApplicationV2Resolver,
    description: 'Update an existing application',
  }),
}));

builder.mutationFields((t) => ({
  deleteApplicationV2: t.field({
    type: ApplicationV2Type,
    args: {
      id: t.arg.id({
        required: true,
        description: 'Application ID',
      }),
    },
    resolve: deleteApplicationV2Resolver,
    description: 'Delete an application by ID',
  }),
}));
