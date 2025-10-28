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

    // Create a test user
    const testUser: NewUserV2 = {
      walletAddress: '0xTestUser1234567890123456789012345678901234',
      loginType: 'wallet',
      role: 'user',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
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

      // Debug output
      console.log('Full Response:', JSON.stringify(result, null, 2));

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
