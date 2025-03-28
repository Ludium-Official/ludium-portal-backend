import {
  type Milestone,
  type MilestoneUpdate,
  linksTable,
  milestonesTable,
  milestonesToLinksTable,
} from '@/db/schemas';
import type { PaginationInput } from '@/graphql/types/common';
import type {
  CheckMilestoneInput,
  CreateMilestoneInput,
  UpdateMilestoneInput,
} from '@/graphql/types/milestones';
import type { Context, Root } from '@/types';
import { filterEmptyValues, isInSameScope, validAndNotEmptyArray } from '@/utils';
import { count, eq } from 'drizzle-orm';

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
  const milestones: Milestone[] = [];
  return ctx.db.transaction(async (t) => {
    for (const milestone of args.input) {
      const { links, ...inputData } = milestone;
      const [newMilestone] = await t.insert(milestonesTable).values(inputData).returning();
      // handle links
      if (links) {
        const filteredLinks = links.filter((link) => link.url);
        const newLinks = await t
          .insert(linksTable)
          .values(
            filteredLinks.map((link) => ({
              url: link.url as string,
              title: link.title as string,
            })),
          )
          .returning();
        await t.insert(milestonesToLinksTable).values(
          newLinks.map((link) => ({
            milestoneId: newMilestone.id,
            linkId: link.id,
          })),
        );
      }
      milestones.push(newMilestone);
    }

    return milestones;
  });
}

export async function updateMilestoneResolver(
  _root: Root,
  args: { input: typeof UpdateMilestoneInput.$inferInput },
  ctx: Context,
) {
  const filteredData = filterEmptyValues<MilestoneUpdate>(args.input);

  return ctx.db.transaction(async (t) => {
    // handle links
    if (args.input.links) {
      const filteredLinks = args.input.links.filter((link) => link.url);
      const newLinks = await t
        .insert(linksTable)
        .values(
          filteredLinks.map((link) => ({
            url: link.url as string,
            title: link.title as string,
          })),
        )
        .returning();
      await t.insert(milestonesToLinksTable).values(
        newLinks.map((link) => ({
          milestoneId: args.input.id,
          linkId: link.id,
        })),
      );
    }

    const [milestone] = await t
      .update(milestonesTable)
      .set(filteredData)
      .where(eq(milestonesTable.id, args.input.id))
      .returning();

    return milestone;
  });
}

export async function submitMilestoneResolver(_root: Root, args: { id: string }, ctx: Context) {
  const user = ctx.server.auth.getUser(ctx.request);
  if (!user) {
    throw new Error('User not found');
  }

  return ctx.db.transaction(async (t) => {
    const hasAccess = await isInSameScope({
      scope: 'milestone_builder',
      userId: user.id,
      entityId: args.id,
      db: t,
    });
    if (!hasAccess) {
      throw new Error('You are not allowed to submit this milestone');
    }

    const [milestone] = await t
      .update(milestonesTable)
      .set({ status: 'revision_requested' })
      .where(eq(milestonesTable.id, args.id))
      .returning();

    return milestone;
  });
}

export async function checkMilestoneResolver(
  _root: Root,
  args: { input: typeof CheckMilestoneInput.$inferInput },
  ctx: Context,
) {
  const user = ctx.server.auth.getUser(ctx.request);
  if (!user) {
    throw new Error('User not found');
  }

  return ctx.db.transaction(async (t) => {
    const hasAccess = await isInSameScope({
      scope: 'milestone_validator',
      userId: user.id,
      entityId: args.input.id,
      db: t,
    });
    if (!hasAccess) {
      throw new Error('You are not allowed to check this milestone');
    }

    const [milestone] = await t
      .update(milestonesTable)
      .set({ status: args.input.status })
      .where(eq(milestonesTable.id, args.input.id))
      .returning();

    return milestone;
  });
}
