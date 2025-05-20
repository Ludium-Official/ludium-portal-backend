import {
  type ApplicationUpdate,
  applicationsTable,
  applicationsToLinksTable,
  linksTable,
  programUserRolesTable,
  programsTable,
} from '@/db/schemas';
import type { CreateApplicationInput, UpdateApplicationInput } from '@/graphql/types/applications';
import type { PaginationInput } from '@/graphql/types/common';
import type { Context, Root } from '@/types';
import { isInSameScope } from '@/utils';
import { filterEmptyValues, validAndNotEmptyArray } from '@/utils/common';
import { and, asc, count, desc, eq } from 'drizzle-orm';

export async function getApplicationsResolver(
  _root: Root,
  args: { pagination?: typeof PaginationInput.$inferInput | null },
  ctx: Context,
) {
  const limit = args.pagination?.limit || 10;
  const offset = args.pagination?.offset || 0;
  const sort = args.pagination?.sort || 'desc';
  const filter = args.pagination?.filter || [];

  const data = await ctx.db
    .select()
    .from(applicationsTable)
    .limit(limit)
    .offset(offset)
    .orderBy(sort === 'asc' ? asc(applicationsTable.createdAt) : desc(applicationsTable.createdAt))
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
                return eq(
                  applicationsTable.status,
                  f.value as 'pending' | 'approved' | 'rejected' | 'withdrawn',
                );
              default:
                return undefined;
            }
          }),
      ),
    );
  const [totalCount] = await ctx.db.select({ count: count() }).from(applicationsTable);

  if (!validAndNotEmptyArray(data) || !totalCount) {
    throw new Error('No applications found');
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
  const user = ctx.server.auth.getUser(ctx.request);
  if (!user) {
    throw new Error('User not found');
  }

  return ctx.db.transaction(async (t) => {
    const [program] = await t
      .select({ creatorId: programsTable.creatorId, validatorId: programsTable.validatorId })
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

    await ctx.server.pubsub.publish('notifications', t, {
      type: 'application',
      action: 'created',
      recipientId: program.creatorId,
      entityId: application.id,
    });
    await ctx.server.pubsub.publish('notificationsCount');

    return application;
  });
}

export function updateApplicationResolver(
  _root: Root,
  args: { input: typeof UpdateApplicationInput.$inferInput },
  ctx: Context,
) {
  const user = ctx.server.auth.getUser(ctx.request);
  if (!user) {
    throw new Error('User not found');
  }

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

export function approveApplicationResolver(_root: Root, args: { id: string }, ctx: Context) {
  return ctx.db.transaction(async (t) => {
    const [application] = await t
      .update(applicationsTable)
      .set({ status: 'approved' })
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
    });
    await ctx.server.pubsub.publish('notificationsCount');

    return application;
  });
}

export function denyApplicationResolver(_root: Root, args: { id: string }, ctx: Context) {
  const user = ctx.server.auth.getUser(ctx.request);
  if (!user) {
    throw new Error('User not found');
  }

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
      .set({ status: 'rejected' })
      .where(eq(applicationsTable.id, args.id))
      .returning();

    await ctx.server.pubsub.publish('notifications', t, {
      type: 'application',
      action: 'rejected',
      recipientId: application.applicantId,
      entityId: application.id,
    });
    await ctx.server.pubsub.publish('notificationsCount');

    return application;
  });
}
