import {
  type ApplicationStatusEnum,
  type ApplicationUpdate,
  type Milestone,
  applicationsTable,
  applicationsToLinksTable,
  linksTable,
  milestonesTable,
  milestonesToLinksTable,
  programUserRolesTable,
  programsTable,
} from '@/db/schemas';
import type { CreateApplicationInput, UpdateApplicationInput } from '@/graphql/types/applications';
import type { PaginationInput } from '@/graphql/types/common';
import type { Context, Root } from '@/types';
import { filterEmptyValues, isInSameScope, requireUser, validAndNotEmptyArray } from '@/utils';
import BigNumber from 'bignumber.js';
import { and, asc, count, desc, eq, inArray } from 'drizzle-orm';

export async function getApplicationsResolver(
  _root: Root,
  args: { pagination?: typeof PaginationInput.$inferInput | null },
  ctx: Context,
) {
  const limit = args.pagination?.limit || 10;
  const offset = args.pagination?.offset || 0;
  const sort = args.pagination?.sort || 'desc';
  const filter = args.pagination?.filter || [];

  const filterPromises = filter
    .map((f) => {
      switch (f.field) {
        case 'programId':
          return eq(applicationsTable.programId, f.value);
        case 'applicantId':
          return eq(applicationsTable.applicantId, f.value);
        case 'status':
          return eq(applicationsTable.status, f.value as ApplicationStatusEnum);
        default:
          return undefined;
      }
    })
    .filter(Boolean);

  const data = await ctx.db
    .select()
    .from(applicationsTable)
    .limit(limit)
    .offset(offset)
    .orderBy(sort === 'asc' ? asc(applicationsTable.createdAt) : desc(applicationsTable.createdAt))
    .where(and(...filterPromises));

  const [totalCount] = await ctx.db
    .select({ count: count() })
    .from(applicationsTable)
    .where(
      and(
        ...filter
          .filter((f) => f.field in applicationsTable)
          .map((f) => {
            switch (f.field) {
              case 'programId':
                return eq(applicationsTable.programId, f.value);
              case 'applicantId':
                return eq(applicationsTable.applicantId, f.value);
              case 'status':
                return eq(applicationsTable.status, f.value as ApplicationStatusEnum);
              default:
                return undefined;
            }
          }),
      ),
    );

  if (!validAndNotEmptyArray(data)) {
    return {
      data: [],
      count: 0,
    };
  }

  return {
    data,
    count: totalCount.count,
  };
}

export async function getApplicationResolver(_root: Root, args: { id: string }, ctx: Context) {
  const [application] = await ctx.db
    .select()
    .from(applicationsTable)
    .where(eq(applicationsTable.id, args.id));
  return application;
}

export function getApplicationsByProgramIdResolver(
  _root: Root,
  args: { programId: string },
  ctx: Context,
) {
  return ctx.db
    .select()
    .from(applicationsTable)
    .where(eq(applicationsTable.programId, args.programId));
}

export function createApplicationResolver(
  _root: Root,
  args: { input: typeof CreateApplicationInput.$inferInput },
  ctx: Context,
) {
  const user = requireUser(ctx);
  const milestones: Milestone[] = [];

  return ctx.db.transaction(async (t) => {
    const [program] = await t
      .select({
        creatorId: programsTable.creatorId,
        validatorId: programsTable.validatorId,
        id: programsTable.id,
        price: programsTable.price,
      })
      .from(programsTable)
      .where(eq(programsTable.id, args.input.programId));

    if (program.creatorId === user.id) {
      throw new Error('You are already a sponsor of this program');
    }

    if (program.validatorId === user.id) {
      throw new Error('You are already a validator of this program');
    }

    const [application] = await t
      .insert(applicationsTable)
      .values({
        ...args.input,
        applicantId: user.id,
        status: 'pending',
      })
      .returning();

    if (args.input.links) {
      // insert links to links table and map to program
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

      await t.insert(applicationsToLinksTable).values(
        newLinks.map((link) => ({
          applicationId: application.id,
          linkId: link.id,
        })),
      );
    }

    let sortOrder = 0;
    for (const milestone of args.input.milestones) {
      const { links, ...inputData } = milestone;
      const [newMilestone] = await t
        .insert(milestonesTable)
        .values({ ...inputData, sortOrder, applicationId: application.id })
        .returning();
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
      sortOrder++;
    }

    if (!validAndNotEmptyArray(milestones)) {
      ctx.server.log.error('Milestones are required');
      t.rollback();
    }

    const applications = await t
      .select({ price: applicationsTable.price })
      .from(applicationsTable)
      .where(
        and(
          eq(applicationsTable.programId, args.input.programId),
          inArray(applicationsTable.status, ['accepted', 'completed', 'submitted']),
        ),
      );

    const milestonesTotalPrice = milestones.reduce((acc, m) => {
      return acc.plus(new BigNumber(m.price));
    }, new BigNumber(0));

    const applicationsTotalPrice = applications.reduce((acc, a) => {
      return acc.plus(new BigNumber(a.price));
    }, new BigNumber(0));

    if (applicationsTotalPrice.plus(milestonesTotalPrice).gt(new BigNumber(program.price))) {
      ctx.server.log.error('The total price of the applications is greater than the program price');
      t.rollback();
    }

    if (program.validatorId) {
      await ctx.server.pubsub.publish('notifications', t, {
        type: 'application',
        action: 'created',
        recipientId: program.validatorId,
        entityId: application.id,
      });
      await ctx.server.pubsub.publish('notificationsCount');
    }

    return application;
  });
}

