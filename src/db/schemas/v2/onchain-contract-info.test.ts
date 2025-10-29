import { db } from '@/db/test-db';
import { sql } from 'drizzle-orm';
import { type NewNetworkType, networksTable } from './networks';
import { type NewOnchainContractInfo, onchainContractInfoTable } from './onchain-contract-info';
import { type NewProgramV2, programsV2Table } from './programs';
import { type NewTokenType, tokensTable } from './tokens';
import { type NewUserV2, usersV2Table } from './users';

describe('Onchain Contract Info Table', () => {
  let testUserId: number;
  let testProgramId: number;
  let testNetworkId: number;
  let testTokenId: number;

  beforeAll(async () => {
    // Create a test user
    const testUser: NewUserV2 = {
      walletAddress: '0xContractUser123456789012345678901234567890',
      loginType: 'wallet',
      role: 'user',
      firstName: 'Contract',
      lastName: 'User',
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
      sponsorId: testUserId,
    };
    const [insertedProgram] = await db.insert(programsV2Table).values(testProgram).returning();
    testProgramId = insertedProgram.id;
  });

  afterEach(async () => {
    // Clean up only onchain contract info table
    await db.execute(sql`TRUNCATE TABLE onchain_contract_info RESTART IDENTITY`);
  });

  afterAll(async () => {
    // Clean up programs and users at the end
    await db.execute(sql`TRUNCATE TABLE programs_v2 RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE tokens RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE networks RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE users_v2 RESTART IDENTITY CASCADE`);
  });

  it('should create and retrieve a new onchain contract info', async () => {
    const newContractInfo: NewOnchainContractInfo = {
      programId: testProgramId,
      applicantId: testUserId,
      contentHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
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
    expect(contractInfo.applicantId).toBe(newContractInfo.applicantId);
    expect(contractInfo.contentHash).toBe(newContractInfo.contentHash);
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
    expect(selectedContractInfo.contentHash).toBe(newContractInfo.contentHash);
  });

  it('should default status to active when not provided', async () => {
    const newContractInfo: NewOnchainContractInfo = {
      programId: testProgramId,
      applicantId: testUserId,
      contentHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      tx: '0x3334567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    };

    const [contractInfo] = await db
      .insert(onchainContractInfoTable)
      .values(newContractInfo)
      .returning();
    expect(contractInfo.status).toBe('active');
  });

  it('should allow all status values', async () => {
    const statuses: Array<'active' | 'canceled' | 'updated' | 'paused' | 'completed'> = [
      'active',
      'canceled',
      'updated',
      'paused',
      'completed',
    ];

    for (const status of statuses) {
      const contractInfoInput: NewOnchainContractInfo = {
        programId: testProgramId,
        applicantId: testUserId,
        contentHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
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
      programId: 999999, // Non-existent program ID
      applicantId: testUserId,
      contentHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      tx: '0x3334567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    };

    await expect(db.insert(onchainContractInfoTable).values(newContractInfo)).rejects.toThrow();
  });

  it('should enforce foreign key constraint for applicantId', async () => {
    const newContractInfo: NewOnchainContractInfo = {
      programId: testProgramId,
      applicantId: 999999, // Non-existent user ID
      contentHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      tx: '0x3334567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    };

    await expect(db.insert(onchainContractInfoTable).values(newContractInfo)).rejects.toThrow();
  });

  it('should cascade delete contract info when program is deleted', async () => {
    // Create a contract info
    const newContractInfo: NewOnchainContractInfo = {
      programId: testProgramId,
      applicantId: testUserId,
      contentHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
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
      sponsorId: testUserId,
    };
    const [recreatedProgram] = await db.insert(programsV2Table).values(testProgram).returning();
    testProgramId = recreatedProgram.id;
  });

  it('should cascade delete contract info when applicant is deleted', async () => {
    // Create another user and program
    const anotherUser: NewUserV2 = {
      walletAddress: '0xAnotherContractUser123456789012345678901234567',
      loginType: 'google',
      role: 'user',
      firstName: 'Another',
      lastName: 'User',
    };
    const [anotherUserInserted] = await db.insert(usersV2Table).values(anotherUser).returning();
    const anotherUserId = anotherUserInserted.id;

    const deadline = new Date();
    const anotherProgram: NewProgramV2 = {
      title: 'Another Test Program',
      description: 'Another test program.',
      skills: ['React', 'Node.js'],
      deadline,
      visibility: 'public',
      networkId: testNetworkId,
      price: '500',
      token_id: testTokenId,
      status: 'open',
      sponsorId: anotherUserId,
    };
    const [anotherProgramInserted] = await db
      .insert(programsV2Table)
      .values(anotherProgram)
      .returning();
    const anotherProgramId = anotherProgramInserted.id;

    // Create a contract info
    const newContractInfo: NewOnchainContractInfo = {
      programId: anotherProgramId,
      applicantId: anotherUserId,
      contentHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      tx: '0x3334567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    };
    await db.insert(onchainContractInfoTable).values(newContractInfo);

    // Delete the applicant user
    await db.delete(usersV2Table).where(sql`${usersV2Table.id} = ${anotherUserId}`);

    // Verify the contract info was also deleted
    const contractInfos = await db
      .select()
      .from(onchainContractInfoTable)
      .where(sql`${onchainContractInfoTable.applicantId} = ${anotherUserId}`);
    expect(contractInfos).toHaveLength(0);
  });

  it('should allow multiple contract infos for the same program and applicant', async () => {
    const contractInfo1: NewOnchainContractInfo = {
      programId: testProgramId,
      applicantId: testUserId,
      contentHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      status: 'active',
      tx: '0x3334567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    };
    const contractInfo2: NewOnchainContractInfo = {
      programId: testProgramId,
      applicantId: testUserId,
      contentHash: '0x1244567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
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
    expect(contractInfo1Inserted.applicantId).toBe(testUserId);
    expect(contractInfo2Inserted.applicantId).toBe(testUserId);
    expect(contractInfo1Inserted.status).toBe('active');
    expect(contractInfo2Inserted.status).toBe('updated');
  });
});
