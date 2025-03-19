import { applicationsTable, milestonesTable } from '@/db/schemas';
import type {
  CreateApplicationInput,
  CreateMilestoneInput,
  UpdateApplicationInput,
  UpdateMilestoneInput,
} from '@/graphql/types/applications';
import type { PaginationInput } from '@/graphql/types/common';
import type { Context, Root } from '@/types';
import { eq } from 'drizzle-orm';

export async function getApplicationsResolver(
  _root: Root,
  args: { pagination?: typeof PaginationInput.$inferInput | null },
  ctx: Context,
) {
  const limit = args.pagination?.limit || 10;
  const offset = args.pagination?.offset || 0;

  return ctx.db.select().from(applicationsTable).limit(limit).offset(offset);
}

export async function getApplicationResolver(_root: Root, args: { id: string }, ctx: Context) {
  return ctx.db.select().from(applicationsTable).where(eq(applicationsTable.id, args.id));
}

export async function getMilestoneResolver(_root: Root, args: { id: string }, ctx: Context) {
  const [milestone] = await ctx.db
    .select()
    .from(milestonesTable)
    .where(eq(milestonesTable.id, args.id));
  return milestone;
}

export async function getMilestonesResolver(
  _root: Root,
  args: { applicationId: string; pagination?: typeof PaginationInput.$inferInput | null },
  ctx: Context,
) {
  const limit = args.pagination?.limit || 10;
  const offset = args.pagination?.offset || 0;

  return ctx.db
    .select()
    .from(milestonesTable)
    .where(eq(milestonesTable.applicationId, args.applicationId))
    .limit(limit)
    .offset(offset);
}

export async function createMilestoneResolver(
  _root: Root,
  args: { input: typeof CreateMilestoneInput.$inferInput },
  ctx: Context,
) {
  const [milestone] = await ctx.db.insert(milestonesTable).values(args.input).returning();
  return milestone;
}

export async function updateMilestoneResolver(
  _root: Root,
  args: { input: typeof UpdateMilestoneInput.$inferInput },
  ctx: Context,
) {
  const { id, ...updateData } = args.input;

  // Filter out null values
  const filteredData = Object.fromEntries(
    Object.entries(updateData).filter(([_, v]) => v !== null),
  );

  const [milestone] = await ctx.db
    .update(milestonesTable)
    .set(filteredData)
    .where(eq(milestonesTable.id, id))
    .returning();

  return milestone;
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