export function updateApplicationResolver(
  _root: Root,
  args: { input: typeof UpdateApplicationInput.$inferInput },
  ctx: Context,
) {
  const user = requireUser(ctx);

  const filteredData = filterEmptyValues<ApplicationUpdate>(args.input);

  return ctx.db.transaction(async (t) => {
    const hasAccess = await isInSameScope({
      scope: 'application_builder',
      userId: user.id,
      entityId: args.input.id,
      db: t,
    });
    if (!hasAccess) {
      throw new Error('You are not allowed to update this application');
    }

    const [application] = await t
      .update(applicationsTable)
      .set(filteredData)
      .where(eq(applicationsTable.id, args.input.id))
      .returning();

    if (args.input.links) {
      // delete existing links
      await t
        .delete(applicationsToLinksTable)
        .where(eq(applicationsToLinksTable.applicationId, args.input.id));

      // insert new links
      const newLinks = await t
        .insert(linksTable)
        .values(
          args.input.links.map((link) => ({
            url: link.url as string,
            title: link.title as string,
          })),
        )
        .returning();

      await t.insert(applicationsToLinksTable).values(
        newLinks.map((link) => ({
          applicationId: application.id,
          linkId: link.id,
        })),
      );
    }

    return application;
  });
}

export function acceptApplicationResolver(_root: Root, args: { id: string }, ctx: Context) {
  return ctx.db.transaction(async (t) => {
    const [application] = await t
      .update(applicationsTable)
      .set({ status: 'accepted' })
      .where(eq(applicationsTable.id, args.id))
      .returning();

    if (!application) {
      throw new Error('Application not found');
    }

    // Add applicant as program builder (auto-confirmed)
    await t.insert(programUserRolesTable).values({
      programId: application.programId,
      userId: application.applicantId,
      roleType: 'builder',
    });

    await ctx.server.pubsub.publish('notifications', t, {
      type: 'application',
      action: 'accepted',
      recipientId: application.applicantId,
      entityId: application.id,
      metadata: { programId: application.programId },
    });
    await ctx.server.pubsub.publish('notificationsCount');

    return application;
  });
}

export function rejectApplicationResolver(
  _root: Root,
  args: { id: string; rejectionReason?: string | null },
  ctx: Context,
) {
  const user = requireUser(ctx);

  return ctx.db.transaction(async (t) => {
    const hasAccess = await isInSameScope({
      scope: 'application_validator',
      userId: user.id,
      entityId: args.id,
      db: t,
    });
    if (!hasAccess) {
      throw new Error('You are not allowed to deny this application');
    }

    const [application] = await t
      .update(applicationsTable)
      .set({
        status: 'rejected',
        ...(args.rejectionReason && { rejectionReason: args.rejectionReason }),
      })
      .where(eq(applicationsTable.id, args.id))
      .returning();

    await ctx.server.pubsub.publish('notifications', t, {
      type: 'application',
      action: 'rejected',
      recipientId: application.applicantId,
      entityId: application.id,
      metadata: { programId: application.programId },
    });
    await ctx.server.pubsub.publish('notificationsCount');

    return application;
  });
}
