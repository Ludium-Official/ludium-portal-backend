import { type NewUserV2, usersV2Table } from '@/db/schemas';
import { networksTable } from '@/db/schemas/v2/networks';
import { tokensTable } from '@/db/schemas/v2/tokens';
import { db } from '@/db/test-db';
import { sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { createTestServer } from '../helper';

describe('Tokens V2 GraphQL API - Integration Tests', () => {
  let server: FastifyInstance;
  let authToken: string;
  let networkId: number;

  beforeAll(async () => {
    server = await createTestServer();
  });

  beforeEach(async () => {
    const testUser: NewUserV2 = {
      walletAddress: '0xTokenTester00000000000000000000000000000000',
      loginType: 'wallet',
      role: 'admin',
      email: 'token@test.com',
      firstName: 'Tok',
      lastName: 'Admin',
    };
    await db.insert(usersV2Table).values(testUser).returning();

    const [net] = await db
      .insert(networksTable)
      .values({
        chainId: 1,
        chainName: 'Ethereum',
        mainnet: true,
        exploreUrl: 'https://etherscan.io',
      })
      .returning();
    networkId = net.id;

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
    await db.execute(sql`TRUNCATE TABLE tokens RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE networks RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE users_v2 RESTART IDENTITY CASCADE`);
  });

  it('should create, list, filter by network, update and delete a token', async () => {
    const createMutation = `
      mutation CreateToken($input: CreateTokenV2Input!) {
        createTokenV2(input: $input) { id chainInfoId tokenName tokenAddress }
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
            tokenName: 'USDC',
            tokenAddress: '0x0000000000000000000000000000000000000001',
            decimals: 6,
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
    const created = createResult.data.createTokenV2;
    expect(created.tokenName).toBe('USDC');

    const listQuery = `
      query Tokens($pagination: PaginationInput) {
        tokensV2(pagination: $pagination) { count data { id tokenName } }
      }
    `;
    const listRes = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: { authorization: `Bearer ${authToken}` },
      payload: { query: listQuery, variables: { pagination: { limit: 10, offset: 0 } } },
    });
    expect(listRes.statusCode).toBe(200);
    const listResult = JSON.parse(listRes.body);
    expect(listResult.errors).toBeUndefined();
    expect(listResult.data.tokensV2.count).toBe(1);

    const byNetworkQuery = `
      query TokensByNetwork($networkId: Int!, $pagination: PaginationInput) {
        tokensByNetworkV2(networkId: $networkId, pagination: $pagination) { count data { id chainInfoId tokenName } }
      }
    `;
    const byNetworkRes = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        query: byNetworkQuery,
        variables: { networkId, pagination: { limit: 10, offset: 0 } },
      },
    });
    expect(byNetworkRes.statusCode).toBe(200);
    const byNetworkResult = JSON.parse(byNetworkRes.body);
    expect(byNetworkResult.errors).toBeUndefined();
    const byNetwork = byNetworkResult.data.tokensByNetworkV2;
    expect(byNetwork.count).toBe(1);
    expect(byNetwork.data[0].chainInfoId).toBe(networkId);

    const updateMutation = `
      mutation UpdateToken($id: ID!, $input: UpdateTokenV2Input!) {
        updateTokenV2(id: $id, input: $input) { id tokenName }
      }
    `;
    const updateRes = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        query: updateMutation,
        variables: { id: created.id, input: { tokenName: 'WETH' } },
      },
    });
    expect(updateRes.statusCode).toBe(200);
    const updateResult = JSON.parse(updateRes.body);
    expect(updateResult.errors).toBeUndefined();
    expect(updateResult.data.updateTokenV2.tokenName).toBe('WETH');

    const deleteMutation = `
      mutation DeleteToken($id: ID!) { deleteTokenV2(id: $id) { id } }
    `;
    const deleteRes = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: { authorization: `Bearer ${authToken}` },
      payload: { query: deleteMutation, variables: { id: created.id } },
    });
    expect(deleteRes.statusCode).toBe(200);
    const deleteResult = JSON.parse(deleteRes.body);
    expect(deleteResult.errors).toBeUndefined();
    expect(deleteResult.data.deleteTokenV2.id).toBe(created.id);

    const rows = await db.select().from(tokensTable);
    expect(rows.length).toBe(0);
  });
});
