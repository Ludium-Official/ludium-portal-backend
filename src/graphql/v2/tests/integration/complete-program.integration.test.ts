import {
  type NewTokenType,
  applicationsV2Table,
  programsV2Table,
  tokensTable,
  usersV2Table,
} from '@/db/schemas';
import type { NewProgramV2, NewUserV2 } from '@/db/schemas';
import { applicationStatusV2Values } from '@/db/schemas/v2/applications';
import { networksTable } from '@/db/schemas/v2/networks';
import { db } from '@/db/test-db';
import { eq, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { createTestServer } from '../helper';

// Application status values
const ApplicationStatus = {
  SUBMITTED: applicationStatusV2Values[0],
  PENDING_SIGNATURE: applicationStatusV2Values[1],
  IN_PROGRESS: applicationStatusV2Values[2],
  COMPLETED: applicationStatusV2Values[3],
} as const;

describe('completeProgramV2 Mutation Tests', () => {
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
      title: 'Test Program for Complete Program',
      description: 'A program to test program completion.',
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
  });

  afterEach(async () => {
    await db.execute(sql`TRUNCATE TABLE applications_v2 RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE programs_v2 RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE networks RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE tokens RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE users_v2 RESTART IDENTITY CASCADE`);
  });

  afterAll(async () => {
    await db.execute(sql`TRUNCATE TABLE applications_v2 RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE programs_v2 RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE networks RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE tokens RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE users_v2 RESTART IDENTITY CASCADE`);
    await server.close();
  });

  it('should complete program when all applications are completed', async () => {
    // Create completed applications
    await db.insert(applicationsV2Table).values([
      {
        programId: testProgramId,
        applicantId: applicantId,
        content: 'App 1',
        status: ApplicationStatus.COMPLETED,
      },
      {
        programId: testProgramId,
        applicantId: applicantId, // Same applicant for simplicity, but could be different
        content: 'App 2',
        status: ApplicationStatus.COMPLETED,
      },
    ]);

    const mutation = `
      mutation CompleteProgramV2($id: ID!) {
        completeProgramV2(id: $id) {
          id
          status
        }
      }
    `;
    const variables = { id: testProgramId.toString() };

    const response = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: { authorization: `Bearer ${creatorAuthToken}` },
      payload: { query: mutation, variables },
    });

    expect(response.statusCode).toBe(200);
    const result = JSON.parse(response.body);

    if (result.errors) {
      console.error('GraphQL Errors:', JSON.stringify(result.errors, null, 2));
    }

    expect(result.data).toBeDefined();
    expect(result.data.completeProgramV2.status).toBe('closed');

    // Verify in database
    const [updatedProgram] = await db
      .select()
      .from(programsV2Table)
      .where(eq(programsV2Table.id, testProgramId));
    expect(updatedProgram.status).toBe('closed');
  });

  it('should fail when not all applications are completed', async () => {
    // Create mixed status applications
    await db.insert(applicationsV2Table).values([
      {
        programId: testProgramId,
        applicantId: applicantId,
        content: 'App 1',
        status: ApplicationStatus.COMPLETED,
      },
      {
        programId: testProgramId,
        applicantId: applicantId,
        content: 'App 2',
        status: ApplicationStatus.IN_PROGRESS,
      },
    ]);

    const mutation = `
      mutation CompleteProgramV2($id: ID!) {
        completeProgramV2(id: $id) {
          id
          status
        }
      }
    `;
    const variables = { id: testProgramId.toString() };

    const response = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: { authorization: `Bearer ${creatorAuthToken}` },
      payload: { query: mutation, variables },
    });

    expect(response.statusCode).toBe(200);
    const result = JSON.parse(response.body);

    expect(result.errors).toBeDefined();
    expect(result.errors[0].message).toMatch(/Cannot complete program.*1 out of 2/);
  });

  it('should fail when program has no applications', async () => {
    const mutation = `
      mutation CompleteProgramV2($id: ID!) {
        completeProgramV2(id: $id) {
          id
          status
        }
      }
    `;
    const variables = { id: testProgramId.toString() };

    const response = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: { authorization: `Bearer ${creatorAuthToken}` },
      payload: { query: mutation, variables },
    });

    expect(response.statusCode).toBe(200);
    const result = JSON.parse(response.body);

    expect(result.errors).toBeDefined();
    expect(result.errors[0].message).toMatch(/Cannot complete program.*0 out of 0/);
  });

  it('should not be completed by non-sponsor', async () => {
    // Create completed applications
    await db.insert(applicationsV2Table).values([
      {
        programId: testProgramId,
        applicantId: applicantId,
        content: 'App 1',
        status: ApplicationStatus.COMPLETED,
      },
    ]);

    const mutation = `
      mutation CompleteProgramV2($id: ID!) {
        completeProgramV2(id: $id) {
          id
          status
        }
      }
    `;
    const variables = { id: testProgramId.toString() };

    const response = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: { authorization: `Bearer ${applicantAuthToken}` }, // Using applicant's token (not sponsor)
      payload: { query: mutation, variables },
    });

    expect(response.statusCode).toBe(200);
    const result = JSON.parse(response.body);

    expect(result.errors).toBeDefined();
    expect(result.errors[0].message).toMatch(/Unauthorized to complete this program/);
  });
});
