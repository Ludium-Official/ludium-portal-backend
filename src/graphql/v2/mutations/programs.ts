import builder from '@/graphql/builder';
import { CreateProgramV2Input, UpdateProgramV2Input } from '../inputs/programs';
import {
  createProgramV2Resolver,
  deleteProgramV2Resolver,
  updateProgramV2Resolver,
} from '../resolvers/programs';
import { ProgramV2Type } from '../types/programs';

builder.mutationFields((t) => ({
  createProgramV2: t.field({
    type: ProgramV2Type,
    args: {
      input: t.arg({ type: CreateProgramV2Input, required: true }),
    },
    resolve: createProgramV2Resolver,
  }),
  updateProgramV2: t.field({
    type: ProgramV2Type,
    args: {
      id: t.arg.id({ required: true }),
      input: t.arg({ type: UpdateProgramV2Input, required: true }),
    },
    resolve: updateProgramV2Resolver,
  }),
  deleteProgramV2: t.field({
    type: ProgramV2Type,
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: deleteProgramV2Resolver,
  }),
}));
