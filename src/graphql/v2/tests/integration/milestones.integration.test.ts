import { type NewTokenType, type NewUserV2, tokensTable, usersV2Table } from '@/db/schemas';
import { milestonesV2Table } from '@/db/schemas/v2/milestones';
import { networksTable } from '@/db/schemas/v2/networks';
import { type NewProgramV2, programsV2Table } from '@/db/schemas/v2/programs';
import { db } from '@/db/test-db';
import { sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { createTestServer } from '../helper';

describe('Milestones V2 GraphQL API - Integration Tests', () => {
  let server: FastifyInstance;
  let authToken: string;
  let programId: string;
  let applicantId: number;

  beforeAll(async () => {
    server = await createTestServer();
  });

  beforeEach(async () => {
    // Seed user (sponsor)
    const sponsor: NewUserV2 = {
      walletAddress: '0xSponsor0000000000000000000000000000000000',
      loginType: 'wallet',
      role: 'admin',
      email: 'sponsor@test.com',
      firstName: 'Spo',
      lastName: 'Nsor',
    };
    const [insertedSponsor] = await db.insert(usersV2Table).values(sponsor).returning();

    // Seed applicant
    const applicant: NewUserV2 = {
      walletAddress: '0xApplicant0000000000000000000000000000000',
      loginType: 'wallet',
      role: 'user',
      email: 'applicant@test.com',
      firstName: 'App',
      lastName: 'Licant',
    };
    const [insertedApplicant] = await db.insert(usersV2Table).values(applicant).returning();
    applicantId = insertedApplicant.id;

    // Seed network required for program
    const [net] = await db
      .insert(networksTable)
      .values({ chainId: 11155111, chainName: 'Sepolia', mainnet: false })
      .returning();

    // Seed a test token required for program
    const testToken: NewTokenType = {
      chainInfoId: net.id,
      tokenName: 'USDC',
      tokenAddress: '0xA0b86a33E6441b8C4C8C0C4C8C0C4C8C0C4C8C0',
      decimals: 6,
    };
    const [token] = await db.insert(tokensTable).values(testToken).returning();

    // Seed program
    const program: NewProgramV2 = {
      title: 'Test Program',
      description: 'Desc',
      skills: ['a'],
      deadline: new Date(),
      status: 'draft',
      visibility: 'public',
      sponsorId: insertedSponsor.id,
      networkId: net.id,
      price: '0',
      token_id: token.id,
    };
    const [insertedProgram] = await db.insert(programsV2Table).values(program).returning();
    programId = insertedProgram.id;

    // Login
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
          walletAddress: sponsor.walletAddress,
          loginType: 'wallet',
          email: sponsor.email,
        },
      },
    });
    authToken = JSON.parse(loginResponse.body).data.loginV2;
  });

  afterEach(async () => {
    await db.execute(sql`TRUNCATE TABLE milestones_v2 RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE programs_v2 RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE networks RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE tokens RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE users_v2 RESTART IDENTITY CASCADE`);
  });

  it('should create, query, update and delete milestones', async () => {
    const deadline = new Date('2025-12-31');
    const createMutation = `
      mutation CreateMilestone($input: CreateMilestoneV2Input!) {
        createMilestoneV2(input: $input) {
          id
          programId
          applicantId
          title
          description
          payout
          deadline
          status
        }
      }
    `;
    const createRes = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        query: createMutation,
        variables: {
          input: {
            programId: programId.toString(),
            applicantId: applicantId.toString(),
            title: 'Test Milestone',
            description: 'Test milestone description',
            payout: '100',
            deadline: deadline.toISOString(),
            status: 'draft', // Required field
          },
        },
      },
    });
    expect(createRes.statusCode).toBe(200);
    const createResult = JSON.parse(createRes.body);
    if (createResult.errors) {
      console.error('GraphQL errors:', JSON.stringify(createResult.errors, null, 2));
    }
    expect(createResult.errors).toBeUndefined();
    expect(createResult.data).toBeDefined();
    const created = createResult.data.createMilestoneV2;
    expect(created.programId).toBe(programId);
    expect(created.applicantId).toBe(applicantId);
    expect(created.title).toBe('Test Milestone');
    expect(created.payout).toBe('100');
    expect(created.status).toBe('draft');

    // Query milestones with filter
    const listQuery = `
      query Milestones($query: MilestonesV2QueryInput) {
        milestonesV2(query: $query) {
          count
          data {
            id
            programId
            applicantId
            title
            description
            payout
            status
          }
        }
      }
    `;
    const listRes = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        query: listQuery,
        variables: {
          query: {
            programId: programId.toString(),
            limit: 10,
            page: 1,
          },
        },
      },
    });
    expect(listRes.statusCode).toBe(200);
    const listResult = JSON.parse(listRes.body).data.milestonesV2;
    expect(listResult.count).toBe(1);
    expect(listResult.data[0].title).toBe('Test Milestone');

    // Get milestone by ID
    const getByIdQuery = `
      query Milestone($id: ID!) {
        milestoneV2(id: $id) {
          id
          programId
          applicantId
          title
          description
          payout
          status
        }
      }
    `;
    const getByIdRes = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: { authorization: `Bearer ${authToken}` },
      payload: { query: getByIdQuery, variables: { id: created.id } },
    });
    expect(getByIdRes.statusCode).toBe(200);
    const milestone = JSON.parse(getByIdRes.body).data.milestoneV2;
    expect(milestone.id).toBe(created.id);
    expect(milestone.title).toBe('Test Milestone');

    // Get created milestone with createdAt and updatedAt for comparison
    const getBeforeUpdate = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        query: `
          query Milestone($id: ID!) {
            milestoneV2(id: $id) {
              id
              createdAt
              updatedAt
            }
          }
        `,
        variables: { id: created.id },
      },
    });
    const beforeUpdate = JSON.parse(getBeforeUpdate.body).data.milestoneV2;
    const originalUpdatedAt = new Date(beforeUpdate.updatedAt);

    // Wait a bit to ensure updatedAt changes
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Update milestone with all fields
    const updateMutation = `
      mutation UpdateMilestone($id: ID!, $input: UpdateMilestoneV2Input!) {
        updateMilestoneV2(id: $id, input: $input) {
          id
          title
          description
          payout
          deadline
          files
          status
          payout_tx
          updatedAt
        }
      }
    `;
    const newDeadline = new Date('2026-01-31');
    const updateRes = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        query: updateMutation,
        variables: {
          id: created.id,
          input: {
            title: 'Updated Milestone',
            description: 'Updated description',
            payout: '200',
            deadline: newDeadline.toISOString(),
            files: ['https://example.com/file1.pdf', 'https://example.com/file2.pdf'],
            status: 'under_review',
            payout_tx: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          },
        },
      },
    });
    expect(updateRes.statusCode).toBe(200);
    const updateResult = JSON.parse(updateRes.body);
    if (updateResult.errors) {
      console.error('GraphQL errors:', JSON.stringify(updateResult.errors, null, 2));
    }
    expect(updateResult.errors).toBeUndefined();
    const updated = updateResult.data.updateMilestoneV2;
    expect(updated.title).toBe('Updated Milestone');
    expect(updated.description).toBe('Updated description');
    expect(updated.payout).toBe('200');
    expect(updated.files).toEqual([
      'https://example.com/file1.pdf',
      'https://example.com/file2.pdf',
    ]);
    expect(updated.status).toBe('under_review');
    expect(updated.payout_tx).toBe(
      '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    );
    // Verify updatedAt was updated
    const newUpdatedAt = new Date(updated.updatedAt);
    expect(newUpdatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());

    // Delete milestone
    const deleteMutation = `
      mutation DeleteMilestone($id: ID!) {
        deleteMilestoneV2(id: $id) {
          id
        }
      }
    `;
    const deleteRes = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: { authorization: `Bearer ${authToken}` },
      payload: { query: deleteMutation, variables: { id: created.id } },
    });
    expect(deleteRes.statusCode).toBe(200);
    expect(JSON.parse(deleteRes.body).data.deleteMilestoneV2.id).toBe(created.id);

    // Verify deletion
    const rows = await db.select().from(milestonesV2Table);
    expect(rows.length).toBe(0);
  });

  it('should filter milestones by applicantId', async () => {
    const deadline = new Date('2025-12-31');
    // Create milestone for applicant
    const createMutation = `
      mutation CreateMilestone($input: CreateMilestoneV2Input!) {
        createMilestoneV2(input: $input) {
          id
          applicantId
        }
      }
    `;
    const createRes = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        query: createMutation,
        variables: {
          input: {
            programId: programId.toString(),
            applicantId: applicantId.toString(),
            title: 'Milestone for Applicant',
            description: 'Description',
            payout: '100',
            deadline: deadline.toISOString(),
            status: 'draft', // Required field
          },
        },
      },
    });
    expect(createRes.statusCode).toBe(200);
    const createResult = JSON.parse(createRes.body);
    if (createResult.errors) {
      console.error('GraphQL errors:', JSON.stringify(createResult.errors, null, 2));
    }
    expect(createResult.errors).toBeUndefined();
    expect(createResult.data).toBeDefined();
    const created = createResult.data.createMilestoneV2;

    // Query milestones by applicantId
    const listQuery = `
      query Milestones($query: MilestonesV2QueryInput) {
        milestonesV2(query: $query) {
          count
          data {
            id
            applicantId
          }
        }
      }
    `;
    const listRes = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        query: listQuery,
        variables: {
          query: {
            applicantId: applicantId.toString(),
            limit: 10,
            page: 1,
          },
        },
      },
    });
    expect(listRes.statusCode).toBe(200);
    const listResult = JSON.parse(listRes.body).data.milestonesV2;
    expect(listResult.count).toBe(1);
    expect(listResult.data[0].id).toBe(created.id);
  });

  it('should update milestone with partial fields (files, status, payout_tx)', async () => {
    const deadline = new Date('2025-12-31');
    // Create milestone
    const createMutation = `
      mutation CreateMilestone($input: CreateMilestoneV2Input!) {
        createMilestoneV2(input: $input) {
          id
          title
          files
          status
          payout_tx
        }
      }
    `;
    const createRes = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        query: createMutation,
        variables: {
          input: {
            programId: programId.toString(),
            applicantId: applicantId.toString(),
            title: 'Test Milestone',
            description: 'Test description',
            payout: '100',
            deadline: deadline.toISOString(),
            status: 'draft',
          },
        },
      },
    });
    expect(createRes.statusCode).toBe(200);
    const created = JSON.parse(createRes.body).data.createMilestoneV2;
    expect(created.files).toBeNull();
    expect(created.status).toBe('draft');
    expect(created.payout_tx).toBeNull();

    // Update only files, status, and payout_tx
    const updateMutation = `
      mutation UpdateMilestone($id: ID!, $input: UpdateMilestoneV2Input!) {
        updateMilestoneV2(id: $id, input: $input) {
          id
          title
          files
          status
          payout_tx
          updatedAt
        }
      }
    `;
    const updateRes = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        query: updateMutation,
        variables: {
          id: created.id,
          input: {
            files: ['https://example.com/test.pdf'],
            status: 'in_progress',
            payout_tx: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          },
        },
      },
    });
    expect(updateRes.statusCode).toBe(200);
    const updateResult = JSON.parse(updateRes.body);
    expect(updateResult.errors).toBeUndefined();
    const updated = updateResult.data.updateMilestoneV2;
    expect(updated.title).toBe('Test Milestone'); // Should remain unchanged
    expect(updated.files).toEqual(['https://example.com/test.pdf']);
    expect(updated.status).toBe('in_progress');
    expect(updated.payout_tx).toBe(
      '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    );
    expect(updated.updatedAt).toBeDefined();
  });
});
