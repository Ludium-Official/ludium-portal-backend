import {
  type NewApplicationV2,
  type NewProgramV2,
  type NewUserV2,
  applicationsV2Table,
  programsV2Table,
  usersV2Table,
} from '@/db/schemas';
import { applicationStatusV2Values } from '@/db/schemas/v2/applications';
import { type NewNetworkType, networksTable } from '@/db/schemas/v2/networks';
import { type NewTokenType, tokensTable } from '@/db/schemas/v2/tokens';
import { db } from '@/db/test-db';
import { sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { createTestServer } from '../helper';

describe('Programs V2 - Subquery Tests (Joined Queries with application_count)', () => {
  let server: FastifyInstance;
  let testUserId: number;
  let testNetworkId: number;
  let testTokenId: number;
  let authToken: string;
  let applicantUserIds: number[] = [];

  beforeAll(async () => {
    server = await createTestServer();
  });

  beforeEach(async () => {
    // Create a test user (creator/sponsor)
    const testUser: NewUserV2 = {
      walletAddress: '0xTestCreator1234567890123456789012345678901234',
      loginType: 'wallet',
      role: 'user',
      email: 'creator@example.com',
      nickname: 'Test User',
    };
    const [insertedUser] = await db.insert(usersV2Table).values(testUser).returning();
    testUserId = insertedUser.id;

    // Create applicant users
    const applicants: NewUserV2[] = Array.from({ length: 5 }, (_, i) => ({
      walletAddress: `0xApplicant${i + 1}1234567890123456789012345678901234`,
      loginType: 'wallet',
      role: 'user',
      email: `applicant${i + 1}@example.com`,
      firstName: 'Applicant',
      lastName: `${i + 1}`,
    }));
    const insertedApplicants = await db.insert(usersV2Table).values(applicants).returning();
    applicantUserIds = insertedApplicants.map((u) => u.id);

    // Create a test network
    const testNetwork: NewNetworkType = {
      chainId: 1,
      chainName: 'ethereum',
      mainnet: true,
      exploreUrl: 'https://etherscan.io',
    };
    const [insertedNetwork] = await db.insert(networksTable).values(testNetwork).returning();
    testNetworkId = insertedNetwork.id;

    // Create a test token
    const testToken: NewTokenType = {
      chainInfoId: testNetworkId,
      tokenName: 'USDC',
      tokenAddress: '0xA0b86a33E6441b8C4C8C0C4C8C0C4C8C0C4C8C0',
      decimals: 6,
    };
    const [insertedToken] = await db.insert(tokensTable).values(testToken).returning();
    testTokenId = insertedToken.id;

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
    await db.execute(sql`TRUNCATE TABLE applications_v2 RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE programs_v2 RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE tokens RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE networks RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE users_v2 RESTART IDENTITY CASCADE`);
    applicantUserIds = [];
  });

  afterAll(async () => {
    // Final clean up
    await db.execute(sql`TRUNCATE TABLE applications_v2 RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE programs_v2 RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE tokens RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE networks RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE users_v2 RESTART IDENTITY CASCADE`);
  });

  describe('applicationCount in programsV2 query', () => {
    it('should return applicationCount as 0 when program has no applications', async () => {
      const deadline = new Date();
      deadline.setMonth(deadline.getMonth() + 1);

      const newProgram: NewProgramV2 = {
        title: 'Program with No Applications',
        description: 'A program with zero applications',
        skills: ['testing'],
        deadline,
        visibility: 'public',
        networkId: testNetworkId,
        price: '1000',
        token_id: testTokenId,
        status: 'open',
        sponsorId: testUserId,
      };
      const [insertedProgram] = await db.insert(programsV2Table).values(newProgram).returning();

      const query = `
        query GetProgramsV2 {
          programsV2 {
            data {
              id
              title
              applicationCount
            }
            count
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

      if (result.errors) {
        console.error('GraphQL Errors:', JSON.stringify(result.errors, null, 2));
      }

      expect(result.data).toBeDefined();
      expect(result.data.programsV2).toBeDefined();
      expect(result.data.programsV2.data.length).toBeGreaterThan(0);

      const program = result.data.programsV2.data.find(
        (p: { id: string }) => p.id === insertedProgram.id.toString(),
      );

      expect(program).toBeDefined();
      expect(program.applicationCount).toBe(0);
    });

    it('should return correct applicationCount when program has applications', async () => {
      const deadline = new Date();
      deadline.setMonth(deadline.getMonth() + 1);

      const newProgram: NewProgramV2 = {
        title: 'Program with Applications',
        description: 'A program with multiple applications',
        skills: ['testing'],
        deadline,
        visibility: 'public',
        networkId: testNetworkId,
        price: '1000',
        token_id: testTokenId,
        status: 'open',
        sponsorId: testUserId,
      };
      const [insertedProgram] = await db.insert(programsV2Table).values(newProgram).returning();

      // Create 3 applications for this program
      const applications: NewApplicationV2[] = Array.from({ length: 3 }, (_, i) => ({
        programId: insertedProgram.id,
        applicantId: applicantUserIds[i],
        title: `Application ${i + 1}`,
        content: `Content for application ${i + 1}`,
        status: applicationStatusV2Values[0],
      }));

      await db.insert(applicationsV2Table).values(applications);

      const query = `
        query GetProgramsV2 {
          programsV2 {
            data {
              id
              title
              applicationCount
            }
            count
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

      if (result.errors) {
        console.error('GraphQL Errors:', JSON.stringify(result.errors, null, 2));
      }

      expect(result.data).toBeDefined();
      expect(result.data.programsV2).toBeDefined();

      const program = result.data.programsV2.data.find(
        (p: { id: string }) => p.id === insertedProgram.id.toString(),
      );

      expect(program).toBeDefined();
      expect(program.applicationCount).toBe(3);
    });

    it('should return correct applicationCount for multiple programs with different counts', async () => {
      const deadline = new Date();
      deadline.setMonth(deadline.getMonth() + 1);

      // Create 3 programs with different application counts
      const programs: NewProgramV2[] = [
        {
          title: 'Program with 0 Applications',
          description: 'Program 1',
          skills: ['testing'],
          deadline,
          visibility: 'public',
          networkId: testNetworkId,
          price: '1000',
          token_id: testTokenId,
          status: 'open',
          sponsorId: testUserId,
        },
        {
          title: 'Program with 2 Applications',
          description: 'Program 2',
          skills: ['testing'],
          deadline,
          visibility: 'public',
          networkId: testNetworkId,
          price: '2000',
          token_id: testTokenId,
          status: 'open',
          sponsorId: testUserId,
        },
        {
          title: 'Program with 5 Applications',
          description: 'Program 3',
          skills: ['testing'],
          deadline,
          visibility: 'public',
          networkId: testNetworkId,
          price: '3000',
          token_id: testTokenId,
          status: 'open',
          sponsorId: testUserId,
        },
      ];

      const insertedPrograms = await db.insert(programsV2Table).values(programs).returning();

      // Create applications for program 2 (2 applications)
      await db.insert(applicationsV2Table).values([
        {
          programId: insertedPrograms[1]?.id,
          applicantId: applicantUserIds[0],
          title: 'App 1',
          content: 'Content 1',
          status: applicationStatusV2Values[0],
        },
        {
          programId: insertedPrograms[1]?.id,
          applicantId: applicantUserIds[1],
          title: 'App 2',
          content: 'Content 2',
          status: applicationStatusV2Values[0],
        },
      ]);

      // Create applications for program 3 (5 applications)
      const applicationsForProgram3: NewApplicationV2[] = Array.from({ length: 5 }, (_, i) => ({
        programId: insertedPrograms[2]?.id,
        applicantId: applicantUserIds[i],
        title: `App ${i + 1}`,
        content: `Content ${i + 1}`,
        status: applicationStatusV2Values[0],
      }));
      await db.insert(applicationsV2Table).values(applicationsForProgram3);

      const query = `
        query GetProgramsV2 {
          programsV2 {
            data {
              id
              title
              applicationCount
            }
            count
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

      if (result.errors) {
        console.error('GraphQL Errors:', JSON.stringify(result.errors, null, 2));
      }

      expect(result.data).toBeDefined();
      expect(result.data.programsV2).toBeDefined();

      // Find each program and verify application count
      const program0 = result.data.programsV2.data.find(
        (p: { title: string }) => p.title === 'Program with 0 Applications',
      );
      expect(program0).toBeDefined();
      expect(program0.applicationCount).toBe(0);

      const program2 = result.data.programsV2.data.find(
        (p: { title: string }) => p.title === 'Program with 2 Applications',
      );
      expect(program2).toBeDefined();
      expect(program2.applicationCount).toBe(2);

      const program5 = result.data.programsV2.data.find(
        (p: { title: string }) => p.title === 'Program with 5 Applications',
      );
      expect(program5).toBeDefined();
      expect(program5.applicationCount).toBe(5);
    });

    it('should return applicationCount with pagination', async () => {
      const deadline = new Date();
      deadline.setMonth(deadline.getMonth() + 1);

      // Create 5 programs
      const programs: NewProgramV2[] = Array.from({ length: 5 }, (_, i) => ({
        title: `Program ${i + 1}`,
        description: `Program number ${i + 1}`,
        skills: ['testing'],
        deadline,
        visibility: 'public',
        networkId: testNetworkId,
        price: `${(i + 1) * 1000}`,
        token_id: testTokenId,
        status: 'open',
        sponsorId: testUserId,
      }));

      const insertedPrograms = await db.insert(programsV2Table).values(programs).returning();

      // Add applications to some programs
      await db.insert(applicationsV2Table).values([
        {
          programId: insertedPrograms[0]?.id,
          applicantId: applicantUserIds[0],
          title: 'App 1',
          content: 'Content',
          status: applicationStatusV2Values[0],
        },
        {
          programId: insertedPrograms[1]?.id,
          applicantId: applicantUserIds[0],
          title: 'App 1',
          content: 'Content',
          status: applicationStatusV2Values[0],
        },
        {
          programId: insertedPrograms[1]?.id,
          applicantId: applicantUserIds[1],
          title: 'App 2',
          content: 'Content',
          status: applicationStatusV2Values[0],
        },
      ]);

      const query = `
        query GetProgramsV2($pagination: PaginationInput) {
          programsV2(pagination: $pagination) {
            data {
              id
              title
              applicationCount
            }
            count
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
          variables: {
            pagination: {
              limit: 3,
              offset: 0,
            },
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);

      if (result.errors) {
        console.error('GraphQL Errors:', JSON.stringify(result.errors, null, 2));
      }

      expect(result.data).toBeDefined();
      expect(result.data.programsV2.data).toHaveLength(3);

      // Verify applicationCount is present for all programs
      for (const program of result.data.programsV2.data) {
        expect(program.applicationCount).toBeDefined();
        expect(typeof program.applicationCount).toBe('number');
        expect(program.applicationCount).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('applicationCount in programsBysponsorIdV2 query', () => {
    it('should return applicationCount as 0 when sponsor programs have no applications', async () => {
      const deadline = new Date();
      deadline.setMonth(deadline.getMonth() + 1);

      const programs: NewProgramV2[] = Array.from({ length: 3 }, (_, i) => ({
        title: `Sponsor Program ${i + 1}`,
        description: `Program ${i + 1}`,
        skills: ['testing'],
        deadline,
        visibility: 'public',
        networkId: testNetworkId,
        price: `${(i + 1) * 1000}`,
        token_id: testTokenId,
        status: 'open',
        sponsorId: testUserId,
      }));

      await db.insert(programsV2Table).values(programs);

      const query = `
        query GetProgramsBySponsorV2($sponsorId: ID!) {
          programsBysponsorIdV2(sponsorId: $sponsorId) {
            data {
              id
              title
              applicationCount
            }
            count
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
          variables: {
            sponsorId: testUserId.toString(),
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);

      if (result.errors) {
        console.error('GraphQL Errors:', JSON.stringify(result.errors, null, 2));
      }

      expect(result.data).toBeDefined();
      expect(result.data.programsBysponsorIdV2).toBeDefined();
      expect(result.data.programsBysponsorIdV2.data).toHaveLength(3);

      // All programs should have 0 applications
      for (const program of result.data.programsBysponsorIdV2.data) {
        expect(program.applicationCount).toBe(0);
      }
    });

    it('should return correct applicationCount for sponsor programs with applications', async () => {
      const deadline = new Date();
      deadline.setMonth(deadline.getMonth() + 1);

      const programs: NewProgramV2[] = Array.from({ length: 3 }, (_, i) => ({
        title: `Sponsor Program ${i + 1}`,
        description: `Program ${i + 1}`,
        skills: ['testing'],
        deadline,
        visibility: 'public',
        networkId: testNetworkId,
        price: `${(i + 1) * 1000}`,
        token_id: testTokenId,
        status: 'open',
        sponsorId: testUserId,
      }));

      const insertedPrograms = await db.insert(programsV2Table).values(programs).returning();

      // Add different number of applications to each program
      // Program 0: 1 application
      await db.insert(applicationsV2Table).values({
        programId: insertedPrograms[0]?.id,
        applicantId: applicantUserIds[0],
        title: 'App 1',
        content: 'Content',
        status: applicationStatusV2Values[0],
      });

      // Program 1: 3 applications
      await db.insert(applicationsV2Table).values(
        Array.from({ length: 3 }, (_, i) => ({
          programId: insertedPrograms[1]?.id,
          applicantId: applicantUserIds[i],
          title: `App ${i + 1}`,
          content: 'Content',
          status: applicationStatusV2Values[0],
        })),
      );

      // Program 2: 0 applications (no insert)

      const query = `
        query GetProgramsBySponsorV2($sponsorId: ID!) {
          programsBysponsorIdV2(sponsorId: $sponsorId) {
            data {
              id
              title
              applicationCount
            }
            count
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
          variables: {
            sponsorId: testUserId.toString(),
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);

      if (result.errors) {
        console.error('GraphQL Errors:', JSON.stringify(result.errors, null, 2));
      }

      expect(result.data).toBeDefined();
      expect(result.data.programsBysponsorIdV2).toBeDefined();
      expect(result.data.programsBysponsorIdV2.data).toHaveLength(3);

      // Verify application counts
      const program0 = result.data.programsBysponsorIdV2.data.find(
        (p: { title: string }) => p.title === 'Sponsor Program 1',
      );
      expect(program0).toBeDefined();
      expect(program0.applicationCount).toBe(1);

      const program1 = result.data.programsBysponsorIdV2.data.find(
        (p: { title: string }) => p.title === 'Sponsor Program 2',
      );
      expect(program1).toBeDefined();
      expect(program1.applicationCount).toBe(3);

      const program2 = result.data.programsBysponsorIdV2.data.find(
        (p: { title: string }) => p.title === 'Sponsor Program 3',
      );
      expect(program2).toBeDefined();
      expect(program2.applicationCount).toBe(0);
    });

    it('should return applicationCount with pagination for sponsor programs', async () => {
      const deadline = new Date();
      deadline.setMonth(deadline.getMonth() + 1);

      // Create 5 programs for the sponsor
      const programs: NewProgramV2[] = Array.from({ length: 5 }, (_, i) => ({
        title: `Sponsor Program ${i + 1}`,
        description: `Program ${i + 1}`,
        skills: ['testing'],
        deadline,
        visibility: 'public',
        networkId: testNetworkId,
        price: `${(i + 1) * 1000}`,
        token_id: testTokenId,
        status: 'open',
        sponsorId: testUserId,
      }));

      const insertedPrograms = await db.insert(programsV2Table).values(programs).returning();

      // Add applications to some programs
      await db.insert(applicationsV2Table).values([
        {
          programId: insertedPrograms[0]?.id,
          applicantId: applicantUserIds[0],
          title: 'App 1',
          content: 'Content',
          status: applicationStatusV2Values[0],
        },
        {
          programId: insertedPrograms[1]?.id,
          applicantId: applicantUserIds[0],
          title: 'App 1',
          content: 'Content',
          status: applicationStatusV2Values[0],
        },
        {
          programId: insertedPrograms[1]?.id,
          applicantId: applicantUserIds[1],
          title: 'App 2',
          content: 'Content',
          status: applicationStatusV2Values[0],
        },
      ]);

      const query = `
        query GetProgramsBySponsorV2($sponsorId: ID!, $pagination: PaginationInput) {
          programsBysponsorIdV2(sponsorId: $sponsorId, pagination: $pagination) {
            data {
              id
              title
              applicationCount
            }
            count
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
          variables: {
            sponsorId: testUserId.toString(),
            pagination: {
              limit: 3,
              offset: 0,
            },
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);

      if (result.errors) {
        console.error('GraphQL Errors:', JSON.stringify(result.errors, null, 2));
      }

      expect(result.data).toBeDefined();
      expect(result.data.programsBysponsorIdV2).toBeDefined();
      expect(result.data.programsBysponsorIdV2.data).toHaveLength(3);
      expect(result.data.programsBysponsorIdV2.count).toBe(5);

      // Verify applicationCount is present for all programs
      for (const program of result.data.programsBysponsorIdV2.data) {
        expect(program.applicationCount).toBeDefined();
        expect(typeof program.applicationCount).toBe('number');
        expect(program.applicationCount).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
