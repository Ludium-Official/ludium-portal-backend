import { usersV2Table } from '@/db/schemas/v2/usersV2';
import type { NewUserV2 } from '@/db/schemas/v2/usersV2';
import type { Context } from '@/types';
import { and, asc, count, desc, eq, ilike, isNotNull, isNull, or } from 'drizzle-orm';

// Get single user by ID
export async function getUserV2Resolver(_root: unknown, args: { id: string }, ctx: Context) {
  const startTime = Date.now();

  ctx.server.log.info(`🚀 Starting getUserV2 query for id: ${args.id}`);

  try {
    const [user] = await ctx.db
      .select()
      .from(usersV2Table)
      .where(eq(usersV2Table.id, Number.parseInt(args.id)));

    const duration = Date.now() - startTime;

    if (!user) {
      ctx.server.log.warn(`❌ User not found with id: ${args.id}`);
      throw new Error('User not found');
    }

    ctx.server.log.info(`✅ getUserV2 query completed in ${duration}ms`);
    return user;
  } catch (error) {
    const duration = Date.now() - startTime;
    ctx.server.log.error(`❌ getUserV2 query failed after ${duration}ms: ${error.message}`);
    throw error;
  }
}

// Get paginated users list
export async function getUsersV2Resolver(
  _root: unknown,
  args: {
    pagination?: {
      page?: number;
      limit?: number;
      search?: string;
      role?: string;
      loginType?: string;
      hasEmail?: boolean;
      sortBy?: string;
      sortOrder?: string;
    };
  },
  ctx: Context,
) {
  const startTime = Date.now();

  const {
    page = 1,
    limit = 10,
    search,
    role,
    loginType,
    hasEmail,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = args.pagination || {};

  ctx.server.log.info(
    `🚀 Starting getUsersV2 query with pagination: ${JSON.stringify(args.pagination)}`,
  );

  try {
    // Build where conditions
    const whereConditions = [];

    if (search) {
      const searchCondition = or(
        ilike(usersV2Table.firstName, `%${search}%`),
        ilike(usersV2Table.lastName, `%${search}%`),
        ilike(usersV2Table.email, `%${search}%`),
        ilike(usersV2Table.bio, `%${search}%`),
      );
      if (searchCondition) {
        whereConditions.push(searchCondition);
      }
    }

    if (role) {
      whereConditions.push(eq(usersV2Table.role, role as 'user' | 'admin'));
    }

    if (loginType) {
      whereConditions.push(
        eq(usersV2Table.loginType, loginType as 'google' | 'wallet' | 'farcaster'),
      );
    }

    if (hasEmail !== undefined) {
      if (hasEmail) {
        whereConditions.push(isNotNull(usersV2Table.email));
      } else {
        whereConditions.push(isNull(usersV2Table.email));
      }
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // Get total count
    const [totalResult] = await ctx.db
      .select({ count: count() })
      .from(usersV2Table)
      .where(whereClause);

    const totalCount = totalResult.count;
    const totalPages = Math.ceil(totalCount / limit);
    const offset = (page - 1) * limit;

    // Build sort clause
    let sortClause: ReturnType<typeof asc> | ReturnType<typeof desc>;
    switch (sortBy) {
      case 'firstName':
        sortClause =
          sortOrder === 'asc' ? asc(usersV2Table.firstName) : desc(usersV2Table.firstName);
        break;
      case 'lastName':
        sortClause = sortOrder === 'asc' ? asc(usersV2Table.lastName) : desc(usersV2Table.lastName);
        break;
      case 'updatedAt':
        sortClause =
          sortOrder === 'asc' ? asc(usersV2Table.updatedAt) : desc(usersV2Table.updatedAt);
        break;
      default:
        sortClause =
          sortOrder === 'asc' ? asc(usersV2Table.createdAt) : desc(usersV2Table.createdAt);
    }

    // Get users
    const users = await ctx.db
      .select()
      .from(usersV2Table)
      .where(whereClause)
      .orderBy(sortClause)
      .limit(limit)
      .offset(offset);

    const duration = Date.now() - startTime;

    ctx.server.log.info(
      `✅ getUsersV2 query completed in ${duration}ms - found ${users.length} users`,
    );

    return {
      users,
      totalCount,
      totalPages,
      currentPage: page,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    ctx.server.log.error(`❌ getUsersV2 query failed after ${duration}ms: ${error.message}`);
    throw error;
  }
}

// Search users with advanced filtering
export async function searchUsersV2Resolver(
  _root: unknown,
  args: {
    search: {
      query: string;
      fields?: string[];
      role?: string;
      loginType?: string;
      hasEmail?: boolean;
    };
    pagination?: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: string;
    };
  },
  ctx: Context,
) {
  const startTime = Date.now();

  const {
    query,
    fields = ['firstName', 'lastName', 'email', 'bio'],
    role,
    loginType,
    hasEmail,
  } = args.search;

  const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = args.pagination || {};

  ctx.server.log.info(
    `🚀 Starting searchUsersV2 query with search: ${JSON.stringify(args.search)}`,
  );

  try {
    // Build search conditions
    const searchConditions = [];

    if (fields.includes('firstName')) {
      searchConditions.push(ilike(usersV2Table.firstName, `%${query}%`));
    }
    if (fields.includes('lastName')) {
      searchConditions.push(ilike(usersV2Table.lastName, `%${query}%`));
    }
    if (fields.includes('email')) {
      searchConditions.push(ilike(usersV2Table.email, `%${query}%`));
    }
    if (fields.includes('bio')) {
      searchConditions.push(ilike(usersV2Table.bio, `%${query}%`));
    }

    const searchCondition = or(...searchConditions);
    const whereConditions = searchCondition ? [searchCondition] : [];

    if (role) {
      whereConditions.push(eq(usersV2Table.role, role as 'user' | 'admin'));
    }

    if (loginType) {
      whereConditions.push(
        eq(usersV2Table.loginType, loginType as 'google' | 'wallet' | 'farcaster'),
      );
    }

    if (hasEmail !== undefined) {
      if (hasEmail) {
        whereConditions.push(isNotNull(usersV2Table.email));
      } else {
        whereConditions.push(isNull(usersV2Table.email));
      }
    }

    const whereClause = and(...whereConditions);

    // Get total count
    const [totalResult] = await ctx.db
      .select({ count: count() })
      .from(usersV2Table)
      .where(whereClause);

    const totalCount = totalResult.count;
    const totalPages = Math.ceil(totalCount / limit);
    const offset = (page - 1) * limit;

    // Build sort clause
    let sortClause: ReturnType<typeof asc> | ReturnType<typeof desc>;
    switch (sortBy) {
      case 'firstName':
        sortClause =
          sortOrder === 'asc' ? asc(usersV2Table.firstName) : desc(usersV2Table.firstName);
        break;
      case 'lastName':
        sortClause = sortOrder === 'asc' ? asc(usersV2Table.lastName) : desc(usersV2Table.lastName);
        break;
      case 'updatedAt':
        sortClause =
          sortOrder === 'asc' ? asc(usersV2Table.updatedAt) : desc(usersV2Table.updatedAt);
        break;
      default:
        sortClause =
          sortOrder === 'asc' ? asc(usersV2Table.createdAt) : desc(usersV2Table.createdAt);
    }

    // Get users
    const users = await ctx.db
      .select()
      .from(usersV2Table)
      .where(whereClause)
      .orderBy(sortClause)
      .limit(limit)
      .offset(offset);

    const duration = Date.now() - startTime;

    ctx.server.log.info(
      `✅ searchUsersV2 query completed in ${duration}ms - found ${users.length} users`,
    );

    return {
      users,
      totalCount,
      totalPages,
      currentPage: page,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    ctx.server.log.error(`❌ searchUsersV2 query failed after ${duration}ms: ${error.message}`);
    throw error;
  }
}

// Create user
export async function createUserV2Resolver(
  _root: unknown,
  args: { input: Record<string, unknown> },
  ctx: Context,
) {
  const startTime = Date.now();

  ctx.server.log.info(`🚀 Starting createUserV2 with input: ${JSON.stringify(args.input)}`);

  try {
    const userData: NewUserV2 = {
      loginType: args.input.loginType,
      walletAddress: args.input.walletAddress,
      email: args.input.email || null,
      role: args.input.role || 'user',
      firstName: args.input.firstName || null,
      lastName: args.input.lastName || null,
      organizationName: args.input.organizationName || null,
      profileImage: args.input.profileImage || null,
      bio: args.input.bio || null,
      skills: args.input.skills || null,
      links: args.input.links || null,
    };

    const [newUser] = await ctx.db.insert(usersV2Table).values(userData).returning();

    const duration = Date.now() - startTime;

    ctx.server.log.info(`✅ createUserV2 completed in ${duration}ms - created user ${newUser.id}`);

    return newUser;
  } catch (error) {
    const duration = Date.now() - startTime;
    ctx.server.log.error(`❌ createUserV2 failed after ${duration}ms: ${error.message}`);
    throw error;
  }
}

// Update user
export async function updateUserV2Resolver(
  _root: unknown,
  args: { input: Record<string, unknown> },
  ctx: Context,
) {
  const startTime = Date.now();

  ctx.server.log.info(`🚀 Starting updateUserV2 for id: ${args.input.id}`);

  try {
    // Check if user exists
    const [existingUser] = await ctx.db
      .select()
      .from(usersV2Table)
      .where(eq(usersV2Table.id, Number.parseInt(args.input.id)));

    if (!existingUser) {
      throw new Error('User not found');
    }

    // Build update data
    const updateData: Partial<NewUserV2> = {};

    if (args.input.email !== undefined) updateData.email = args.input.email || null;
    if (args.input.walletAddress !== undefined) updateData.walletAddress = args.input.walletAddress;
    if (args.input.firstName !== undefined) updateData.firstName = args.input.firstName || null;
    if (args.input.lastName !== undefined) updateData.lastName = args.input.lastName || null;
    if (args.input.organizationName !== undefined)
      updateData.organizationName = args.input.organizationName || null;
    if (args.input.profileImage !== undefined)
      updateData.profileImage = args.input.profileImage || null;
    if (args.input.bio !== undefined) updateData.bio = args.input.bio || null;
    if (args.input.skills !== undefined) updateData.skills = args.input.skills || null;
    if (args.input.links !== undefined) updateData.links = args.input.links || null;
    if (args.input.role !== undefined) updateData.role = args.input.role;

    const [updatedUser] = await ctx.db
      .update(usersV2Table)
      .set(updateData)
      .where(eq(usersV2Table.id, Number.parseInt(args.input.id)))
      .returning();

    const duration = Date.now() - startTime;

    ctx.server.log.info(
      `✅ updateUserV2 completed in ${duration}ms - updated user ${updatedUser.id}`,
    );

    return updatedUser;
  } catch (error) {
    const duration = Date.now() - startTime;
    ctx.server.log.error(`❌ updateUserV2 failed after ${duration}ms: ${error.message}`);
    throw error;
  }
}

// Delete user
export async function deleteUserV2Resolver(_root: unknown, args: { id: string }, ctx: Context) {
  const startTime = Date.now();

  ctx.server.log.info(`🚀 Starting deleteUserV2 for id: ${args.id}`);

  try {
    // Check if user exists
    const [existingUser] = await ctx.db
      .select()
      .from(usersV2Table)
      .where(eq(usersV2Table.id, Number.parseInt(args.id)));

    if (!existingUser) {
      throw new Error('User not found');
    }

    await ctx.db.delete(usersV2Table).where(eq(usersV2Table.id, Number.parseInt(args.id)));

    const duration = Date.now() - startTime;

    ctx.server.log.info(`✅ deleteUserV2 completed in ${duration}ms - deleted user ${args.id}`);

    return true;
  } catch (error) {
    const duration = Date.now() - startTime;
    ctx.server.log.error(`❌ deleteUserV2 failed after ${duration}ms: ${error.message}`);
    throw error;
  }
}
