import { createHash } from 'node:crypto';
import { db } from '@/db/test-db';
import { sql } from 'drizzle-orm';
import { type NewApplicationV2, applicationsV2Table } from './applications';
import { type NewContracts, contractsTable } from './contracts';
import { type NewNetworkType, networksTable } from './networks';
import { type NewProgramV2, programsV2Table } from './programs';
import { type NewSmartContract, smartContractsTable } from './smart-contracts';
import { type NewTokenType, tokensTable } from './tokens';
import { type NewUserV2, usersV2Table } from './users';

describe('Contracts V2 Table', () => {
  let testSponsorId: number;
  let testApplicantId: number;
  let testProgramId: string;
  let testSmartContractId: number;
  let testNetworkId: number;
  let testTokenId: number;
  let testApplicationId: number;

  const createApplication = async (programId: string, applicantId: number) => {
    const application: NewApplicationV2 = {
      programId,
      applicantId,
      status: 'submitted',
      title: 'Test application for contracts',
      content: 'This is a test application linked to a contract.',
      picked: false,
    };
    const [insertedApplication] = await db
      .insert(applicationsV2Table)
      .values(application)
      .returning();
    return insertedApplication.id;
  };

  beforeAll(async () => {
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

    // Create a test sponsor user
    const testSponsor: NewUserV2 = {
      walletAddress: '0xSponsor12345678901234567890123456789012',
      loginType: 'wallet',
      role: 'user',
      firstName: 'Sponsor',
      lastName: 'User',
    };
    const [insertedSponsor] = await db.insert(usersV2Table).values(testSponsor).returning();
    testSponsorId = insertedSponsor.id;

    // Create a test applicant user
    const testApplicant: NewUserV2 = {
      walletAddress: '0xApplicant1234567890123456789012345678',
      loginType: 'wallet',
      role: 'user',
      firstName: 'Applicant',
      lastName: 'User',
    };
    const [insertedApplicant] = await db.insert(usersV2Table).values(testApplicant).returning();
    testApplicantId = insertedApplicant.id;

    // Create a test program
    const deadline = new Date();
    const testProgram: NewProgramV2 = {
      title: 'Test Program for Contracts',
      description: 'A test program for testing contracts.',
      skills: ['TypeScript', 'Drizzle'],
      deadline,
      visibility: 'public',
      networkId: testNetworkId,
      price: '1000',
      token_id: testTokenId,
      status: 'open',
      sponsorId: testSponsorId,
    };
    const [insertedProgram] = await db.insert(programsV2Table).values(testProgram).returning();
    testProgramId = insertedProgram.id;

    // Create a test application linking the program and applicant
    testApplicationId = await createApplication(testProgramId, testApplicantId);

    // Create a test smart contract
    const testSmartContract: NewSmartContract = {
      chainInfoId: testNetworkId,
      address: '0x0000000000000000000000000000000000000123',
      name: 'TestContract',
    };
    const [insertedSmartContract] = await db
      .insert(smartContractsTable)
      .values(testSmartContract)
      .returning();
    testSmartContractId = insertedSmartContract.id;
  });

  afterEach(async () => {
    // Clean up only contracts table
    await db.execute(sql`TRUNCATE TABLE contracts RESTART IDENTITY`);
  });

  afterAll(async () => {
    // Clean up all related tables at the end
    await db.execute(sql`TRUNCATE TABLE contracts RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE programs_v2 RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE applications_v2 RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE smart_contracts RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE networks RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE tokens RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE users_v2 RESTART IDENTITY CASCADE`);
  });

  it('should create and retrieve a new contract', async () => {
    const newContract: NewContracts = {
      programId: testProgramId,
      sponsorId: testSponsorId,
      applicantId: testApplicantId,
      applicationId: testApplicationId,
      smartContractId: testSmartContractId,
      onchainContractId: 1,
    };

    const insertedContracts = await db.insert(contractsTable).values(newContract).returning();
    const contract = insertedContracts[0];

    expect(contract).toBeDefined();
    expect(contract.programId).toBe(newContract.programId);
    expect(contract.sponsorId).toBe(newContract.sponsorId);
    expect(contract.applicantId).toBe(newContract.applicantId);
    expect(contract.smartContractId).toBe(newContract.smartContractId);
    expect(contract.onchainContractId).toBe(newContract.onchainContractId);
    expect(contract.createdAt).toBeDefined();

    const selectedContracts = await db
      .select()
      .from(contractsTable)
      .where(sql`${contractsTable.id} = ${contract.id}`);
    const selectedContract = selectedContracts[0];

    expect(selectedContract).toBeDefined();
    expect(selectedContract.id).toBe(contract.id);
    expect(selectedContract.programId).toBe(newContract.programId);
    expect(selectedContract.sponsorId).toBe(newContract.sponsorId);
    expect(selectedContract.applicantId).toBe(newContract.applicantId);
  });

  it('should create a contract with snapshot contents', async () => {
    const snapshotContents = {
      milestones: [
        { id: 1, title: 'Milestone 1', description: 'First milestone', payout: '500' },
        { id: 2, title: 'Milestone 2', description: 'Second milestone', payout: '500' },
      ],
    };

    const newContract: NewContracts = {
      programId: testProgramId,
      sponsorId: testSponsorId,
      applicantId: testApplicantId,
      applicationId: testApplicationId,
      smartContractId: testSmartContractId,
      onchainContractId: 2,
      contract_snapshot_cotents: snapshotContents,
    };

    const [contract] = await db.insert(contractsTable).values(newContract).returning();

    expect(contract).toBeDefined();
    expect(contract.contract_snapshot_cotents).toEqual(snapshotContents);
  });

  it('should create a contract with snapshot contents and hash', async () => {
    // Create contract snapshot contents with the specified structure
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

    const newContract: NewContracts = {
      programId: testProgramId,
      sponsorId: testSponsorId,
      applicantId: testApplicantId,
      applicationId: testApplicationId,
      smartContractId: testSmartContractId,
      onchainContractId: 3,
      contract_snapshot_cotents: contractSnapshotContents,
      contract_snapshot_hash: snapshotHash,
    };

    const [contract] = await db.insert(contractsTable).values(newContract).returning();

    expect(contract).toBeDefined();
    expect(contract.contract_snapshot_cotents).toEqual(contractSnapshotContents);
    expect(contract.contract_snapshot_hash).toBe(snapshotHash);
    expect(contract.contract_snapshot_hash).toHaveLength(66); // 0x + 64 hex chars

    // Verify insert was successful by querying the contract
    const [retrievedContract] = await db
      .select()
      .from(contractsTable)
      .where(sql`${contractsTable.id} = ${contract.id}`);

    expect(retrievedContract).toBeDefined();
    expect(retrievedContract.contract_snapshot_cotents).toEqual(contractSnapshotContents);
    expect(retrievedContract.contract_snapshot_hash).toBe(snapshotHash);
  });

  it('should create a contract with builder signature', async () => {
    const builderSignature = '0xsignedbybuilder1234567890123456789012345678901234567890';

    const newContract: NewContracts = {
      programId: testProgramId,
      sponsorId: testSponsorId,
      applicantId: testApplicantId,
      applicationId: testApplicationId,
      smartContractId: testSmartContractId,
      onchainContractId: 4,
      builder_signature: builderSignature,
    };

    const [contract] = await db.insert(contractsTable).values(newContract).returning();

    expect(contract).toBeDefined();
    expect(contract.builder_signature).toBe(builderSignature);
  });

  it('should create a contract with all optional fields', async () => {
    const snapshotContents = {
      milestones: [{ id: 1, title: 'Test', description: 'Test milestone', payout: '1000' }],
    };
    const snapshotHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
    const builderSignature = '0xsignature12345678901234567890123456789012345678901234567890';

    const newContract: NewContracts = {
      programId: testProgramId,
      sponsorId: testSponsorId,
      applicantId: testApplicantId,
      applicationId: testApplicationId,
      smartContractId: testSmartContractId,
      onchainContractId: 5,
      contract_snapshot_cotents: snapshotContents,
      contract_snapshot_hash: snapshotHash,
      builder_signature: builderSignature,
    };

    const [contract] = await db.insert(contractsTable).values(newContract).returning();

    expect(contract).toBeDefined();
    expect(contract.contract_snapshot_cotents).toEqual(snapshotContents);
    expect(contract.contract_snapshot_hash).toBe(snapshotHash);
    expect(contract.builder_signature).toBe(builderSignature);
  });

  it('should enforce foreign key constraint for programId', async () => {
    const newContract: NewContracts = {
      programId: '999999', // Non-existent program ID
      sponsorId: testSponsorId,
      applicantId: testApplicantId,
      applicationId: testApplicationId,
      smartContractId: testSmartContractId,
      onchainContractId: 6,
    };

    await expect(db.insert(contractsTable).values(newContract)).rejects.toThrow();
  });

  it('should enforce foreign key constraint for sponsorId', async () => {
    const newContract: NewContracts = {
      programId: testProgramId,
      sponsorId: 999999, // Non-existent user ID
      applicantId: testApplicantId,
      applicationId: testApplicationId,
      smartContractId: testSmartContractId,
      onchainContractId: 7,
    };

    await expect(db.insert(contractsTable).values(newContract)).rejects.toThrow();
  });

  it('should enforce foreign key constraint for applicantId', async () => {
    const newContract: NewContracts = {
      programId: testProgramId,
      sponsorId: testSponsorId,
      applicantId: 999999, // Non-existent user ID
      applicationId: testApplicationId,
      smartContractId: testSmartContractId,
      onchainContractId: 8,
    };

    await expect(db.insert(contractsTable).values(newContract)).rejects.toThrow();
  });

  it('should enforce foreign key constraint for smartContractId', async () => {
    const newContract: NewContracts = {
      programId: testProgramId,
      sponsorId: testSponsorId,
      applicantId: testApplicantId,
      applicationId: testApplicationId,
      smartContractId: 999999, // Non-existent smart contract ID
      onchainContractId: 9,
    };

    await expect(db.insert(contractsTable).values(newContract)).rejects.toThrow();
  });

  it('should cascade delete contracts when program is deleted', async () => {
    // Create a contract
    const newContract: NewContracts = {
      programId: testProgramId,
      sponsorId: testSponsorId,
      applicantId: testApplicantId,
      applicationId: testApplicationId,
      smartContractId: testSmartContractId,
      onchainContractId: 10,
    };
    await db.insert(contractsTable).values(newContract);

    // Delete the program
    await db.delete(programsV2Table).where(sql`${programsV2Table.id} = ${testProgramId}`);

    // Verify the contract was also deleted
    const contracts = await db
      .select()
      .from(contractsTable)
      .where(sql`${contractsTable.programId} = ${testProgramId}`);
    expect(contracts).toHaveLength(0);

    // Clean up: recreate the program for other tests
    const deadline = new Date();
    const testProgram: NewProgramV2 = {
      title: 'Test Program for Contracts',
      description: 'A test program for testing contracts.',
      skills: ['TypeScript', 'Drizzle'],
      deadline,
      visibility: 'public',
      networkId: testNetworkId,
      price: '1000',
      token_id: testTokenId,
      status: 'open',
      sponsorId: testSponsorId,
    };
    const [recreatedProgram] = await db.insert(programsV2Table).values(testProgram).returning();
    testProgramId = recreatedProgram.id;
    testApplicationId = await createApplication(testProgramId, testApplicantId);
  });

  it('should cascade delete contracts when sponsor is deleted', async () => {
    // Create another sponsor user and program
    const anotherSponsor: NewUserV2 = {
      walletAddress: '0xAnotherSponsor1234567890123456789012345678',
      loginType: 'wallet',
      role: 'user',
    };
    const [anotherSponsorInserted] = await db
      .insert(usersV2Table)
      .values(anotherSponsor)
      .returning();
    const anotherSponsorId = anotherSponsorInserted.id;

    const deadline = new Date();
    const anotherProgram: NewProgramV2 = {
      title: 'Another Test Program',
      description: 'Another test program.',
      skills: ['React'],
      deadline,
      visibility: 'public',
      networkId: testNetworkId,
      price: '500',
      token_id: testTokenId,
      status: 'open',
      sponsorId: anotherSponsorId,
    };
    const [anotherProgramInserted] = await db
      .insert(programsV2Table)
      .values(anotherProgram)
      .returning();
    const anotherProgramId = anotherProgramInserted.id;

    const applicationId = await createApplication(anotherProgramId, testApplicantId);

    // Create a contract with the new sponsor
    const newContract: NewContracts = {
      programId: anotherProgramId,
      sponsorId: anotherSponsorId,
      applicantId: testApplicantId,
      applicationId,
      smartContractId: testSmartContractId,
      onchainContractId: 11,
    };
    await db.insert(contractsTable).values(newContract);

    // Delete the sponsor user
    await db.delete(usersV2Table).where(sql`${usersV2Table.id} = ${anotherSponsorId}`);

    // Verify the contract was also deleted
    const contracts = await db
      .select()
      .from(contractsTable)
      .where(sql`${contractsTable.sponsorId} = ${anotherSponsorId}`);
    expect(contracts).toHaveLength(0);
  });

  it('should cascade delete contracts when applicant is deleted', async () => {
    // Create another applicant user
    const anotherApplicant: NewUserV2 = {
      walletAddress: '0xAnotherApplicant123456789012345678901234567',
      loginType: 'wallet',
      role: 'user',
    };
    const [anotherApplicantInserted] = await db
      .insert(usersV2Table)
      .values(anotherApplicant)
      .returning();
    const anotherApplicantId = anotherApplicantInserted.id;

    // Create a contract with the new applicant
    const applicationId = await createApplication(testProgramId, anotherApplicantId);

    const newContract: NewContracts = {
      programId: testProgramId,
      sponsorId: testSponsorId,
      applicantId: anotherApplicantId,
      applicationId,
      smartContractId: testSmartContractId,
      onchainContractId: 12,
    };
    await db.insert(contractsTable).values(newContract);

    // Delete the applicant user
    await db.delete(usersV2Table).where(sql`${usersV2Table.id} = ${anotherApplicantId}`);

    // Verify the contract was also deleted
    const contracts = await db
      .select()
      .from(contractsTable)
      .where(sql`${contractsTable.applicantId} = ${anotherApplicantId}`);
    expect(contracts).toHaveLength(0);
  });

  it('should cascade delete contracts when smart contract is deleted', async () => {
    // Create another smart contract
    const anotherSmartContract: NewSmartContract = {
      chainInfoId: testNetworkId,
      address: '0x0000000000000000000000000000000000000456',
      name: 'AnotherContract',
    };
    const [anotherSmartContractInserted] = await db
      .insert(smartContractsTable)
      .values(anotherSmartContract)
      .returning();
    const anotherSmartContractId = anotherSmartContractInserted.id;

    // Create a contract with the new smart contract
    const applicationId = await createApplication(testProgramId, testApplicantId);

    const newContract: NewContracts = {
      programId: testProgramId,
      sponsorId: testSponsorId,
      applicantId: testApplicantId,
      applicationId,
      smartContractId: anotherSmartContractId,
      onchainContractId: 13,
    };
    await db.insert(contractsTable).values(newContract);

    // Delete the smart contract
    await db
      .delete(smartContractsTable)
      .where(sql`${smartContractsTable.id} = ${anotherSmartContractId}`);

    // Verify the contract was also deleted
    const contracts = await db
      .select()
      .from(contractsTable)
      .where(sql`${contractsTable.smartContractId} = ${anotherSmartContractId}`);
    expect(contracts).toHaveLength(0);
  });

  it('should allow multiple contracts for the same program', async () => {
    // Create another applicant
    const secondApplicant: NewUserV2 = {
      walletAddress: '0xSecondApplicant12345678901234567890123456',
      loginType: 'wallet',
      role: 'user',
    };
    const [secondApplicantInserted] = await db
      .insert(usersV2Table)
      .values(secondApplicant)
      .returning();
    const secondApplicantId = secondApplicantInserted.id;

    // Create contracts with different applicants
    const applicationId1 = await createApplication(testProgramId, testApplicantId);
    const applicationId2 = await createApplication(testProgramId, secondApplicantId);

    const contract1: NewContracts = {
      programId: testProgramId,
      sponsorId: testSponsorId,
      applicantId: testApplicantId,
      applicationId: applicationId1,
      smartContractId: testSmartContractId,
      onchainContractId: 14,
    };
    const contract2: NewContracts = {
      programId: testProgramId,
      sponsorId: testSponsorId,
      applicantId: secondApplicantId,
      applicationId: applicationId2,
      smartContractId: testSmartContractId,
      onchainContractId: 15,
    };

    const [c1] = await db.insert(contractsTable).values(contract1).returning();
    const [c2] = await db.insert(contractsTable).values(contract2).returning();

    expect(c1).toBeDefined();
    expect(c2).toBeDefined();
    expect(c1.id).not.toBe(c2.id);
    expect(c1.programId).toBe(testProgramId);
    expect(c2.programId).toBe(testProgramId);
    expect(c1.applicantId).toBe(testApplicantId);
    expect(c2.applicantId).toBe(secondApplicantId);
  });

  it('should validate contract_snapshot_hash maximum length', async () => {
    const invalidHash = `0x${'a'.repeat(65)}`; // Too long (67 chars, should be max 66)

    const applicationId = await createApplication(testProgramId, testApplicantId);

    const newContract: NewContracts = {
      programId: testProgramId,
      sponsorId: testSponsorId,
      applicantId: testApplicantId,
      applicationId,
      smartContractId: testSmartContractId,
      onchainContractId: 16,
      contract_snapshot_hash: invalidHash,
    };

    await expect(db.insert(contractsTable).values(newContract)).rejects.toThrow();
  });
});
