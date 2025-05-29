import { NETWORKS } from '@/constants';
import {
  type NewProgram,
  type Program,
  applicationsTable,
  keywordsTable,
  linksTable,
  programUserRolesTable,
  programsTable,
  programsToKeywordsTable,
  programsToLinksTable,
} from '@/db/schemas';
import type { PaginationInput } from '@/graphql/types/common';
import type { CreateProgramInput, UpdateProgramInput } from '@/graphql/types/programs';
import type { Args, Context, Root } from '@/types';
import { filterEmptyValues, isInSameScope, requireUser, validAndNotEmptyArray } from '@/utils';
import { and, asc, count, desc, eq, ilike, inArray, or } from 'drizzle-orm';

export async function getProgramsResolver(
  _root: Root,
  args: { pagination?: typeof PaginationInput.$inferInput | null },
  ctx: Context,
) {
  const limit = args.pagination?.limit || 10;
  const offset = args.pagination?.offset || 0;
  const sort = args.pagination?.sort || 'desc';
  const filter = args.pagination?.filter || [];

  const filterPromises = filter.map(async (f) => {
    switch (f.field) {
      case 'creatorId':
        return eq(programsTable.creatorId, f.value);
      case 'validatorId':
        return eq(programsTable.validatorId, f.value);
      case 'applicantId': {
        const applications = await ctx.db
          .select()
          .from(applicationsTable)
          .where(eq(applicationsTable.applicantId, f.value));
        return inArray(
          programsTable.id,
          applications.map((a) => a.programId),
        );
      }
      case 'userId': {
        const creatorCondition = eq(programsTable.creatorId, f.value);
        const validatorCondition = eq(programsTable.validatorId, f.value);

        const userRoles = await ctx.db
          .select()
          .from(programUserRolesTable)
          .where(eq(programUserRolesTable.userId, f.value));

        const applications = await ctx.db
          .select()
          .from(applicationsTable)
          .where(eq(applicationsTable.applicantId, f.value));

        const conditions = [creatorCondition, validatorCondition];

        if (userRoles.length > 0) {
          conditions.push(
            inArray(
              programsTable.id,
              userRoles.map((role) => role.programId),
            ),
          );
        }

        if (applications.length > 0) {
          conditions.push(
            inArray(
              programsTable.id,
              applications.map((app) => app.programId),
            ),
          );
        }

        return or(...conditions);
      }
      case 'name':
        return ilike(programsTable.name, `%${f.value}%`);
      case 'status':
        return eq(
          programsTable.status,
          f.value as 'draft' | 'published' | 'closed' | 'completed' | 'cancelled',
        );
      case 'price':
        // sort by price, value can be 'asc' or 'desc'
        return sort === 'asc' ? asc(programsTable.price) : desc(programsTable.price);
      default:
        return undefined;
    }
  });

  const filterConditions = (await Promise.all(filterPromises)).filter(Boolean);

  let data: Program[] = [];
  if (filterConditions.length > 0) {
    data = await ctx.db
      .select()
      .from(programsTable)
      .where(and(...filterConditions))
      .limit(limit)
      .offset(offset)
      .orderBy(sort === 'asc' ? asc(programsTable.createdAt) : desc(programsTable.createdAt));
  } else {
    data = await ctx.db
      .select()
      .from(programsTable)
      .limit(limit)
      .offset(offset)
      .orderBy(sort === 'asc' ? asc(programsTable.createdAt) : desc(programsTable.createdAt));
  }

  if (!validAndNotEmptyArray(data)) {
    return {
      data: [],
      count: 0,
    };
  }

  const [totalCount] = await ctx.db
    .select({ count: count() })
    .from(programsTable)
    .where(and(...filterConditions));

  return {
    data,
    count: totalCount.count,
  };
}

export async function getProgramResolver(_root: Root, args: { id: string }, ctx: Context) {
  const [program] = await ctx.db.select().from(programsTable).where(eq(programsTable.id, args.id));
  return program;
}

