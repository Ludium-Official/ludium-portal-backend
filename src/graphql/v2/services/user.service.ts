import { filesTable } from '@/db/schemas';
import { usersV2Table } from '@/db/schemas/v2/users';
import type { NewUserV2, UserV2 } from '@/db/schemas/v2/users';
import type {
  CreateUserV2Input,
  UpdateProfileV2Input,
  UpdateUserV2Input,
  UserV2QueryFilterInput,
  UsersV2QueryInput,
} from '@/graphql/v2/inputs/users';
import type { Context } from '@/types';
import { and, asc, count, desc, eq, ilike, isNotNull, isNull, or } from 'drizzle-orm';

type LoginType = 'google' | 'wallet' | 'farcaster';
type UserRole = 'user' | 'admin';

interface PaginatedUsersV2Result {
  users: UserV2[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export class UserV2Service {
  constructor(
    private db: Context['db'],
    private server: Context['server'],
  ) {}

  async getById(id: string): Promise<UserV2> {
    const startTime = Date.now();
    this.server.log.info(`🚀 Starting UserV2Service.getById for id: ${id}`);

    try {
      const [user] = await this.db
        .select()
        .from(usersV2Table)
        .where(eq(usersV2Table.id, Number.parseInt(id)));

      const duration = Date.now() - startTime;

      if (!user) {
        this.server.log.warn(`❌ User not found with id: ${id}`);
        throw new Error('User not found');
      }

      this.server.log.info(`✅ UserV2Service.getById completed in ${duration}ms`);
      return user;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.server.log.error(
        `❌ UserV2Service.getById failed after ${duration}ms: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }

  async getMany(
    query?: typeof UsersV2QueryInput.$inferInput | null,
  ): Promise<PaginatedUsersV2Result> {
    const startTime = Date.now();
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 10;
    const sortBy = query?.sortBy ?? 'createdAt';
    const sortOrder = query?.sortOrder ?? 'desc';
    const search = query?.search;
    const role = query?.role;
    const loginType = query?.loginType;
    const hasEmail = query?.hasEmail;

    this.server.log.info(`🚀 Starting UserV2Service.getMany with params: ${JSON.stringify(query)}`);

    try {
      const whereConditions = [];
      if (search) {
        whereConditions.push(
          or(
            ilike(usersV2Table.walletAddress, `%${search}%`),
            ilike(usersV2Table.email, `%${search}%`),
            ilike(usersV2Table.firstName, `%${search}%`),
            ilike(usersV2Table.lastName, `%${search}%`),
          ),
        );
      }
      if (role) {
        whereConditions.push(eq(usersV2Table.role, role as UserRole));
      }
      if (loginType) {
        whereConditions.push(eq(usersV2Table.loginType, loginType as LoginType));
      }
      if (hasEmail !== undefined && hasEmail !== null) {
        whereConditions.push(hasEmail ? isNotNull(usersV2Table.email) : isNull(usersV2Table.email));
      }
      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      const [totalResult] = await this.db
        .select({ count: count() })
        .from(usersV2Table)
        .where(whereClause);
      const totalCount = totalResult.count;
      const totalPages = Math.ceil(totalCount / limit);
      const offset = (page - 1) * limit;

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

      const users = await this.db
        .select()
        .from(usersV2Table)
        .where(whereClause)
        .orderBy(sortClause)
        .limit(limit)
        .offset(offset);
      const duration = Date.now() - startTime;
      this.server.log.info(
        `✅ UserV2Service.getMany completed in ${duration}ms - found ${users.length} users`,
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
      this.server.log.error(
        `❌ UserV2Service.getMany failed after ${duration}ms: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }

  async queryUsers(args: {
    filter?: (typeof UserV2QueryFilterInput.$inferInput)[] | null;
  }): Promise<UserV2[]> {
    const startTime = Date.now();
    const filter = args.filter ?? [];
    this.server.log.info(
      `🚀 Starting UserV2Service.queryUsers with filters: ${JSON.stringify(filter)}`,
    );
    try {
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
              this.server.log.warn(`Unknown filter field: ${field}`);
          }
        }
      }
      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
      const users = await this.db
        .select()
        .from(usersV2Table)
        .where(whereClause)
        .orderBy(desc(usersV2Table.createdAt));
      const duration = Date.now() - startTime;
      this.server.log.info(
        `✅ UserV2Service.queryUsers completed in ${duration}ms - found ${users.length} users`,
      );
      return users;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.server.log.error(
        `❌ UserV2Service.queryUsers failed after ${duration}ms: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }

  async login(args: {
    walletAddress: string;
    loginType: string;
    email?: string | null;
  }): Promise<string> {
    const startTime = Date.now();
    try {
      const { email, walletAddress, loginType } = args;
      this.server.log.info({
        msg: '🚀 Starting V2 login process in Service',
        email,
        walletAddress,
        loginType,
      });

      const [foundUser] = await this.db
        .select()
        .from(usersV2Table)
        .where(
          or(eq(usersV2Table.email, email ?? ''), eq(usersV2Table.walletAddress, walletAddress)),
        );
      let user: UserV2 | null = null;

      if (!foundUser) {
        const [newUser] = await this.db
          .insert(usersV2Table)
          .values({
            email: email ?? null,
            walletAddress,
            loginType: loginType as LoginType,
            role: 'user',
          })
          .returning();
        user = newUser;
      } else {
        if (email && foundUser.email && foundUser.email !== email) {
          throw new Error('This wallet is already associated with a different email address');
        }
        if (walletAddress && foundUser.walletAddress && foundUser.walletAddress !== walletAddress) {
          throw new Error(
            'This email is already associated with a different wallet address. Please log in with your original authentication method.',
          );
        }

        const updateData: Partial<NewUserV2> = {};
        let needsUpdate = false;

        if (!foundUser.email && email) {
          updateData.email = email;
          needsUpdate = true;
        }
        if (!foundUser.walletAddress && walletAddress) {
          updateData.walletAddress = walletAddress;
          needsUpdate = true;
        }
        if (foundUser.loginType !== loginType) {
          updateData.loginType = loginType as LoginType;
          needsUpdate = true;
        }

        if (needsUpdate) {
          this.server.log.info({ msg: 'Updating existing user', updateData });
          const [updatedUser] = await this.db
            .update(usersV2Table)
            .set(updateData)
            .where(eq(usersV2Table.id, foundUser.id))
            .returning();
          user = updatedUser;
        } else {
          user = foundUser;
        }
      }

      if (!user) {
        throw new Error('User creation/update failed - no user object available');
      }

      const token = this.server.jwt.sign(
        { payload: { id: user.id, email: user.email, role: user.role } },
        { expiresIn: '7d' },
      );
      const duration = Date.now() - startTime;
      this.server.log.info({
        msg: '✅ V2 login completed successfully in Service',
        duration: `${duration}ms`,
        userId: user.id,
      });
      return token;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.server.log.error({
        msg: '❌ V2 login failed in Service',
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async create(input: typeof CreateUserV2Input.$inferInput): Promise<UserV2> {
    const userData: NewUserV2 = {
      loginType: input.loginType as LoginType,
      walletAddress: input.walletAddress,
      email: input.email ?? null,
      role: (input.role ?? 'user') as UserRole,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      organizationName: input.organizationName ?? null,
      profileImage: input.profileImage ?? null,
      bio: input.bio ?? null,
      skills: input.skills ?? null,
      links: input.links ?? null,
    };
    const [newUser] = await this.db.insert(usersV2Table).values(userData).returning();
    return newUser;
  }

  async update(input: typeof UpdateUserV2Input.$inferInput): Promise<UserV2> {
    const [existingUser] = await this.db
      .select()
      .from(usersV2Table)
      .where(eq(usersV2Table.id, Number.parseInt(input.id as string)));
    if (!existingUser) {
      throw new Error('User not found');
    }
    const updateData: Partial<Omit<NewUserV2, 'id'>> = {};
    if (input.email !== undefined) updateData.email = input.email ?? null;
    if (input.walletAddress !== undefined && input.walletAddress !== null) {
      updateData.walletAddress = input.walletAddress;
    }
    if (input.firstName !== undefined) updateData.firstName = input.firstName ?? null;
    if (input.lastName !== undefined) updateData.lastName = input.lastName ?? null;
    if (input.organizationName !== undefined)
      updateData.organizationName = input.organizationName ?? null;
    if (input.profileImage !== undefined) updateData.profileImage = input.profileImage ?? null;
    if (input.bio !== undefined) updateData.bio = input.bio ?? null;
    if (input.skills !== undefined) updateData.skills = input.skills ?? null;
    if (input.links !== undefined) updateData.links = input.links ?? null;
    if (input.role !== undefined) updateData.role = (input.role ?? 'user') as UserRole;

    const [updatedUser] = await this.db
      .update(usersV2Table)
      .set(updateData)
      .where(eq(usersV2Table.id, Number.parseInt(input.id as string)))
      .returning();
    return updatedUser;
  }

  async delete(id: string): Promise<boolean> {
    const [existingUser] = await this.db
      .select()
      .from(usersV2Table)
      .where(eq(usersV2Table.id, Number.parseInt(id)));
    if (!existingUser) {
      throw new Error('User not found');
    }
    await this.db.delete(usersV2Table).where(eq(usersV2Table.id, Number.parseInt(id)));
    return true;
  }

  async updateProfile(
    input: typeof UpdateProfileV2Input.$inferInput,
    userId: number,
  ): Promise<UserV2> {
    try {
      const [existingUser] = await this.db
        .select()
        .from(usersV2Table)
        .where(eq(usersV2Table.id, userId));
      if (!existingUser) {
        throw new Error('User not found');
      }

      const updateData: Partial<Omit<NewUserV2, 'id'>> = {};

      if (input.profileImage) {
        // Delete existing profile image if exists
        if (existingUser.profileImage) {
          const urlPattern = /https:\/\/storage\.googleapis\.com\/[^/]+\/(.+)/;
          const match = existingUser.profileImage.match(urlPattern);
          if (match) {
            const filePath = match[1];
            const [existingFile] = await this.db
              .select()
              .from(filesTable)
              .where(eq(filesTable.path, filePath))
              .limit(1);

            if (existingFile) {
              await this.server.fileManager.deleteFile(existingFile.id);
            }
          }
        }

        // Upload new profile image
        const fileUrl = await this.server.fileManager.uploadFile({
          file: input.profileImage,
          userId: String(userId),
          directory: 'users',
        });
        updateData.profileImage = fileUrl;
      }

      if (input.email !== undefined) updateData.email = input.email ?? null;
      if (input.firstName !== undefined) updateData.firstName = input.firstName ?? null;
      if (input.lastName !== undefined) updateData.lastName = input.lastName ?? null;
      if (input.organizationName !== undefined)
        updateData.organizationName = input.organizationName ?? null;
      if (input.bio !== undefined) updateData.bio = input.bio ?? null;
      if (input.skills !== undefined) updateData.skills = input.skills ?? null;
      if (input.links !== undefined) updateData.links = input.links ?? null;

      const [updatedUser] = await this.db
        .update(usersV2Table)
        .set(updateData)
        .where(eq(usersV2Table.id, userId))
        .returning();
      return updatedUser;
    } catch (error) {
      this.server.log.error({
        msg: '❌ UserV2Service.updateProfile failed',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
