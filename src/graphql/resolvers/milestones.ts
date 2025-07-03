import {
  type MilestoneUpdate,
  applicationsTable,
  filesTable,
  linksTable,
  milestonesTable,
  milestonesToLinksTable,
  programsTable,
} from '@/db/schemas';
import type { PaginationInput } from '@/graphql/types/common';
import type {
  CheckMilestoneInput,
  SubmitMilestoneInput,
  UpdateMilestoneInput,
} from '@/graphql/types/milestones';
import type { Context, Root } from '@/types';
import { filterEmptyValues, isInSameScope, requireUser, validAndNotEmptyArray } from '@/utils';
import BigNumber from 'bignumber.js';
import { and, asc, count, eq, inArray, lt } from 'drizzle-orm';

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

    if (args.input.price) {
      // const get program id from milestone
      const [milestone] = await t
        .select({ applicationId: milestonesTable.applicationId })
        .from(milestonesTable)
        .where(eq(milestonesTable.id, args.input.id));

      const [application] = await t
        .select({ programId: applicationsTable.programId })
        .from(applicationsTable)
        .where(eq(applicationsTable.id, milestone.applicationId));

      const [program] = await t
        .select({ id: programsTable.id, price: programsTable.price })
        .from(programsTable)
        .where(eq(programsTable.id, application.programId));

      const applications = await t
        .select({ price: applicationsTable.price })
        .from(applicationsTable)
        .where(
          and(
            eq(applicationsTable.programId, program.id),
            inArray(applicationsTable.status, ['accepted', 'completed', 'submitted']),
          ),
        );

      const milestones = await t
        .select({ price: milestonesTable.price })
        .from(milestonesTable)
        .where(
          and(
            eq(milestonesTable.applicationId, milestone.applicationId),
            inArray(milestonesTable.status, ['pending', 'completed', 'submitted']),
          ),
        );

      const milestonesTotalPrice = milestones.reduce((acc, m) => {
        return acc.plus(new BigNumber(m.price));
      }, new BigNumber(0));

      const applicationsTotalPrice = applications.reduce((acc, a) => {
        return acc.plus(new BigNumber(a.price));
      }, new BigNumber(0));

      if (applicationsTotalPrice.plus(milestonesTotalPrice).gt(new BigNumber(program.price))) {
        ctx.server.log.error(
          'The total price of the applications is greater than the program price',
        );
        t.rollback();
      }
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

    // TODO: Refactor this
    const [application] = await t
      .select({ programId: applicationsTable.programId })
      .from(applicationsTable)
      .where(eq(applicationsTable.id, milestone.applicationId));

    const [program] = await t
      .select({ validatorId: programsTable.validatorId })
      .from(programsTable)
      .where(eq(programsTable.id, application.programId));

    if (program.validatorId) {
      await ctx.server.pubsub.publish('notifications', t, {
        type: 'milestone',
        action: 'submitted',
        recipientId: program.validatorId,
        entityId: milestone.id,
      });
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
