import { usersV2Table } from '@/db/schemas/v2/usersV2';
import type { NewUserV2, UserV2 } from '@/db/schemas/v2/usersV2';
import type { Context, Root } from '@/types';
import { and, asc, count, desc, eq, ilike, isNotNull, isNull, or } from 'drizzle-orm';

// ============================================================================
// Type Definitions
// ============================================================================

type LoginType = 'google' | 'wallet' | 'farcaster';
type UserRole = 'user' | 'admin';

interface CreateUserV2Args {
  input: {
    loginType: string; // GraphQL에서 string으로 들어옴
    walletAddress: string;
    email?: string | null;
    role?: string | null; // GraphQL에서 string으로 들어옴
    firstName?: string | null;
    lastName?: string | null;
    organizationName?: string | null;
    profileImage?: string | null;
    bio?: string | null;
    skills?: string[] | null;
    links?: string[] | null;
  };
}

interface UpdateUserV2Args {
  input: {
    id: string;
    email?: string | null;
    walletAddress?: string;
    firstName?: string | null;
    lastName?: string | null;
    organizationName?: string | null;
    profileImage?: string | null;
    bio?: string | null;
    skills?: string[] | null;
    links?: string[] | null;
    role?: string | null; // GraphQL에서 string으로 들어옴
  };
}

interface UsersV2QueryArgs {
  page?: number | null;
  limit?: number | null;
  sortBy?: string | null;
  sortOrder?: string | null;
  search?: string | null;
  role?: string | null; // GraphQL에서 string으로 들어옴
  loginType?: string | null; // GraphQL에서 string으로 들어옴
  hasEmail?: boolean | null;
}

interface QueryUsersV2Args {
  filter?: Array<{
    field: string;
    value?: string | null;
  }> | null;
}

