import {
  type User,
  applicationsTable,
  filesTable,
  investmentsTable,
  keywordsTable,
  linksTable,
  programUserRolesTable,
  programsTable,
  usersTable,
  usersToKeywordsTable,
  usersToLinksTable,
} from '@/db/schemas';
import type { PaginationInput } from '@/graphql/types/common';
import type { UserInput, UserUpdateInput } from '@/graphql/types/users';
import type { Args, Context, Root, UploadFile } from '@/types';
import { requireUser } from '@/utils';
import { filterEmptyValues, validAndNotEmptyArray } from '@/utils/common';
import { and, asc, count, desc, eq, ilike, inArray, isNotNull, or, sql } from 'drizzle-orm';

export async function getUsersResolver(
  _root: Root,
  args: { pagination?: typeof PaginationInput.$inferInput | null },
  ctx: Context,
) {
  const limit = args.pagination?.limit || 10;
  const offset = args.pagination?.offset || 0;
  const sort = args.pagination?.sort || 'desc';
  const filter = args.pagination?.filter || [];

  const sortByProjects = filter.some((f) => f.field === 'byNumberOfProjects');
  const sortDirection = filter.find((f) => f.field === 'byNumberOfProjects')?.value || 'desc';
  const sortByNewest = filter.some((f) => f.field === 'byNewest');

  const filterPromises = filter.map(async (f) => {
    if (f.field === 'search') {
      return or(
        ilike(usersTable.firstName, `%${f.value}%`),
        ilike(usersTable.lastName, `%${f.value}%`),
        ilike(usersTable.organizationName, `%${f.value}%`),
        ilike(usersTable.email, `%${f.value}%`),
      );
    }

    if (f.field === 'byNumberOfProjects') {
      return undefined;
    }

    if (f.field === 'byNewest') {
      return undefined;
    }

    switch (f.field) {
      case 'firstName':
        return ilike(usersTable.firstName, `%${f.value}%`);
      case 'lastName':
        return ilike(usersTable.lastName, `%${f.value}%`);
      case 'organizationName':
        return ilike(usersTable.organizationName, `%${f.value}%`);
      case 'email':
        return ilike(usersTable.email, `%${f.value}%`);
      default:
        return undefined;
    }
  });

  const conditions = await Promise.all(filterPromises);
  const validConditions = conditions.filter(Boolean);

  // Add default filter for users with email not null and not banned
  const emailNotNullCondition = isNotNull(usersTable.email);
  const notBannedCondition = eq(usersTable.banned, false);
  const allConditions = [...validConditions, emailNotNullCondition, notBannedCondition];

  const where = allConditions.length > 0 ? and(...allConditions) : undefined;

  if (sortByProjects) {
    const subquery = ctx.db
      .select({
        userId: programUserRolesTable.userId,
        projectCount: count(programUserRolesTable.id).as('project_count'),
      })
      .from(programUserRolesTable)
      .groupBy(programUserRolesTable.userId)
      .as('project_counts');

    const userWithCounts = await ctx.db
      .select({
        user: usersTable,
        projectCount: sql<number>`COALESCE(${subquery.projectCount}, 0)`,
      })
      .from(usersTable)
      .leftJoin(subquery, eq(usersTable.id, subquery.userId))
      .where(where)
      .orderBy(
        sortDirection === 'desc'
          ? desc(sql<number>`COALESCE(${subquery.projectCount}, 0)`)
          : asc(sql<number>`COALESCE(${subquery.projectCount}, 0)`),
      )
      .limit(limit)
      .offset(offset);

    const users = userWithCounts.map((result) => result.user);

    const [totalCount] = await ctx.db.select({ count: count() }).from(usersTable).where(where);
    return { data: users, count: totalCount.count };
  }

  // Determine the order based on filters
  const orderBy = sortByNewest
    ? desc(usersTable.createdAt)
    : sort === 'asc'
      ? asc(usersTable.createdAt)
      : desc(usersTable.createdAt);

  const users = await ctx.db
    .select()
    .from(usersTable)
    .where(where)
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);

  if (!validAndNotEmptyArray(users)) {
    return {
      data: [],
      count: 0,
    };
  }

  const [totalCount] = await ctx.db.select({ count: count() }).from(usersTable).where(where);

  return { data: users, count: totalCount.count };
}

export async function getUserByIdResolver(_root: Root, args: { id: string }, ctx: Context) {
  const [user] = await ctx.db.select().from(usersTable).where(eq(usersTable.id, args.id));
  return user;
}

