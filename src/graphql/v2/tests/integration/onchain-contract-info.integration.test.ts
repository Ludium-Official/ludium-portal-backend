import { type NewTokenType, type NewUserV2, tokensTable, usersV2Table } from '@/db/schemas';
import { networksTable } from '@/db/schemas/v2/networks';
import { onchainContractInfoTable } from '@/db/schemas/v2/onchain-contract-info';
import { type NewProgramV2, programsV2Table } from '@/db/schemas/v2/programs';
import { type NewSmartContract, smartContractsTable } from '@/db/schemas/v2/smart-contracts';
import { db } from '@/db/test-db';
import { sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { createTestServer } from '../helper';

describe('Onchain Contract Info V2 GraphQL API - Integration Tests', () => {
  let server: FastifyInstance;
  let authToken: string;
  let programId: number;
  let sponsorId: number;
  let applicantId: number;
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
      firstName: 'Spo',
      lastName: 'Nsor',
    };
    const [insertedSponsor] = await db.insert(usersV2Table).values(sponsor).returning();
    sponsorId = insertedSponsor.id;

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
    await db.execute(sql`TRUNCATE TABLE onchain_contract_info RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE programs_v2 RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE smart_contracts RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE networks RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE tokens RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE users_v2 RESTART IDENTITY CASCADE`);
  });

  it('should create, list, filter, update and delete onchain contract info', async () => {
    const createMutation = `
      mutation CreateOCI($input: CreateOnchainContractInfoV2Input!) {
        createOnchainContractInfoV2(input: $input) { id programId sponsorId applicantId smartContractId onchainContractId status tx }
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
            programId,
            sponsorId,
            applicantId,
            smartContractId,
            onchainContractId: 1,
            tx: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
          },
        },
      },
    });
    const created = JSON.parse(createRes.body).data.createOnchainContractInfoV2;
    expect(created.programId).toBe(programId);
    expect(created.sponsorId).toBe(sponsorId);
    expect(created.applicantId).toBe(applicantId);
    expect(created.smartContractId).toBe(smartContractId);
    expect(created.onchainContractId).toBe(1);

    const listQuery = `
      query OCI($pagination: PaginationInput) {
        onchainContractInfosV2(pagination: $pagination) { count data { id } }
      }
    `;
    const listRes = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: { authorization: `Bearer ${authToken}` },
      payload: { query: listQuery, variables: { pagination: { limit: 10, offset: 0 } } },
    });
    expect(JSON.parse(listRes.body).data.onchainContractInfosV2.count).toBe(1);

    const byProgramQuery = `
      query OCIByProgram($programId: Int!, $pagination: PaginationInput) {
        onchainContractInfosByProgramV2(programId: $programId, pagination: $pagination) { count data { id programId } }
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
    const byProgram = JSON.parse(byProgramRes.body).data.onchainContractInfosByProgramV2;
    expect(byProgram.count).toBe(1);

    const byApplicantQuery = `
      query OCIByApplicant($applicantId: Int!, $pagination: PaginationInput) {
        onchainContractInfosByApplicantV2(applicantId: $applicantId, pagination: $pagination) { count data { id applicantId } }
      }
    `;
    const byApplicantRes = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        query: byApplicantQuery,
        variables: { applicantId, pagination: { limit: 10, offset: 0 } },
      },
    });
    const byApplicant = JSON.parse(byApplicantRes.body).data.onchainContractInfosByApplicantV2;
    expect(byApplicant.count).toBe(1);

    const updateMutation = `
      mutation UpdateOCI($id: ID!, $input: UpdateOnchainContractInfoV2Input!) {
        updateOnchainContractInfoV2(id: $id, input: $input) { id status tx }
      }
    `;
    const updateRes = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        query: updateMutation,
        variables: { id: created.id, input: { status: 'updated' } },
      },
    });
    expect(JSON.parse(updateRes.body).data.updateOnchainContractInfoV2.status).toBe('updated');

    const deleteMutation = `
      mutation DeleteOCI($id: ID!) { deleteOnchainContractInfoV2(id: $id) { id } }
    `;
    const deleteRes = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: { authorization: `Bearer ${authToken}` },
      payload: { query: deleteMutation, variables: { id: created.id } },
    });
    expect(JSON.parse(deleteRes.body).data.deleteOnchainContractInfoV2.id).toBe(created.id);

    const rows = await db.select().from(onchainContractInfoTable);
    expect(rows.length).toBe(0);
  });
});
