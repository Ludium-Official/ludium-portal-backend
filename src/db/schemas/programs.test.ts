import { sql } from 'drizzle-orm';
import { db } from '../test-db';
import { type NewProgram, programsTable } from './programs';
import { type NewUser, usersTable } from './users';

describe('Programs Table', () => {
  let user: NewUser;

  beforeEach(async () => {
    // Create a user to associate with the program
    const newUser: NewUser = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      role: 'admin',
    };
    const insertedUsers = await db.insert(usersTable).values(newUser).returning();
    user = insertedUsers[0];
  });

  afterEach(async () => {
    // Clean up the tables
    await db.execute(sql`TRUNCATE TABLE programs, users RESTART IDENTITY CASCADE`);
  });

  it('should create a new program', async () => {
    if (!user.id) {
      throw new Error('User ID is not defined');
    }

    const newProgram: NewProgram = {
      name: 'Test Program',
      price: '100',
      deadline: new Date(),
      creatorId: user.id,
    };

    const insertedPrograms = await db.insert(programsTable).values(newProgram).returning();
    const program = insertedPrograms[0];

    expect(program).toBeDefined();
    expect(program.name).toBe(newProgram.name);
    expect(program.price).toBe(newProgram.price);
    expect(program.creatorId).toBe(user.id);
  });
});