export async function getUserResolver(_root: Root, args: { id: string }, ctx: Context) {
  if (!args.id) {
    return null;
  }

  const [user] = await ctx.db.select().from(usersTable).where(eq(usersTable.id, args.id));

  return user;
}

export async function getValidatorsByProgramIdResolver(
  _root: Root,
  args: { programId: string },
  ctx: Context,
) {
  const validators = await ctx.db
    .select({ userId: programUserRolesTable.userId })
    .from(programUserRolesTable)
    .where(
      and(
        eq(programUserRolesTable.programId, args.programId),
        eq(programUserRolesTable.roleType, 'validator'),
      ),
    );

  if (validators.length === 0) return [];

  const validatorUsers = await Promise.all(
    validators.map((validator) => getUserResolver({}, { id: validator.userId }, ctx)),
  );

  // add to set to remove duplicates
  return validatorUsers.filter((user) => user !== null);
}

export async function getInvitedBuildersByProgramIdResolver(
  _root: Root,
  args: { programId: string },
  ctx: Context,
) {
  const builders = await ctx.db
    .select({ userId: programUserRolesTable.userId })
    .from(programUserRolesTable)
    .where(
      and(
        eq(programUserRolesTable.programId, args.programId),
        eq(programUserRolesTable.roleType, 'builder'),
      ),
    );

  if (builders.length === 0) return [];

  const builderUsers = await Promise.all(
    builders.map((builder) => getUserResolver({}, { id: builder.userId }, ctx)),
  );

  return builderUsers.filter((user) => user !== null);
}

export async function getUserProgramStatisticsResolver(
  _root: Root,
  args: { userId: string },
  ctx: Context,
) {
  // Get all program roles for this user
  const userRoles = await ctx.db
    .select({
      programId: programUserRolesTable.programId,
      roleType: programUserRolesTable.roleType,
    })
    .from(programUserRolesTable)
    .where(eq(programUserRolesTable.userId, args.userId));

  if (userRoles.length === 0) {
    const initStats = () => ({
      notConfirmed: 0,
      confirmed: 0,
      published: 0,
      paymentRequired: 0,
      completed: 0,
      refund: 0,
    });
    return {
      asSponsor: initStats(),
      asValidator: initStats(),
      asBuilder: initStats(),
    };
  }

  // Get program statuses for all user's programs
  const programIds = userRoles.map((role) => role.programId);
  const programs = await ctx.db
    .select({
      id: programsTable.id,
      status: programsTable.status,
    })
    .from(programsTable)
    .where(inArray(programsTable.id, programIds));

  // Create a map of program ID to status
  const programStatusMap = new Map(programs.map((p) => [p.id, p.status]));

  // Combine roles with program statuses
  const userProgramRoles = userRoles.map((role) => ({
    ...role,
    status: programStatusMap.get(role.programId) || 'draft',
  }));

  // Function to map database status to UI status
  const mapStatusToUI = (status: string) => {
    switch (status) {
      case 'draft':
        return 'notConfirmed';
      case 'payment_required':
        return 'paymentRequired';
      case 'published':
        return 'published';
      case 'completed':
        return 'completed';
      case 'cancelled':
        return 'refund';
      case 'closed':
        return 'completed'; // Treating closed as completed
      default:
        return 'notConfirmed';
    }
  };

  // Initialize statistics structure
  const initStats = () => ({
    notConfirmed: 0,
    confirmed: 0,
    published: 0,
    paymentRequired: 0,
    completed: 0,
    refund: 0,
  });

  const asSponsor = initStats();
  const asValidator = initStats();
  const asBuilder = initStats();

  // Process each program role
  for (const role of userProgramRoles) {
    const uiStatus = mapStatusToUI(role.status);

    switch (role.roleType) {
      case 'sponsor':
        asSponsor[uiStatus]++;
        break;
      case 'validator':
        asValidator[uiStatus]++;
        break;
      case 'builder':
        asBuilder[uiStatus]++;
        break;
    }
  }

  // For confirmed status, we need to handle the special case
  // Programs that are payment_required are considered "confirmed" by validators
  for (const role of userProgramRoles) {
    if (role.status === 'payment_required') {
      switch (role.roleType) {
        case 'sponsor':
          asSponsor.confirmed++;
          break;
        case 'validator':
          asValidator.confirmed++;
          break;
        case 'builder':
          asBuilder.confirmed++;
          break;
      }
    }
  }

  return {
    asSponsor,
    asValidator,
    asBuilder,
  };
}

