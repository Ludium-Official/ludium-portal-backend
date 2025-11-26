import builder from '@/graphql/builder';
import {
  CreateProgramV2Input,
  CreateProgramWithOnchainV2Input,
  UpdateProgramByRelayerV2Input,
  UpdateProgramV2Input,
} from '../inputs/programs';
import {
  createProgramV2Resolver,
  deleteProgramV2Resolver,
  updateProgramByRelayerV2Resolver,
  updateProgramV2Resolver,
  completeProgramV2Resolver,
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

builder.mutationField('updateProgramByRelayerV2', (t) =>
  t.field({
    type: ProgramV2Ref,
    authScopes: { relayer: true },
    args: {
      id: t.arg.id({
        required: true,
        description: 'Program ID',
      }),
      input: t.arg({
        type: UpdateProgramByRelayerV2Input,
        required: true,
        description: 'Program update data for relayer (status change from open to closed)',
      }),
    },
    resolve: updateProgramByRelayerV2Resolver,
    description: 'Update program status from open to closed by relayer service',
  }),
);

builder.mutationField('completeProgramV2', (t) =>
  t.field({
    type: ProgramV2Ref,
    authScopes: { relayer: true },
    description:
      'Complete a program by changing its status to closed. Requires all applications to be completed.',
    args: {
      id: t.arg.id({ required: true, description: 'Program ID' }),
    },
    resolve: completeProgramV2Resolver,
  }),
);
