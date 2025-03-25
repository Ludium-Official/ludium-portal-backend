import {
  type ApplicationUpdate,
  type MilestoneUpdate,
  applicationsTable,
  milestonesTable,
} from '@/db/schemas';
import type {
  CreateApplicationInput,
  CreateMilestoneInput,
  UpdateApplicationInput,
  UpdateMilestoneInput,
} from '@/graphql/types/applications';
import type { PaginationInput } from '@/graphql/types/common';
import type { Context, Root } from '@/types';
import { filterEmptyValues, validAndNotEmptyArray } from '@/utils/common';
import { count, eq } from 'drizzle-orm';

export async function getApplicationsResolver(
  _root: Root,
  args: { pagination?: typeof PaginationInput.$inferInput | null },
  ctx: Context,
) {
  const limit = args.pagination?.limit || 10;
  const offset = args.pagination?.offset || 0;

  const data = await ctx.db.select().from(applicationsTable).limit(limit).offset(offset);
  const totalCount = await ctx.db.select({ count: count() }).from(applicationsTable);

  if (!validAndNotEmptyArray(data) || !validAndNotEmptyArray(totalCount)) {
    throw new Error('No applications found');
  }

  return {
    data,
    count: totalCount[0].count,
  };
}

export async function getApplicationResolver(_root: Root, args: { id: string }, ctx: Context) {
  const [application] = await ctx.db
    .select()
    .from(applicationsTable)
    .where(eq(applicationsTable.id, args.id));
  return application;
}

export async function getApplicationsByProgramIdResolver(
  _root: Root,
  args: { programId: string },
  ctx: Context,
) {
  return ctx.db
    .select()
    .from(applicationsTable)
    .where(eq(applicationsTable.programId, args.programId));
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

  const data = await ctx.db
    .select()
    .from(milestonesTable)
    .where(eq(milestonesTable.applicationId, args.applicationId))
    .limit(limit)
    .offset(offset);

  const totalCount = await ctx.db
    .select({ count: count() })
    .from(milestonesTable)
    .where(eq(milestonesTable.applicationId, args.applicationId));

  if (!validAndNotEmptyArray(data) || !validAndNotEmptyArray(totalCount)) {
    throw new Error('No milestones found');
  }

  return {
    data,
    count: totalCount[0].count,
  };
}

export async function getMilestonesByApplicationIdResolver(
  _root: Root,
  args: { applicationId: string },
  ctx: Context,
) {
  return ctx.db
    .select()
    .from(milestonesTable)
    .where(eq(milestonesTable.applicationId, args.applicationId));
}

export async function createMilestonesResolver(
  _root: Root,
  args: { input: (typeof CreateMilestoneInput.$inferInput)[] },
  ctx: Context,
) {
  const milestones = await ctx.db.insert(milestonesTable).values(args.input).returning();
  return milestones;
}

export async function updateMilestoneResolver(
  _root: Root,
  args: { input: typeof UpdateMilestoneInput.$inferInput },
  ctx: Context,
) {
  const filteredData = filterEmptyValues<MilestoneUpdate>(args.input);

  const [milestone] = await ctx.db
    .update(milestonesTable)
    .set(filteredData)
    .where(eq(milestonesTable.id, args.input.id))
    .returning();

  return milestone;
}

export async function createApplicationResolver(
  _root: Root,
  args: { input: typeof CreateApplicationInput.$inferInput },
  ctx: Context,
) {
  const user = ctx.server.auth.getUser(ctx.request);
  if (!user) {
    throw new Error('User not found');
  }

  const [application] = await ctx.db
    .insert(applicationsTable)
    .values({
      ...args.input,
      applicantId: user.id,
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
  const filteredData = filterEmptyValues<ApplicationUpdate>(args.input);

  const [application] = await ctx.db
    .update(applicationsTable)
    .set(filteredData)
    .where(eq(applicationsTable.id, args.input.id))
    .returning();

  return application;
}
