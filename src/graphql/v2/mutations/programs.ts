import builder from '@/graphql/builder';
import { CreateProgramV2Input, UpdateProgramV2Input } from '../inputs/programs';
import {
  createProgramV2Resolver,
  deleteProgramV2Resolver,
  updateProgramV2Resolver,
} from '../resolvers/programs';
import { ProgramV2Ref } from '../types/programs';
import { ProgramV2Ref } from '../types/programs';

builder.mutationField('createProgramV2', (t) =>
  t.field({
    type: ProgramV2Ref,
    authScopes: {
      userV2: true,
    },
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
    resolve: async (_, { input }, ctx) => {
      if (!ctx.userV2) {
        throw new Error('User not authenticated');
      }

      const [newProgram] = await ctx.db
        .insert(programsV2Table)
        .values({
          ...input,
          deadline: input.deadline instanceof Date ? input.deadline : new Date(input.deadline),
          invitedMembers: input.invitedMembers ?? [],
          creatorId: ctx.userV2.id,
        })
        .returning();

      return newProgram;
    },
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
    resolve: async (_, { id, input }, ctx) => {
      const numericId = Number.parseInt(id, 10);
      if (Number.isNaN(numericId)) {
        throw new Error('Invalid program ID');
      }

      // Filter out null/undefined values and handle date conversion
      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (input.title !== undefined) updateData.title = input.title;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.skills !== undefined) updateData.skills = input.skills;
      if (input.deadline !== undefined && input.deadline !== null) {
        updateData.deadline =
          input.deadline instanceof Date ? input.deadline : new Date(input.deadline);
      }
      if (input.invitedMembers !== undefined) updateData.invitedMembers = input.invitedMembers;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.visibility !== undefined) updateData.visibility = input.visibility;
      if (input.network !== undefined) updateData.network = input.network;
      if (input.price !== undefined) updateData.price = input.price;
      if (input.currency !== undefined) updateData.currency = input.currency;

      const [updatedProgram] = await ctx.db
        .update(programsV2Table)
        .set(updateData)
        .where(eq(programsV2Table.id, numericId))
        .returning();

      return updatedProgram;
    },
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
)
