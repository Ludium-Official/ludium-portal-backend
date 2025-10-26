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
  const programService = new ProgramV2Service(ctx.db);
  return programService.create(args.input);
}

export async function updateProgramV2Resolver(
  _root: Root,
  args: { id: string; input: typeof UpdateProgramV2Input.$inferInput },
  ctx: Context,
) {
  const programService = new ProgramV2Service(ctx.db);
  return programService.update(args.id, args.input);
}

export async function deleteProgramV2Resolver(_root: Root, args: { id: string }, ctx: Context) {
  const programService = new ProgramV2Service(ctx.db);
  return programService.delete(args.id);
}
