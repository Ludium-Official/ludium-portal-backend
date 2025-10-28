import builder from '@/graphql/builder';
import { CreateProgramV2Input, UpdateProgramV2Input } from '../inputs/programs';
import {
  createProgramV2Resolver,
  deleteProgramV2Resolver,
  updateProgramV2Resolver,
} from '../resolvers/programs';
import { ProgramV2Ref } from '../types/programs';

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

builder.mutationField('updateProgramV2', (t) =>
  t.field({
    type: ProgramV2Ref,
    authScopes: (_parent, args) => ({
      isProgramCreatorV2: { programId: args.id },
    }),
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
