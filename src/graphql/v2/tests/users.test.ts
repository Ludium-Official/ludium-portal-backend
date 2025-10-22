import { usersV2Table } from '@/db/schemas/v2/usersV2';
import type { NewUserV2 } from '@/db/schemas/v2/usersV2';
import { db } from '@/db/test-db';
import { sql } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  createUserV2Resolver,
  deleteUserV2Resolver,
  getUserV2Resolver,
  getUsersV2Resolver,
  searchUsersV2Resolver,
  updateUserV2Resolver,
} from '../resolvers/users';

// Mock context
const mockContext = {
  db,
  server: {
    log: {
      info: () => {},
      warn: () => {},
      error: () => {},
    },
  },
} as {
  db: typeof db;
  server: {
    log: {
      info: (message: string) => void;
      warn: (message: string) => void;
      error: (message: string) => void;
    };
  };
};

describe('Users V2 GraphQL Resolvers', () => {
  let testUser: {
    id: number;
    email: string | null;
    walletAddress: string;
    loginType: string;
    role: string;
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
      const input = {
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

      const result = await createUserV2Resolver(null, { input }, mockContext);

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
      const input = {
        loginType: 'google',
        walletAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
        email: 'minimal@example.com',
      };

      const result = await createUserV2Resolver(null, { input }, mockContext);

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
      const input = {
        loginType: 'wallet',
        walletAddress: '0xadmin1234567890admin1234567890admin1234',
        role: 'admin',
      };

      const result = await createUserV2Resolver(null, { input }, mockContext);

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
      const result = await getUserV2Resolver(null, { id: testUser.id.toString() }, mockContext);

      expect(result).toBeDefined();
      expect(result.id).toBe(testUser.id);
      expect(result.email).toBe(testUser.email);
      expect(result.firstName).toBe(testUser.firstName);
    });

    it('should throw error for non-existent user', async () => {
      await expect(getUserV2Resolver(null, { id: '999' }, mockContext)).rejects.toThrow(
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
          firstName: 'Charlie',
          lastName: 'Brown',
          role: 'user',
        },
      ];

      await db.insert(usersV2Table).values(users);
    });

    it('should get paginated users list', async () => {
      const result = await getUsersV2Resolver(
        null,
        { pagination: { page: 1, limit: 2 } },
        mockContext,
      );

      expect(result).toBeDefined();
      expect(result.users).toHaveLength(2);
      expect(result.totalCount).toBe(3);
      expect(result.totalPages).toBe(2);
      expect(result.currentPage).toBe(1);
      expect(result.hasNextPage).toBe(true);
      expect(result.hasPreviousPage).toBe(false);
    });

    it('should filter users by role', async () => {
      const result = await getUsersV2Resolver(null, { pagination: { role: 'admin' } }, mockContext);

      expect(result).toBeDefined();
      expect(result.users).toHaveLength(1);
      expect(result.users[0].role).toBe('admin');
    });

    it('should filter users by login type', async () => {
      const result = await getUsersV2Resolver(
        null,
        { pagination: { loginType: 'wallet' } },
        mockContext,
      );

      expect(result).toBeDefined();
      expect(result.users).toHaveLength(1);
      expect(result.users[0].loginType).toBe('wallet');
    });

    it('should search users by name', async () => {
      const result = await getUsersV2Resolver(
        null,
        { pagination: { search: 'Alice' } },
        mockContext,
      );

      expect(result).toBeDefined();
      expect(result.users).toHaveLength(1);
      expect(result.users[0].firstName).toBe('Alice');
    });
  });

  describe('searchUsersV2Resolver', () => {
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

    it('should search users by bio', async () => {
      const result = await searchUsersV2Resolver(
        null,
        {
          search: { query: 'developer', fields: ['bio'] },
          pagination: { page: 1, limit: 10 },
        },
        mockContext,
      );

      expect(result).toBeDefined();
      expect(result.users).toHaveLength(1);
      expect(result.users[0].firstName).toBe('Alice');
    });

    it('should search users by skills', async () => {
      const result = await searchUsersV2Resolver(
        null,
        {
          search: { query: 'React', fields: ['firstName', 'lastName', 'bio'] },
          pagination: { page: 1, limit: 10 },
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

      const result = await updateUserV2Resolver(null, { input }, mockContext);

      expect(result).toBeDefined();
      expect(result.id).toBe(testUser.id);
      expect(result.firstName).toBe('Jane');
      expect(result.lastName).toBe('Smith');
      expect(result.bio).toBe('Updated bio');
      expect(result.skills).toEqual(['Updated', 'Skills']);
    });

    it('should update user role', async () => {
      const input = {
        id: testUser.id.toString(),
        role: 'admin',
      };

      const result = await updateUserV2Resolver(null, { input }, mockContext);

      expect(result).toBeDefined();
      expect(result.role).toBe('admin');
    });

    it('should throw error for non-existent user', async () => {
      const input = {
        id: '999',
        firstName: 'Test',
      };

      await expect(updateUserV2Resolver(null, { input }, mockContext)).rejects.toThrow(
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
      const result = await deleteUserV2Resolver(null, { id: testUser.id.toString() }, mockContext);

      expect(result).toBe(true);

      // Verify user is deleted
      const [deletedUser] = await db
        .select()
        .from(usersV2Table)
        .where(sql`${usersV2Table.id} = ${testUser.id}`);
      expect(deletedUser).toBeUndefined();
    });

    it('should throw error for non-existent user', async () => {
      await expect(deleteUserV2Resolver(null, { id: '999' }, mockContext)).rejects.toThrow(
        'User not found',
      );
    });
  });
});
