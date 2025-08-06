import { NETWORKS } from '@/constants';
import {
  type NewProgram,
  type Program,
  applicationsTable,
  filesTable,
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
import {
  filterEmptyValues,
  hasPrivateProgramAccess,
  isInSameScope,
  requireUser,
  validAndNotEmptyArray,
} from '@/utils';
import { and, asc, count, desc, eq, gt, ilike, inArray, lt, or } from 'drizzle-orm';

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
      case 'validatorId': {
        // Get programs where user has validator role
        const validatorPrograms = await ctx.db
          .select({ programId: programUserRolesTable.programId })
          .from(programUserRolesTable)
          .where(
            and(
              eq(programUserRolesTable.userId, f.value),
              eq(programUserRolesTable.roleType, 'validator'),
            ),
          );
        return inArray(
          programsTable.id,
          validatorPrograms.map((p) => p.programId),
        );
      }
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

        const userRoles = await ctx.db
          .select()
          .from(programUserRolesTable)
          .where(eq(programUserRolesTable.userId, f.value));

        const applications = await ctx.db
          .select()
          .from(applicationsTable)
          .where(eq(applicationsTable.applicantId, f.value));

        const conditions = [creatorCondition];

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
        return ilike(programsTable.name, `%${f.value ?? ''}%`);
      case 'status':
        return eq(
          programsTable.status,
          f.value as 'draft' | 'published' | 'closed' | 'completed' | 'cancelled',
        );
      case 'visibility':
        return eq(programsTable.visibility, f.value as 'private' | 'restricted' | 'public');
      case 'price':
        // sort by price, value can be 'asc' or 'desc'
        return sort === 'asc' ? asc(programsTable.price) : desc(programsTable.price);
      case 'imminent':
        // Only programs with a deadline within 7 days should be shown
        return and(
          gt(programsTable.deadline, new Date().toISOString()),
          lt(programsTable.deadline, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()),
        );
      default:
        return undefined;
    }
  });

  const filterConditions = (await Promise.all(filterPromises)).filter(Boolean);

  // Check if visibility filter was explicitly provided
  const hasVisibilityFilter = filter.some((f) => f.field === 'visibility');

  // Only add visibility filtering if no explicit visibility filter was provided
  // When no visibility filter is provided, return all programs (no restrictions)
  // This allows admins or other authorized users to see all programs when needed
  const visibilityConditions = hasVisibilityFilter ? [] : [];

  const allConditions = [...filterConditions, ...visibilityConditions];

  let data: Program[] = [];
  if (allConditions.length > 0) {
    data = await ctx.db
      .select()
      .from(programsTable)
      .where(and(...allConditions))
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

  // Only apply post-query filtering if no visibility filter was provided
  // When visibility filter is provided, we return all programs matching the query
  if (!hasVisibilityFilter) {
    // No additional filtering - return all programs
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
    .where(and(...allConditions));

  return {
    data,
    count: totalCount.count,
  };
}

export async function getProgramResolver(_root: Root, args: { id: string }, ctx: Context) {
  const [program] = await ctx.db.select().from(programsTable).where(eq(programsTable.id, args.id));

  if (!program) {
    throw new Error('Program not found');
  }

  // Check visibility access based on program visibility rules:
  // - Public: Anyone can access
  // - Restricted: Anyone can access if they know the URL (no additional checks needed)
  // - Private: Only invited builders and program creators/validators can access
  if (program.visibility === 'private') {
    const hasAccess = await hasPrivateProgramAccess(program.id, ctx.user?.id || null, ctx.db);
    if (!hasAccess) {
      throw new Error('You do not have access to this program');
    }
  }
  // No additional checks needed for 'restricted' and 'public' programs

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
      status: 'draft',
      visibility: inputData.visibility || 'public',
      network: inputData.network,
    };

    const [program] = await t.insert(programsTable).values(insertData).returning();
    if (inputData.image) {
      const [imageFile] = await t
        .select()
        .from(filesTable)
        .where(eq(filesTable.uploadedById, user.id));
      if (imageFile) {
        await ctx.server.fileManager.deleteFile(imageFile.id);
      }
      const fileUrl = await ctx.server.fileManager.uploadFile({
        file: inputData.image,
        userId: user.id,
      });
      await t.update(programsTable).set({ image: fileUrl }).where(eq(programsTable.id, program.id));
    }

    // Add creator as program sponsor (auto-confirmed)
    await t.insert(programUserRolesTable).values({
      programId: program.id,
      userId: user.id,
      roleType: 'sponsor',
    });

    // Handle keywords - create if they don't exist
    if (keywords?.length) {
      const keywordIds = [];

      for (const keywordName of keywords) {
        // Check if keyword exists
        let [existingKeyword] = await t
          .select()
          .from(keywordsTable)
          .where(eq(keywordsTable.name, keywordName.trim()));

        if (!existingKeyword) {
          // Create new keyword
          [existingKeyword] = await t
            .insert(keywordsTable)
            .values({ name: keywordName.trim() })
            .returning();
        }

        keywordIds.push(existingKeyword.id);
      }

      // Link keywords to program
      if (keywordIds.length > 0) {
        await t
          .insert(programsToKeywordsTable)
          .values(
            keywordIds.map((keywordId) => ({
              programId: program.id,
              keywordId,
            })),
          )
          .onConflictDoNothing();
      }
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

    if (inputData.image) {
      const [imageFile] = await t
        .select()
        .from(filesTable)
        .where(eq(filesTable.uploadedById, user.id));
      if (imageFile) {
        await ctx.server.fileManager.deleteFile(imageFile.id);
      }
      const fileUrl = await ctx.server.fileManager.uploadFile({
        file: inputData.image,
        userId: user.id,
      });
      await t
        .update(programsTable)
        .set({ image: fileUrl })
        .where(eq(programsTable.id, args.input.id));
    }

    // Handle keywords - create if they don't exist
    if (keywords) {
      // Delete existing keyword associations
      await t
        .delete(programsToKeywordsTable)
        .where(eq(programsToKeywordsTable.programId, args.input.id));

      const keywordIds = [];

      for (const keywordName of keywords) {
        // Check if keyword exists
        let [existingKeyword] = await t
          .select()
          .from(keywordsTable)
          .where(eq(keywordsTable.name, keywordName.trim()));

        if (!existingKeyword) {
          // Create new keyword
          [existingKeyword] = await t
            .insert(keywordsTable)
            .values({ name: keywordName.trim() })
            .returning();
        }

        keywordIds.push(existingKeyword.id);
      }

      // Link keywords to program
      if (keywordIds.length > 0) {
        await t
          .insert(programsToKeywordsTable)
          .values(
            keywordIds.map((keywordId) => ({
              programId: args.input.id,
              keywordId,
            })),
          )
          .onConflictDoNothing();
      }
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

export function rejectProgramResolver(
  _root: Root,
  args: { id: string; rejectionReason?: string | null },
  ctx: Context,
) {
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
      .set({
        status: 'draft',
        ...(args.rejectionReason && { rejectionReason: args.rejectionReason }),
      })
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

export function inviteUserToProgramResolver(
  _root: Root,
  args: { programId: string; userId: string },
  ctx: Context,
) {
  const user = requireUser(ctx);

  return ctx.db.transaction(async (t) => {
    // Check if user is the program creator
    const hasAccess = await isInSameScope({
      scope: 'program_creator',
      userId: user.id,
      entityId: args.programId,
      db: t,
    });
    if (!hasAccess) {
      throw new Error('You are not allowed to invite users to this program');
    }

    // Check if program exists
    const [program] = await t
      .select()
      .from(programsTable)
      .where(eq(programsTable.id, args.programId));

    if (!program) {
      throw new Error('Program not found');
    }

    // Check if user is already associated with this program
    const existingRole = await t
      .select()
      .from(programUserRolesTable)
      .where(
        and(
          eq(programUserRolesTable.programId, args.programId),
          eq(programUserRolesTable.userId, args.userId),
        ),
      );

    if (existingRole.length > 0) {
      throw new Error('User is already associated with this program');
    }

    // Add user as builder to the program
    await t.insert(programUserRolesTable).values({
      programId: args.programId,
      userId: args.userId,
      roleType: 'builder',
    });

    // Send notification to the invited user
    await ctx.server.pubsub.publish('notifications', t, {
      type: 'program',
      action: 'invited',
      recipientId: args.userId,
      entityId: args.programId,
    });
    await ctx.server.pubsub.publish('notificationsCount');

    return program;
  });
}

export function assignValidatorToProgramResolver(
  _root: Root,
  args: { programId: string; validatorId: string },
  ctx: Context,
) {
  const user = requireUser(ctx);

  return ctx.db.transaction(async (t) => {
    // Check if user is the program creator
    const hasAccess = await isInSameScope({
      scope: 'program_creator',
      userId: user.id,
      entityId: args.programId,
      db: t,
    });
    if (!hasAccess) {
      throw new Error('You are not allowed to assign validators to this program');
    }

    // Check if program exists
    const [program] = await t
      .select()
      .from(programsTable)
      .where(eq(programsTable.id, args.programId));

    if (!program) {
      throw new Error('Program not found');
    }

    // Check if user is already a validator for this program
    const existingValidator = await t
      .select()
      .from(programUserRolesTable)
      .where(
        and(
          eq(programUserRolesTable.programId, args.programId),
          eq(programUserRolesTable.userId, args.validatorId),
          eq(programUserRolesTable.roleType, 'validator'),
        ),
      );

    if (existingValidator.length > 0) {
      throw new Error('User is already a validator for this program');
    }

    // Add user as validator to the program
    await t.insert(programUserRolesTable).values({
      programId: args.programId,
      userId: args.validatorId,
      roleType: 'validator',
    });

    // Send notification to the assigned validator
    await ctx.server.pubsub.publish('notifications', t, {
      type: 'program',
      action: 'created',
      recipientId: args.validatorId,
      entityId: args.programId,
    });
    await ctx.server.pubsub.publish('notificationsCount');

    return program;
  });
}

export function removeValidatorFromProgramResolver(
  _root: Root,
  args: { programId: string; validatorId: string },
  ctx: Context,
) {
  const user = requireUser(ctx);

  return ctx.db.transaction(async (t) => {
    // Check if user is the program creator
    const hasAccess = await isInSameScope({
      scope: 'program_creator',
      userId: user.id,
      entityId: args.programId,
      db: t,
    });
    if (!hasAccess) {
      throw new Error('You are not allowed to remove validators from this program');
    }

    // Check if program exists
    const [program] = await t
      .select()
      .from(programsTable)
      .where(eq(programsTable.id, args.programId));

    if (!program) {
      throw new Error('Program not found');
    }

    // Remove the validator role
    await t
      .delete(programUserRolesTable)
      .where(
        and(
          eq(programUserRolesTable.programId, args.programId),
          eq(programUserRolesTable.userId, args.validatorId),
          eq(programUserRolesTable.roleType, 'validator'),
        ),
      );

    // Send notification to the removed validator
    await ctx.server.pubsub.publish('notifications', t, {
      type: 'program',
      action: 'rejected',
      recipientId: args.validatorId,
      entityId: args.programId,
    });
    await ctx.server.pubsub.publish('notificationsCount');

    return program;
  });
}

export async function addProgramKeywordResolver(
  _root: Root,
  args: { programId: string; keyword: string },
  ctx: Context,
) {
  const user = requireUser(ctx);

  return ctx.db.transaction(async (t) => {
    // Check if user has access to update the program
    const hasAccess = await isInSameScope({
      scope: 'program_creator',
      userId: user.id,
      entityId: args.programId,
      db: t,
    });
    if (!hasAccess) {
      throw new Error('You are not allowed to modify keywords for this program');
    }

    // Check if keyword exists
    let [existingKeyword] = await t
      .select()
      .from(keywordsTable)
      .where(eq(keywordsTable.name, args.keyword.trim()));

    if (!existingKeyword) {
      // Create new keyword
      [existingKeyword] = await t
        .insert(keywordsTable)
        .values({ name: args.keyword.trim() })
        .returning();
    }

    // Link keyword to program
    await t
      .insert(programsToKeywordsTable)
      .values({
        programId: args.programId,
        keywordId: existingKeyword.id,
      })
      .onConflictDoNothing();

    return existingKeyword;
  });
}

export async function removeProgramKeywordResolver(
  _root: Root,
  args: { programId: string; keyword: string },
  ctx: Context,
) {
  const user = requireUser(ctx);

  return ctx.db.transaction(async (t) => {
    // Check if user has access to update the program
    const hasAccess = await isInSameScope({
      scope: 'program_creator',
      userId: user.id,
      entityId: args.programId,
      db: t,
    });
    if (!hasAccess) {
      throw new Error('You are not allowed to modify keywords for this program');
    }

    // Find the keyword
    const [existingKeyword] = await t
      .select()
      .from(keywordsTable)
      .where(eq(keywordsTable.name, args.keyword.trim()));

    if (!existingKeyword) {
      throw new Error('Keyword not found');
    }

    // Remove the association
    await t
      .delete(programsToKeywordsTable)
      .where(
        and(
          eq(programsToKeywordsTable.programId, args.programId),
          eq(programsToKeywordsTable.keywordId, existingKeyword.id),
        ),
      );

    return true;
  });
}
