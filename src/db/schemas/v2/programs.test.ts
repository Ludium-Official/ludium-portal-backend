import { db } from '@/db/test-db';
import { sql } from 'drizzle-orm';
import { type NewProgramV2, programsV2Table } from './programs';
import { type NewUserV2, usersV2Table } from './users';

describe('Programs V2 Table', () => {
  let testUserId: number;

  beforeAll(async () => {
    // Create a test user that will be used for all tests
    const testUser: NewUserV2 = {
      walletAddress: '0x1234567890123456789012345678901234567890',
      loginType: 'wallet',
      role: 'user',
    };
    const [insertedUser] = await db.insert(usersV2Table).values(testUser).returning();
    testUserId = insertedUser.id;
  });

  afterEach(async () => {
    // Clean up only programs table
    await db.execute(sql`TRUNCATE TABLE programs_v2 RESTART IDENTITY CASCADE`);
  });

  afterAll(async () => {
    // Clean up user at the end
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
      network: 'mainnet',
      price: '1000',
      currency: 'USDC',
      status: 'draft',
      creatorId: testUserId,
    };

    const insertedPrograms = await db.insert(programsV2Table).values(newProgram).returning();
    const program = insertedPrograms[0];

    expect(program).toBeDefined();
    expect(program.title).toBe(newProgram.title);
    expect(program.description).toBe(newProgram.description);
    expect(program.status).toBe(newProgram.status);
    expect(program.visibility).toBe(newProgram.visibility);
    expect(program.network).toBe(newProgram.network);
    expect(program.price).toBe(newProgram.price);
    expect(program.currency).toBe(newProgram.currency);
    expect(program.skills).toEqual(newProgram.skills);
    expect(program.deadline).toEqual(deadline);
    expect(program.creatorId).toEqual(newProgram.creatorId);

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
