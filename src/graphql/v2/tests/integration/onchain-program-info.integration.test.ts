import { type NewTokenType, type NewUserV2, tokensTable, usersV2Table } from '@/db/schemas';
import { networksTable } from '@/db/schemas/v2/networks';
import { onchainProgramInfoTable } from '@/db/schemas/v2/onchain-program-info';
import { type NewProgramV2, programsV2Table } from '@/db/schemas/v2/programs';
import { type NewSmartContract, smartContractsTable } from '@/db/schemas/v2/smart-contracts';
import { db } from '@/db/test-db';
import { sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { createTestServer } from '../helper';

describe('Onchain Program Info V2 GraphQL API - Integration Tests', () => {
  let server: FastifyInstance;
  let authToken: string;
  let programId: string;
  let networkId: number;
  let smartContractId: number;

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
      nickname: 'Test User',
    };
    const [insertedSponsor] = await db.insert(usersV2Table).values(sponsor).returning();

    // Seed network
    const [net] = await db
      .insert(networksTable)
      .values({ chainId: 11155111, chainName: 'Sepolia', mainnet: false })
      .returning();
    networkId = net.id;

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

    // Seed smart contract
    const testSmartContract: NewSmartContract = {
      chainInfoId: net.id,
      address: '0x0000000000000000000000000000000000000123',
      name: 'TestContract',
    };
    const [insertedSmartContract] = await db
      .insert(smartContractsTable)
      .values(testSmartContract)
      .returning();
    smartContractId = insertedSmartContract.id;

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
    await db.execute(sql`TRUNCATE TABLE onchain_program_info RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE programs_v2 RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE smart_contracts RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE networks RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE tokens RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE users_v2 RESTART IDENTITY CASCADE`);
  });

  it('should create, list, filter, update and delete onchain program info', async () => {
    const createMutation = `
      mutation CreateOPI($input: CreateOnchainProgramInfoV2Input!) {
        createOnchainProgramInfoV2(input: $input) {
          id
          programId
          networkId
          smartContractId
          onchainProgramId
          status
          tx
        }
      }
    `;
    const mockTxHash = `0x${'a'.repeat(64)}`;
    const createRes = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        query: createMutation,
        variables: {
          input: {
            programId,
            networkId,
            smartContractId,
            onchainProgramId: 1,
            tx: mockTxHash,
            status: 'active',
          },
        },
      },
    });
    expect(createRes.statusCode).toBe(200);
    const created = JSON.parse(createRes.body).data.createOnchainProgramInfoV2;
    expect(created.programId).toBe(programId);
    expect(created.networkId).toBe(networkId);
    expect(created.smartContractId).toBe(smartContractId);
    expect(created.onchainProgramId).toBe(1);
    expect(created.status).toBe('active');
    expect(created.tx).toBe(mockTxHash);

    // List all onchain program infos
    const listQuery = `
      query OPI($pagination: PaginationInput) {
        onchainProgramInfosV2(pagination: $pagination) {
          count
          data {
            id
            programId
            networkId
            smartContractId
            onchainProgramId
            status
          }
        }
      }
    `;
    const listRes = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: { authorization: `Bearer ${authToken}` },
      payload: { query: listQuery, variables: { pagination: { limit: 10, offset: 0 } } },
    });
    expect(listRes.statusCode).toBe(200);
    const listResult = JSON.parse(listRes.body).data.onchainProgramInfosV2;
    expect(listResult.count).toBe(1);

    // Get onchain program info by ID
    const getByIdQuery = `
      query OPI($id: ID!) {
        onchainProgramInfoV2(id: $id) {
          id
          programId
          networkId
          smartContractId
          onchainProgramId
          status
          tx
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
    const programInfo = JSON.parse(getByIdRes.body).data.onchainProgramInfoV2;
    expect(programInfo.id).toBe(created.id);
    expect(programInfo.programId).toBe(programId);

    // Filter by programId
    const byProgramQuery = `
      query OPIByProgram($programId: Int!, $pagination: PaginationInput) {
        onchainProgramInfosByProgramV2(programId: $programId, pagination: $pagination) {
          count
          data {
            id
            programId
            status
          }
        }
      }
    `;
    const byProgramRes = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        query: byProgramQuery,
        variables: { programId, pagination: { limit: 10, offset: 0 } },
      },
    });
    expect(byProgramRes.statusCode).toBe(200);
    const byProgram = JSON.parse(byProgramRes.body).data.onchainProgramInfosByProgramV2;
    expect(byProgram.count).toBe(1);
    expect(byProgram.data[0].programId).toBe(programId);

    // Filter by smartContractId
    const bySmartContractQuery = `
      query OPIBySmartContract($smartContractId: Int!, $pagination: PaginationInput) {
        onchainProgramInfosBySmartContractV2(smartContractId: $smartContractId, pagination: $pagination) {
          count
          data {
            id
            smartContractId
            status
          }
        }
      }
    `;
    const bySmartContractRes = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        query: bySmartContractQuery,
        variables: {
          smartContractId,
          pagination: { limit: 10, offset: 0 },
        },
      },
    });
    expect(bySmartContractRes.statusCode).toBe(200);
    const bySmartContract = JSON.parse(bySmartContractRes.body).data
      .onchainProgramInfosBySmartContractV2;
    expect(bySmartContract.count).toBe(1);
    expect(bySmartContract.data[0].smartContractId).toBe(smartContractId);

    // Update onchain program info
    const updateMutation = `
      mutation UpdateOPI($id: ID!, $input: UpdateOnchainProgramInfoV2Input!) {
        updateOnchainProgramInfoV2(id: $id, input: $input) {
          id
          status
          tx
        }
      }
    `;
    const updatedTxHash = `0x${'b'.repeat(64)}`;
    const updateRes = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        query: updateMutation,
        variables: {
          id: created.id,
          input: {
            status: 'paused',
            tx: updatedTxHash,
          },
        },
      },
    });
    expect(updateRes.statusCode).toBe(200);
    const updated = JSON.parse(updateRes.body).data.updateOnchainProgramInfoV2;
    expect(updated.status).toBe('paused');
    expect(updated.tx).toBe(updatedTxHash);

    // Delete onchain program info
    const deleteMutation = `
      mutation DeleteOPI($id: ID!) {
        deleteOnchainProgramInfoV2(id: $id) {
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
    expect(JSON.parse(deleteRes.body).data.deleteOnchainProgramInfoV2.id).toBe(created.id);

    // Verify deletion
    const rows = await db.select().from(onchainProgramInfoTable);
    expect(rows.length).toBe(0);
  });

  it('should create onchain program info with default status', async () => {
    const createMutation = `
      mutation CreateOPI($input: CreateOnchainProgramInfoV2Input!) {
        createOnchainProgramInfoV2(input: $input) {
          id
          programId
          networkId
          smartContractId
          onchainProgramId
          status
          tx
        }
      }
    `;
    const mockTxHash = `0x${'c'.repeat(64)}`;
    const createRes = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        query: createMutation,
        variables: {
          input: {
            programId,
            networkId,
            smartContractId,
            onchainProgramId: 2,
            tx: mockTxHash,
            // status not provided, should default to 'active'
          },
        },
      },
    });
    expect(createRes.statusCode).toBe(200);
    const created = JSON.parse(createRes.body).data.createOnchainProgramInfoV2;
    expect(created.status).toBe('active');
    expect(created.onchainProgramId).toBe(2);
  });
});
