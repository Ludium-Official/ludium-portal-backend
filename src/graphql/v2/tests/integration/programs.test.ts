import {
  type NewProgramV2,
  type NewUserV2,
  applicationsV2Table,
  milestonesV2Table,
  programsV2Table,
  usersV2Table,
} from '@/db/schemas';
import { db } from '@/db/test-db';
import { sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { createTestServer } from '../helper';

describe('Programs V2 GraphQL API', () => {
  let server: FastifyInstance;
  let testUserId: number;

  beforeAll(async () => {
    server = await createTestServer();

    // Create a test user for all program tests
    const testUser: NewUserV2 = {
      walletAddress: '0xTestUser1234567890123456789012345678901234',
      loginType: 'wallet',
      role: 'user',
    };
    const [insertedUser] = await db.insert(usersV2Table).values(testUser).returning();
    testUserId = insertedUser.id;
  });

  afterEach(async () => {
    // Clean up: truncate tables in dependency order with CASCADE
    // CASCADE will automatically truncate all tables that have foreign key references
    await db.execute(
      sql`TRUNCATE TABLE ${milestonesV2Table}, ${applicationsV2Table}, ${programsV2Table} RESTART IDENTITY CASCADE`,
    );
  });

  afterAll(async () => {
    // Clean up: truncate all tables with CASCADE
    await db.execute(
      sql`TRUNCATE TABLE ${milestonesV2Table}, ${applicationsV2Table}, ${programsV2Table}, ${usersV2Table} RESTART IDENTITY CASCADE`,
    );
  });

  it('should create a new program via mutation', async () => {
    const deadline = new Date();
    const mutation = `
      mutation CreateProgram($input: CreateProgramV2Input!) {
        createProgramV2(input: $input) {
          id
          title
          description
          status
          visibility
          skills
          network
          price
          currency
          deadline
        }
      }
    `;

    const variables = {
      input: {
        title: 'Test Program via GraphQL',
        description: 'This is a test program created via a GraphQL mutation.',
        skills: ['GraphQL', 'TypeScript'],
        deadline: deadline.toISOString(),
        visibility: 'public',
        network: 'mainnet',
        price: '1500',
        currency: 'USDC',
        status: 'open',
        creatorId: testUserId,
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
    const { data } = response.json();
    const program = data.createProgramV2;

    expect(program).toBeDefined();
    expect(program.id).toBeDefined();
    expect(program.title).toBe(variables.input.title);
    expect(program.description).toBe(variables.input.description);
    expect(program.status).toBe(variables.input.status);
    expect(program.visibility).toBe(variables.input.visibility);
    expect(program.skills).toEqual(variables.input.skills);
    expect(program.network).toBe(variables.input.network);
    expect(program.price).toBe(variables.input.price);
    expect(program.currency).toBe(variables.input.currency);
    expect(new Date(program.deadline)).toEqual(deadline);
  });

  it('should fetch a single program by ID', async () => {
    const deadline = new Date();
    const newProgram: NewProgramV2 = {
      title: 'Test Program',
      description: 'A program to be fetched.',
      skills: ['testing'],
      deadline,
      visibility: 'private',
      network: 'testnet',
      price: '100',
      currency: 'ETH',
      status: 'closed',
      creatorId: testUserId,
    };
    const [insertedProgram] = await db.insert(programsV2Table).values(newProgram).returning();

    const query = `
      query GetProgram($id: ID!) {
        programV2(id: $id) {
          id
          title
          description
        }
      }
    `;

    const response = await server.inject({
      method: 'POST',
      url: '/graphql',
      payload: {
        query,
        variables: { id: insertedProgram.id },
      },
    });

    expect(response.statusCode).toBe(200);
    const { data } = response.json();
    const program = data.programV2;

    expect(program).toBeDefined();
    expect(program.id).toBe(insertedProgram.id.toString());
    expect(program.title).toBe(newProgram.title);
    expect(program.description).toBe(newProgram.description);
  });

  it('should update a program via mutation', async () => {
    const deadline = new Date();
    const newProgram: NewProgramV2 = {
      title: 'Old Title',
      description: 'Old description.',
      skills: ['old-skill'],
      deadline,
      visibility: 'public',
      network: 'mainnet',
      price: '1000',
      currency: 'USDC',
      status: 'draft',
      creatorId: testUserId,
    };
    const [insertedProgram] = await db.insert(programsV2Table).values(newProgram).returning();

    const mutation = `
      mutation UpdateProgram($id: ID!, $input: UpdateProgramV2Input!) {
        updateProgramV2(id: $id, input: $input) {
          id
          title
          description
          status
        }
      }
    `;

    const variables = {
      id: insertedProgram.id,
      input: {
        title: 'New Title',
        description: 'New description.',
        status: 'open',
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
    const { data } = response.json();
    const updatedProgram = data.updateProgramV2;

    expect(updatedProgram).toBeDefined();
    expect(updatedProgram.id).toBe(insertedProgram.id.toString());
    expect(updatedProgram.title).toBe(variables.input.title);
    expect(updatedProgram.description).toBe(variables.input.description);
    expect(updatedProgram.status).toBe(variables.input.status);
  });

  it('should delete a program via mutation', async () => {
    const deadline = new Date();
    const newProgram: NewProgramV2 = {
      title: 'To Be Deleted',
      description: 'This program will be deleted.',
      skills: ['disposable'],
      deadline,
      visibility: 'public',
      network: 'mainnet',
      price: '100',
      currency: 'USDC',
      status: 'draft',
      creatorId: testUserId,
    };
    const [insertedProgram] = await db.insert(programsV2Table).values(newProgram).returning();

    const mutation = `
      mutation DeleteProgram($id: ID!) {
        deleteProgramV2(id: $id) {
          id
          title
        }
      }
    `;

    const response = await server.inject({
      method: 'POST',
      url: '/graphql',
      payload: {
        query: mutation,
        variables: { id: insertedProgram.id },
      },
    });

    expect(response.statusCode).toBe(200);
    const { data } = response.json();
    const deletedProgram = data.deleteProgramV2;

    expect(deletedProgram).toBeDefined();
    expect(deletedProgram.id).toBe(insertedProgram.id.toString());
    expect(deletedProgram.title).toBe(newProgram.title);

    // Verify it's actually deleted
    const [program] = await db
      .select()
      .from(programsV2Table)
      .where(sql`${programsV2Table.id} = ${insertedProgram.id}`);
    expect(program).toBeUndefined();
  });
});
