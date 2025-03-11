import { applicationsTable } from '@/db/schemas';
import type { CreateApplicationInput, UpdateApplicationInput } from '@/graphql/types/applications';
import type { Args, Context, Root } from '@/types';
import { eq } from 'drizzle-orm';

export async function getApplicationsResolver(_root: Root, _args: Args, ctx: Context) {
  return ctx.db.select().from(applicationsTable);
}

export async function getApplicationResolver(_root: Root, args: { id: string }, ctx: Context) {
  return ctx.db.select().from(applicationsTable).where(eq(applicationsTable.id, args.id));
}

export async function createApplicationResolver(
  _root: Root,
  args: { input: typeof CreateApplicationInput.$inferInput },
  ctx: Context,
) {
  const [application] = await ctx.db
    .insert(applicationsTable)
    .values({
      ...args.input,
      applicantId: ctx.user.id,
      status: 'pending',
    })
    .returning();

  return application;
}

export async function updateApplicationResolver(
  _root: Root,
  args: { input: typeof UpdateApplicationInput.$inferInput },
  ctx: Context,
) {
  const { id, ...updateData } = args.input;

  // Remove null values and ensure status is a valid enum value
  const filteredData = Object.fromEntries(
    Object.entries(updateData).filter(([_, v]) => v !== null),
  );

  const [application] = await ctx.db
    .update(applicationsTable)
    .set(filteredData)
    .where(eq(applicationsTable.id, id))
    .returning();

  return application;
}