export async function getProgramKeywordsByProgramIdResolver(
  _root: Root,
  args: { programId: string },
  ctx: Context,
) {
  // First get the junction records
  const keywordRelations = await ctx.db
    .select()
    .from(programsToKeywordsTable)
    .where(eq(programsToKeywordsTable.programId, args.programId));

  if (!keywordRelations.length) return [];

  // Then get the actual keywords
  return ctx.db
    .select()
    .from(keywordsTable)
    .where(
      inArray(
        keywordsTable.id,
        keywordRelations.map((rel) => rel.keywordId),
      ),
    );
}

export function getProgramKeywordsResolver(_root: Root, _args: Args, ctx: Context) {
  return ctx.db.select().from(keywordsTable);
}

export function createProgramResolver(
  _root: Root,
  args: { input: typeof CreateProgramInput.$inferInput },
  ctx: Context,
) {
  const { keywords, links, ...inputData } = args.input;

  const user = requireUser(ctx);

  return ctx.db.transaction(async (t) => {
    // Validate network
    if (inputData.network && !NETWORKS.includes(inputData.network)) {
      throw new Error('Invalid network');
    }

    // Create a properly typed object for the database insert
    const insertData: NewProgram = {
      name: inputData.name,
      summary: inputData.summary,
      description: inputData.description,
      price: inputData.price || '0',
      currency: inputData.currency || 'ETH',
      deadline: inputData.deadline
        ? new Date(inputData.deadline).toISOString()
        : new Date().toISOString(),
      creatorId: user.id,
      validatorId: inputData.validatorId,
      status: 'draft',
      network: inputData.network,
    };

    const [program] = await t.insert(programsTable).values(insertData).returning();

    // Add creator as program sponsor (auto-confirmed)
    await t.insert(programUserRolesTable).values({
      programId: program.id,
      userId: user.id,
      roleType: 'sponsor',
    });

    // Handle keywords
    if (keywords?.length) {
      await t
        .insert(programsToKeywordsTable)
        .values(
          keywords.map((keyword) => ({
            programId: program.id,
            keywordId: keyword,
          })),
        )
        .onConflictDoNothing();
    }

    if (links) {
      // insert links to links table and map to program
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

      await t.insert(programsToLinksTable).values(
        newLinks.map((link) => ({
          programId: program.id,
          linkId: link.id,
        })),
      );
    }

    await ctx.server.pubsub.publish('notifications', t, {
      type: 'program',
      action: 'created',
      recipientId: inputData.validatorId,
      entityId: program.id,
    });
    await ctx.server.pubsub.publish('notificationsCount');

    return program;
  });
}

export function updateProgramResolver(
  _root: Root,
  args: { input: typeof UpdateProgramInput.$inferInput },
  ctx: Context,
) {
  const user = requireUser(ctx);

  const { keywords, links, ...inputData } = args.input;

  // Remove null values and prepare data
  const programData = filterEmptyValues<Program>(inputData);

  return ctx.db.transaction(async (t) => {
    const hasAccess = await isInSameScope({
      scope: 'program_creator',
      userId: user.id,
      entityId: args.input.id,
      db: t,
    });
    if (!hasAccess) {
      throw new Error('You are not allowed to update this program');
    }

    // Validate network
    if (programData.network && !NETWORKS.includes(programData.network)) {
      throw new Error('Invalid network');
    }

    // check program status
    const [programStatus] = await t
      .select()
      .from(programsTable)
      .where(eq(programsTable.id, args.input.id));
    if (programStatus.status === 'published' && programData.price) {
      throw new Error('You are not allowed to update the price of a published program');
    }

    // handle keywords
    if (keywords) {
      await t
        .delete(programsToKeywordsTable)
        .where(eq(programsToKeywordsTable.programId, args.input.id));
      await t
        .insert(programsToKeywordsTable)
        .values(keywords.map((keyword) => ({ programId: args.input.id, keywordId: keyword })))
        .onConflictDoNothing();
    }

    // Transform links if present
    const updateData: Partial<Program> = { ...programData };
    if (links) {
      // delete existing links
      await t.delete(programsToLinksTable).where(eq(programsToLinksTable.programId, args.input.id));

      // insert new links
      const newLinks = await t
        .insert(linksTable)
        .values(links.map((link) => ({ url: link.url as string, title: link.title as string })))
        .returning();
      await t.insert(programsToLinksTable).values(
        newLinks.map((link) => ({
          programId: args.input.id,
          linkId: link.id,
        })),
      );
    }

    const [program] = await ctx.db
      .update(programsTable)
      .set(updateData)
      .where(eq(programsTable.id, args.input.id))
      .returning();

    return program;
  });
}

