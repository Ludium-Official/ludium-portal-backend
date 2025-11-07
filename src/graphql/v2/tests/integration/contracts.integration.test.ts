import { createHash } from 'node:crypto';
import { type NewTokenType, type NewUserV2, tokensTable, usersV2Table } from '@/db/schemas';
import { type NewApplicationV2, applicationsV2Table } from '@/db/schemas/v2/applications';
import { contractsTable } from '@/db/schemas/v2/contracts';
import { networksTable } from '@/db/schemas/v2/networks';
import { type NewProgramV2, programsV2Table } from '@/db/schemas/v2/programs';
import { type NewSmartContract, smartContractsTable } from '@/db/schemas/v2/smart-contracts';
import { db } from '@/db/test-db';
import { sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { createTestServer } from '../helper';

describe('Contracts V2 GraphQL API - Integration Tests', () => {
  let server: FastifyInstance;
  let authToken: string;
  let programId: number;
  let sponsorId: number;
  let applicantId: number;
  let smartContractId: number;
  let applicationId: number;

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

    // Seed application linking program and applicant
    const application: NewApplicationV2 = {
      programId,
      applicantId,
      status: 'applied',
      title: 'Builder application',
      content: 'Ready to contribute to the program',
      picked: false,
    };
    const [insertedApplication] = await db
      .insert(applicationsV2Table)
      .values(application)
      .returning();
    applicationId = insertedApplication.id;

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
    await db.execute(sql`TRUNCATE TABLE contracts RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE programs_v2 RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE applications_v2 RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE smart_contracts RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE networks RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE tokens RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE users_v2 RESTART IDENTITY CASCADE`);
  });

  it('should create, list, filter, update and delete contract', async () => {
    // Create contract snapshot contents
    const contractSnapshotContents = {
      title: 'Test Contract Agreement',
      milestone_contents: [
        'Complete frontend development',
        'Implement backend API',
        'Deploy to production',
      ],
      terms: 'All work must be completed according to the specifications',
      deadline: new Date('2024-12-31').toISOString(),
      payamount: '5000',
      addendum: 'Additional terms may be added upon mutual agreement',
    };

    // Generate hash from snapshot contents
    const snapshotData = JSON.stringify(contractSnapshotContents);
    const snapshotHash = `0x${createHash('sha256').update(snapshotData).digest('hex')}`;

    const createMutation = `
      mutation CreateContract($input: CreateContractV2Input!) {
        createContractV2(input: $input) {
          id
          programId
          sponsorId
          applicantId
          applicationId
          smartContractId
          onchainContractId
          contract_snapshot_cotents
          contract_snapshot_hash
          builder_signature
          createdAt
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
            programId,
            sponsorId,
            applicantId,
            applicationId,
            smartContractId,
            onchainContractId: 1,
            contract_snapshot_cotents: contractSnapshotContents,
            contract_snapshot_hash: snapshotHash,
            builder_signature: '0xSignature123',
          },
        },
      },
    });
    expect(createRes.statusCode).toBe(200);
    const created = JSON.parse(createRes.body).data.createContractV2;
    expect(created.programId).toBe(programId);
    expect(created.sponsorId).toBe(sponsorId);
    expect(created.applicantId).toBe(applicantId);
    expect(created.applicationId).toBe(applicationId);
    expect(created.smartContractId).toBe(smartContractId);
    expect(created.onchainContractId).toBe(1);
    expect(created.contract_snapshot_hash).toBe(snapshotHash);
    expect(created.builder_signature).toBe('0xSignature123');
    expect(created.contract_snapshot_cotents).toEqual(contractSnapshotContents);

    // List all contracts
    const listQuery = `
      query Contracts($pagination: PaginationInput) {
        contractsV2(pagination: $pagination) {
          count
          data {
            id
            programId
            sponsorId
            applicantId
            applicationId
            smartContractId
            onchainContractId
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
    expect(JSON.parse(listRes.body).data.contractsV2.count).toBe(1);

    // Get contract by ID
    const getByIdQuery = `
      query Contract($id: ID!) {
        contractV2(id: $id) {
          id
          programId
          sponsorId
          applicantId
          applicationId
          smartContractId
          onchainContractId
          contract_snapshot_hash
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
    const contract = JSON.parse(getByIdRes.body).data.contractV2;
    expect(contract.id).toBe(created.id);
    expect(contract.programId).toBe(programId);
    expect(contract.applicationId).toBe(applicationId);

    // Filter by program
    const byProgramQuery = `
      query ContractsByProgram($programId: Int!, $pagination: PaginationInput) {
        contractsByProgramV2(programId: $programId, pagination: $pagination) {
          count
          data {
            id
            programId
            sponsorId
            applicantId
            applicationId
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
    const byProgram = JSON.parse(byProgramRes.body).data.contractsByProgramV2;
    expect(byProgram.count).toBe(1);
    expect(byProgram.data[0].programId).toBe(programId);

    // Filter by applicant
    const byApplicantQuery = `
      query ContractsByApplicant($applicantId: Int!, $pagination: PaginationInput) {
        contractsByApplicantV2(applicantId: $applicantId, pagination: $pagination) {
          count
          data {
            id
            applicantId
            applicationId
          }
        }
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
    expect(byApplicantRes.statusCode).toBe(200);
    const byApplicant = JSON.parse(byApplicantRes.body).data.contractsByApplicantV2;
    expect(byApplicant.count).toBe(1);
    expect(byApplicant.data[0].applicantId).toBe(applicantId);

    // Filter by sponsor
    const bySponsorQuery = `
      query ContractsBySponsor($sponsorId: Int!, $pagination: PaginationInput) {
        contractsBySponsorV2(sponsorId: $sponsorId, pagination: $pagination) {
          count
          data {
            id
            sponsorId
            applicationId
          }
        }
      }
    `;
    const bySponsorRes = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        query: bySponsorQuery,
        variables: { sponsorId, pagination: { limit: 10, offset: 0 } },
      },
    });
    expect(bySponsorRes.statusCode).toBe(200);
    const bySponsor = JSON.parse(bySponsorRes.body).data.contractsBySponsorV2;
    expect(bySponsor.count).toBe(1);
    expect(bySponsor.data[0].sponsorId).toBe(sponsorId);

    // Filter by application
    const byApplicationQuery = `
      query ContractsByApplication($applicationId: Int!, $pagination: PaginationInput) {
        contractsByApplicationV2(applicationId: $applicationId, pagination: $pagination) {
          count
          data {
            id
            applicationId
          }
        }
      }
    `;
    const byApplicationRes = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        query: byApplicationQuery,
        variables: { applicationId, pagination: { limit: 10, offset: 0 } },
      },
    });
    expect(byApplicationRes.statusCode).toBe(200);
    const byApplication = JSON.parse(byApplicationRes.body).data.contractsByApplicationV2;
    expect(byApplication.count).toBe(1);
    expect(byApplication.data[0].applicationId).toBe(applicationId);

    // Update contract
    const updatedSnapshotContents = {
      ...contractSnapshotContents,
      addendum: 'Updated terms',
    };
    const updatedSnapshotData = JSON.stringify(updatedSnapshotContents);
    const updatedSnapshotHash = `0x${createHash('sha256').update(updatedSnapshotData).digest('hex')}`;

    const updateMutation = `
      mutation UpdateContract($id: ID!, $input: UpdateContractV2Input!) {
        updateContractV2(id: $id, input: $input) {
          id
          contract_snapshot_cotents
          contract_snapshot_hash
          builder_signature
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
            contract_snapshot_cotents: updatedSnapshotContents,
            contract_snapshot_hash: updatedSnapshotHash,
            builder_signature: '0xUpdatedSignature',
          },
        },
      },
    });
    expect(updateRes.statusCode).toBe(200);
    const updated = JSON.parse(updateRes.body).data.updateContractV2;
    expect(updated.contract_snapshot_hash).toBe(updatedSnapshotHash);
    expect(updated.builder_signature).toBe('0xUpdatedSignature');
    expect(updated.contract_snapshot_cotents).toEqual(updatedSnapshotContents);

    // Delete contract
    const deleteMutation = `
      mutation DeleteContract($id: ID!) {
        deleteContractV2(id: $id) {
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
    expect(JSON.parse(deleteRes.body).data.deleteContractV2.id).toBe(created.id);

    // Verify deletion
    const rows = await db.select().from(contractsTable);
    expect(rows.length).toBe(0);
  });

  it('should create contract with minimal fields', async () => {
    const createMutation = `
      mutation CreateContract($input: CreateContractV2Input!) {
        createContractV2(input: $input) {
          id
          programId
          sponsorId
          applicantId
          applicationId
          smartContractId
          onchainContractId
          contract_snapshot_cotents
          contract_snapshot_hash
          builder_signature
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
            programId,
            sponsorId,
            applicantId,
            applicationId,
            smartContractId,
            onchainContractId: 2,
          },
        },
      },
    });
    expect(createRes.statusCode).toBe(200);
    const created = JSON.parse(createRes.body).data.createContractV2;
    expect(created.programId).toBe(programId);
    expect(created.applicationId).toBe(applicationId);
    expect(created.onchainContractId).toBe(2);
    expect(created.contract_snapshot_cotents).toBeNull();
    expect(created.contract_snapshot_hash).toBeNull();
    expect(created.builder_signature).toBeNull();
  });
});
