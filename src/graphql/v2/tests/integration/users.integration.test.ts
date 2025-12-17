import { type NewUserV2, usersV2Table } from '@/db/schemas';
import { db } from '@/db/test-db';
import { sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { createTestServer } from '../helper';

describe('Users V2 GraphQL API - Integration Tests', () => {
  let server: FastifyInstance;
  let testUserId: number;
  let authToken: string;

  beforeAll(async () => {
    server = await createTestServer();
  });

  beforeEach(async () => {
    // Create a test user
    const testUser: NewUserV2 = {
      walletAddress: '0xTestUser1234567890123456789012345678901234',
      loginType: 'wallet',
      role: 'user',
      email: 'test@example.com',
      nickname: 'Test User',
    };
    const [insertedUser] = await db.insert(usersV2Table).values(testUser).returning();
    testUserId = insertedUser.id;

    // Login to get auth token
    const loginMutation = `
      mutation LoginV2($walletAddress: String!, $loginType: LoginTypeEnum!, $email: String) {
        loginV2(walletAddress: $walletAddress, loginType: $loginType, email: $email)
      }
    `;

    const loginResponse = await server.inject({
      method: 'POST',
      url: '/graphql',
      payload: {
        query: loginMutation,
        variables: {
          walletAddress: testUser.walletAddress,
          loginType: 'wallet',
          email: testUser.email,
        },
      },
    });

    const loginResult = JSON.parse(loginResponse.body);
    authToken = loginResult.data.loginV2;
  });

  afterEach(async () => {
    // Clean up
    await db.execute(sql`TRUNCATE TABLE users_v2 RESTART IDENTITY CASCADE`);
  });

  afterAll(async () => {
    // Clean up
    await db.execute(sql`TRUNCATE TABLE users_v2 RESTART IDENTITY CASCADE`);
  });

  describe('updateProfileV2', () => {
    it('should update current authenticated user profile', async () => {
      const mutation = `
        mutation UpdateProfileV2($input: UpdateProfileV2Input!) {
          updateProfileV2(input: $input) {
            id
            email
            firstName
            lastName
            walletAddress
            organizationName
            profileImage
            bio
            skills
            links
            createdAt
            updatedAt
          }
        }
      `;

      const variables = {
        input: {
          firstName: 'Updated First Name',
          lastName: 'Updated Last Name',
          email: 'updated@example.com',
          organizationName: 'Updated Organization',
          profileImage: 'https://example.com/profile.jpg',
          bio: 'Updated bio',
          skills: ['TypeScript', 'React', 'Node.js'],
          links: ['https://github.com/user', 'https://twitter.com/user'],
        },
      };

      const response = await server.inject({
        method: 'POST',
        url: '/graphql',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          query: mutation,
          variables,
        },
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);

      console.log('Update Profile Response:', JSON.stringify(result, null, 2));

      expect(result.data).toBeDefined();
      expect(result.data.updateProfileV2).toBeDefined();
      expect(result.data.updateProfileV2.id).toBe(String(testUserId));
      expect(result.data.updateProfileV2.email).toBe('updated@example.com');
      expect(result.data.updateProfileV2.firstName).toBe('Updated First Name');
      expect(result.data.updateProfileV2.lastName).toBe('Updated Last Name');
      expect(result.data.updateProfileV2.organizationName).toBe('Updated Organization');
      expect(result.data.updateProfileV2.profileImage).toBe('https://example.com/profile.jpg');
      expect(result.data.updateProfileV2.bio).toBe('Updated bio');
      expect(result.data.updateProfileV2.skills).toEqual(['TypeScript', 'React', 'Node.js']);
      expect(result.data.updateProfileV2.links).toEqual([
        'https://github.com/user',
        'https://twitter.com/user',
      ]);
      expect(result.data.updateProfileV2.walletAddress).toBe(
        '0xTestUser1234567890123456789012345678901234',
      );
    });

    it('should return unauthorized without auth token', async () => {
      const mutation = `
        mutation UpdateProfileV2($input: UpdateProfileV2Input!) {
          updateProfileV2(input: $input) {
            id
            email
          }
        }
      `;

      const variables = {
        input: {
          firstName: 'Test',
        },
      };

      const response = await server.inject({
        method: 'POST',
        url: '/graphql',
        payload: {
          query: mutation,
          variables,
        },
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);

      expect(result.errors).toBeDefined();
      expect(result.errors[0].message).toMatch(/unauthorized|Not authorized/i);
    });

    it('should partially update profile fields (only specified fields)', async () => {
      // First, ensure we have a user for this test
      const createUserMutation = `
        mutation {
          loginV2(walletAddress: "0xPartialUpdateTest", loginType: wallet, email: "partial@test.com")
        }
      `;

      const createResponse = await server.inject({
        method: 'POST',
        url: '/graphql',
        payload: {
          query: createUserMutation,
        },
      });

      const partialAuthToken = JSON.parse(createResponse.body).data.loginV2;

      const mutation = `
        mutation UpdateProfileV2($input: UpdateProfileV2Input!) {
          updateProfileV2(input: $input) {
            id
            firstName
            lastName
            bio
            email
          }
        }
      `;

      const variables = {
        input: {
          firstName: 'Partially Updated',
          bio: 'Partially updated bio',
        },
      };

      const response = await server.inject({
        method: 'POST',
        url: '/graphql',
        headers: {
          authorization: `Bearer ${partialAuthToken}`,
        },
        payload: {
          query: mutation,
          variables,
        },
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);

      console.log('Partial Update Response:', JSON.stringify(result, null, 2));

      expect(result.data).toBeDefined();
      expect(result.data.updateProfileV2).toBeDefined();
      expect(result.data.updateProfileV2.firstName).toBe('Partially Updated');
      expect(result.data.updateProfileV2.bio).toBe('Partially updated bio');
      expect(result.data.updateProfileV2.email).toBe('partial@test.com'); // Unchanged field
    });
  });

  describe('profileV2', () => {
    it('should get current authenticated user profile', async () => {
      const query = `
        query profileV2 {
          profileV2 {
            id
            email
            firstName
            lastName
            role
            loginType
            walletAddress
            organizationName
            profileImage
            bio
            skills
            links
            createdAt
            updatedAt
          }
        }
      `;

      const response = await server.inject({
        method: 'POST',
        url: '/graphql',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          query,
        },
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);

      expect(result.data).toBeDefined();
      expect(result.data.profileV2).toBeDefined();
      // GraphQL ID is always string, even if stored as number in DB
      expect(result.data.profileV2.id).toBe(String(testUserId));
      expect(result.data.profileV2.email).toBe('test@example.com');
      expect(result.data.profileV2.firstName).toBe('Test');
      expect(result.data.profileV2.lastName).toBe('User');
      expect(result.data.profileV2.walletAddress).toBe(
        '0xTestUser1234567890123456789012345678901234',
      );
    });

    it('should return unauthorized without auth token', async () => {
      const query = `
        query profileV2 {
          profileV2 {
            id
            email
          }
        }
      `;

      const response = await server.inject({
        method: 'POST',
        url: '/graphql',
        payload: {
          query,
        },
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);

      expect(result.errors).toBeDefined();
      expect(result.errors[0].message).toMatch(/unauthorized|Not authorized/i);
    });
  });
});