export async function getUserInvestmentStatisticsResolver(
  _root: Root,
  args: { userId: string },
  ctx: Context,
) {
  // Initialize statistics structure for investment programs
  const initInvestmentStats = () => ({
    ready: 0,
    applicationOngoing: 0,
    fundingOngoing: 0,
    projectOngoing: 0,
    programCompleted: 0,
    refund: 0,
  });

  const asHost = initInvestmentStats();
  const asProject = initInvestmentStats();
  const asSupporter = initInvestmentStats();

  // 1. Investment Program Host statistics
  // Get programs created by this user that are investment type
  const hostPrograms = await ctx.db
    .select({
      id: programsTable.id,
      status: programsTable.status,
      applicationStartDate: programsTable.applicationStartDate,
      applicationEndDate: programsTable.applicationEndDate,
      fundingStartDate: programsTable.fundingStartDate,
      fundingEndDate: programsTable.fundingEndDate,
    })
    .from(programsTable)
    .where(and(eq(programsTable.creatorId, args.userId), eq(programsTable.type, 'funding')));

  // Map host program statuses
  const now = new Date();
  for (const program of hostPrograms) {
    let mappedStatus: keyof ReturnType<typeof initInvestmentStats>;

    if (program.status === 'pending') {
      mappedStatus = 'ready';
    } else if (program.status === 'published') {
      // Determine phase based on dates
      const applicationStart = program.applicationStartDate
        ? new Date(program.applicationStartDate)
        : null;
      const applicationEnd = program.applicationEndDate
        ? new Date(program.applicationEndDate)
        : null;
      const fundingStart = program.fundingStartDate ? new Date(program.fundingStartDate) : null;
      const fundingEnd = program.fundingEndDate ? new Date(program.fundingEndDate) : null;

      if (applicationStart && applicationEnd && now >= applicationStart && now <= applicationEnd) {
        mappedStatus = 'applicationOngoing';
      } else if (fundingStart && fundingEnd && now >= fundingStart && now <= fundingEnd) {
        mappedStatus = 'fundingOngoing';
      } else if (fundingEnd && now > fundingEnd) {
        mappedStatus = 'projectOngoing';
      } else {
        mappedStatus = 'ready';
      }
    } else if (program.status === 'completed') {
      mappedStatus = 'programCompleted';
    } else if (program.status === 'cancelled') {
      mappedStatus = 'refund';
    } else {
      mappedStatus = 'ready';
    }

    asHost[mappedStatus]++;
  }

  // 2. Investment Program Project statistics
  // First get all applications by this user
  const userApplications = await ctx.db
    .select({
      id: applicationsTable.id,
      status: applicationsTable.status,
      fundingSuccessful: applicationsTable.fundingSuccessful,
      programId: applicationsTable.programId,
    })
    .from(applicationsTable)
    .where(eq(applicationsTable.applicantId, args.userId));

  if (userApplications.length === 0) {
    // Continue to supporter stats
  } else {
    // Get investment programs for these applications
    const applicationProgramIds = userApplications.map((app) => app.programId);
    const investmentPrograms = await ctx.db
      .select({
        id: programsTable.id,
        status: programsTable.status,
        type: programsTable.type,
        applicationStartDate: programsTable.applicationStartDate,
        applicationEndDate: programsTable.applicationEndDate,
        fundingStartDate: programsTable.fundingStartDate,
        fundingEndDate: programsTable.fundingEndDate,
      })
      .from(programsTable)
      .where(
        and(inArray(programsTable.id, applicationProgramIds), eq(programsTable.type, 'funding')),
      );

    // Create a map for easy lookup
    const programMap = new Map(investmentPrograms.map((p) => [p.id, p]));

    // Process applications that are in investment programs
    const investmentApplications = userApplications.filter((app) => programMap.has(app.programId));

    // Map project application statuses
    for (const application of investmentApplications) {
      const program = programMap.get(application.programId);
      if (!program) continue;

      let mappedStatus: keyof ReturnType<typeof initInvestmentStats>;

      if (application.status === 'pending') {
        mappedStatus = 'ready';
      } else if (application.status === 'accepted') {
        // Determine phase based on dates
        const fundingStart = program.fundingStartDate ? new Date(program.fundingStartDate) : null;
        const fundingEnd = program.fundingEndDate ? new Date(program.fundingEndDate) : null;

        if (fundingStart && fundingEnd && now >= fundingStart && now <= fundingEnd) {
          mappedStatus = 'fundingOngoing';
        } else if (fundingEnd && now > fundingEnd) {
          if (application.fundingSuccessful) {
            mappedStatus = 'projectOngoing';
          } else {
            mappedStatus = 'refund'; // Project failed to get funding
          }
        } else {
          mappedStatus = 'ready';
        }
      } else if (application.status === 'completed') {
        mappedStatus = 'programCompleted';
      } else if (application.status === 'rejected') {
        mappedStatus = 'refund';
      } else {
        mappedStatus = 'ready';
      }

      asProject[mappedStatus]++;
    }
  }

  // 3. Investment Program Supporter statistics
  // First get all investments by this user
  const userInvestments = await ctx.db
    .select({
      id: investmentsTable.id,
      status: investmentsTable.status,
      applicationId: investmentsTable.applicationId,
    })
    .from(investmentsTable)
    .where(eq(investmentsTable.userId, args.userId));

  if (userInvestments.length > 0) {
    // Get applications for these investments
    const investmentApplicationIds = userInvestments.map((inv) => inv.applicationId);
    const investmentApplications = await ctx.db
      .select({
        id: applicationsTable.id,
        status: applicationsTable.status,
        fundingSuccessful: applicationsTable.fundingSuccessful,
        programId: applicationsTable.programId,
      })
      .from(applicationsTable)
      .where(inArray(applicationsTable.id, investmentApplicationIds));

    // Get programs for these applications
    const applicationProgramIds = investmentApplications.map((app) => app.programId);
    const supporterPrograms = await ctx.db
      .select({
        id: programsTable.id,
        status: programsTable.status,
        type: programsTable.type,
        fundingStartDate: programsTable.fundingStartDate,
        fundingEndDate: programsTable.fundingEndDate,
      })
      .from(programsTable)
      .where(
        and(inArray(programsTable.id, applicationProgramIds), eq(programsTable.type, 'funding')),
      );

    // Create maps for easy lookup
    const applicationMap = new Map(investmentApplications.map((app) => [app.id, app]));
    const supporterProgramMap = new Map(supporterPrograms.map((p) => [p.id, p]));

    // Map supporter investment statuses
    for (const investment of userInvestments) {
      const application = applicationMap.get(investment.applicationId);
      if (!application) continue;

      const program = supporterProgramMap.get(application.programId);
      if (!program) continue;

      let mappedStatus: keyof ReturnType<typeof initInvestmentStats>;

      if (investment.status === 'pending') {
        mappedStatus = 'ready';
      } else if (investment.status === 'confirmed') {
        // Check project and program status
        const fundingEnd = program.fundingEndDate ? new Date(program.fundingEndDate) : null;

        if (fundingEnd && now <= fundingEnd) {
          mappedStatus = 'fundingOngoing';
        } else if (application.fundingSuccessful) {
          if (application.status === 'completed') {
            mappedStatus = 'programCompleted';
          } else {
            mappedStatus = 'projectOngoing';
          }
        } else {
          mappedStatus = 'refund'; // Project failed to get funding
        }
      } else if (investment.status === 'refunded') {
        mappedStatus = 'refund';
      } else if (investment.status === 'failed') {
        mappedStatus = 'refund';
      } else {
        mappedStatus = 'ready';
      }

      asSupporter[mappedStatus]++;
    }
  }

  return {
    asHost,
    asProject,
    asSupporter,
  };
}

