import { type NewProgramV2, type NewUserV2, programsV2Table, usersV2Table } from '@/db/schemas';
import { type NewNetworkType, networksTable } from '@/db/schemas/v2/networks';
import { type NewTokenType, tokensTable } from '@/db/schemas/v2/tokens';
import { db } from '@/db/test-db';
import { sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { createTestServer } from '../helper';

describe('Programs V2 GraphQL API - Integration Tests', () => {
  let server: FastifyInstance;
  let testUserId: number;
  let testNetworkId: number;
  let testTokenId: number;
  let authToken: string;

  beforeAll(async () => {
    server = await createTestServer();
  });

  beforeEach(async () => {
    // Create a test user (creator)
    const testUser: NewUserV2 = {
      walletAddress: '0xTestCreator1234567890123456789012345678901234',
      loginType: 'wallet',
      role: 'user',
      email: 'creator@example.com',
      firstName: 'Test',
      lastName: 'Creator',
    };
    const [insertedUser] = await db.insert(usersV2Table).values(testUser).returning();
    testUserId = insertedUser.id;

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
    await db.execute(sql`TRUNCATE TABLE programs_v2 RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE tokens RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE networks RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE users_v2 RESTART IDENTITY CASCADE`);
  });

  afterAll(async () => {
    // Final clean up
    await db.execute(sql`TRUNCATE TABLE programs_v2 RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE tokens RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE networks RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE users_v2 RESTART IDENTITY CASCADE`);
  });

  describe('createProgramV2', () => {
    it('should create a new program via mutation', async () => {
      const deadline = new Date();
      deadline.setMonth(deadline.getMonth() + 1); // 1 month from now

      const mutation = `
        mutation CreateProgramV2($input: CreateProgramV2Input!) {
          createProgramV2(input: $input) {
            id
            title
            description
            skills
            deadline
            status
            visibility
            networkId
            price
            token_id
            invitedMembers
            createdAt
            updatedAt
          }
        }
      `;

      const variables = {
        input: {
          title: 'Test Program via GraphQL',
          description: 'This is a test program created via a GraphQL mutation.',
          skills: ['GraphQL', 'TypeScript', 'Node.js'],
          deadline: deadline.toISOString(),
          visibility: 'public',
          status: 'draft', // Required field
          networkId: testNetworkId,
          price: '1500',
          token_id: testTokenId,
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

      if (response.statusCode !== 200) {
        console.error('Error Response:', JSON.stringify(JSON.parse(response.body), null, 2));
      }
      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);

      console.log('Create Program Response:', JSON.stringify(result, null, 2));

      expect(result.data).toBeDefined();
      expect(result.data.createProgramV2).toBeDefined();
      const program = result.data.createProgramV2;

      expect(program.id).toBeDefined();
      expect(program.title).toBe(variables.input.title);
      expect(program.description).toBe(variables.input.description);
      expect(program.status).toBe('draft'); // Programs are always created as draft
      expect(program.visibility).toBe(variables.input.visibility);
      expect(program.skills).toEqual(variables.input.skills);
      expect(program.networkId).toBe(variables.input.networkId);
      expect(program.price).toBe(variables.input.price);
      expect(program.token_id).toBe(variables.input.token_id);
      expect(program.invitedMembers).toEqual([]);
    });

    it('should return unauthorized without auth token', async () => {
      const mutation = `
        mutation CreateProgramV2($input: CreateProgramV2Input!) {
          createProgramV2(input: $input) {
            id
            title
          }
        }
      `;

      const variables = {
        input: {
          title: 'Unauthorized Test',
          description: 'This should fail',
          skills: ['test'],
          deadline: new Date().toISOString(),
          visibility: 'public',
          status: 'draft', // Required field - must be provided even for unauthorized test
          networkId: testNetworkId,
          price: '100',
          token_id: testTokenId,
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

    it('should create a program with invited members', async () => {
      const deadline = new Date();
      deadline.setMonth(deadline.getMonth() + 1);

      const mutation = `
        mutation CreateProgramV2($input: CreateProgramV2Input!) {
          createProgramV2(input: $input) {
            id
            title
            invitedMembers
          }
        }
      `;

      const variables = {
        input: {
          title: 'Program with Invites',
          description: 'A program with invited members',
          skills: ['React', 'Vue'],
          deadline: deadline.toISOString(),
          visibility: 'private',
          status: 'draft', // Required field
          networkId: testNetworkId,
          price: '500',
          token_id: testTokenId,
          invitedMembers: ['user1@example.com', 'user2@example.com'],
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

      expect(result.data).toBeDefined();
      expect(result.data.createProgramV2.invitedMembers).toEqual(variables.input.invitedMembers);
    });
  });

  describe('updateProgramV2', () => {
    it('should update a program by its creator', async () => {
      // Create a program first
      const deadline = new Date();
      deadline.setMonth(deadline.getMonth() + 1);

      const newProgram: NewProgramV2 = {
        title: 'Old Title',
        description: 'Old description.',
        skills: ['old-skill'],
        deadline,
        visibility: 'public',
        networkId: testNetworkId,
        price: '1000',
        token_id: testTokenId,
        status: 'draft',
        sponsorId: testUserId,
      };
      const [insertedProgram] = await db.insert(programsV2Table).values(newProgram).returning();

      const mutation = `
        mutation UpdateProgramV2($id: ID!, $input: UpdateProgramV2Input!) {
          updateProgramV2(id: $id, input: $input) {
            id
            title
            description
            status
            updatedAt
          }
        }
      `;

      const variables = {
        id: insertedProgram.id.toString(),
        input: {
          title: 'New Updated Title',
          description: 'New updated description.',
          // Note: status change from 'draft' to 'open' is not allowed without proper workflow
          // (draft → under_review requires onchain_program_id, under_review → open requires admin)
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

      if (response.statusCode !== 200) {
        console.error('Error Response:', JSON.stringify(JSON.parse(response.body), null, 2));
      }
      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);

      console.log('Update Program Response:', JSON.stringify(result, null, 2));

      expect(result.data).toBeDefined();
      expect(result.data.updateProgramV2).toBeDefined();
      const updatedProgram = result.data.updateProgramV2;

      expect(updatedProgram.id).toBe(insertedProgram.id.toString());
      expect(updatedProgram.title).toBe(variables.input.title);
      expect(updatedProgram.description).toBe(variables.input.description);
      expect(updatedProgram.status).toBe('draft'); // Status remains draft (no status change in this update)
    });

    it('should not update a program by non-creator', async () => {
      // Create another user
      const otherUser: NewUserV2 = {
        walletAddress: '0xOtherUser1234567890123456789012345678901234',
        loginType: 'wallet',
        role: 'user',
        email: 'other@example.com',
      };
      await db.insert(usersV2Table).values(otherUser);

      // Login as other user
      const loginResponse = await server.inject({
        method: 'POST',
        url: '/graphql',
        payload: {
          query: `
            mutation LoginV2($walletAddress: String!, $loginType: LoginTypeEnum!, $email: String) {
              loginV2(walletAddress: $walletAddress, loginType: $loginType, email: $email)
            }
          `,
          variables: {
            walletAddress: otherUser.walletAddress,
            loginType: 'wallet',
            email: otherUser.email,
          },
        },
      });
      const otherAuthToken = JSON.parse(loginResponse.body).data.loginV2;

      // Create a program by test user (creator)
      const deadline = new Date();
      deadline.setMonth(deadline.getMonth() + 1);
      const newProgram: NewProgramV2 = {
        title: 'Creator Only Program',
        description: 'Only creator can update this',
        skills: ['test'],
        deadline,
        visibility: 'public',
        networkId: testNetworkId,
        price: '1000',
        token_id: testTokenId,
        status: 'draft',
        sponsorId: testUserId, // Created by testUser, not otherUser
      };
      const [insertedProgram] = await db.insert(programsV2Table).values(newProgram).returning();

      // Try to update as other user
      const mutation = `
        mutation UpdateProgramV2($id: ID!, $input: UpdateProgramV2Input!) {
          updateProgramV2(id: $id, input: $input) {
            id
            title
          }
        }
      `;

      const variables = {
        id: insertedProgram.id.toString(),
        input: {
          title: 'Hacked Title',
        },
      };

      const response = await server.inject({
        method: 'POST',
        url: '/graphql',
        headers: {
          authorization: `Bearer ${otherAuthToken}`,
        },
        payload: {
          query: mutation,
          variables,
        },
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);

      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toMatch(
        /Only the program creator|unauthorized|Not authorized/i,
      );
    });

    it('should partially update program fields', async () => {
      const deadline = new Date();
      deadline.setMonth(deadline.getMonth() + 1);

      const newProgram: NewProgramV2 = {
        title: 'Original Title',
        description: 'Original Description',
        skills: ['skill1', 'skill2'],
        deadline,
        visibility: 'public',
        networkId: testNetworkId,
        price: '1000',
        token_id: testTokenId,
        status: 'draft',
        sponsorId: testUserId,
      };
      const [insertedProgram] = await db.insert(programsV2Table).values(newProgram).returning();

      const mutation = `
        mutation UpdateProgramV2($id: ID!, $input: UpdateProgramV2Input!) {
          updateProgramV2(id: $id, input: $input) {
            id
            title
            description
            skills
            status
          }
        }
      `;

      const variables = {
        id: insertedProgram.id.toString(),
        input: {
          title: 'Only Title Updated',
          // Note: status change from 'draft' to 'open' is not allowed without proper workflow
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

      expect(result.data).toBeDefined();
      expect(result.data.updateProgramV2.title).toBe('Only Title Updated');
      expect(result.data.updateProgramV2.status).toBe('draft'); // Status remains draft
      expect(result.data.updateProgramV2.description).toBe('Original Description');
      expect(result.data.updateProgramV2.skills).toEqual(['skill1', 'skill2']);
    });
  });

  describe('deleteProgramV2', () => {
    it('should delete a program by its creator', async () => {
      const deadline = new Date();
      deadline.setMonth(deadline.getMonth() + 1);

      const newProgram: NewProgramV2 = {
        title: 'To Be Deleted',
        description: 'This program will be deleted.',
        skills: ['disposable'],
        deadline,
        visibility: 'public',
        networkId: testNetworkId,
        price: '100',
        token_id: testTokenId,
        status: 'draft',
        sponsorId: testUserId,
      };
      const [insertedProgram] = await db.insert(programsV2Table).values(newProgram).returning();

      const mutation = `
        mutation DeleteProgramV2($id: ID!) {
          deleteProgramV2(id: $id)
        }
      `;

      const variables = {
        id: insertedProgram.id.toString(),
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

      if (response.statusCode !== 200) {
        console.error('Error Response:', JSON.stringify(JSON.parse(response.body), null, 2));
      }
      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);

      console.log('Delete Program Response:', JSON.stringify(result, null, 2));

      expect(result.data).toBeDefined();
      expect(result.data.deleteProgramV2).toBe(insertedProgram.id.toString());

      // Verify it's actually deleted
      const [program] = await db
        .select()
        .from(programsV2Table)
        .where(sql`${programsV2Table.id} = ${insertedProgram.id}`);
      expect(program).toBeUndefined();
    });

    it('should not delete a program by non-creator', async () => {
      // Create another user
      const otherUser: NewUserV2 = {
        walletAddress: '0xAnotherUser1234567890123456789012345678901234',
        loginType: 'wallet',
        role: 'user',
        email: 'another@example.com',
      };
      await db.insert(usersV2Table).values(otherUser);

      // Login as other user
      const loginResponse = await server.inject({
        method: 'POST',
        url: '/graphql',
        payload: {
          query: `
            mutation LoginV2($walletAddress: String!, $loginType: LoginTypeEnum!, $email: String) {
              loginV2(walletAddress: $walletAddress, loginType: $loginType, email: $email)
            }
          `,
          variables: {
            walletAddress: otherUser.walletAddress,
            loginType: 'wallet',
            email: otherUser.email,
          },
        },
      });
      const otherAuthToken = JSON.parse(loginResponse.body).data.loginV2;

      // Create a program by test user (creator)
      const deadline = new Date();
      deadline.setMonth(deadline.getMonth() + 1);
      const newProgram: NewProgramV2 = {
        title: 'Protected Program',
        description: 'Only creator can delete this',
        skills: ['test'],
        deadline,
        visibility: 'public',
        networkId: testNetworkId,
        price: '1000',
        token_id: testTokenId,
        status: 'draft',
        sponsorId: testUserId,
      };
      const [insertedProgram] = await db.insert(programsV2Table).values(newProgram).returning();

      // Try to delete as other user
      const mutation = `
        mutation DeleteProgramV2($id: ID!) {
          deleteProgramV2(id: $id)
        }
      `;

      const variables = {
        id: insertedProgram.id.toString(),
      };

      const response = await server.inject({
        method: 'POST',
        url: '/graphql',
        headers: {
          authorization: `Bearer ${otherAuthToken}`,
        },
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
  });

  describe('getProgramV2 and getProgramsV2', () => {
    it('should fetch a single program by ID', async () => {
      const deadline = new Date();
      deadline.setMonth(deadline.getMonth() + 1);

      const newProgram: NewProgramV2 = {
        title: 'Test Program for Query',
        description: 'A program to be fetched.',
        skills: ['testing', 'query'],
        deadline,
        visibility: 'public',
        networkId: testNetworkId,
        price: '100',
        token_id: testTokenId,
        status: 'open',
        sponsorId: testUserId,
      };
      const [insertedProgram] = await db.insert(programsV2Table).values(newProgram).returning();

      const query = `
        query GetProgramV2($id: ID!) {
          programV2(id: $id) {
            id
            title
            description
            skills
            status
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
          variables: { id: insertedProgram.id.toString() },
        },
      });

      if (response.statusCode !== 200) {
        console.error('Error Response:', JSON.stringify(JSON.parse(response.body), null, 2));
      }
      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);

      console.log('Get Program Response:', JSON.stringify(result, null, 2));

      expect(result.data).toBeDefined();
      expect(result.data.programV2).toBeDefined();
      const program = result.data.programV2;

      expect(program.id).toBe(insertedProgram.id.toString());
      expect(program.title).toBe(newProgram.title);
      expect(program.description).toBe(newProgram.description);
      expect(program.skills).toEqual(newProgram.skills);
      expect(program.status).toBe(newProgram.status);
    });

    it('should fetch multiple programs with pagination', async () => {
      const deadline = new Date();
      deadline.setMonth(deadline.getMonth() + 1);

      // Create multiple programs
      const programs: NewProgramV2[] = [
        {
          title: 'Program 1',
          description: 'First program',
          skills: ['skill1'],
          deadline,
          visibility: 'public',
          networkId: testNetworkId,
          price: '100',
          token_id: testTokenId,
          status: 'open',
          sponsorId: testUserId,
        },
        {
          title: 'Program 2',
          description: 'Second program',
          skills: ['skill2'],
          deadline,
          visibility: 'public',
          networkId: testNetworkId,
          price: '200',
          token_id: testTokenId,
          status: 'open',
          sponsorId: testUserId,
        },
        {
          title: 'Program 3',
          description: 'Third program',
          skills: ['skill3'],
          deadline,
          visibility: 'private',
          networkId: testNetworkId,
          price: '300',
          token_id: testTokenId,
          status: 'closed',
          sponsorId: testUserId,
        },
      ];

      await db.insert(programsV2Table).values(programs);

      const query = `
        query GetProgramsV2($pagination: PaginationInput) {
          programsV2(pagination: $pagination) {
            data {
              id
              title
              description
              status
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
          variables: { pagination: { limit: 2, offset: 0 } },
        },
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);

      expect(result.data).toBeDefined();
      expect(result.data.programsV2).toBeDefined();
      // GetProgramsV2 only returns programs with visibility='public' AND status='open'
      // Program 3 has visibility='private', so it's not included
      expect(result.data.programsV2.data).toHaveLength(2);
      expect(result.data.programsV2.count).toBe(2); // Only public and open programs
    });

    it('should fetch programs with sponsor, network, and token information', async () => {
      const deadline = new Date();
      deadline.setMonth(deadline.getMonth() + 1);

      const newProgram: NewProgramV2 = {
        title: 'Program with Relations',
        description: 'A program to test sponsor, network, and token fields',
        skills: ['testing', 'sponsor', 'network', 'token'],
        deadline,
        visibility: 'public',
        networkId: testNetworkId,
        price: '500',
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
              description
              sponsor {
                id
                walletAddress
                email
                firstName
                lastName
              }
              network {
                id
                chainId
                chainName
                mainnet
                exploreUrl
              }
              token {
                id
                chainInfoId
                tokenName
                tokenAddress
              }
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
      expect(result.data.programsV2.data).toBeInstanceOf(Array);
      expect(result.data.programsV2.data.length).toBeGreaterThan(0);

      // Find the program we just created
      const program = result.data.programsV2.data.find(
        (p: { id: string }) => p.id === insertedProgram.id.toString(),
      );

      expect(program).toBeDefined();
      expect(program.title).toBe(newProgram.title);

      // Test sponsor information
      expect(program.sponsor).toBeDefined();
      expect(program.sponsor.id).toBe(testUserId.toString());
      expect(program.sponsor.walletAddress).toBe('0xTestCreator1234567890123456789012345678901234');
      expect(program.sponsor.email).toBe('creator@example.com');
      expect(program.sponsor.firstName).toBe('Test');
      expect(program.sponsor.lastName).toBe('Creator');

      // Test network information
      expect(program.network).toBeDefined();
      expect(program.network.id).toBe(testNetworkId.toString());
      expect(program.network.chainId).toBe(1);
      expect(program.network.chainName).toBe('ethereum');
      expect(program.network.mainnet).toBe(true);
      expect(program.network.exploreUrl).toBe('https://etherscan.io');

      // Test token information
      expect(program.token).toBeDefined();
      expect(program.token.id).toBe(testTokenId.toString());
      expect(program.token.chainInfoId).toBe(testNetworkId);
      expect(program.token.tokenName).toBe('USDC');
      expect(program.token.tokenAddress).toBe('0xA0b86a33E6441b8C4C8C0C4C8C0C4C8C0C4C8C0');
    });

    it('should handle pagination correctly', async () => {
      const deadline = new Date();
      deadline.setMonth(deadline.getMonth() + 1);

      // Create 5 programs
      const programs: NewProgramV2[] = Array.from({ length: 5 }, (_, i) => ({
        title: `Program ${i + 1}`,
        description: `Program number ${i + 1}`,
        skills: [`skill${i + 1}`],
        deadline,
        visibility: 'public',
        networkId: testNetworkId,
        price: `${(i + 1) * 100}`,
        token_id: testTokenId,
        status: 'open',
        sponsorId: testUserId,
      }));

      await db.insert(programsV2Table).values(programs);

      // Test first page
      const query = `
        query GetProgramsV2($pagination: PaginationInput) {
          programsV2(pagination: $pagination) {
            data {
              id
              title
            }
            count
          }
        }
      `;

      const firstPageResponse = await server.inject({
        method: 'POST',
        url: '/graphql',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          query,
          variables: { pagination: { limit: 2, offset: 0 } },
        },
      });

      expect(firstPageResponse.statusCode).toBe(200);
      const firstPageResult = JSON.parse(firstPageResponse.body);
      expect(firstPageResult.data.programsV2.data).toHaveLength(2);
      expect(firstPageResult.data.programsV2.count).toBeGreaterThanOrEqual(5);

      // Test second page
      const secondPageResponse = await server.inject({
        method: 'POST',
        url: '/graphql',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          query,
          variables: { pagination: { limit: 2, offset: 2 } },
        },
      });

      expect(secondPageResponse.statusCode).toBe(200);
      const secondPageResult = JSON.parse(secondPageResponse.body);
      expect(secondPageResult.data.programsV2.data).toHaveLength(2);
      expect(secondPageResult.data.programsV2.count).toBe(firstPageResult.data.programsV2.count);

      // Ensure different programs are returned
      const firstPageIds = firstPageResult.data.programsV2.data.map((p: { id: string }) => p.id);
      const secondPageIds = secondPageResult.data.programsV2.data.map((p: { id: string }) => p.id);
      expect(firstPageIds).not.toEqual(secondPageIds);
    });

    it('should return empty array when no programs exist', async () => {
      // Ensure no programs exist (they should be cleaned up in afterEach)
      const query = `
        query GetProgramsV2 {
          programsV2 {
            data {
              id
              title
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

      expect(result.data).toBeDefined();
      expect(result.data.programsV2).toBeDefined();
      expect(result.data.programsV2.data).toEqual([]);
      expect(result.data.programsV2.count).toBe(0);
    });

    it('should fetch programs with pagination input (limit and offset)', async () => {
      const deadline = new Date();
      deadline.setMonth(deadline.getMonth() + 1);

      // Create 10 programs for pagination testing
      const programs: NewProgramV2[] = Array.from({ length: 10 }, (_, i) => ({
        title: `Pagination Program ${i + 1}`,
        description: `Program number ${i + 1} for pagination testing`,
        skills: [`skill${i + 1}`, 'pagination'],
        deadline,
        visibility: 'public',
        networkId: testNetworkId,
        price: `${(i + 1) * 100}`,
        token_id: testTokenId,
        status: 'open',
        sponsorId: testUserId,
      }));

      await db.insert(programsV2Table).values(programs);

      const query = `
        query GetProgramsV2($pagination: PaginationInput) {
          programsV2(pagination: $pagination) {
            data {
              id
              title
              description
              skills
              status
            }
            count
          }
        }
      `;

      // Test with limit 3, offset 0 (first page)
      const firstPageResponse = await server.inject({
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

      expect(firstPageResponse.statusCode).toBe(200);
      const firstPageResult = JSON.parse(firstPageResponse.body);

      if (firstPageResult.errors) {
        console.error('GraphQL Errors:', JSON.stringify(firstPageResult.errors, null, 2));
      }

      expect(firstPageResult.data).toBeDefined();
      expect(firstPageResult.data.programsV2).toBeDefined();
      expect(firstPageResult.data.programsV2.data).toHaveLength(3);
      expect(firstPageResult.data.programsV2.count).toBeGreaterThanOrEqual(10);

      // Test with limit 3, offset 3 (second page)
      const secondPageResponse = await server.inject({
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
              offset: 3,
            },
          },
        },
      });

      expect(secondPageResponse.statusCode).toBe(200);
      const secondPageResult = JSON.parse(secondPageResponse.body);

      expect(secondPageResult.data).toBeDefined();
      expect(secondPageResult.data.programsV2).toBeDefined();
      expect(secondPageResult.data.programsV2.data).toHaveLength(3);
      expect(secondPageResult.data.programsV2.count).toBe(firstPageResult.data.programsV2.count);

      // Verify different programs are returned on different pages
      const firstPageIds = firstPageResult.data.programsV2.data.map((p: { id: string }) => p.id);
      const secondPageIds = secondPageResult.data.programsV2.data.map((p: { id: string }) => p.id);
      expect(firstPageIds).not.toEqual(secondPageIds);
      expect(new Set([...firstPageIds, ...secondPageIds]).size).toBe(6); // No duplicates

      // Test with default pagination (no input provided)
      const defaultResponse = await server.inject({
        method: 'POST',
        url: '/graphql',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          query,
          variables: {},
        },
      });

      expect(defaultResponse.statusCode).toBe(200);
      const defaultResult = JSON.parse(defaultResponse.body);
      expect(defaultResult.data.programsV2.data.length).toBeGreaterThan(0);
      expect(defaultResult.data.programsV2.count).toBeGreaterThanOrEqual(10);
    });
  });

  describe('programsBysponsorIdV2', () => {
    it('should fetch programs by sponsor ID with pagination', async () => {
      const deadline = new Date();
      deadline.setMonth(deadline.getMonth() + 1);

      // Create another user (sponsor)
      const otherSponsor: NewUserV2 = {
        walletAddress: '0xOtherSponsor1234567890123456789012345678901234',
        loginType: 'wallet',
        role: 'user',
        email: 'othersponsor@example.com',
        firstName: 'Other',
        lastName: 'Sponsor',
      };
      const [insertedOtherSponsor] = await db.insert(usersV2Table).values(otherSponsor).returning();
      const otherSponsorId = insertedOtherSponsor.id;

      // Create programs for testUserId (current sponsor)
      const programsForTestUser: NewProgramV2[] = Array.from({ length: 5 }, (_, i) => ({
        title: `Test User Program ${i + 1}`,
        description: `Program ${i + 1} by test user`,
        skills: [`skill${i + 1}`],
        deadline,
        visibility: 'public',
        networkId: testNetworkId,
        price: `${(i + 1) * 100}`,
        token_id: testTokenId,
        status: 'open',
        sponsorId: testUserId,
      }));

      // Create programs for otherSponsorId
      const programsForOtherSponsor: NewProgramV2[] = Array.from({ length: 3 }, (_, i) => ({
        title: `Other Sponsor Program ${i + 1}`,
        description: `Program ${i + 1} by other sponsor`,
        skills: [`otherskill${i + 1}`],
        deadline,
        visibility: 'public',
        networkId: testNetworkId,
        price: `${(i + 1) * 200}`,
        token_id: testTokenId,
        status: 'open',
        sponsorId: otherSponsorId,
      }));

      await db.insert(programsV2Table).values([...programsForTestUser, ...programsForOtherSponsor]);

      const query = `
        query GetProgramsBySponsorV2($sponsorId: ID!, $pagination: PaginationInput) {
          programsBysponsorIdV2(sponsorId: $sponsorId, pagination: $pagination) {
            data {
              id
              title
              description
              status
              sponsor {
                id
                walletAddress
                email
                firstName
                lastName
              }
            }
            count
          }
        }
      `;

      // Test fetching programs by testUserId with pagination
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
      expect(result.data.programsBysponsorIdV2.count).toBe(5); // Total programs for testUserId

      // Verify all returned programs belong to the correct sponsor
      for (const program of result.data.programsBysponsorIdV2.data) {
        expect(program.sponsor.id).toBe(testUserId.toString());
      }

      // Test fetching second page
      const secondPageResponse = await server.inject({
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
              offset: 3,
            },
          },
        },
      });

      expect(secondPageResponse.statusCode).toBe(200);
      const secondPageResult = JSON.parse(secondPageResponse.body);
      expect(secondPageResult.data.programsBysponsorIdV2.data).toHaveLength(2); // Remaining 2 programs
      expect(secondPageResult.data.programsBysponsorIdV2.count).toBe(5);

      // Test fetching programs by other sponsor
      const otherSponsorResponse = await server.inject({
        method: 'POST',
        url: '/graphql',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          query,
          variables: {
            sponsorId: otherSponsorId.toString(),
            pagination: {
              limit: 10,
              offset: 0,
            },
          },
        },
      });

      expect(otherSponsorResponse.statusCode).toBe(200);
      const otherSponsorResult = JSON.parse(otherSponsorResponse.body);
      expect(otherSponsorResult.data.programsBysponsorIdV2.data).toHaveLength(3);
      expect(otherSponsorResult.data.programsBysponsorIdV2.count).toBe(3);

      // Verify all returned programs belong to other sponsor
      for (const program of otherSponsorResult.data.programsBysponsorIdV2.data) {
        expect(program.sponsor.id).toBe(otherSponsorId.toString());
      }
    });

    it('should fetch programs by sponsor ID without pagination (default values)', async () => {
      const deadline = new Date();
      deadline.setMonth(deadline.getMonth() + 1);

      const newProgram: NewProgramV2 = {
        title: 'Program for Sponsor Query',
        description: 'A program to test sponsor query without pagination',
        skills: ['testing', 'sponsor'],
        deadline,
        visibility: 'public',
        networkId: testNetworkId,
        price: '500',
        token_id: testTokenId,
        status: 'open',
        sponsorId: testUserId,
      };
      await db.insert(programsV2Table).values(newProgram);

      const query = `
        query GetProgramsBySponsorV2($sponsorId: ID!) {
          programsBysponsorIdV2(sponsorId: $sponsorId) {
            data {
              id
              title
              description
              sponsor {
                id
                walletAddress
                email
              }
              network {
                id
                chainName
              }
              token {
                id
                tokenName
              }
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
      expect(result.data.programsBysponsorIdV2.data).toBeInstanceOf(Array);
      expect(result.data.programsBysponsorIdV2.data.length).toBeGreaterThan(0);
      expect(result.data.programsBysponsorIdV2.count).toBeGreaterThan(0);

      // Verify sponsor information is included
      const program = result.data.programsBysponsorIdV2.data.find(
        (p: { title: string }) => p.title === newProgram.title,
      );
      expect(program).toBeDefined();
      expect(program.sponsor.id).toBe(testUserId.toString());
      expect(program.sponsor.walletAddress).toBe('0xTestCreator1234567890123456789012345678901234');
      expect(program.network).toBeDefined();
      expect(program.token).toBeDefined();
    });

    it('should return empty array when sponsor has no programs', async () => {
      // Create a new user with no programs
      const newSponsor: NewUserV2 = {
        walletAddress: '0xNewSponsor1234567890123456789012345678901234',
        loginType: 'wallet',
        role: 'user',
        email: 'newsponsor@example.com',
      };
      const [insertedNewSponsor] = await db.insert(usersV2Table).values(newSponsor).returning();
      const newSponsorId = insertedNewSponsor.id;

      const query = `
        query GetProgramsBySponsorV2($sponsorId: ID!) {
          programsBysponsorIdV2(sponsorId: $sponsorId) {
            data {
              id
              title
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
            sponsorId: newSponsorId.toString(),
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);

      expect(result.data).toBeDefined();
      expect(result.data.programsBysponsorIdV2).toBeDefined();
      expect(result.data.programsBysponsorIdV2.data).toEqual([]);
      expect(result.data.programsBysponsorIdV2.count).toBe(0);
    });
  });
});
