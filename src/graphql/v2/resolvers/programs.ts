import type { PaginationInput } from '@/graphql/types/common';
import type { CreateProgramV2Input, UpdateProgramV2Input } from '@/graphql/v2/inputs/programs';
import type { Context, Root } from '@/types';
import { ProgramV2Service } from '../services';

export async function getProgramsV2Resolver(
  _root: Root,
  args: { pagination?: typeof PaginationInput.$inferInput | null },
  ctx: Context,
) {
  const programService = new ProgramV2Service(ctx.db);
  return programService.getMany({
    limit: args.pagination?.limit ?? undefined,
    offset: args.pagination?.offset ?? undefined,
  });
}

export async function getProgramV2Resolver(_root: Root, args: { id: string }, ctx: Context) {
  const programService = new ProgramV2Service(ctx.db);
  return programService.getById(args.id);
}

export async function createProgramV2Resolver(
  _root: Root,
  args: { input: typeof CreateProgramV2Input.$inferInput },
  ctx: Context,
) {
  if (!ctx.userV2) {
    throw new Error('User not authenticated');
  }
  const programService = new ProgramV2Service(ctx.db);
  return programService.create(args.input, ctx.userV2.id);
}

export async function updateProgramV2Resolver(
  _root: Root,
  args: { id: string; input: typeof UpdateProgramV2Input.$inferInput },
  ctx: Context,
) {
  const numericId = Number.parseInt(args.id, 10);
  if (Number.isNaN(numericId)) {
    throw new Error('Invalid program ID');
  }

  const programService = new ProgramV2Service(ctx.db);
  return programService.update(args.id, args.input);
}

export async function deleteProgramV2Resolver(_root: Root, args: { id: string }, ctx: Context) {
  const numericId = Number.parseInt(args.id, 10);
  if (Number.isNaN(numericId)) {
    throw new Error('Invalid program ID');
  }

  const programService = new ProgramV2Service(ctx.db);
  await programService.delete(args.id);
  return args.id;
}

export async function getProgramsByCreatorIdV2Resolver(
  _root: Root,
  args: {
    creatorId: string;
    pagination?: typeof PaginationInput.$inferInput | null;
  },
  ctx: Context,
) {
  const programService = new ProgramV2Service(ctx.db);
  const numericCreatorId = Number.parseInt(args.creatorId, 10);
  if (Number.isNaN(numericCreatorId)) {
    throw new Error('Invalid creator ID');
  }
  return programService.getByCreatorId(numericCreatorId, {
    limit: args.pagination?.limit ?? undefined,
    offset: args.pagination?.offset ?? undefined,
  });
}