export function createUserResolver(
  _root: Root,
  args: { input: typeof UserInput.$inferInput },
  ctx: Context,
) {
  const { links, keywords, ...userData } = args.input;

  return ctx.db.transaction(async (t) => {
    const [user] = await t
      .insert(usersTable)
      .values({
        ...userData,
        image: null,
      })
      .returning();

    if (userData.image) {
      const fileUrl = await ctx.server.fileManager.uploadFile({
        file: userData.image,
        userId: user.id,
      });
      await t.update(usersTable).set({ image: fileUrl }).where(eq(usersTable.id, user.id));
    }

    if (links) {
      // insert links to links table and map to user
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

      await t.insert(usersToLinksTable).values(
        newLinks.map((link) => ({
          userId: user.id,
          linkId: link.id,
        })),
      );
    }

    if (keywords) {
      const keywordIds = [];

      for (const keyword of keywords) {
        let existingKeyword = await t
          .select()
          .from(keywordsTable)
          .where(eq(keywordsTable.name, keyword.toLowerCase().trim()))
          .then((results) => results[0]);

        if (!existingKeyword) {
          const [newKeyword] = await t
            .insert(keywordsTable)
            .values({ name: keyword.toLowerCase().trim() })
            .returning();
          existingKeyword = newKeyword;
        }

        keywordIds.push(existingKeyword.id);
      }

      if (keywordIds.length > 0) {
        await t
          .insert(usersToKeywordsTable)
          .values(
            keywordIds.map((keywordId) => ({
              userId: user.id,
              keywordId,
              type: 'role' as const,
            })),
          )
          .onConflictDoNothing();
      }
    }

    return user;
  });
}

