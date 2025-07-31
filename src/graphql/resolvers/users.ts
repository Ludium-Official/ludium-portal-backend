import {
  type User,
  filesTable,
  linksTable,
  programUserRolesTable,
  programsTable,
  usersTable,
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

  // Add default filter for users with email not null
  const emailNotNullCondition = isNotNull(usersTable.email);
  const allConditions = [...validConditions, emailNotNullCondition];

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

export function createUserResolver(
  _root: Root,
  args: { input: typeof UserInput.$inferInput },
  ctx: Context,
) {
  const { links, ...userData } = args.input;

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

    return user;
  });
}

export function updateUserResolver(
  _root: Root,
  args: { input: typeof UserUpdateInput.$inferInput },
  ctx: Context,
) {
  const { links, ...userData } = args.input;

  return ctx.db.transaction(async (t) => {
    if (userData.image) {
      const [avatar] = await t
        .select()
        .from(filesTable)
        .where(eq(filesTable.uploadedById, userData.id));
      if (avatar) {
        await ctx.server.fileManager.deleteFile(avatar.id);
      }
      const fileUrl = await ctx.server.fileManager.uploadFile({
        file: userData.image,
        userId: userData.id,
      });
      await t.update(usersTable).set({ image: fileUrl }).where(eq(usersTable.id, userData.id));
    }

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

  const { links, ...userData } = args.input;

  const filteredUserData = filterEmptyValues<User>(userData);

  return ctx.db.transaction(async (t) => {
    if (userData.image) {
      const [avatar] = await t
        .select()
        .from(filesTable)
        .where(eq(filesTable.uploadedById, loggedinUser.id));
      if (avatar) {
        await ctx.server.fileManager.deleteFile(avatar.id);
      }
      const fileUrl = await ctx.server.fileManager.uploadFile({
        file: userData.image,
        userId: loggedinUser.id,
      });
      await t.update(usersTable).set({ image: fileUrl }).where(eq(usersTable.id, loggedinUser.id));
    }

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
