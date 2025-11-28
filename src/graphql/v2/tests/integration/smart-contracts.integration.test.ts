import { type NewUserV2, usersV2Table } from '@/db/schemas';
import { networksTable } from '@/db/schemas/v2/networks';
import { smartContractsTable } from '@/db/schemas/v2/smart-contracts';
import { db } from '@/db/test-db';
import { sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { createTestServer } from '../helper';

describe('Smart Contracts V2 GraphQL API - Integration Tests', () => {
  let server: FastifyInstance;
  let authToken: string;
  let networkId: number;

  beforeAll(async () => {
    server = await createTestServer();
  });

  beforeEach(async () => {
    // Seed network
    const [net] = await db
      .insert(networksTable)
      .values({ chainId: 11155111, chainName: 'Sepolia', mainnet: false })
      .returning();
    networkId = net.id;

    // Seed user
    const testUser: NewUserV2 = {
      walletAddress: '0xSmartContractTester0000000000000000000000',
      loginType: 'wallet',
      role: 'admin',
      email: 'smartcontract@test.com',
      firstName: 'Smart',
      lastName: 'Admin',
    };
    await db.insert(usersV2Table).values(testUser).returning();

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
          walletAddress: testUser.walletAddress,
          loginType: 'wallet',
          email: testUser.email,
        },
      },
    });
    authToken = JSON.parse(loginResponse.body).data.loginV2;
  });

  afterEach(async () => {
    await db.execute(sql`TRUNCATE TABLE smart_contracts RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE networks RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE users_v2 RESTART IDENTITY CASCADE`);
  });

  it('should create, list, filter, update and delete smart contract', async () => {
    const createMutation = `
      mutation CreateSmartContract($input: CreateSmartContractV2Input!) {
        createSmartContractV2(input: $input) {
          id
          chainInfoId
          address
          name
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
            chainInfoId: networkId,
            address: '0x0000000000000000000000000000000000000123',
            name: 'TestContract',
          },
        },
      },
    });
    expect(createRes.statusCode).toBe(200);
    const created = JSON.parse(createRes.body).data.createSmartContractV2;
    expect(created.chainInfoId).toBe(networkId);
    expect(created.address).toBe('0x0000000000000000000000000000000000000123');
    expect(created.name).toBe('TestContract');

    // List all smart contracts
    const listQuery = `
      query SmartContracts($pagination: PaginationInput, $chainInfoId: Int) {
        smartContractsV2(pagination: $pagination, chainInfoId: $chainInfoId) {
          count
          data {
            id
            chainInfoId
            address
            name
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
        variables: { pagination: { limit: 10, offset: 0 } },
      },
    });
    expect(listRes.statusCode).toBe(200);
    const listResult = JSON.parse(listRes.body).data.smartContractsV2;
    expect(listResult.count).toBe(1);
    expect(listResult.data[0].name).toBe('TestContract');

    // Get smart contract by ID
    const getByIdQuery = `
      query SmartContract($id: ID!) {
        smartContractV2(id: $id) {
          id
          chainInfoId
          address
          name
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
    const contract = JSON.parse(getByIdRes.body).data.smartContractV2;
    expect(contract.id).toBe(created.id);
    expect(contract.address).toBe('0x0000000000000000000000000000000000000123');

    // Filter by chainInfoId
    const filterByChainQuery = `
      query SmartContracts($pagination: PaginationInput, $chainInfoId: Int) {
        smartContractsV2(pagination: $pagination, chainInfoId: $chainInfoId) {
          count
          data {
            id
            chainInfoId
            address
            name
          }
        }
      }
    `;
    const filterRes = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        query: filterByChainQuery,
        variables: {
          pagination: { limit: 10, offset: 0 },
          chainInfoId: networkId,
        },
      },
    });
    expect(filterRes.statusCode).toBe(200);
    const filterResult = JSON.parse(filterRes.body).data.smartContractsV2;
    expect(filterResult.count).toBe(1);
    expect(filterResult.data[0].chainInfoId).toBe(networkId);

    // Update smart contract
    const updateMutation = `
      mutation UpdateSmartContract($id: ID!, $input: UpdateSmartContractV2Input!) {
        updateSmartContractV2(id: $id, input: $input) {
          id
          address
          name
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
            address: '0x0000000000000000000000000000000000000456',
            name: 'UpdatedContract',
          },
        },
      },
    });
    expect(updateRes.statusCode).toBe(200);
    const updated = JSON.parse(updateRes.body).data.updateSmartContractV2;
    expect(updated.address).toBe('0x0000000000000000000000000000000000000456');
    expect(updated.name).toBe('UpdatedContract');

    // Delete smart contract
    const deleteMutation = `
      mutation DeleteSmartContract($id: ID!) {
        deleteSmartContractV2(id: $id) {
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
    expect(JSON.parse(deleteRes.body).data.deleteSmartContractV2.id).toBe(created.id);

    // Verify deletion
    const rows = await db.select().from(smartContractsTable);
    expect(rows.length).toBe(0);
  });

  it('should create multiple smart contracts and filter by chainInfoId', async () => {
    // Create first contract
    const createMutation1 = `
      mutation CreateSmartContract($input: CreateSmartContractV2Input!) {
        createSmartContractV2(input: $input) {
          id
          chainInfoId
          address
          name
        }
      }
    `;
    await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        query: createMutation1,
        variables: {
          input: {
            chainInfoId: networkId,
            address: '0x1111111111111111111111111111111111111111',
            name: 'Contract1',
          },
        },
      },
    });

    // Create second contract
    await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        query: createMutation1,
        variables: {
          input: {
            chainInfoId: networkId,
            address: '0x2222222222222222222222222222222222222222',
            name: 'Contract2',
          },
        },
      },
    });

    // List all contracts
    const listQuery = `
      query SmartContracts($pagination: PaginationInput) {
        smartContractsV2(pagination: $pagination) {
          count
          data {
            id
            name
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
        variables: { pagination: { limit: 10, offset: 0 } },
      },
    });
    expect(listRes.statusCode).toBe(200);
    const listResult = JSON.parse(listRes.body).data.smartContractsV2;
    expect(listResult.count).toBe(2);
  });
});