interface PaginatedUsersV2Result {
  users: UserV2[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// ============================================================================
// Query Resolvers
// ============================================================================

/**
 * Get a single user by ID
 */
export async function getUserV2Resolver(
  _root: Root,
  args: { id: string },
  ctx: Context,
): Promise<UserV2> {
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
    ctx.server.log.error(
      `❌ getUserV2 query failed after ${duration}ms: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    throw error;
  }
}

/**
 * Get paginated users list with filtering, searching, and sorting
 * This is the main unified resolver for all users queries
 */
export async function getUsersV2Resolver(
  _root: Root,
  args: { query?: UsersV2QueryArgs | null },
  ctx: Context,
): Promise<PaginatedUsersV2Result> {
  const startTime = Date.now();

  // Extract and set defaults
  const page = args.query?.page ?? 1;
  const limit = args.query?.limit ?? 10;
  const sortBy = args.query?.sortBy ?? 'createdAt';
  const sortOrder = args.query?.sortOrder ?? 'desc';
  const search = args.query?.search;
  const role = args.query?.role;
  const loginType = args.query?.loginType;
  const hasEmail = args.query?.hasEmail;

  ctx.server.log.info(`🚀 Starting getUsersV2 query with params: ${JSON.stringify(args.query)}`);

  try {
    // Build WHERE conditions
    const whereConditions = [];

    // Search condition (OR logic across multiple fields)
    if (search) {
      const searchConditions = [
        ilike(usersV2Table.walletAddress, `%${search}%`),
        ilike(usersV2Table.email, `%${search}%`),
        ilike(usersV2Table.firstName, `%${search}%`),
        ilike(usersV2Table.lastName, `%${search}%`),
      ];
      whereConditions.push(or(...searchConditions));
    }

    // Filter conditions
    if (role) {
      whereConditions.push(eq(usersV2Table.role, role));
    }

    if (loginType) {
      whereConditions.push(eq(usersV2Table.loginType, loginType));
    }

    if (hasEmail !== undefined && hasEmail !== null) {
      whereConditions.push(hasEmail ? isNotNull(usersV2Table.email) : isNull(usersV2Table.email));
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
    const sortColumn = (() => {
      switch (sortBy) {
        case 'firstName':
          return usersV2Table.firstName;
        case 'lastName':
          return usersV2Table.lastName;
        case 'updatedAt':
          return usersV2Table.updatedAt;
        default:
          return usersV2Table.createdAt;
      }
    })();

    const sortClause = sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);

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
    ctx.server.log.error(
      `❌ getUsersV2 query failed after ${duration}ms: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    throw error;
  }
}

/**
 * Query users with dynamic field=value filtering (AND logic)
 * Useful for exact field matching
 */
export async function queryUsersV2Resolver(
  _root: Root,
  args: QueryUsersV2Args,
  ctx: Context,
): Promise<UserV2[]> {
  const startTime = Date.now();

  const filter = args.filter ?? [];

  ctx.server.log.info(`🚀 Starting queryUsersV2 with filters: ${JSON.stringify(filter)}`);

  try {
    // Build where conditions from filters
    const whereConditions = [];

    for (const filterItem of filter) {
      const { field, value } = filterItem;

      if (value !== undefined && value !== null) {
        switch (field) {
          case 'walletAddress':
            whereConditions.push(eq(usersV2Table.walletAddress, value));
            break;
          case 'email':
            whereConditions.push(eq(usersV2Table.email, value));
            break;
          case 'role':
            whereConditions.push(eq(usersV2Table.role, value as UserRole));
            break;
          case 'loginType':
            whereConditions.push(eq(usersV2Table.loginType, value as LoginType));
            break;
          case 'firstName':
            whereConditions.push(eq(usersV2Table.firstName, value));
            break;
          case 'lastName':
            whereConditions.push(eq(usersV2Table.lastName, value));
            break;
          case 'organizationName':
            whereConditions.push(eq(usersV2Table.organizationName, value));
            break;
          default:
            ctx.server.log.warn(`Unknown filter field: ${field}`);
        }
      }
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // Get users (no pagination)
    const users = await ctx.db
      .select()
      .from(usersV2Table)
      .where(whereClause)
      .orderBy(desc(usersV2Table.createdAt));

    const duration = Date.now() - startTime;

    ctx.server.log.info(`✅ queryUsersV2 completed in ${duration}ms - found ${users.length} users`);

    return users;
  } catch (error) {
    const duration = Date.now() - startTime;
    ctx.server.log.error(
      `❌ queryUsersV2 failed after ${duration}ms: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    throw error;
  }
}

// ============================================================================
// Authentication Resolvers
// ============================================================================

/**
 * Login or create user (upsert)
 * Returns JWT token for authentication
 */
export async function loginV2Resolver(
  _root: Root,
  args: {
    walletAddress: string;
    loginType: string; // GraphQL에서 string으로 들어옴
    email?: string | null;
  },
  ctx: Context,
): Promise<string> {
  const startTime = Date.now();

  try {
    const { email, walletAddress, loginType } = args;

    ctx.server.log.info({
      msg: '🚀 Starting V2 login process',
      email,
      walletAddress,
      loginType,
    });

    // Check if user exists by email OR wallet address
    const queryStartTime = Date.now();

    const [foundUser] = await ctx.db
      .select()
      .from(usersV2Table)
      .where(
        or(eq(usersV2Table.email, email ?? ''), eq(usersV2Table.walletAddress, walletAddress)),
      );

    const queryDuration = Date.now() - queryStartTime;
    ctx.server.log.info({
      msg: 'Database query completed',
      duration: `${queryDuration}ms`,
      foundUser: !!foundUser,
    });

    let user: UserV2 | null = null;

    if (!foundUser) {
      // New user - create account
      ctx.server.log.info({ msg: 'Creating new user' });
      const insertStartTime = Date.now();

      const [newUser] = await ctx.db
        .insert(usersV2Table)
        .values({
          email: email ?? null,
          walletAddress,
          loginType,
          role: 'user',
        })
        .returning();

      const insertDuration = Date.now() - insertStartTime;
      ctx.server.log.info({
        msg: 'New user created',
        duration: `${insertDuration}ms`,
        userId: newUser.id,
      });

      user = newUser;
    } else {
      // Check for conflicts
      if (email && foundUser.email && foundUser.email !== email) {
        throw new Error('This wallet is already associated with a different email address');
      }

      if (walletAddress && foundUser.walletAddress && foundUser.walletAddress !== walletAddress) {
        throw new Error(
          'This email is already associated with a different wallet address. Please log in with your original authentication method.',
        );
      }

      // Only update empty fields to link accounts
      const updateData: Partial<NewUserV2> = {};

      // Only set email if user doesn't have one yet (linking wallet to email)
      if (!foundUser.email && email) {
        updateData.email = email;
      }

      // Only set wallet if user doesn't have one yet (linking email to wallet)
      if (!foundUser.walletAddress && walletAddress) {
        updateData.walletAddress = walletAddress;
      }

      // Always update loginType to track last login method
      updateData.loginType = loginType;

      // Only update if there are changes
      if (Object.keys(updateData).length > 0) {
        ctx.server.log.info({
          msg: 'Updating existing user',
          updateData,
        });
        const updateStartTime = Date.now();

        const [updatedUser] = await ctx.db
          .update(usersV2Table)
          .set(updateData)
          .where(eq(usersV2Table.id, foundUser.id))
          .returning();

        const updateDuration = Date.now() - updateStartTime;
        ctx.server.log.info({
          msg: 'User updated successfully',
          duration: `${updateDuration}ms`,
        });

        user = updatedUser;
      } else {
        ctx.server.log.info({ msg: 'No updates needed for existing user' });
        user = foundUser;
      }
    }

    if (!user) {
      throw new Error('User creation/update failed - no user object available');
    }

    // Generate JWT token
    ctx.server.log.info({
      msg: 'Generating JWT token',
      userId: user.id,
    });

    const token = ctx.server.jwt.sign(
      {
        payload: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      },
      {
        expiresIn: '7d',
      },
    );

    const duration = Date.now() - startTime;
    ctx.server.log.info({
      msg: '✅ V2 login completed successfully',
      duration: `${duration}ms`,
      userId: user.id,
    });

    return token;
  } catch (error) {
    const duration = Date.now() - startTime;
    ctx.server.log.error({
      msg: '❌ V2 login failed',
      duration: `${duration}ms`,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

// ============================================================================
// Mutation Resolvers
// ============================================================================

/**
 * Create a new user
 */
export async function createUserV2Resolver(
  _root: Root,
  args: CreateUserV2Args,
  ctx: Context,
): Promise<UserV2> {
  const startTime = Date.now();

  ctx.server.log.info(`🚀 Starting createUserV2 with input: ${JSON.stringify(args.input)}`);

  try {
    const userData: NewUserV2 = {
      loginType: args.input.loginType,
      walletAddress: args.input.walletAddress,
      email: args.input.email ?? null,
      role: args.input.role ?? 'user',
      firstName: args.input.firstName ?? null,
      lastName: args.input.lastName ?? null,
      organizationName: args.input.organizationName ?? null,
      profileImage: args.input.profileImage ?? null,
      bio: args.input.bio ?? null,
      skills: args.input.skills ?? null,
      links: args.input.links ?? null,
    };

    const [newUser] = await ctx.db.insert(usersV2Table).values(userData).returning();

    const duration = Date.now() - startTime;

    ctx.server.log.info(`✅ createUserV2 completed in ${duration}ms - created user ${newUser.id}`);

    return newUser;
  } catch (error) {
    const duration = Date.now() - startTime;
    ctx.server.log.error(
      `❌ createUserV2 failed after ${duration}ms: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    throw error;
  }
}

/**
 * Update an existing user
 */
export async function updateUserV2Resolver(
  _root: Root,
  args: UpdateUserV2Args,
  ctx: Context,
): Promise<UserV2> {
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

    // Build update data - only include fields that are explicitly provided
    const updateData: Partial<NewUserV2> = {};

    if (args.input.email !== undefined) updateData.email = args.input.email ?? null;
    if (args.input.walletAddress !== undefined) updateData.walletAddress = args.input.walletAddress;
    if (args.input.firstName !== undefined) updateData.firstName = args.input.firstName ?? null;
    if (args.input.lastName !== undefined) updateData.lastName = args.input.lastName ?? null;
    if (args.input.organizationName !== undefined)
      updateData.organizationName = args.input.organizationName ?? null;
    if (args.input.profileImage !== undefined)
      updateData.profileImage = args.input.profileImage ?? null;
    if (args.input.bio !== undefined) updateData.bio = args.input.bio ?? null;
    if (args.input.skills !== undefined) updateData.skills = args.input.skills ?? null;
    if (args.input.links !== undefined) updateData.links = args.input.links ?? null;
    if (args.input.role !== undefined) updateData.role = args.input.role ?? 'user';

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
    ctx.server.log.error(
      `❌ updateUserV2 failed after ${duration}ms: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    throw error;
  }
}

/**
 * Delete a user
 */
export async function deleteUserV2Resolver(
  _root: Root,
  args: { id: string },
  ctx: Context,
): Promise<boolean> {
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
    ctx.server.log.error(
      `❌ deleteUserV2 failed after ${duration}ms: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    throw error;
  }
}