export function updateUserResolver(
  _root: Root,
  args: { input: typeof UserUpdateInput.$inferInput },
  ctx: Context,
) {
  const { links, keywords, ...userData } = args.input;

  return ctx.db.transaction(async (t) => {
    const [user] = await t
      .update(usersTable)
      .set({
        firstName: userData.firstName,
        lastName: userData.lastName,
        organizationName: userData.organizationName,
        about: userData.about,
        links: links as { url: string; title: string }[],
      })
      .where(eq(usersTable.id, args.input.id))
      .returning();

    if (links) {
      // delete existing links
      await t.delete(usersToLinksTable).where(eq(usersToLinksTable.userId, user.id));

      // insert links to links table and map to user
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

      await t.insert(usersToLinksTable).values(
        newLinks.map((link) => ({
          userId: user.id,
          linkId: link.id,
        })),
      );
    }

    if (keywords) {
      // Delete existing keyword associations
      await t.delete(usersToKeywordsTable).where(eq(usersToKeywordsTable.userId, args.input.id));

      const keywordIds = [];

      for (const keyword of keywords) {
        let existingKeyword = await t
          .select()
          .from(keywordsTable)
          .where(eq(keywordsTable.name, keyword.toLowerCase().trim()))
          .then((results) => results[0]);

        if (!existingKeyword) {
          const [newKeyword] = await t
            .insert(keywordsTable)
            .values({ name: keyword.toLowerCase().trim() })
            .returning();
          existingKeyword = newKeyword;
        }

        keywordIds.push(existingKeyword.id);
      }

      if (keywordIds.length > 0) {
        await t
          .insert(usersToKeywordsTable)
          .values(
            keywordIds.map((keywordId) => ({
              userId: args.input.id,
              keywordId,
              type: 'role' as const,
            })),
          )
          .onConflictDoNothing();
      }
    }

    if (userData.image) {
      const [imageFile] = await t
        .select()
        .from(filesTable)
        .where(eq(filesTable.uploadedById, userData.id));
      if (imageFile) {
        await ctx.server.fileManager.deleteFile(imageFile.id);
      }
      const fileUrl = await ctx.server.fileManager.uploadFile({
        file: userData.image,
        userId: userData.id,
      });
      await t.update(usersTable).set({ image: fileUrl }).where(eq(usersTable.id, userData.id));
    }

    return user;
  });
}

export function deleteUserResolver(_root: Root, args: { id: string }, ctx: Context) {
  return ctx.db.transaction(async (t) => {
    await t.delete(usersToLinksTable).where(eq(usersToLinksTable.userId, args.id));
    const [user] = await t.delete(usersTable).where(eq(usersTable.id, args.id)).returning();
    return user;
  });
}

export async function getProfileResolver(_root: Root, _args: Args, ctx: Context) {
  const user = requireUser(ctx);
  return user;
}

