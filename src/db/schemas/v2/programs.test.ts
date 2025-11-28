import { db } from '@/db/test-db';
import { sql } from 'drizzle-orm';
import { type NewNetworkType, networksTable } from './networks';
import { type NewProgramV2, programsV2Table } from './programs';
import { type NewTokenType, tokensTable } from './tokens';
import { type NewUserV2, usersV2Table } from './users';

describe('Programs V2 Table', () => {
  let testUserId: number;
  let testNetworkId: number;
  let testTokenId: number;

  beforeAll(async () => {
    // Create a test user that will be used for all tests
    const testUser: NewUserV2 = {
      walletAddress: '0x1234567890123456789012345678901234567890',
      loginType: 'wallet',
      role: 'user',
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
      decimals: 6,
    };
    const [insertedToken] = await db.insert(tokensTable).values(testToken).returning();
    testTokenId = insertedToken.id;
  });

  afterEach(async () => {
    // Clean up only programs table
    await db.execute(sql`TRUNCATE TABLE programs_v2 RESTART IDENTITY CASCADE`);
  });

  afterAll(async () => {
    // Clean up all test data
    await db.execute(sql`TRUNCATE TABLE programs_v2 RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE tokens RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE networks RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE users_v2 RESTART IDENTITY CASCADE`);
  });

  it('should create and retrieve a new program', async () => {
    const deadline = new Date();
    const newProgram: NewProgramV2 = {
      title: 'Test Program V2',
      description: 'This is a test program.',
      skills: ['TypeScript', 'Drizzle'],
      deadline,
      visibility: 'public',
      networkId: testNetworkId,
      price: '1000',
      token_id: testTokenId,
      status: 'draft',
      sponsorId: testUserId,
    };

    const insertedPrograms = await db.insert(programsV2Table).values(newProgram).returning();
    const program = insertedPrograms[0];

    expect(program).toBeDefined();
    expect(program.title).toBe(newProgram.title);
    expect(program.description).toBe(newProgram.description);
    expect(program.status).toBe(newProgram.status);
    expect(program.visibility).toBe(newProgram.visibility);
    expect(program.networkId).toBe(newProgram.networkId);
    expect(program.price).toBe(newProgram.price);
    expect(program.token_id).toBe(newProgram.token_id);
    expect(program.skills).toEqual(newProgram.skills);
    expect(program.deadline).toEqual(deadline);
    expect(program.sponsorId).toEqual(newProgram.sponsorId);

    const selectedPrograms = await db
      .select()
      .from(programsV2Table)
      .where(sql`${programsV2Table.id} = ${program.id}`);
    const selectedProgram = selectedPrograms[0];

    expect(selectedProgram).toBeDefined();
    expect(selectedProgram.id).toBe(program.id);
    expect(selectedProgram.title).toBe(newProgram.title);
  });
});
