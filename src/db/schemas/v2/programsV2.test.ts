import { db } from '@/db/test-db';
import { sql } from 'drizzle-orm';
import { type NewProgramV2, programsV2Table } from './programsV2';

describe('Programs V2 Table', () => {
  afterEach(async () => {
    // Clean up the tables
    // await db.execute(sql`TRUNCATE TABLE programs_v2 RESTART IDENTITY CASCADE`);
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