export function updateProfileResolver(
  _root: Root,
  args: { input: typeof UserUpdateInput.$inferInput },
  ctx: Context,
) {
  const loggedinUser = requireUser(ctx);

  if (loggedinUser.id !== args.input.id && !loggedinUser.role?.endsWith('admin')) {
    throw new Error('Unauthorized');
  }

  const { links, keywords, roleKeywords, skillKeywords, ...userData } = args.input;

  const filteredUserData = filterEmptyValues<User>(userData);

  return ctx.db.transaction(async (t) => {
    const [user] = await t
      .update(usersTable)
      .set({
        ...filteredUserData,
        links: links as { url: string; title: string }[],
      })
      .where(eq(usersTable.id, loggedinUser.id))
      .returning();

    if (links) {
      // delete existing links
      await t.delete(usersToLinksTable).where(eq(usersToLinksTable.userId, loggedinUser.id));

      // insert links to links table and map to user
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

      await t.insert(usersToLinksTable).values(
        newLinks.map((link) => ({
          userId: loggedinUser.id,
          linkId: link.id,
        })),
      );
    }

    // Handle role keywords
    if (roleKeywords !== undefined) {
      // Delete existing role keyword associations
      await t
        .delete(usersToKeywordsTable)
        .where(
          and(
            eq(usersToKeywordsTable.userId, loggedinUser.id),
            eq(usersToKeywordsTable.type, 'role'),
          ),
        );

      const keywordIds = [];

      for (const keyword of roleKeywords || []) {
        let existingKeyword = await t
          .select()
          .from(keywordsTable)
          .where(eq(keywordsTable.name, keyword.toLowerCase().trim()))
          .then((results) => results[0]);

        if (!existingKeyword) {
          const [newKeyword] = await t
            .insert(keywordsTable)
            .values({ name: keyword.toLowerCase().trim() })
            .returning();
          existingKeyword = newKeyword;
        }

        keywordIds.push(existingKeyword.id);
      }

      if (keywordIds.length > 0) {
        await t
          .insert(usersToKeywordsTable)
          .values(
            keywordIds.map((keywordId) => ({
              userId: loggedinUser.id,
              keywordId,
              type: 'role' as const,
            })),
          )
          .onConflictDoNothing();
      }
    }

    // Handle skill keywords
    if (skillKeywords !== undefined) {
      // Delete existing skill keyword associations
      await t
        .delete(usersToKeywordsTable)
        .where(
          and(
            eq(usersToKeywordsTable.userId, loggedinUser.id),
            eq(usersToKeywordsTable.type, 'skill'),
          ),
        );

      const keywordIds = [];

      for (const keyword of skillKeywords || []) {
        let existingKeyword = await t
          .select()
          .from(keywordsTable)
          .where(eq(keywordsTable.name, keyword.toLowerCase().trim()))
          .then((results) => results[0]);

        if (!existingKeyword) {
          const [newKeyword] = await t
            .insert(keywordsTable)
            .values({ name: keyword.toLowerCase().trim() })
            .returning();
          existingKeyword = newKeyword;
        }

        keywordIds.push(existingKeyword.id);
      }

      if (keywordIds.length > 0) {
        await t
          .insert(usersToKeywordsTable)
          .values(
            keywordIds.map((keywordId) => ({
              userId: loggedinUser.id,
              keywordId,
              type: 'skill' as const,
            })),
          )
          .onConflictDoNothing();
      }
    }

    // Handle legacy keywords field (for backward compatibility)
    if (keywords) {
      // Delete existing keyword associations
      await t
        .delete(usersToKeywordsTable)
        .where(
          and(
            eq(usersToKeywordsTable.userId, loggedinUser.id),
            eq(usersToKeywordsTable.type, 'role'),
          ),
        );

      const keywordIds = [];

      for (const keyword of keywords) {
        let existingKeyword = await t
          .select()
          .from(keywordsTable)
          .where(eq(keywordsTable.name, keyword.toLowerCase().trim()))
          .then((results) => results[0]);

        if (!existingKeyword) {
          const [newKeyword] = await t
            .insert(keywordsTable)
            .values({ name: keyword.toLowerCase().trim() })
            .returning();
          existingKeyword = newKeyword;
        }

        keywordIds.push(existingKeyword.id);
      }

      if (keywordIds.length > 0) {
        await t
          .insert(usersToKeywordsTable)
          .values(
            keywordIds.map((keywordId) => ({
              userId: loggedinUser.id,
              keywordId,
              type: 'role' as const,
            })),
          )
          .onConflictDoNothing();
      }
    }

    if (userData.image) {
      const [imageFile] = await t
        .select()
        .from(filesTable)
        .where(eq(filesTable.uploadedById, userData.id));
      if (imageFile) {
        await ctx.server.fileManager.deleteFile(imageFile.id);
      }
      const fileUrl = await ctx.server.fileManager.uploadFile({
        file: userData.image,
        userId: loggedinUser.id,
      });
      await t.update(usersTable).set({ image: fileUrl }).where(eq(usersTable.id, loggedinUser.id));
    }

    return user;
  });
}

export async function getUserAvatarResolver(_root: Root, args: { userId: string }, ctx: Context) {
  const [file] = await ctx.db
    .select()
    .from(filesTable)
    .where(eq(filesTable.uploadedById, args.userId))
    .orderBy(desc(filesTable.createdAt))
    .limit(1);

  if (!file) {
    return null;
  }

  return {
    filename: file.originalName,
    mimetype: file.mimeType,
    createReadStream: () => {
      const bucketFile = ctx.server.fileManager.bucket.file(file.path);
      return bucketFile.createReadStream();
    },
  } as unknown as UploadFile;
}

