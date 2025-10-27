import { usersV2Table } from '@/db/schemas/v2/usersV2';
import type { NewUserV2, UserV2 } from '@/db/schemas/v2/usersV2';
import { db } from '@/db/test-db';
import type { Context } from '@/types/context';
import { sql } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { beforeEach, describe, expect, it } from 'vitest';
import type { CreateUserV2Input, UpdateUserV2Input } from '../inputs/users';
import {
  createUserV2Resolver,
  deleteUserV2Resolver,
  getUserV2Resolver,
  getUsersV2Resolver,
  loginV2Resolver,
  queryUsersV2Resolver,
  updateUserV2Resolver,
} from '../resolvers/users';

// Mock JWT sign function
const mockJwtSign = (payload: unknown, _options: unknown) => {
  return `mock-jwt-token-${JSON.stringify(payload)}`;
};

// Mock FastifyInstance
const mockServer = {
  log: {
    info: () => {},
    warn: () => {},
    error: () => {},
    child: () => ({ info: () => {}, warn: () => {}, error: () => {} }),
    level: 'info',
    fatal: () => {},
    debug: () => {},
    trace: () => {},
  },
  jwt: {
    sign: mockJwtSign,
  },
} as unknown as FastifyInstance;

// Mock context
const mockContext = {
  db,
  server: mockServer,
  request: {} as FastifyRequest,
  reply: {} as FastifyReply,
  user: {} as UserV2,
} as unknown as Context;