export async function deleteProgramResolver(_root: Root, args: { id: string }, ctx: Context) {
  const user = requireUser(ctx);

  const hasAccess = await isInSameScope({
    scope: 'program_creator',
    userId: user.id,
    entityId: args.id,
    db: ctx.db,
  });
  if (!hasAccess) {
    throw new Error('You are not allowed to delete this program');
  }

  await ctx.db.delete(programsTable).where(eq(programsTable.id, args.id));
  return true;
}

export function acceptProgramResolver(_root: Root, args: { id: string }, ctx: Context) {
  const user = requireUser(ctx);

  return ctx.db.transaction(async (t) => {
    const hasAccess = await isInSameScope({
      scope: 'program_validator',
      userId: user.id,
      entityId: args.id,
      db: t,
    });
    if (!hasAccess) {
      throw new Error('You are not allowed to accept this program');
    }

    // Add validator
    await t.insert(programUserRolesTable).values({
      programId: args.id,
      userId: user.id,
      roleType: 'validator',
    });

    const [program] = await t
      .update(programsTable)
      .set({ status: 'payment_required' })
      .where(eq(programsTable.id, args.id))
      .returning();

    await ctx.server.pubsub.publish('notifications', t, {
      type: 'program',
      action: 'accepted',
      recipientId: program.creatorId,
      entityId: program.id,
    });
    await ctx.server.pubsub.publish('notificationsCount');

    return program;
  });
}

export function rejectProgramResolver(_root: Root, args: { id: string }, ctx: Context) {
  const user = requireUser(ctx);

  return ctx.db.transaction(async (t) => {
    const hasAccess = await isInSameScope({
      scope: 'program_validator',
      userId: user.id,
      entityId: args.id,
      db: t,
    });
    if (!hasAccess) {
      throw new Error('You are not allowed to reject this program');
    }

    const [program] = await t
      .update(programsTable)
      .set({ status: 'draft', validatorId: null })
      .where(eq(programsTable.id, args.id))
      .returning();

    await ctx.server.pubsub.publish('notifications', t, {
      type: 'program',
      action: 'rejected',
      recipientId: program.creatorId,
      entityId: program.id,
    });
    await ctx.server.pubsub.publish('notificationsCount');

    return program;
  });
}

export function publishProgramResolver(
  _root: Root,
  args: { id: string; educhainProgramId: number; txHash: string },
  ctx: Context,
) {
  const user = requireUser(ctx);

  return ctx.db.transaction(async (t) => {
    const hasAccess = await isInSameScope({
      scope: 'program_creator',
      userId: user.id,
      entityId: args.id,
      db: t,
    });
    if (!hasAccess) {
      throw new Error('You are not allowed to publish this program');
    }

    const [program] = await t
      .update(programsTable)
      .set({ status: 'published', educhainProgramId: args.educhainProgramId, txHash: args.txHash })
      .where(eq(programsTable.id, args.id))
      .returning();

    await ctx.server.pubsub.publish('notifications', t, {
      type: 'program',
      action: 'submitted',
      recipientId: program.creatorId,
      entityId: program.id,
    });
    await ctx.server.pubsub.publish('notificationsCount');

    return program;
  });
}
