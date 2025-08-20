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
  userTierAssignmentsTable,
  usersTable,
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
        return f.value ? eq(programsTable.creatorId, f.value) : undefined;
      case 'validatorId': {
        if (!f.value) return undefined;
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
        if (!f.value) return undefined;
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
        if (!f.value) return undefined;
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
        return f.value ? ilike(programsTable.name, `%${f.value}%`) : undefined;
      case 'status':
        if (f.values && f.values.length > 0) {
          return inArray(
            programsTable.status,
            f.values as ('published' | 'closed' | 'completed' | 'cancelled')[],
          );
        }
        return undefined;
      case 'visibility':
        return f.value
          ? eq(programsTable.visibility, f.value as 'private' | 'restricted' | 'public')
          : undefined;
      case 'type':
        return f.value ? eq(programsTable.type, f.value as 'regular' | 'funding') : undefined;
      case 'price':
        // sort by price, value can be 'asc' or 'desc'
        return sort === 'asc' ? asc(programsTable.price) : desc(programsTable.price);
      case 'imminent':
        // Only programs with a deadline within 7 days should be shown
        return and(
          gt(programsTable.deadline, new Date()),
          lt(programsTable.deadline, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
        );
      default:
        return undefined;
    }
  });

  const filterConditions = (await Promise.all(filterPromises)).filter(Boolean);

  // Check if visibility filter was explicitly provided
  const hasVisibilityFilter = filter.some((f) => f.field === 'visibility');
  const user = ctx.server.auth.getUser(ctx.request);

  // Build visibility conditions based on whether a filter was provided
  const visibilityConditions = [];

  if (!hasVisibilityFilter) {
    // No visibility filter provided - return all programs the user can access
    // This means all public programs, plus private programs they have access to
    if (!user) {
      // Non-authenticated users can only see public programs
      visibilityConditions.push(eq(programsTable.visibility, 'public'));
    }
  }
  // If visibility filter is provided, it's already in filterConditions

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

  // Apply access control for private programs
  if (user && !hasVisibilityFilter) {
    // Get user's roles to check validator access
    const userRoles = await ctx.db
      .select()
      .from(programUserRolesTable)
      .where(eq(programUserRolesTable.userId, user.id));

    const userProgramIds = new Set(userRoles.map((role) => role.programId));

    // Filter out private programs the user doesn't have access to
    data = data.filter((program) => {
      if (program.visibility === 'private') {
        // Allow access if user is creator or has a role (validator, etc.)
        return program.creatorId === user.id || userProgramIds.has(program.id);
      }
      // Public and restricted programs are visible
      return true;
    });
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
    const user = ctx.server.auth.getUser(ctx.request);

    // Check if user is the creator first (fast path)
    if (user && program.creatorId === user.id) {
      return program; // Creator always has access
    }

    // Check for other access (validator, builder roles)
    const hasAccess = await hasPrivateProgramAccess(program.id, user?.id || null, ctx.db);
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
      deadline: inputData.deadline ? new Date(inputData.deadline) : new Date(),
      creatorId: user.id,
      status: inputData.status,
      visibility: inputData.visibility || 'public',
      network: inputData.network,

      // Investment/Funding fields
      type: inputData.type || 'regular',
      applicationStartDate: inputData.applicationStartDate
        ? new Date(inputData.applicationStartDate)
        : undefined,
      applicationEndDate: inputData.applicationEndDate
        ? new Date(inputData.applicationEndDate)
        : undefined,
      fundingStartDate: inputData.fundingStartDate
        ? new Date(inputData.fundingStartDate)
        : undefined,
      fundingEndDate: inputData.fundingEndDate ? new Date(inputData.fundingEndDate) : undefined,
      fundingCondition: inputData.fundingCondition,
      tierSettings: inputData.tierSettings
        ? (inputData.tierSettings as {
            bronze?: { enabled: boolean; maxAmount: string };
            silver?: { enabled: boolean; maxAmount: string };
            gold?: { enabled: boolean; maxAmount: string };
            platinum?: { enabled: boolean; maxAmount: string };
          })
        : undefined,
      feePercentage: inputData.feePercentage,
      customFeePercentage: inputData.customFeePercentage,
    };

    const [program] = await t.insert(programsTable).values(insertData).returning();
    if (inputData.image) {
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
    // Check if user already has validator role
    const existingValidatorRole = await t
      .select()
      .from(programUserRolesTable)
      .where(
        and(
          eq(programUserRolesTable.programId, args.id),
          eq(programUserRolesTable.userId, user.id),
          eq(programUserRolesTable.roleType, 'validator'),
        ),
      );

    if (!existingValidatorRole.length) {
      // User doesn't have validator role, so they can't accept the program
      throw new Error('You are not allowed to accept this program');
    }

    // User already has validator role, no need to insert again

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
        status: 'rejected',
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
  args: {
    programId: string;
    userId: string;
    tier?: 'bronze' | 'silver' | 'gold' | 'platinum' | null;
    maxInvestmentAmount?: string | null;
  },
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

    // If this is a tier-based funding program and tier info is provided, create tier assignment
    if (
      program.type === 'funding' &&
      program.fundingCondition === 'tier' &&
      args.tier &&
      args.maxInvestmentAmount
    ) {
      // Check if user already has a tier assignment
      const existingAssignment = await t
        .select()
        .from(userTierAssignmentsTable)
        .where(
          and(
            eq(userTierAssignmentsTable.programId, args.programId),
            eq(userTierAssignmentsTable.userId, args.userId),
          ),
        );

      if (existingAssignment.length > 0) {
        // Update existing assignment
        await t
          .update(userTierAssignmentsTable)
          .set({
            tier: args.tier,
            maxInvestmentAmount: args.maxInvestmentAmount,
          })
          .where(
            and(
              eq(userTierAssignmentsTable.programId, args.programId),
              eq(userTierAssignmentsTable.userId, args.userId),
            ),
          );
      } else {
        // Create new tier assignment
        await t.insert(userTierAssignmentsTable).values({
          programId: args.programId,
          userId: args.userId,
          tier: args.tier,
          maxInvestmentAmount: args.maxInvestmentAmount,
        });
      }
    }

    // Send notification to the invited user
    await ctx.server.pubsub.publish('notifications', t, {
      type: 'program',
      action: 'invited',
      recipientId: args.userId,
      entityId: args.programId,
      metadata: args.tier
        ? {
            tier: args.tier,
            maxInvestmentAmount: args.maxInvestmentAmount,
          }
        : undefined,
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

export async function getSupportersWithTiersResolver(
  _root: Root,
  args: { programId: string },
  ctx: Context,
) {
  const [program] = await ctx.db
    .select()
    .from(programsTable)
    .where(eq(programsTable.id, args.programId));
  // Only return supporters for tier-based funding programs
  if (program.type !== 'funding' || program.fundingCondition !== 'tier') {
    return null;
  }

  // Get all tier assignments for this program
  const tierAssignments = await ctx.db
    .select()
    .from(userTierAssignmentsTable)
    .where(eq(userTierAssignmentsTable.programId, program.id));

  // Get user details for all assigned users
  const userIds = tierAssignments.map((assignment) => assignment.userId);
  const users =
    userIds.length > 0
      ? await ctx.db.select().from(usersTable).where(inArray(usersTable.id, userIds))
      : [];

  // Create user lookup map
  const userMap = new Map(users.map((u) => [u.id, u]));

  return tierAssignments.map((assignment) => {
    const user = userMap.get(assignment.userId);
    return {
      userId: assignment.userId,
      email: user?.email,
      firstName: user?.firstName,
      lastName: user?.lastName,
      tier: assignment.tier,
      maxInvestmentAmount: assignment.maxInvestmentAmount,
      createdAt: assignment.createdAt,
    };
  });
}
