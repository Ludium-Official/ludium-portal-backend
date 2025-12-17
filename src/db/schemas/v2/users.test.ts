import { db } from '@/db/test-db';
import { sql } from 'drizzle-orm';
import { type NewUserV2, usersV2Table } from './users';

describe('Users V2 Table', () => {
  beforeEach(async () => {
    // Clean up before each test and reset sequence
    await db.execute(sql`TRUNCATE TABLE users_v2 RESTART IDENTITY CASCADE`);
    await db.execute(sql`ALTER SEQUENCE users_v2_id_seq RESTART WITH 1`);
  });

  it('should create and retrieve a new user with email and wallet', async () => {
    const newUser: NewUserV2 = {
      email: 'test@example.com',
      walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
      loginType: 'wallet',
      nickname: 'John',
      profileImage: 'https://example.com/profile.jpg',
      about: 'This is a test user about',
      skills: ['TypeScript', 'React', 'Web3'],
    };

    const insertedUsers = await db.insert(usersV2Table).values(newUser).returning();
    const user = insertedUsers[0];

    expect(user).toBeDefined();
    expect(user.email).toBe(newUser.email);
    expect(user.walletAddress).toBe(newUser.walletAddress);
    expect(user.loginType).toBe(newUser.loginType);
    expect(user.role).toBe('user'); // default value
    expect(user.nickname).toBe(newUser.nickname);
    expect(user.profileImage).toBe(newUser.profileImage);
    expect(user.about).toBe(newUser.about);
    expect(user.skills).toEqual(newUser.skills);
    expect(user.createdAt).toBeDefined();
    expect(user.updatedAt).toBeDefined();

    const selectedUsers = await db
      .select()
      .from(usersV2Table)
      .where(sql`${usersV2Table.id} = ${user.id}`);
    const selectedUser = selectedUsers[0];

    expect(selectedUser).toBeDefined();
    expect(selectedUser.id).toBe(user.id);
    expect(selectedUser.email).toBe(newUser.email);
    expect(selectedUser.walletAddress).toBe(newUser.walletAddress);
  });

  it('should create a user with only wallet address (no email)', async () => {
    const newUser: NewUserV2 = {
      walletAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
      loginType: 'wallet',
    };

    const insertedUsers = await db.insert(usersV2Table).values(newUser).returning();
    const user = insertedUsers[0];

    expect(user).toBeDefined();
    expect(user.walletAddress).toBe(newUser.walletAddress);
    expect(user.loginType).toBe(newUser.loginType);
    expect(user.email).toBeNull();
    expect(user.role).toBe('user'); // default value
  });

  it('should create a user with Google login', async () => {
    const newUser: NewUserV2 = {
      email: 'google@example.com',
      walletAddress: '0x9876543210fedcba9876543210fedcba98765432',
      loginType: 'google',
      nickname: 'Jane',
    };

    const insertedUsers = await db.insert(usersV2Table).values(newUser).returning();
    const user = insertedUsers[0];

    expect(user).toBeDefined();
    expect(user.email).toBe(newUser.email);
    expect(user.walletAddress).toBe(newUser.walletAddress);
    expect(user.loginType).toBe('google');
    expect(user.nickname).toBe(newUser.nickname);
  });

  it('should create a user with Farcaster login', async () => {
    const newUser: NewUserV2 = {
      email: 'farcaster@example.com',
      walletAddress: '0xfedcba0987654321fedcba0987654321fedcba09',
      loginType: 'farcaster',
      nickname: 'Alice',
      about: 'Farcaster user about',
    };

    const insertedUsers = await db.insert(usersV2Table).values(newUser).returning();
    const user = insertedUsers[0];

    expect(user).toBeDefined();
    expect(user.loginType).toBe('farcaster');
    expect(user.about).toBe(newUser.about);
  });

  it('should create an admin user', async () => {
    const newUser: NewUserV2 = {
      email: 'admin@example.com',
      walletAddress: '0xadmin1234567890admin1234567890admin1234',
      loginType: 'wallet',
      role: 'admin',
      nickname: 'Admin',
    };

    const insertedUsers = await db.insert(usersV2Table).values(newUser).returning();
    const user = insertedUsers[0];

    expect(user).toBeDefined();
    expect(user.role).toBe('admin');
    expect(user.email).toBe(newUser.email);
    expect(user.walletAddress).toBe(newUser.walletAddress);
  });

  it('should enforce unique constraint on email and wallet combination', async () => {
    const user1: NewUserV2 = {
      email: 'duplicate@example.com',
      walletAddress: '0xduplicate1234567890duplicate1234567890du',
      loginType: 'wallet',
    };

    const user2: NewUserV2 = {
      email: 'duplicate@example.com',
      walletAddress: '0xduplicate1234567890duplicate1234567890du',
      loginType: 'google',
    };

    // First user should be created successfully
    await db.insert(usersV2Table).values(user1);

    // Second user with same email and wallet should fail
    await expect(db.insert(usersV2Table).values(user2)).rejects.toThrow();
  });

  it('should allow same email with different wallet addresses', async () => {
    const user1: NewUserV2 = {
      email: 'same@example.com',
      walletAddress: '0xwallet1111111111111111111111111111111111',
      loginType: 'wallet',
    };

    const user2: NewUserV2 = {
      email: 'same@example.com',
      walletAddress: '0xwallet2222222222222222222222222222222222',
      loginType: 'google',
    };

    // Both users should be created successfully
    const insertedUsers1 = await db.insert(usersV2Table).values(user1).returning();

    const insertedUsers2 = await db.insert(usersV2Table).values(user2).returning();

    expect(insertedUsers1[0]).toBeDefined();
    expect(insertedUsers2[0]).toBeDefined();
    expect(insertedUsers1[0].id).not.toBe(insertedUsers2[0].id);
  });

  it('should allow same wallet address with different emails', async () => {
    const user1: NewUserV2 = {
      email: 'email1@example.com',
      walletAddress: '0xsamewallet111111111111111111111111111111',
      loginType: 'wallet',
    };

    const user2: NewUserV2 = {
      email: 'email2@example.com',
      walletAddress: '0xsamewallet111111111111111111111111111111',
      loginType: 'farcaster',
    };

    // Both users should be created successfully
    const insertedUsers1 = await db.insert(usersV2Table).values(user1).returning();
    const insertedUsers2 = await db.insert(usersV2Table).values(user2).returning();

    expect(insertedUsers1[0]).toBeDefined();
    expect(insertedUsers2[0]).toBeDefined();
    expect(insertedUsers1[0].id).not.toBe(insertedUsers2[0].id.toString());
  });

  it('should handle empty arrays for skills and links', async () => {
    const newUser: NewUserV2 = {
      email: 'empty@example.com',
      walletAddress: '0xempty1234567890empty1234567890empty1234',
      loginType: 'wallet',
      skills: [],
    };

    const insertedUsers = await db.insert(usersV2Table).values(newUser).returning();
    const user = insertedUsers[0];

    expect(user).toBeDefined();
    expect(user.skills).toEqual([]);
  });

  it('should handle null values for optional fields', async () => {
    const newUser: NewUserV2 = {
      email: 'null@example.com',
      walletAddress: '0xnull1234567890null1234567890null123456',
      loginType: 'wallet',
      nickname: null,
      profileImage: null,
      about: null,
    };

    const insertedUsers = await db.insert(usersV2Table).values(newUser).returning();
    const user = insertedUsers[0];

    expect(user).toBeDefined();
    expect(user.nickname).toBeNull();
    expect(user.profileImage).toBeNull();
    expect(user.about).toBeNull();
  });
});
