import builder from '@/graphql/builder';
import {
  CreateProgramV2Input,
  CreateProgramWithOnchainV2Input,
  UpdateProgramV2Input,
} from '../inputs/programs';
import {
  createProgramV2Resolver,
  deleteProgramV2Resolver,
  updateProgramV2Resolver,
} from '../resolvers/programs';
import { createProgramWithOnchainV2Resolver } from '../resolvers/programs';
import { CreateProgramWithOnchainV2Payload, ProgramV2Ref } from '../types/programs';

builder.mutationField('createProgramV2', (t) =>
  t.field({
    type: ProgramV2Ref,
    authScopes: {
      userV2: true,
    },
    args: {
      input: t.arg({ type: CreateProgramV2Input, required: true }),
    },
    resolve: createProgramV2Resolver,
  }),
);

builder.mutationField('createProgramWithOnchainV2', (t) =>
  t.field({
    type: CreateProgramWithOnchainV2Payload,
    authScopes: { userV2: true },
    args: { input: t.arg({ type: CreateProgramWithOnchainV2Input, required: true }) },
    resolve: createProgramWithOnchainV2Resolver,
  }),
);

builder.mutationField('updateProgramV2', (t) =>
  t.field({
    type: ProgramV2Ref,
    // Auth scopes are handled dynamically in the resolver
    // For draft → under_review: creator only
    // For under_review → open/declined: admin only
    // For other updates: creator only (default)
    authScopes: {
      userV2: true,
    },
    args: {
      id: t.arg.id({ required: true }),
      input: t.arg({ type: UpdateProgramV2Input, required: true }),
    },
    resolve: updateProgramV2Resolver,
  }),
);

builder.mutationField('deleteProgramV2', (t) =>
  t.field({
    type: 'ID',
    authScopes: (_parent, args) => ({
      isProgramCreatorV2: { programId: args.id },
    }),
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: deleteProgramV2Resolver,
  }),
);
