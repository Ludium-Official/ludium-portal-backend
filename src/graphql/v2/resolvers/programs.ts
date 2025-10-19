import { programsV2Table } from '@/db/schemas';
import type { PaginationInput } from '@/graphql/types/common';
import type { CreateProgramV2Input, UpdateProgramV2Input } from '@/graphql/v2/inputs/programs';
import type { Context, Root } from '@/types';
import { count, desc, eq } from 'drizzle-orm';

export async function getProgramsV2Resolver(
  _root: Root,
  args: { pagination?: typeof PaginationInput.$inferInput | null },
  ctx: Context,
) {
  const limit = args.pagination?.limit || 10;
  const offset = args.pagination?.offset || 0;

  const data = await ctx.db
    .select()
    .from(programsV2Table)
    .limit(limit)
    .offset(offset)
    .orderBy(desc(programsV2Table.createdAt));

  const [totalCount] = await ctx.db.select({ count: count() }).from(programsV2Table);

  return {
    data,
    count: totalCount.count,
  };
}

export async function getProgramV2Resolver(_root: Root, args: { id: string }, ctx: Context) {
  const [program] = await ctx.db
    .select()
    .from(programsV2Table)
    .where(eq(programsV2Table.id, Number.parseInt(args.id, 10)));

  if (!program) {
    throw new Error('Program not found');
  }

  return program;
}

export async function createProgramV2Resolver(
  _root: Root,
  args: { input: typeof CreateProgramV2Input.$inferInput },
  ctx: Context,
) {
  const values = {
    ...args.input,
    deadline: new Date(args.input.deadline),
  };
  const [newProgram] = await ctx.db.insert(programsV2Table).values(values).returning();
  return newProgram;
}

export async function updateProgramV2Resolver(
  _root: Root,
  args: { id: string; input: typeof UpdateProgramV2Input.$inferInput },
  ctx: Context,
) {
  const values = {
    ...args.input,
    ...(args.input.deadline && { deadline: new Date(args.input.deadline) }),
  };

  const [updatedProgram] = await ctx.db
    .update(programsV2Table)
    .set(values)
    .where(eq(programsV2Table.id, Number.parseInt(args.id, 10)))
    .returning();
  return updatedProgram;
}

export async function deleteProgramV2Resolver(_root: Root, args: { id: string }, ctx: Context) {
  const [deletedProgram] = await ctx.db
    .delete(programsV2Table)
    .where(eq(programsV2Table.id, Number.parseInt(args.id, 10)))
    .returning();
  return deletedProgram;
}
