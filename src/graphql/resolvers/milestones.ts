import {
  type MilestoneUpdate,
  applicationsTable,
  filesTable,
  linksTable,
  milestonesTable,
  milestonesToLinksTable,
} from '@/db/schemas';
import type { PaginationInput } from '@/graphql/types/common';
import type {
  CheckMilestoneInput,
  SubmitMilestoneInput,
  UpdateMilestoneInput,
} from '@/graphql/types/milestones';
import type { Context, Root } from '@/types';
import {
  calculateMilestoneAmount,
  filterEmptyValues,
  isInSameScope,
  requireUser,
  validAndNotEmptyArray,
  validateMilestonePercentages,
} from '@/utils';
import BigNumber from 'bignumber.js';
import { and, asc, count, eq, lt } from 'drizzle-orm';
import { getValidatorsByProgramIdResolver } from './users';

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

export function getMilestonesByApplicationIdResolver(
  _root: Root,
  args: { applicationId: string },
  ctx: Context,
) {
  return ctx.db
    .select()
    .from(milestonesTable)
    .where(eq(milestonesTable.applicationId, args.applicationId))
    .orderBy(asc(milestonesTable.sortOrder));
}

export function updateMilestoneResolver(
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

    // Validate percentage if provided
    if (args.input.percentage) {
      const percentage = new BigNumber(args.input.percentage);

      // Validate percentage is between 0 and 100
      if (percentage.isLessThan(0) || percentage.isGreaterThan(100)) {
        ctx.server.log.error('Percentage must be between 0 and 100');
        t.rollback();
      }

      // Get milestone and application info
      const [milestone] = await t
        .select({ applicationId: milestonesTable.applicationId })
        .from(milestonesTable)
        .where(eq(milestonesTable.id, args.input.id));

      const [application] = await t
        .select({ programId: applicationsTable.programId, price: applicationsTable.price })
        .from(applicationsTable)
        .where(eq(applicationsTable.id, milestone.applicationId));

      // Get all milestones for this application
      const milestones = await t
        .select({ id: milestonesTable.id, percentage: milestonesTable.percentage })
        .from(milestonesTable)
        .where(eq(milestonesTable.applicationId, milestone.applicationId));

      // Calculate total percentage including the updated one
      const updatedMilestones = milestones
        .map((m) =>
          m.id === args.input.id ? { ...m, percentage: args.input.percentage || '0' } : m,
        )
        .filter((m): m is { id: string; percentage: string } => m.percentage != null);

      if (!validateMilestonePercentages(updatedMilestones)) {
        ctx.server.log.error('Total milestone percentages must equal 100%');
        t.rollback();
      }

      // Calculate the actual price amount and update it
      const calculatedAmount = calculateMilestoneAmount(args.input.percentage, application.price);
      filteredData.price = calculatedAmount;
    }

    const [milestone] = await t
      .update(milestonesTable)
      .set(filteredData)
      .where(eq(milestonesTable.id, args.input.id))
      .returning();

    return milestone;
  });
}

export function submitMilestoneResolver(
  _root: Root,
  args: { input: typeof SubmitMilestoneInput.$inferInput },
  ctx: Context,
) {
  const user = requireUser(ctx);

  return ctx.db.transaction(async (t) => {
    const hasAccess = await isInSameScope({
      scope: 'milestone_builder',
      userId: user.id,
      entityId: args.input.id,
      db: t,
    });
    if (!hasAccess) {
      throw new Error('You are not allowed to submit this milestone');
    }

    if (args.input.file) {
      const [avatar] = await t
        .select()
        .from(filesTable)
        .where(eq(filesTable.uploadedById, user.id));
      if (avatar) {
        await ctx.server.fileManager.deleteFile(avatar.id);
      }
      const fileUrl = await ctx.server.fileManager.uploadFile({
        file: args.input.file,
        userId: user.id,
      });
      await t
        .update(milestonesTable)
        .set({ file: fileUrl })
        .where(eq(milestonesTable.id, args.input.id));
    }

    // handle links
    await t
      .delete(milestonesToLinksTable)
      .where(eq(milestonesToLinksTable.milestoneId, args.input.id));
    if (args.input.links) {
      const filteredLinks = args.input.links.filter((link) => link.url);
      const newLinks = await t
        .insert(linksTable)
        .values(
          filteredLinks.map((link) => ({ url: link.url as string, title: link.title as string })),
        )
        .returning();
      await t
        .insert(milestonesToLinksTable)
        .values(newLinks.map((link) => ({ milestoneId: args.input.id, linkId: link.id })));
    }

    const [milestone] = await t
      .update(milestonesTable)
      .set({
        status: args.input.status,
        description: args.input.description,
        rejectionReason: null,
      })
      .where(eq(milestonesTable.id, args.input.id))
      .returning();

    // Get all application milestones and check if they are all completed
    const applicationMilestones = await t
      .select({ status: milestonesTable.status })
      .from(milestonesTable)
      .where(eq(milestonesTable.applicationId, milestone.applicationId));

    if (applicationMilestones.every((m) => m.status === 'completed')) {
      await t
        .update(applicationsTable)
        .set({
          status: 'completed',
        })
        .where(eq(applicationsTable.id, milestone.applicationId));
    }

    const [application] = await t
      .select({ programId: applicationsTable.programId })
      .from(applicationsTable)
      .where(eq(applicationsTable.id, milestone.applicationId));

    const validators = await getValidatorsByProgramIdResolver(
      {},
      { programId: application.programId },
      ctx,
    );

    if (validators.length > 0) {
      for (const validator of validators) {
        await ctx.server.pubsub.publish('notifications', t, {
          type: 'milestone',
          action: 'submitted',
          recipientId: validator.id,
          entityId: milestone.id,
        });
      }
      await ctx.server.pubsub.publish('notificationsCount');
    }

    return milestone;
  });
}

export function checkMilestoneResolver(
  _root: Root,
  args: { input: typeof CheckMilestoneInput.$inferInput },
  ctx: Context,
) {
  const user = requireUser(ctx);

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
      .set({
        status: args.input.status,
        ...(args.input.rejectionReason && { rejectionReason: args.input.rejectionReason }),
      })
      .where(eq(milestonesTable.id, args.input.id))
      .returning();

    const [application] = await t
      .select({ applicantId: applicationsTable.applicantId })
      .from(applicationsTable)
      .where(eq(applicationsTable.id, milestone.applicationId));

    const applicationMilestones = await t
      .select({ status: milestonesTable.status })
      .from(milestonesTable)
      .where(eq(milestonesTable.applicationId, milestone.applicationId));
    if (applicationMilestones.every((m) => m.status === 'completed')) {
      await t
        .update(applicationsTable)
        .set({ status: 'completed' })
        .where(eq(applicationsTable.id, milestone.applicationId));
    }

    const previousMilestones = await t
      .select({ status: milestonesTable.status })
      .from(milestonesTable)
      .where(
        and(
          eq(milestonesTable.applicationId, milestone.applicationId),
          lt(milestonesTable.sortOrder, milestone.sortOrder),
        ),
      );

    if (!previousMilestones.every((m) => m.status === 'completed')) {
      throw new Error('Previous milestones must be accepted');
    }

    await ctx.server.pubsub.publish('notifications', t, {
      type: 'milestone',
      action: args.input.status === 'pending' ? 'rejected' : 'accepted',
      recipientId: application.applicantId,
      entityId: milestone.id,
    });
    await ctx.server.pubsub.publish('notificationsCount');

    return milestone;
  });
}
