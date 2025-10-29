import {
  type NewProgramV2,
  type NewUserV2,
  applicationsV2Table,
  programsV2Table,
  usersV2Table,
} from '@/db/schemas';
import { applicationStatusV2Values } from '@/db/schemas/v2/applications';
import { db } from '@/db/test-db';
import { eq, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { createTestServer } from '../helper';

// Application status values from DB schema (Single Source of Truth)
const ApplicationStatus = {
  APPLIED: applicationStatusV2Values[0], // 'applied'
  ACCEPTED: applicationStatusV2Values[1], // 'accepted'
  REJECTED: applicationStatusV2Values[2], // 'rejected'
  DELETED: applicationStatusV2Values[3], // 'deleted'
} as const;

describe('Applications V2 GraphQL API - Integration Tests', () => {
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
  let testProgramId: number;

  beforeAll(async () => {
    server = await createTestServer();
  });

  beforeEach(async () => {
    // 1. Create users (program creator and applicant)
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

    // 3. Create a test program
    const deadline = new Date();
    deadline.setMonth(deadline.getMonth() + 1);
    testProgram = {
      title: 'Test Program for Applications',
      description: 'A program to test application flows.',
      skills: ['testing', 'graphql'],
      deadline,
      visibility: 'public',
      network: 'mainnet',
      price: '1000',
      currency: 'USDC',
      status: 'open',
      sponsorId: programsponsorId,
    };
    const [insertedProgram] = await db.insert(programsV2Table).values(testProgram).returning();
    testProgramId = insertedProgram.id;
  });

  afterEach(async () => {
    // Clean up all tables
    await db.execute(sql`TRUNCATE TABLE applications_v2 RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE programs_v2 RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE users_v2 RESTART IDENTITY CASCADE`);
  });

  afterAll(async () => {
    // Final clean up
    await db.execute(sql`TRUNCATE TABLE applications_v2 RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE programs_v2 RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE users_v2 RESTART IDENTITY CASCADE`);
    await server.close();
  });

  // #region Mutations
  describe('createApplicationV2', () => {
    it('should create a new application for a program', async () => {
      const mutation = `
        mutation CreateApplicationV2($input: CreateApplicationV2Input!) {
          createApplicationV2(input: $input) {
            id
            programId
            applicantId
            status
            content
          }
        }
      `;

      const variables = {
        input: {
          programId: testProgramId.toString(),
          content: 'I am a great candidate for this program.',
        },
      };

      const response = await server.inject({
        method: 'POST',
        url: '/graphql',
        headers: {
          authorization: `Bearer ${applicantAuthToken}`,
        },
        payload: {
          query: mutation,
          variables,
        },
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);

      expect(result.data).toBeDefined();
      const application = result.data.createApplicationV2;

      expect(application.id).toBeDefined();
      expect(application.status).toBe(ApplicationStatus.APPLIED);
      expect(application.content).toBe(variables.input.content);
    });

    it('should return unauthorized if no auth token is provided', async () => {
      const mutation = `
        mutation CreateApplicationV2($input: CreateApplicationV2Input!) {
          createApplicationV2(input: $input) { id }
        }
      `;
      const variables = {
        input: {
          programId: testProgramId.toString(),
          content: 'This should fail.',
        },
      };

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

  describe('updateApplicationV2', () => {
    let testApplicationId: number;

    beforeEach(async () => {
      const [app] = await db
        .insert(applicationsV2Table)
        .values({
          programId: testProgramId,
          applicantId: applicantId,
          content: 'Initial content',
          status: ApplicationStatus.APPLIED,
        })
        .returning();
      testApplicationId = app.id;
    });

    it('should be updated by the original applicant', async () => {
      const mutation = `
        mutation UpdateApplicationV2($id: ID!, $input: UpdateApplicationV2Input!) {
          updateApplicationV2(id: $id, input: $input) {
            id
            content
            status
          }
        }
      `;
      const variables = {
        id: testApplicationId.toString(),
        input: {
          content: 'Updated application content.',
        },
      };

      const response = await server.inject({
        method: 'POST',
        url: '/graphql',
        headers: { authorization: `Bearer ${applicantAuthToken}` },
        payload: { query: mutation, variables },
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);
      expect(result.data.updateApplicationV2.content).toBe(variables.input.content);
    });

    it('should not be updated by a different user', async () => {
      const mutation = `
        mutation UpdateApplicationV2($id: ID!, $input: UpdateApplicationV2Input!) {
          updateApplicationV2(id: $id, input: $input) { id }
        }
      `;
      const variables = {
        id: testApplicationId.toString(),
        input: { content: 'Malicious update' },
      };

      const response = await server.inject({
        method: 'POST',
        url: '/graphql',
        headers: { authorization: `Bearer ${creatorAuthToken}` }, // Using creator's token
        payload: { query: mutation, variables },
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);
      expect(result.errors).toBeDefined();
      expect(result.errors[0].message).toMatch(/unauthorized/i);
    });
  });

  describe('reviewApplicationV2', () => {
    let testApplicationId: number;

    beforeEach(async () => {
      const [app] = await db
        .insert(applicationsV2Table)
        .values({
          programId: testProgramId,
          applicantId: applicantId,
          content: 'Please review me.',
          status: ApplicationStatus.APPLIED,
        })
        .returning();
      testApplicationId = app.id;
    });

    it('should be reviewed (accepted) by the program creator', async () => {
      const mutation = `
        mutation ReviewApplicationV2($id: ID!, $input: ReviewApplicationV2Input!) {
          reviewApplicationV2(id: $id, input: $input) {
            id
            status
            rejectedReason
          }
        }
      `;
      const variables = {
        id: testApplicationId.toString(),
        input: {
          status: ApplicationStatus.ACCEPTED,
          rejectedReason: 'Welcome aboard!',
        },
      };

      const response = await server.inject({
        method: 'POST',
        url: '/graphql',
        headers: { authorization: `Bearer ${creatorAuthToken}` },
        payload: { query: mutation, variables },
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);
      const application = result.data.reviewApplicationV2;
      expect(application.status).toBe(ApplicationStatus.ACCEPTED);
      expect(application.rejectedReason).toBe(variables.input.rejectedReason);
    });

    it('should not be reviewed by the applicant', async () => {
      const mutation = `
        mutation ReviewApplicationV2($id: ID!, $input: ReviewApplicationV2Input!) {
          reviewApplicationV2(id: $id, input: $input) { id }
        }
      `;
      const variables = {
        id: testApplicationId.toString(),
        input: { status: ApplicationStatus.ACCEPTED },
      };

      const response = await server.inject({
        method: 'POST',
        url: '/graphql',
        headers: { authorization: `Bearer ${applicantAuthToken}` },
        payload: { query: mutation, variables },
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);
      expect(result.errors).toBeDefined();
      expect(result.errors[0].message).toMatch(/unauthorized/i);
    });
  });

  describe('pickApplicationV2', () => {
    let testApplicationId: number;

    beforeEach(async () => {
      const [app] = await db
        .insert(applicationsV2Table)
        .values({
          programId: testProgramId,
          applicantId: applicantId,
          content: 'Please pick me.',
          status: ApplicationStatus.APPLIED,
        })
        .returning();
      testApplicationId = app.id;
    });

    it('should be picked by the program creator', async () => {
      const mutation = `
        mutation PickApplicationV2($id: ID!, $input: PickApplicationV2Input!) {
          pickApplicationV2(id: $id, input: $input) {
            id
            picked
          }
        }
      `;
      const variables = {
        id: testApplicationId.toString(),
        input: {
          picked: true,
        },
      };

      const response = await server.inject({
        method: 'POST',
        url: '/graphql',
        headers: { authorization: `Bearer ${creatorAuthToken}` },
        payload: { query: mutation, variables },
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);
      expect(result.data.pickApplicationV2.picked).toBe(true);
    });

    it('should not be picked by the applicant', async () => {
      const mutation = `
        mutation PickApplicationV2($id: ID!, $input: PickApplicationV2Input!) {
          pickApplicationV2(id: $id, input: $input) { id }
        }
      `;
      const variables = {
        id: testApplicationId.toString(),
        input: { picked: true },
      };

      const response = await server.inject({
        method: 'POST',
        url: '/graphql',
        headers: { authorization: `Bearer ${applicantAuthToken}` },
        payload: { query: mutation, variables },
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);
      expect(result.errors).toBeDefined();
      expect(result.errors[0].message).toMatch(/unauthorized/i);
    });
  });

  describe('deleteApplicationV2', () => {
    let testApplicationId: number;

    beforeEach(async () => {
      const [app] = await db
        .insert(applicationsV2Table)
        .values({
          programId: testProgramId,
          applicantId: applicantId,
          content: 'To be deleted',
          status: ApplicationStatus.APPLIED,
        })
        .returning();
      testApplicationId = app.id;
    });

    it('should be deleted by the original applicant', async () => {
      const mutation = `
        mutation DeleteApplicationV2($id: ID!) {
          deleteApplicationV2(id: $id) {
            id
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
      expect(result.data.deleteApplicationV2.id).toBe(testApplicationId.toString());

      // Verify it's gone from the DB
      const found = await db
        .select()
        .from(applicationsV2Table)
        .where(eq(applicationsV2Table.id, testApplicationId));
      expect(found).toHaveLength(0);
    });

    it('should not be deleted by another user', async () => {
      const mutation = `
        mutation DeleteApplicationV2($id: ID!) {
          deleteApplicationV2(id: $id) { id }
        }
      `;
      const variables = { id: testApplicationId.toString() };

      const response = await server.inject({
        method: 'POST',
        url: '/graphql',
        headers: { authorization: `Bearer ${creatorAuthToken}` },
        payload: { query: mutation, variables },
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);
      expect(result.errors).toBeDefined();
      expect(result.errors[0].message).toMatch(/unauthorized/i);
    });
  });
  // #endregion

  // #region Queries
  describe('applicationV2', () => {
    let testApplicationId: number;

    beforeEach(async () => {
      const [app] = await db
        .insert(applicationsV2Table)
        .values({
          programId: testProgramId,
          applicantId: applicantId,
          content: 'Query me',
          status: ApplicationStatus.APPLIED,
        })
        .returning();
      testApplicationId = app.id;
    });

    it('should fetch a single application by ID', async () => {
      const query = `
        query GetApplication($id: ID!) {
          applicationV2(id: $id) {
            id
            content
            status
          }
        }
      `;
      const variables = { id: testApplicationId.toString() };

      const response = await server.inject({
        method: 'POST',
        url: '/graphql',
        // No auth needed for public query
        payload: { query, variables },
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);
      const application = result.data.applicationV2;
      expect(application.id).toBe(testApplicationId.toString());
      expect(application.content).toBe('Query me');
    });
  });

  describe('myApplicationsV2', () => {
    beforeEach(async () => {
      // Create applications for the applicant
      await db.insert(applicationsV2Table).values([
        {
          programId: testProgramId,
          applicantId: applicantId,
          content: 'My first app',
          status: ApplicationStatus.APPLIED,
        },
        {
          programId: testProgramId,
          applicantId: applicantId,
          content: 'My second app',
          status: ApplicationStatus.ACCEPTED,
        },
      ]);
      // Create an application for another user to ensure filtering works
      await db.insert(applicationsV2Table).values({
        programId: testProgramId,
        applicantId: programsponsorId, // Different applicant
        content: 'Not my app',
        status: ApplicationStatus.APPLIED,
      });
    });

    it("should fetch only the current user's applications", async () => {
      const query = `
        query MyApplications {
          myApplicationsV2 {
            data {
              id
              content
            }
            count
          }
        }
      `;

      const response = await server.inject({
        method: 'POST',
        url: '/graphql',
        headers: { authorization: `Bearer ${applicantAuthToken}` },
        payload: { query },
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);
      const { data, count } = result.data.myApplicationsV2;
      expect(count).toBe(2);
      expect(data).toHaveLength(2);
      expect(data[0].content).toBeDefined();
      expect(data[1].content).toBeDefined();
    });
  });

  describe('applicationsByProgramV2', () => {
    beforeEach(async () => {
      // Create applications for the program
      await db.insert(applicationsV2Table).values([
        {
          programId: testProgramId,
          applicantId: applicantId,
          content: 'Applicant app',
          status: ApplicationStatus.APPLIED,
        },
        {
          programId: testProgramId,
          applicantId: programsponsorId, // Creator also applies
          content: 'Creator app',
          status: ApplicationStatus.ACCEPTED,
        },
      ]);
    });

    it('should be fetched by the program creator', async () => {
      const query = `
        query AppsByProgram($query: ApplicationsByProgramV2QueryInput!) {
          applicationsByProgramV2(query: $query) {
            data {
              id
              programId
            }
            count
          }
        }
      `;
      const variables = {
        query: {
          programId: testProgramId.toString(),
        },
      };

      const response = await server.inject({
        method: 'POST',
        url: '/graphql',
        headers: { authorization: `Bearer ${creatorAuthToken}` },
        payload: { query, variables },
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);
      const { data, count } = result.data.applicationsByProgramV2;
      expect(count).toBe(2);
      expect(data).toHaveLength(2);
      expect(data[0].programId).toBe(testProgramId.toString());
    });

    it('should not be fetched by a regular user (non-creator)', async () => {
      const query = `
        query AppsByProgram($query: ApplicationsByProgramV2QueryInput!) {
          applicationsByProgramV2(query: $query) {
            data { id }
          }
        }
      `;
      const variables = {
        query: {
          programId: testProgramId.toString(),
        },
      };

      const response = await server.inject({
        method: 'POST',
        url: '/graphql',
        headers: { authorization: `Bearer ${applicantAuthToken}` },
        payload: { query, variables },
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);
      expect(result.errors).toBeDefined();
      expect(result.errors[0].message).toMatch(/unauthorized/i);
    });
  });
  // #endregion
});