describe('Users V2 GraphQL Resolvers', () => {
  let testUser: {
    id: number;
    email: string | null;
    walletAddress: string;
    loginType: 'wallet' | 'google' | 'farcaster';
    role: 'user' | 'admin';
    firstName: string | null;
    lastName: string | null;
  };

  beforeEach(async () => {
    // Clean up before each test and reset sequence
    await db.execute(sql`TRUNCATE TABLE users_v2 RESTART IDENTITY CASCADE`);
    await db.execute(sql`ALTER SEQUENCE users_v2_id_seq RESTART WITH 1`);
  });

  describe('createUserV2Resolver', () => {
    it('should create a new user with all fields', async () => {
      const input: typeof CreateUserV2Input.$inferInput = {
        loginType: 'wallet',
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        organizationName: 'Test Org',
        profileImage: 'https://example.com/profile.jpg',
        bio: 'This is a test user bio',
        skills: ['TypeScript', 'React', 'Web3'],
        links: ['https://github.com/johndoe', 'https://twitter.com/johndoe'],
      };

      const result = await createUserV2Resolver({}, { input }, mockContext);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(result.loginType).toBe('wallet');
      expect(result.walletAddress).toBe(input.walletAddress);
      expect(result.email).toBe(input.email);
      expect(result.firstName).toBe(input.firstName);
      expect(result.lastName).toBe(input.lastName);
      expect(result.organizationName).toBe(input.organizationName);
      expect(result.profileImage).toBe(input.profileImage);
      expect(result.bio).toBe(input.bio);
      expect(result.skills).toEqual(input.skills);
      expect(result.links).toEqual(input.links);
      expect(result.role).toBe('user'); // default value
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();

      testUser = result;
    });

    it('should create a user with minimal fields', async () => {
      const input: typeof CreateUserV2Input.$inferInput = {
        loginType: 'google',
        walletAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
        email: 'minimal@example.com',
      };

      const result = await createUserV2Resolver({}, { input }, mockContext);

      expect(result).toBeDefined();
      expect(result.loginType).toBe('google');
      expect(result.walletAddress).toBe(input.walletAddress);
      expect(result.email).toBe(input.email);
      expect(result.role).toBe('user');
      expect(result.firstName).toBeNull();
      expect(result.lastName).toBeNull();
      expect(result.skills).toBeNull();
      expect(result.links).toBeNull();
    });

    it('should create an admin user', async () => {
      const input: typeof CreateUserV2Input.$inferInput = {
        loginType: 'wallet',
        walletAddress: '0xadmin1234567890admin1234567890admin1234',
        role: 'admin',
      };

      const result = await createUserV2Resolver({}, { input }, mockContext);

      expect(result).toBeDefined();
      expect(result.role).toBe('admin');
    });
  });

  describe('getUserV2Resolver', () => {
    beforeEach(async () => {
      // Create a test user
      const newUser: NewUserV2 = {
        loginType: 'wallet',
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };
      const [user] = await db.insert(usersV2Table).values(newUser).returning();
      testUser = user;
    });

    it('should get a user by ID', async () => {
      const result = await getUserV2Resolver({}, { id: testUser.id.toString() }, mockContext);

      expect(result).toBeDefined();
      expect(result.id).toBe(testUser.id);
      expect(result.email).toBe(testUser.email);
      expect(result.firstName).toBe(testUser.firstName);
    });

    it('should throw error for non-existent user', async () => {
      await expect(getUserV2Resolver({}, { id: '999' }, mockContext)).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('getUsersV2Resolver', () => {
    beforeEach(async () => {
      // Clean up first
      await db.execute(sql`TRUNCATE TABLE users_v2 RESTART IDENTITY CASCADE`);
      await db.execute(sql`ALTER SEQUENCE users_v2_id_seq RESTART WITH 1`);

      // Create test users
      const users: NewUserV2[] = [
        {
          loginType: 'wallet',
          walletAddress: '0x1111111111111111111111111111111111111111',
          email: 'user1@example.com',
          firstName: 'Alice',
          lastName: 'Smith',
        },
        {
          loginType: 'google',
          walletAddress: '0x2222222222222222222222222222222222222222',
          email: 'user2@example.com',
          firstName: 'Bob',
          lastName: 'Johnson',
          role: 'admin',
        },
        {
          loginType: 'farcaster',
          walletAddress: '0x3333333333333333333333333333333333333333',
          firstName: 'Charlie',
          lastName: 'Brown',
        },
      ];

      await db.insert(usersV2Table).values(users);
    });

    it('should get paginated users list', async () => {
      const result = await getUsersV2Resolver({}, { query: { page: 1, limit: 2 } }, mockContext);

      expect(result).toBeDefined();
      expect(result.users).toHaveLength(2);
      expect(result.totalCount).toBe(3);
      expect(result.totalPages).toBe(2);
      expect(result.currentPage).toBe(1);
      expect(result.hasNextPage).toBe(true);
      expect(result.hasPreviousPage).toBe(false);
    });

    it('should filter users by role', async () => {
      const result = await getUsersV2Resolver({}, { query: { role: 'admin' } }, mockContext);

      expect(result).toBeDefined();
      expect(result.users).toHaveLength(1);
      expect(result.users[0].role).toBe('admin');
    });

    it('should filter users by login type', async () => {
      const result = await getUsersV2Resolver({}, { query: { loginType: 'wallet' } }, mockContext);

      expect(result).toBeDefined();
      expect(result.users).toHaveLength(1);
      expect(result.users[0].loginType).toBe('wallet');
    });

    it('should search users by name', async () => {
      const result = await getUsersV2Resolver({}, { query: { search: 'Alice' } }, mockContext);

      expect(result).toBeDefined();
      expect(result.users).toHaveLength(1);
      expect(result.users[0].firstName).toBe('Alice');
    });
  });

  describe('getUsersV2Resolver with search', () => {
    beforeEach(async () => {
      // Clean up first
      await db.execute(sql`TRUNCATE TABLE users_v2 RESTART IDENTITY CASCADE`);
      await db.execute(sql`ALTER SEQUENCE users_v2_id_seq RESTART WITH 1`);

      // Create test users
      const users: NewUserV2[] = [
        {
          loginType: 'wallet',
          walletAddress: '0x1111111111111111111111111111111111111111',
          email: 'developer@example.com',
          firstName: 'Alice',
          lastName: 'Developer',
          bio: 'Full-stack developer with React and TypeScript experience',
          skills: ['React', 'TypeScript', 'Node.js'],
        },
        {
          loginType: 'google',
          walletAddress: '0x2222222222222222222222222222222222222222',
          email: 'designer@example.com',
          firstName: 'Bob',
          lastName: 'Designer',
          bio: 'UI/UX designer specializing in Web3 interfaces',
          skills: ['Figma', 'Adobe XD', 'Web3'],
        },
      ];

      await db.insert(usersV2Table).values(users);
    });

    it('should search users by email', async () => {
      const result = await getUsersV2Resolver(
        {},
        {
          query: { search: 'developer@example.com', page: 1, limit: 10 },
        },
        mockContext,
      );

      expect(result).toBeDefined();
      expect(result.users).toHaveLength(1);
      expect(result.users[0].firstName).toBe('Alice');
    });

    it('should search users by wallet address', async () => {
      const result = await getUsersV2Resolver(
        {},
        {
          query: {
            search: '0x1111111111111111111111111111111111111111',
            page: 1,
            limit: 10,
          },
        },
        mockContext,
      );

      expect(result).toBeDefined();
      expect(result.users).toHaveLength(1);
      expect(result.users[0].firstName).toBe('Alice');
    });

    it('should search users by firstName', async () => {
      const result = await getUsersV2Resolver(
        {},
        {
          query: { search: 'Alice', page: 1, limit: 10 },
        },
        mockContext,
      );

      expect(result).toBeDefined();
      expect(result.users).toHaveLength(1);
      expect(result.users[0].firstName).toBe('Alice');
    });
  });

  describe('updateUserV2Resolver', () => {
    beforeEach(async () => {
      // Clean up first
      await db.execute(sql`TRUNCATE TABLE users_v2 RESTART IDENTITY CASCADE`);
      await db.execute(sql`ALTER SEQUENCE users_v2_id_seq RESTART WITH 1`);

      // Create a test user
      const newUser: NewUserV2 = {
        loginType: 'wallet',
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };
      const [user] = await db.insert(usersV2Table).values(newUser).returning();
      testUser = user;
    });

    it('should update user fields', async () => {
      const input = {
        id: testUser.id.toString(),
        firstName: 'Jane',
        lastName: 'Smith',
        bio: 'Updated bio',
        skills: ['Updated', 'Skills'],
      };

      const result = await updateUserV2Resolver({}, { input }, mockContext);

      expect(result).toBeDefined();
      expect(result.id).toBe(testUser.id);
      expect(result.firstName).toBe('Jane');
      expect(result.lastName).toBe('Smith');
      expect(result.bio).toBe('Updated bio');
      expect(result.skills).toEqual(['Updated', 'Skills']);
    });

    it('should update user role', async () => {
      const input: typeof UpdateUserV2Input.$inferInput = {
        id: testUser.id.toString(),
        role: 'admin',
      };

      const result = await updateUserV2Resolver({}, { input }, mockContext);

      expect(result).toBeDefined();
      expect(result.role).toBe('admin');
    });

    it('should throw error for non-existent user', async () => {
      const input = {
        id: '999',
        firstName: 'Test',
      };

      await expect(updateUserV2Resolver({}, { input }, mockContext)).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('deleteUserV2Resolver', () => {
    beforeEach(async () => {
      // Clean up first
      await db.execute(sql`TRUNCATE TABLE users_v2 RESTART IDENTITY CASCADE`);
      await db.execute(sql`ALTER SEQUENCE users_v2_id_seq RESTART WITH 1`);

      // Create a test user
      const newUser: NewUserV2 = {
        loginType: 'wallet',
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };
      const [user] = await db.insert(usersV2Table).values(newUser).returning();
      testUser = user;
    });

    it('should delete a user', async () => {
      const result = await deleteUserV2Resolver({}, { id: testUser.id.toString() }, mockContext);

      expect(result).toBe(true);

      // Verify user is deleted
      const [deletedUser] = await db
        .select()
        .from(usersV2Table)
        .where(sql`${usersV2Table.id} = ${testUser.id}`);
      expect(deletedUser).toBeUndefined();
    });

    it('should throw error for non-existent user', async () => {
      await expect(deleteUserV2Resolver({}, { id: '999' }, mockContext)).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('queryUsersV2Resolver', () => {
    beforeEach(async () => {
      // Clean up first
      await db.execute(sql`TRUNCATE TABLE users_v2 RESTART IDENTITY CASCADE`);
      await db.execute(sql`ALTER SEQUENCE users_v2_id_seq RESTART WITH 1`);

      // Create test users
      const users: NewUserV2[] = [
        {
          loginType: 'wallet',
          walletAddress: '0x1111111111111111111111111111111111111111',
          email: 'user1@example.com',
          firstName: 'Alice',
          lastName: 'Smith',
          role: 'user',
        },
        {
          loginType: 'google',
          walletAddress: '0x2222222222222222222222222222222222222222',
          email: 'user2@example.com',
          firstName: 'Bob',
          lastName: 'Johnson',
          role: 'admin',
        },
        {
          loginType: 'farcaster',
          walletAddress: '0x3333333333333333333333333333333333333333',
          email: 'user3@example.com',
          firstName: 'Charlie',
          lastName: 'Brown',
          role: 'user',
        },
      ];

      await db.insert(usersV2Table).values(users);
    });

    it('should query users by wallet address', async () => {
      const result = await queryUsersV2Resolver(
        {},
        {
          filter: [
            {
              field: 'walletAddress',
              value: '0x1111111111111111111111111111111111111111',
            },
          ],
        },
        mockContext,
      );

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].firstName).toBe('Alice');
    });

    it('should query users by email', async () => {
      const result = await queryUsersV2Resolver(
        {},
        {
          filter: [
            {
              field: 'email',
              value: 'user2@example.com',
            },
          ],
        },
        mockContext,
      );

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].firstName).toBe('Bob');
    });

    it('should query users with AND condition (wallet AND email)', async () => {
      const result = await queryUsersV2Resolver(
        {},
        {
          filter: [
            {
              field: 'walletAddress',
              value: '0x1111111111111111111111111111111111111111',
            },
            {
              field: 'email',
              value: 'user1@example.com',
            },
          ],
        },
        mockContext,
      );

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].firstName).toBe('Alice');
    });

    it('should return empty array when no match found', async () => {
      const result = await queryUsersV2Resolver(
        {},
        {
          filter: [
            {
              field: 'walletAddress',
              value: '0x9999999999999999999999999999999999999999',
            },
          ],
        },
        mockContext,
      );

      expect(result).toBeDefined();
      expect(result).toHaveLength(0);
    });

    it('should return all users when no filter provided', async () => {
      const result = await queryUsersV2Resolver(
        {},
        {
          filter: [],
        },
        mockContext,
      );

      expect(result).toBeDefined();
      expect(result).toHaveLength(3);
    });

    it('should query by role', async () => {
      const result = await queryUsersV2Resolver(
        {},
        {
          filter: [
            {
              field: 'role',
              value: 'admin',
            },
          ],
        },
        mockContext,
      );

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('admin');
    });
  });

  describe('loginV2Resolver', () => {
    beforeEach(async () => {
      // Clean up first
      await db.execute(sql`TRUNCATE TABLE users_v2 RESTART IDENTITY CASCADE`);
      await db.execute(sql`ALTER SEQUENCE users_v2_id_seq RESTART WITH 1`);
    });

    it('should create new user and return JWT token', async () => {
      const result = await loginV2Resolver(
        {},
        {
          walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
          loginType: 'wallet',
          email: 'newuser@example.com',
        },
        mockContext,
      );

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toContain('mock-jwt-token');

      // Verify user was created
      const [user] = await db
        .select()
        .from(usersV2Table)
        .where(sql`${usersV2Table.walletAddress} = '0x1234567890abcdef1234567890abcdef12345678'`);

      expect(user).toBeDefined();
      expect(user.email).toBe('newuser@example.com');
      expect(user.loginType).toBe('wallet');
      expect(user.role).toBe('user');
    });

    it('should login existing user and return JWT token', async () => {
      // Create a user first
      const newUser: NewUserV2 = {
        loginType: 'wallet',
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        email: 'existing@example.com',
      };
      await db.insert(usersV2Table).values(newUser);

      // Login with existing wallet
      const result = await loginV2Resolver(
        {},
        {
          walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
          loginType: 'wallet',
          email: 'existing@example.com',
        },
        mockContext,
      );

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toContain('mock-jwt-token');

      // Verify only one user exists
      const users = await db.select().from(usersV2Table);
      expect(users).toHaveLength(1);
    });

    it('should link email to existing wallet account', async () => {
      // Create user with wallet only
      const newUser: NewUserV2 = {
        loginType: 'wallet',
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        email: null,
      };
      await db.insert(usersV2Table).values(newUser);

      // Login with same wallet but add email
      const result = await loginV2Resolver(
        {},
        {
          walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
          loginType: 'google',
          email: 'linked@example.com',
        },
        mockContext,
      );

      expect(result).toBeDefined();

      // Verify email was added
      const [user] = await db
        .select()
        .from(usersV2Table)
        .where(sql`${usersV2Table.walletAddress} = '0x1234567890abcdef1234567890abcdef12345678'`);

      expect(user.email).toBe('linked@example.com');
      expect(user.loginType).toBe('google'); // Updated to latest login type
    });

    it('should update loginType on each login', async () => {
      // Create user with wallet
      const newUser: NewUserV2 = {
        loginType: 'wallet',
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        email: 'user@example.com',
      };
      await db.insert(usersV2Table).values(newUser);

      // Login with google
      await loginV2Resolver(
        {},
        {
          walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
          loginType: 'google',
          email: 'user@example.com',
        },
        mockContext,
      );

      // Verify loginType was updated
      const [user] = await db
        .select()
        .from(usersV2Table)
        .where(sql`${usersV2Table.walletAddress} = '0x1234567890abcdef1234567890abcdef12345678'`);

      expect(user.loginType).toBe('google');
    });

    it('should throw error when wallet is linked to different email', async () => {
      // Create user with wallet and email
      const newUser: NewUserV2 = {
        loginType: 'wallet',
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        email: 'original@example.com',
      };
      await db.insert(usersV2Table).values(newUser);

      // Try to login with same wallet but different email
      await expect(
        loginV2Resolver(
          {},
          {
            walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
            loginType: 'wallet',
            email: 'different@example.com',
          },
          mockContext,
        ),
      ).rejects.toThrow('This wallet is already associated with a different email address');
    });

    it('should create user without email', async () => {
      const result = await loginV2Resolver(
        {},
        {
          walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
          loginType: 'wallet',
        },
        mockContext,
      );

      expect(result).toBeDefined();

      // Verify user was created without email
      const [user] = await db
        .select()
        .from(usersV2Table)
        .where(sql`${usersV2Table.walletAddress} = '0x1234567890abcdef1234567890abcdef12345678'`);

      expect(user).toBeDefined();
      expect(user.email).toBeNull();
      expect(user.walletAddress).toBe('0x1234567890abcdef1234567890abcdef12345678');
    });
  });
});
