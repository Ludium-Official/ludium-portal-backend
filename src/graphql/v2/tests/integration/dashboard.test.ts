import type { NewUserV2 } from '@/db/schemas';
import { db } from '@/db/test-db';
import { sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { createTestServer } from '../helper';

describe('Dashboard V2 GraphQL API - Integration Tests', () => {
  let server: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    server = await createTestServer();
  });

  beforeEach(async () => {
    // Create a test user
    const testUser: NewUserV2 = {
      walletAddress: '0xTestDashboard123456789012345678901234567890',
      loginType: 'wallet',
      role: 'user',
      email: 'dashboard@example.com',
      nickname: 'Test User',
    };

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
    await db.execute(sql`TRUNCATE TABLE milestones_v2 RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE applications_v2 RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE programs_v2 RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE users_v2 RESTART IDENTITY CASCADE`);
  });

  afterAll(async () => {
    await db.execute(sql`TRUNCATE TABLE milestones_v2 RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE applications_v2 RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE programs_v2 RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE users_v2 RESTART IDENTITY CASCADE`);
  });

  describe('dashboardV2', () => {
    it('should return dashboard data for authenticated user', async () => {
      const query = `
        query GetDashboardV2 {
          dashboardV2 {
            hiringActivity {
              ... on SponsorHiringActivity {
                openPrograms
                ongoingPrograms
              }
            }
            jobActivity {
              appliedPrograms
              ongoingPrograms
            }
            sponsorPaymentOverview {
              label
              budget
            }
            builderPaymentOverview {
              label
              budget
            }
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

      const result = JSON.parse(response.body);
      expect(response.statusCode).toBe(200);
      expect(result.data).toBeDefined();
      expect(result.data.dashboardV2).toBeDefined();
      expect(result.data.dashboardV2.hiringActivity).toBeDefined();
      expect(result.data.dashboardV2.jobActivity).toBeDefined();
      expect(result.data.dashboardV2.sponsorPaymentOverview).toHaveLength(4);
      expect(result.data.dashboardV2.builderPaymentOverview).toHaveLength(4);
    });
  });
});
