import {
  type NewTokenType,
  applicationsV2Table,
  programsV2Table,
  tokensTable,
  usersV2Table,
} from '@/db/schemas';
import type { NewProgramV2, NewUserV2 } from '@/db/schemas';
import { applicationStatusV2Values } from '@/db/schemas/v2/applications';
import { milestonesV2Table } from '@/db/schemas/v2/milestones';
import { networksTable } from '@/db/schemas/v2/networks';
import { db } from '@/db/test-db';
import { eq, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { createTestServer } from '../helper';

// Application status values from DB schema (Single Source of Truth)
const ApplicationStatus = {
  SUBMITTED: applicationStatusV2Values[0], // 'submitted'
  PENDING_SIGNATURE: applicationStatusV2Values[1], // 'pending_signature'
  IN_PROGRESS: applicationStatusV2Values[2], // 'in_progress'
  COMPLETED: applicationStatusV2Values[3], // 'completed'
} as const;

describe('completeApplicationV2 Mutation Tests', () => {
  let server: FastifyInstance;

  // Users
  let programCreator: NewUserV2;
  let applicant: NewUserV2;
  let programsponsorId: number;
  let applicantId: number;
  let creatorAuthToken: string;
  let applicantAuthToken: string;

  // Program
  let testProgram: NewProgramV2;
  let testProgramId: string;

  // Application
  let testApplicationId: number;

  beforeAll(async () => {
    server = await createTestServer();
  });

  beforeEach(async () => {
    // 1. Create users
    programCreator = {
      walletAddress: '0xCreatorWalletAddress012345678901234567890',
      loginType: 'wallet',
      role: 'user',
      email: 'creator@test.com',
      firstName: 'Program',
      lastName: 'Creator',
    };
    applicant = {
      walletAddress: '0xApplicantWalletAddress01234567890123456789',
      loginType: 'wallet',
      role: 'user',
      email: 'applicant@test.com',
      firstName: 'Test',
      lastName: 'Applicant',
    };

    const [creatorUser] = await db.insert(usersV2Table).values(programCreator).returning();
    const [applicantUser] = await db.insert(usersV2Table).values(applicant).returning();
    programsponsorId = creatorUser.id;
    applicantId = applicantUser.id;

    // 2. Log in to get auth tokens
    const loginMutation = `
      mutation LoginV2($walletAddress: String!, $loginType: LoginTypeEnum!, $email: String) {
        loginV2(walletAddress: $walletAddress, loginType: $loginType, email: $email)
      }
    `;

    const creatorLoginResponse = await server.inject({
      method: 'POST',
      url: '/graphql',
      payload: {
        query: loginMutation,
        variables: {
          walletAddress: programCreator.walletAddress,
          loginType: 'wallet',
          email: programCreator.email,
        },
      },
    });
    creatorAuthToken = JSON.parse(creatorLoginResponse.body).data.loginV2;

    const applicantLoginResponse = await server.inject({
      method: 'POST',
      url: '/graphql',
      payload: {
        query: loginMutation,
        variables: {
          walletAddress: applicant.walletAddress,
          loginType: 'wallet',
          email: applicant.email,
        },
      },
    });
    applicantAuthToken = JSON.parse(applicantLoginResponse.body).data.loginV2;

    // 3. Seed network
    const [net] = await db
      .insert(networksTable)
      .values({
        chainId: 11155111,
        chainName: 'Sepolia',
        mainnet: false,
      })
      .returning();

    // 4. Seed token
    const testToken: NewTokenType = {
      chainInfoId: net.id,
      tokenName: 'USDC',
      tokenAddress: '0xA0b86a33E6441b8C4C8C0C4C8C0C4C8C0C4C8C0',
      decimals: 6,
    };
    const [token] = await db.insert(tokensTable).values(testToken).returning();

    // 5. Create test program
    const deadline = new Date();
    deadline.setMonth(deadline.getMonth() + 1);
    testProgram = {
      title: 'Test Program for Complete Application',
      description: 'A program to test application completion.',
      skills: ['testing', 'graphql'],
      deadline,
      visibility: 'public',
      networkId: net.id,
      price: '1000',
      token_id: token.id,
      status: 'open',
      sponsorId: programsponsorId,
    };
    const [insertedProgram] = await db.insert(programsV2Table).values(testProgram).returning();
    testProgramId = insertedProgram.id;

    // 6. Create test application
    const [app] = await db
      .insert(applicationsV2Table)
      .values({
        programId: testProgramId,
        applicantId: applicantId,
        content: 'Application to be completed',
        status: ApplicationStatus.IN_PROGRESS,
      })
      .returning();
    testApplicationId = app.id;
  });

  afterEach(async () => {
    await db.execute(sql`TRUNCATE TABLE milestones_v2 RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE applications_v2 RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE programs_v2 RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE networks RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE tokens RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE users_v2 RESTART IDENTITY CASCADE`);
  });

  afterAll(async () => {
    await db.execute(sql`TRUNCATE TABLE milestones_v2 RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE applications_v2 RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE programs_v2 RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE networks RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE tokens RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE users_v2 RESTART IDENTITY CASCADE`);
    await server.close();
  });

  it('should complete application when all milestones are completed', async () => {
    // Create completed milestones
    await db.insert(milestonesV2Table).values([
      {
        programId: testProgramId,
        applicationId: testApplicationId,
        sponsorId: programsponsorId,
        title: 'Milestone 1',
        description: 'First milestone',
        payout: '100',
        deadline: new Date(Date.now() + 86400000),
        status: 'completed',
      },
      {
        programId: testProgramId,
        applicationId: testApplicationId,
        sponsorId: programsponsorId,
        title: 'Milestone 2',
        description: 'Second milestone',
        payout: '200',
        deadline: new Date(Date.now() + 86400000),
        status: 'completed',
      },
    ]);

    const mutation = `
      mutation CompleteApplicationV2($id: ID!) {
        completeApplicationV2(id: $id) {
          id
          status
        }
      }
    `;
    const variables = { id: testApplicationId.toString() };

    const response = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: { authorization: `Bearer ${applicantAuthToken}` },
      payload: { query: mutation, variables },
    });

    expect(response.statusCode).toBe(200);
    const result = JSON.parse(response.body);

    if (result.errors) {
      console.error('GraphQL Errors:', JSON.stringify(result.errors, null, 2));
    }

    expect(result.data).toBeDefined();
    expect(result.data.completeApplicationV2.status).toBe(ApplicationStatus.COMPLETED);

    // Verify in database
    const [updatedApp] = await db
      .select()
      .from(applicationsV2Table)
      .where(eq(applicationsV2Table.id, testApplicationId));
    expect(updatedApp.status).toBe(ApplicationStatus.COMPLETED);
  });

  it('should fail when not all milestones are completed', async () => {
    // Create milestones with mixed statuses
    await db.insert(milestonesV2Table).values([
      {
        programId: testProgramId,
        applicationId: testApplicationId,
        sponsorId: programsponsorId,
        title: 'Milestone 1',
        description: 'Completed milestone',
        payout: '100',
        deadline: new Date(Date.now() + 86400000),
        status: 'completed',
      },
      {
        programId: testProgramId,
        applicationId: testApplicationId,
        sponsorId: programsponsorId,
        title: 'Milestone 2',
        description: 'In progress milestone',
        payout: '200',
        deadline: new Date(Date.now() + 86400000),
        status: 'in_progress',
      },
    ]);

    const mutation = `
      mutation CompleteApplicationV2($id: ID!) {
        completeApplicationV2(id: $id) {
          id
          status
        }
      }
    `;
    const variables = { id: testApplicationId.toString() };

    const response = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: { authorization: `Bearer ${applicantAuthToken}` },
      payload: { query: mutation, variables },
    });

    expect(response.statusCode).toBe(200);
    const result = JSON.parse(response.body);

    expect(result.errors).toBeDefined();
    expect(result.errors[0].message).toMatch(/Cannot complete application.*1 out of 2/);
  });

  it('should fail when application has no milestones', async () => {
    const mutation = `
      mutation CompleteApplicationV2($id: ID!) {
        completeApplicationV2(id: $id) {
          id
          status
        }
      }
    `;
    const variables = { id: testApplicationId.toString() };

    const response = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: { authorization: `Bearer ${applicantAuthToken}` },
      payload: { query: mutation, variables },
    });

    expect(response.statusCode).toBe(200);
    const result = JSON.parse(response.body);

    expect(result.errors).toBeDefined();
    expect(result.errors[0].message).toMatch(/Cannot complete application.*0 out of 0/);
  });

  it('should not be completed by a different user', async () => {
    // Create completed milestones
    await db.insert(milestonesV2Table).values([
      {
        programId: testProgramId,
        applicationId: testApplicationId,
        sponsorId: programsponsorId,
        title: 'Milestone 1',
        description: 'First milestone',
        payout: '100',
        deadline: new Date(Date.now() + 86400000),
        status: 'completed',
      },
    ]);

    const mutation = `
      mutation CompleteApplicationV2($id: ID!) {
        completeApplicationV2(id: $id) {
          id
          status
        }
      }
    `;
    const variables = { id: testApplicationId.toString() };

    const response = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: { authorization: `Bearer ${creatorAuthToken}` }, // Using creator's token
      payload: { query: mutation, variables },
    });

    expect(response.statusCode).toBe(200);
    const result = JSON.parse(response.body);

    expect(result.errors).toBeDefined();
    expect(result.errors[0].message).toMatch(/Unauthorized to complete this application/);
  });

  it('should not be completed without authentication', async () => {
    const mutation = `
      mutation CompleteApplicationV2($id: ID!) {
        completeApplicationV2(id: $id) {
          id
          status
        }
      }
    `;
    const variables = { id: testApplicationId.toString() };

    const response = await server.inject({
      method: 'POST',
      url: '/graphql',
      payload: { query: mutation, variables },
    });

    expect(response.statusCode).toBe(200);
    const result = JSON.parse(response.body);

    expect(result.errors).toBeDefined();
    expect(result.errors[0].message).toMatch(/Not authorized/);
  });
});