export async function getUserKeywordsByUserIdResolver(
  _root: Root,
  args: { userId: string; type?: 'role' | 'skill' },
  ctx: Context,
) {
  const whereConditions = [eq(usersToKeywordsTable.userId, args.userId)];

  if (args.type) {
    whereConditions.push(eq(usersToKeywordsTable.type, args.type));
  }

  const keywordRelations = await ctx.db
    .select()
    .from(usersToKeywordsTable)
    .where(and(...whereConditions));

  if (!keywordRelations.length) return [];

  const keywordIds = keywordRelations.map((r) => r.keywordId);
  const keywords = await ctx.db
    .select()
    .from(keywordsTable)
    .where(inArray(keywordsTable.id, keywordIds));

  return keywords;
}

export async function addUserKeywordResolver(
  _root: Root,
  args: { userId: string; keyword: string; type?: 'role' | 'skill' | null },
  ctx: Context,
) {
  return await ctx.db.transaction(async (t) => {
    const [user] = await t.select().from(usersTable).where(eq(usersTable.id, args.userId));

    if (!user) {
      throw new Error('User not found');
    }

    const keywordType = args.type || 'role';

    let existingKeyword = await t
      .select()
      .from(keywordsTable)
      .where(eq(keywordsTable.name, args.keyword.toLowerCase().trim()))
      .then((results) => results[0]);

    if (!existingKeyword) {
      const [newKeyword] = await t
        .insert(keywordsTable)
        .values({ name: args.keyword.toLowerCase().trim() })
        .returning();
      existingKeyword = newKeyword;
    }

    await t
      .insert(usersToKeywordsTable)
      .values({
        userId: args.userId,
        keywordId: existingKeyword.id,
        type: keywordType,
      })
      .onConflictDoNothing();

    return existingKeyword;
  });
}

export async function removeUserKeywordResolver(
  _root: Root,
  args: { userId: string; keyword: string; type?: 'role' | 'skill' | null },
  ctx: Context,
) {
  return await ctx.db.transaction(async (t) => {
    const [user] = await t.select().from(usersTable).where(eq(usersTable.id, args.userId));

    if (!user) {
      throw new Error('User not found');
    }

    const keywordType = args.type || 'role';

    const existingKeyword = await t
      .select()
      .from(keywordsTable)
      .where(eq(keywordsTable.name, args.keyword.toLowerCase().trim()))
      .then((results) => results[0]);

    if (!existingKeyword) {
      throw new Error('Keyword not found');
    }

    await t
      .delete(usersToKeywordsTable)
      .where(
        and(
          eq(usersToKeywordsTable.userId, args.userId),
          eq(usersToKeywordsTable.keywordId, existingKeyword.id),
          eq(usersToKeywordsTable.type, keywordType),
        ),
      );

    return true;
  });
}

// Ban management resolvers
export async function banUserResolver(
  _root: Root,
  args: { userId: string; reason?: string | null },
  ctx: Context,
): Promise<User> {
  const currentUser = requireUser(ctx);

  // Cannot ban yourself
  if (currentUser.id === args.userId) {
    throw new Error('Cannot ban yourself');
  }

  // Check if target user exists
  const [targetUser] = await ctx.db.select().from(usersTable).where(eq(usersTable.id, args.userId));

  if (!targetUser) {
    throw new Error('User not found');
  }

  // Cannot ban superadmin
  if (targetUser.role === 'superadmin') {
    throw new Error('Cannot ban superadmin');
  }

  // Update user to banned
  const [bannedUser] = await ctx.db
    .update(usersTable)
    .set({
      banned: true,
      bannedAt: new Date(),
      bannedReason: args.reason,
    })
    .where(eq(usersTable.id, args.userId))
    .returning();

  return bannedUser;
}

export async function unbanUserResolver(
  _root: Root,
  args: { userId: string },
  ctx: Context,
): Promise<User> {
  // Check if user exists
  const [targetUser] = await ctx.db.select().from(usersTable).where(eq(usersTable.id, args.userId));

  if (!targetUser) {
    throw new Error('User not found');
  }

  // Update user to unbanned
  const [unbannedUser] = await ctx.db
    .update(usersTable)
    .set({
      banned: false,
      bannedAt: null,
      bannedReason: null,
    })
    .where(eq(usersTable.id, args.userId))
    .returning();

  return unbannedUser;
}

