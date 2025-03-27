import {
  type ApplicationUpdate,
  applicationsTable,
  applicationsToLinksTable,
  linksTable,
} from '@/db/schemas';
import type { CreateApplicationInput, UpdateApplicationInput } from '@/graphql/types/applications';
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

export async function createApplicationResolver(
  _root: Root,
  args: { input: typeof CreateApplicationInput.$inferInput },
  ctx: Context,
) {
  const user = ctx.server.auth.getUser(ctx.request);
  if (!user) {
    throw new Error('User not found');
  }

  return ctx.db.transaction(async (t) => {
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

    return application;
  });
}

export async function updateApplicationResolver(
  _root: Root,
  args: { input: typeof UpdateApplicationInput.$inferInput },
  ctx: Context,
) {
  const filteredData = filterEmptyValues<ApplicationUpdate>(args.input);

  return ctx.db.transaction(async (t) => {
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
