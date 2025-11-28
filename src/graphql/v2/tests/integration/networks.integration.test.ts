import { type NewUserV2, usersV2Table } from '@/db/schemas';
import { networksTable } from '@/db/schemas/v2/networks';
import { db } from '@/db/test-db';
import { sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { createTestServer } from '../helper';

describe('Networks V2 GraphQL API - Integration Tests', () => {
  let server: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    server = await createTestServer();
  });

  beforeEach(async () => {
    const testUser: NewUserV2 = {
      walletAddress: '0xNetworkTester000000000000000000000000000000',
      loginType: 'wallet',
      role: 'admin',
      email: 'network@test.com',
      firstName: 'Net',
      lastName: 'Admin',
    };
    await db.insert(usersV2Table).values(testUser).returning();

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
    await db.execute(sql`TRUNCATE TABLE networks RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE users_v2 RESTART IDENTITY CASCADE`);
  });

  it('should create, query, update and delete a network', async () => {
    const createMutation = `
      mutation CreateNetwork($input: CreateNetworkV2Input!) {
        createNetworkV2(input: $input) {
          id
          chainId
          chainName
          mainnet
          exploreUrl
        }
      }
    `;
    const createVariables = {
      input: {
        chainId: 11155111,
        chainName: 'Sepolia',
        mainnet: false,
        exploreUrl: 'https://sepolia.etherscan.io',
      },
    };
    const createRes = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: { authorization: `Bearer ${authToken}` },
      payload: { query: createMutation, variables: createVariables },
    });
    expect(createRes.statusCode).toBe(200);
    const created = JSON.parse(createRes.body).data.createNetworkV2;
    expect(created.chainId).toBe(11155111);

    const listQuery = `
      query Networks($pagination: PaginationInput) {
        networksV2(pagination: $pagination) { count data { id chainId chainName mainnet exploreUrl } }
      }
    `;
    const listRes = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: { authorization: `Bearer ${authToken}` },
      payload: { query: listQuery, variables: { pagination: { limit: 10, offset: 0 } } },
    });
    const list = JSON.parse(listRes.body).data.networksV2;
    expect(list.count).toBe(1);
    expect(list.data[0].chainName).toBe('Sepolia');

    const getQuery = `
      query Network($id: ID!) { networkV2(id: $id) { id chainId chainName mainnet exploreUrl } }
    `;
    const getRes = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: { authorization: `Bearer ${authToken}` },
      payload: { query: getQuery, variables: { id: created.id } },
    });
    expect(JSON.parse(getRes.body).data.networkV2.chainName).toBe('Sepolia');

    const updateMutation = `
      mutation UpdateNetwork($id: ID!, $input: UpdateNetworkV2Input!) {
        updateNetworkV2(id: $id, input: $input) { id chainName mainnet }
      }
    `;
    const updateRes = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        query: updateMutation,
        variables: { id: created.id, input: { chainName: 'Sepolia Test' } },
      },
    });
    expect(JSON.parse(updateRes.body).data.updateNetworkV2.chainName).toBe('Sepolia Test');

    const deleteMutation = `
      mutation DeleteNetwork($id: ID!) { deleteNetworkV2(id: $id) { id } }
    `;
    const deleteRes = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: { authorization: `Bearer ${authToken}` },
      payload: { query: deleteMutation, variables: { id: created.id } },
    });
    expect(JSON.parse(deleteRes.body).data.deleteNetworkV2.id).toBe(created.id);

    const countAfter = await db.select().from(networksTable);
    expect(countAfter.length).toBe(0);
  });
});