// Role management resolvers
export async function promoteToAdminResolver(
  _root: Root,
  args: { userId: string },
  ctx: Context,
): Promise<User> {
  // Ensure user is authenticated (admin check is done at GraphQL level)
  requireUser(ctx);

  // Check if target user exists
  const [targetUser] = await ctx.db.select().from(usersTable).where(eq(usersTable.id, args.userId));

  if (!targetUser) {
    throw new Error('User not found');
  }

  // Check if already admin
  if (targetUser.role === 'admin' || targetUser.role === 'superadmin') {
    throw new Error('User is already an admin');
  }

  // Promote to admin
  const [promotedUser] = await ctx.db
    .update(usersTable)
    .set({ role: 'admin' })
    .where(eq(usersTable.id, args.userId))
    .returning();

  return promotedUser;
}

export async function demoteFromAdminResolver(
  _root: Root,
  args: { userId: string },
  ctx: Context,
): Promise<User> {
  const currentUser = requireUser(ctx);

  // Cannot demote yourself
  if (currentUser.id === args.userId) {
    throw new Error('Cannot demote yourself');
  }

  // Check if target user exists
  const [targetUser] = await ctx.db.select().from(usersTable).where(eq(usersTable.id, args.userId));

  if (!targetUser) {
    throw new Error('User not found');
  }

  // Cannot demote superadmin
  if (targetUser.role === 'superadmin') {
    throw new Error('Cannot demote superadmin');
  }

  // Check if user is admin
  if (targetUser.role !== 'admin') {
    throw new Error('User is not an admin');
  }

  // Only superadmin can demote other admins
  if (currentUser.role !== 'superadmin') {
    throw new Error('Only superadmin can demote other admins');
  }

  // Demote to regular user
  const [demotedUser] = await ctx.db
    .update(usersTable)
    .set({ role: 'user' })
    .where(eq(usersTable.id, args.userId))
    .returning();

  return demotedUser;
}

// Admin user management query
export async function getAdminUsersResolver(
  _root: Root,
  args: {
    pagination?: typeof PaginationInput.$inferInput | null;
    includesBanned?: boolean | null;
    onlyBanned?: boolean | null;
    role?: 'user' | 'admin' | 'superadmin' | null;
  },
  ctx: Context,
) {
  const limit = args.pagination?.limit || 10;
  const offset = args.pagination?.offset || 0;
  const sort = args.pagination?.sort || 'desc';
  const filter = args.pagination?.filter || [];

  const filterPromises = filter.map(async (f) => {
    if (f.field === 'search') {
      return or(
        ilike(usersTable.firstName, `%${f.value}%`),
        ilike(usersTable.lastName, `%${f.value}%`),
        ilike(usersTable.organizationName, `%${f.value}%`),
        ilike(usersTable.email, `%${f.value}%`),
      );
    }
    switch (f.field) {
      case 'email':
        return f.value ? ilike(usersTable.email, `%${f.value}%`) : undefined;
      case 'firstName':
        return f.value ? ilike(usersTable.firstName, `%${f.value}%`) : undefined;
      case 'lastName':
        return f.value ? ilike(usersTable.lastName, `%${f.value}%`) : undefined;
      case 'organizationName':
        return f.value ? ilike(usersTable.organizationName, `%${f.value}%`) : undefined;
      default:
        return undefined;
    }
  });

  const filterConditions = (await Promise.all(filterPromises)).filter(Boolean);

  // Handle banned filter
  if (args.onlyBanned) {
    filterConditions.push(eq(usersTable.banned, true));
  } else if (!args.includesBanned) {
    filterConditions.push(eq(usersTable.banned, false));
  }

  // Handle role filter
  if (args.role) {
    filterConditions.push(eq(usersTable.role, args.role));
  }

  const where = filterConditions.length > 0 ? and(...filterConditions) : undefined;

  const data = await ctx.db
    .select()
    .from(usersTable)
    .where(where)
    .limit(limit)
    .offset(offset)
    .orderBy(sort === 'asc' ? asc(usersTable.createdAt) : desc(usersTable.createdAt));

  if (!validAndNotEmptyArray(data)) {
    return {
      data: [],
      count: 0,
    };
  }

  const [totalCount] = await ctx.db.select({ count: count() }).from(usersTable).where(where);

  return {
    data,
    count: totalCount.count,
  };
}
