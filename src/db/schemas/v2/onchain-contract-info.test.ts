import { db } from '@/db/test-db';
import { sql } from 'drizzle-orm';
import { type NewNetworkType, networksTable } from './networks';
import { type NewOnchainContractInfo, onchainContractInfoTable } from './onchain-contract-info';
import { type NewProgramV2, programsV2Table } from './programs';
import { type NewSmartContract, smartContractsTable } from './smart-contracts';
import { type NewTokenType, tokensTable } from './tokens';
import { type NewUserV2, usersV2Table } from './users';

describe('Onchain Contract Info Table', () => {
  let testSponsorId: number;
  let testApplicantId: number;
  let testProgramId: string;
  let testNetworkId: number;
  let testTokenId: number;
  let testSmartContractId: number;

  beforeAll(async () => {
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

    // Create a test program
    const deadline = new Date();
    const testProgram: NewProgramV2 = {
      title: 'Test Program for Contract Info',
      description: 'A test program for testing onchain contract info.',
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
    // Clean up only onchain contract info table
    await db.execute(sql`TRUNCATE TABLE onchain_contract_info RESTART IDENTITY`);
  });

  afterAll(async () => {
    // Clean up all related tables at the end
    await db.execute(sql`TRUNCATE TABLE onchain_contract_info RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE programs_v2 RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE smart_contracts RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE networks RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE tokens RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE users_v2 RESTART IDENTITY CASCADE`);
  });

  it('should create and retrieve a new onchain contract info', async () => {
    const newContractInfo: NewOnchainContractInfo = {
      programId: testProgramId,
      sponsorId: testSponsorId,
      applicantId: testApplicantId,
      smartContractId: testSmartContractId,
      onchainContractId: 1,
      status: 'active',
      tx: '0x3334567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    };

    const insertedContractInfos = await db
      .insert(onchainContractInfoTable)
      .values(newContractInfo)
      .returning();
    const contractInfo = insertedContractInfos[0];

    expect(contractInfo).toBeDefined();
    expect(contractInfo.programId).toBe(newContractInfo.programId);
    expect(contractInfo.sponsorId).toBe(newContractInfo.sponsorId);
    expect(contractInfo.applicantId).toBe(newContractInfo.applicantId);
    expect(contractInfo.smartContractId).toBe(newContractInfo.smartContractId);
    expect(contractInfo.onchainContractId).toBe(newContractInfo.onchainContractId);
    expect(contractInfo.status).toBe(newContractInfo.status);
    expect(contractInfo.tx).toBe(newContractInfo.tx);
    expect(contractInfo.createdAt).toBeDefined();

    const selectedContractInfos = await db
      .select()
      .from(onchainContractInfoTable)
      .where(sql`${onchainContractInfoTable.id} = ${contractInfo.id}`);
    const selectedContractInfo = selectedContractInfos[0];

    expect(selectedContractInfo).toBeDefined();
    expect(selectedContractInfo.id).toBe(contractInfo.id);
    expect(selectedContractInfo.programId).toBe(newContractInfo.programId);
    expect(selectedContractInfo.sponsorId).toBe(newContractInfo.sponsorId);
    expect(selectedContractInfo.applicantId).toBe(newContractInfo.applicantId);
  });

  it('should default status to active when not provided', async () => {
    const newContractInfo: NewOnchainContractInfo = {
      programId: testProgramId,
      sponsorId: testSponsorId,
      applicantId: testApplicantId,
      smartContractId: testSmartContractId,
      onchainContractId: 2,
      tx: '0x3334567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    };

    const [contractInfo] = await db
      .insert(onchainContractInfoTable)
      .values(newContractInfo)
      .returning();
    expect(contractInfo.status).toBe('active');
  });

  it('should allow all status values', async () => {
    const statuses: Array<'active' | 'cancelled' | 'updated' | 'paused' | 'completed'> = [
      'active',
      'cancelled',
      'updated',
      'paused',
      'completed',
    ];

    for (const status of statuses) {
      const contractInfoInput: NewOnchainContractInfo = {
        programId: testProgramId,
        sponsorId: testSponsorId,
        applicantId: testApplicantId,
        smartContractId: testSmartContractId,
        onchainContractId: 3 + statuses.indexOf(status),
        status,
        tx: '0x3334567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      };
      const [inserted] = await db
        .insert(onchainContractInfoTable)
        .values(contractInfoInput)
        .returning();
      expect(inserted.status).toBe(status);
    }
  });

  it('should enforce foreign key constraint for programId', async () => {
    const newContractInfo: NewOnchainContractInfo = {
      programId: '999999', // Non-existent program ID
      sponsorId: testSponsorId,
      applicantId: testApplicantId,
      smartContractId: testSmartContractId,
      onchainContractId: 9,
      tx: '0x3334567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    };

    await expect(db.insert(onchainContractInfoTable).values(newContractInfo)).rejects.toThrow();
  });

  it('should enforce foreign key constraint for sponsorId', async () => {
    const newContractInfo: NewOnchainContractInfo = {
      programId: testProgramId,
      sponsorId: 999999, // Non-existent user ID
      applicantId: testApplicantId,
      smartContractId: testSmartContractId,
      onchainContractId: 10,
      tx: '0x3334567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    };

    await expect(db.insert(onchainContractInfoTable).values(newContractInfo)).rejects.toThrow();
  });

  it('should enforce foreign key constraint for applicantId', async () => {
    const newContractInfo: NewOnchainContractInfo = {
      programId: testProgramId,
      sponsorId: testSponsorId,
      applicantId: 999999, // Non-existent user ID
      smartContractId: testSmartContractId,
      onchainContractId: 11,
      tx: '0x3334567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    };

    await expect(db.insert(onchainContractInfoTable).values(newContractInfo)).rejects.toThrow();
  });

  it('should enforce foreign key constraint for smartContractId', async () => {
    const newContractInfo: NewOnchainContractInfo = {
      programId: testProgramId,
      sponsorId: testSponsorId,
      applicantId: testApplicantId,
      smartContractId: 999999, // Non-existent smart contract ID
      onchainContractId: 12,
      tx: '0x3334567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    };

    await expect(db.insert(onchainContractInfoTable).values(newContractInfo)).rejects.toThrow();
  });

  it('should cascade delete contract info when program is deleted', async () => {
    // Create a contract info
    const newContractInfo: NewOnchainContractInfo = {
      programId: testProgramId,
      sponsorId: testSponsorId,
      applicantId: testApplicantId,
      smartContractId: testSmartContractId,
      onchainContractId: 13,
      tx: '0x3334567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    };
    await db.insert(onchainContractInfoTable).values(newContractInfo);

    // Delete the program
    await db.delete(programsV2Table).where(sql`${programsV2Table.id} = ${testProgramId}`);

    // Verify the contract info was also deleted
    const contractInfos = await db
      .select()
      .from(onchainContractInfoTable)
      .where(sql`${onchainContractInfoTable.programId} = ${testProgramId}`);
    expect(contractInfos).toHaveLength(0);

    // Clean up: recreate the program for other tests
    const deadline = new Date();
    const testProgram: NewProgramV2 = {
      title: 'Test Program for Contract Info',
      description: 'A test program for testing onchain contract info.',
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
  });

  it('should cascade delete contract info when sponsor is deleted', async () => {
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

    // Create a contract info with the new sponsor
    const newContractInfo: NewOnchainContractInfo = {
      programId: anotherProgramId,
      sponsorId: anotherSponsorId,
      applicantId: testApplicantId,
      smartContractId: testSmartContractId,
      onchainContractId: 14,
      tx: '0x3334567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    };
    await db.insert(onchainContractInfoTable).values(newContractInfo);

    // Delete the sponsor user
    await db.delete(usersV2Table).where(sql`${usersV2Table.id} = ${anotherSponsorId}`);

    // Verify the contract info was also deleted
    const contractInfos = await db
      .select()
      .from(onchainContractInfoTable)
      .where(sql`${onchainContractInfoTable.sponsorId} = ${anotherSponsorId}`);
    expect(contractInfos).toHaveLength(0);
  });

  it('should cascade delete contract info when applicant is deleted', async () => {
    // Create another applicant user
    const anotherApplicant: NewUserV2 = {
      walletAddress: '0xAnotherApplicant123456789012345678901234567',
      loginType: 'google',
      role: 'user',
      firstName: 'Another',
      lastName: 'User',
    };
    const [anotherApplicantInserted] = await db
      .insert(usersV2Table)
      .values(anotherApplicant)
      .returning();
    const anotherApplicantId = anotherApplicantInserted.id;

    // Create a contract info with the new applicant
    const newContractInfo: NewOnchainContractInfo = {
      programId: testProgramId,
      sponsorId: testSponsorId,
      applicantId: anotherApplicantId,
      smartContractId: testSmartContractId,
      onchainContractId: 15,
      tx: '0x3334567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    };
    await db.insert(onchainContractInfoTable).values(newContractInfo);

    // Delete the applicant user
    await db.delete(usersV2Table).where(sql`${usersV2Table.id} = ${anotherApplicantId}`);

    // Verify the contract info was also deleted
    const contractInfos = await db
      .select()
      .from(onchainContractInfoTable)
      .where(sql`${onchainContractInfoTable.applicantId} = ${anotherApplicantId}`);
    expect(contractInfos).toHaveLength(0);
  });

  it('should cascade delete contract info when smart contract is deleted', async () => {
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

    // Create a contract info with the new smart contract
    const newContractInfo: NewOnchainContractInfo = {
      programId: testProgramId,
      sponsorId: testSponsorId,
      applicantId: testApplicantId,
      smartContractId: anotherSmartContractId,
      onchainContractId: 16,
      tx: '0x3334567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    };
    await db.insert(onchainContractInfoTable).values(newContractInfo);

    // Delete the smart contract
    await db
      .delete(smartContractsTable)
      .where(sql`${smartContractsTable.id} = ${anotherSmartContractId}`);

    // Verify the contract info was also deleted
    const contractInfos = await db
      .select()
      .from(onchainContractInfoTable)
      .where(sql`${onchainContractInfoTable.smartContractId} = ${anotherSmartContractId}`);
    expect(contractInfos).toHaveLength(0);
  });

  it('should allow multiple contract infos for the same program and applicant', async () => {
    const contractInfo1: NewOnchainContractInfo = {
      programId: testProgramId,
      sponsorId: testSponsorId,
      applicantId: testApplicantId,
      smartContractId: testSmartContractId,
      onchainContractId: 17,
      status: 'active',
      tx: '0x3334567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    };
    const contractInfo2: NewOnchainContractInfo = {
      programId: testProgramId,
      sponsorId: testSponsorId,
      applicantId: testApplicantId,
      smartContractId: testSmartContractId,
      onchainContractId: 18,
      status: 'updated',
      tx: '0x3344567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    };

    const [contractInfo1Inserted] = await db
      .insert(onchainContractInfoTable)
      .values(contractInfo1)
      .returning();
    const [contractInfo2Inserted] = await db
      .insert(onchainContractInfoTable)
      .values(contractInfo2)
      .returning();

    expect(contractInfo1Inserted).toBeDefined();
    expect(contractInfo2Inserted).toBeDefined();
    expect(contractInfo1Inserted.id).not.toBe(contractInfo2Inserted.id);
    expect(contractInfo1Inserted.programId).toBe(testProgramId);
    expect(contractInfo2Inserted.programId).toBe(testProgramId);
    expect(contractInfo1Inserted.sponsorId).toBe(testSponsorId);
    expect(contractInfo2Inserted.sponsorId).toBe(testSponsorId);
    expect(contractInfo1Inserted.applicantId).toBe(testApplicantId);
    expect(contractInfo2Inserted.applicantId).toBe(testApplicantId);
    expect(contractInfo1Inserted.status).toBe('active');
    expect(contractInfo2Inserted.status).toBe('updated');
  });
});
