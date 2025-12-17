import { db } from '@/db/test-db';
import { sql } from 'drizzle-orm';
import { type NewApplicationV2, applicationsV2Table } from './applications';
import { type NewNetworkType, networksTable } from './networks';
import { type NewProgramV2, programsV2Table } from './programs';
import { type NewTokenType, tokensTable } from './tokens';
import { type NewUserV2, usersV2Table } from './users';

describe('Applications V2 Table', () => {
  let testUserId: number;
  let testProgramId: string;
  let testNetworkId: number;
  let testTokenId: number;

  beforeAll(async () => {
    // Create a test user (applicant)
    const testUser: NewUserV2 = {
      walletAddress: '0xApplicant12345678901234567890123456789012',
      loginType: 'wallet',
      role: 'user',
      nickname: 'Applicant',
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

    // Create a test program
    const deadline = new Date();
    const testProgram: NewProgramV2 = {
      title: 'Test Program for Applications',
      description: 'A test program for testing applications.',
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
    // Clean up only applications table (including dependent FK records)
    await db.execute(sql`TRUNCATE TABLE applications_v2 RESTART IDENTITY CASCADE`);
  });

  afterAll(async () => {
    // Clean up programs, users, and networks
    await db.execute(sql`TRUNCATE TABLE applications_v2 RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE programs_v2 RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE networks RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE users_v2 RESTART IDENTITY CASCADE`);
  });

  it('should create and retrieve a new application', async () => {
    const newApplication: NewApplicationV2 = {
      programId: testProgramId,
      applicantId: testUserId,
      status: 'submitted',
    };

    const insertedApplications = await db
      .insert(applicationsV2Table)
      .values(newApplication)
      .returning();
    const application = insertedApplications[0];

    expect(application).toBeDefined();
    expect(application.programId).toBe(newApplication.programId);
    expect(application.applicantId).toBe(newApplication.applicantId);
    expect(application.status).toBe('submitted');
    expect(application.createdAt).toBeDefined();
    expect(application.updatedAt).toBeDefined();

    const selectedApplications = await db
      .select()
      .from(applicationsV2Table)
      .where(sql`${applicationsV2Table.id} = ${application.id}`);
    const selectedApplication = selectedApplications[0];

    expect(selectedApplication).toBeDefined();
    expect(selectedApplication.id).toBe(application.id);
    expect(selectedApplication.programId).toBe(newApplication.programId);
    expect(selectedApplication.applicantId).toBe(newApplication.applicantId);
  });

  it('should create an application with in-progress status', async () => {
    const newApplication: NewApplicationV2 = {
      programId: testProgramId,
      applicantId: testUserId,
      status: 'in_progress',
    };

    const [application] = await db.insert(applicationsV2Table).values(newApplication).returning();

    expect(application).toBeDefined();
    expect(application.status).toBe('in_progress');
  });

  it('should create an application with pending signature status', async () => {
    const newApplicationTitle: NewApplicationV2 = {
      programId: testProgramId,
      applicantId: testUserId,
      status: 'pending_signature',
    };

    const [application] = await db
      .insert(applicationsV2Table)
      .values(newApplicationTitle)
      .returning();

    expect(application).toBeDefined();
    expect(application.status).toBe('pending_signature');
  });

  it('should default to submitted status when status is not provided', async () => {
    const newApplication: NewApplicationV2 = {
      programId: testProgramId,
      applicantId: testUserId,
    };

    const [application] = await db.insert(applicationsV2Table).values(newApplication).returning();

    expect(application).toBeDefined();
    expect(application.status).toBe('submitted');
  });

  it('should enforce foreign key constraint for programId', async () => {
    const newApplication: NewApplicationV2 = {
      programId: '999999', // Non-existent program ID
      applicantId: testUserId,
      status: 'submitted',
    };

    await expect(db.insert(applicationsV2Table).values(newApplication)).rejects.toThrow();
  });

  it('should enforce foreign key constraint for applicantId', async () => {
    const newApplication: NewApplicationV2 = {
      programId: testProgramId,
      applicantId: 999999, // Non-existent user ID
      status: 'submitted',
    };

    await expect(db.insert(applicationsV2Table).values(newApplication)).rejects.toThrow();
  });

  it('should cascade delete applications when program is deleted', async () => {
    // Create an application
    const newApplication: NewApplicationV2 = {
      programId: testProgramId,
      applicantId: testUserId,
      status: 'submitted',
    };
    await db.insert(applicationsV2Table).values(newApplication);

    // Delete the program
    await db.delete(programsV2Table).where(sql`${programsV2Table.id} = ${testProgramId}`);

    // Verify the application was also deleted
    const applications = await db
      .select()
      .from(applicationsV2Table)
      .where(sql`${applicationsV2Table.programId} = ${testProgramId}`);
    expect(applications).toHaveLength(0);

    // Clean up: recreate the program for other tests
    const deadline = new Date();
    const testProgram: NewProgramV2 = {
      title: 'Test Program for Applications',
      description: 'A test program for testing applications.',
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

  it('should cascade delete applications when applicant is deleted', async () => {
    // Create another user and program
    const anotherUser: NewUserV2 = {
      walletAddress: '0xAnotherUser123456789012345678901234567890',
      loginType: 'wallet',
      role: 'user',
    };
    const [anotherUserInserted] = await db.insert(usersV2Table).values(anotherUser).returning();
    const anotherUserId = anotherUserInserted.id;

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
      sponsorId: anotherUserId,
    };
    const [anotherProgramInserted] = await db
      .insert(programsV2Table)
      .values(anotherProgram)
      .returning();
    const anotherProgramId = anotherProgramInserted.id;

    // Create an application with the new user
    const newApplication: NewApplicationV2 = {
      programId: anotherProgramId,
      applicantId: anotherUserId,
      status: 'submitted',
    };
    await db.insert(applicationsV2Table).values(newApplication);

    // Delete the applicant user
    await db.delete(usersV2Table).where(sql`${usersV2Table.id} = ${anotherUserId}`);

    // Verify the application was also deleted
    const applications = await db
      .select()
      .from(applicationsV2Table)
      .where(sql`${applicationsV2Table.applicantId} = ${anotherUserId}`);
    expect(applications).toHaveLength(0);
  });

  it('should allow multiple applications from the same user to different programs', async () => {
    // Create another program
    const deadline = new Date();
    const anotherProgram: NewProgramV2 = {
      title: 'Second Test Program',
      description: 'A second test program.',
      skills: ['Node.js', 'PostgreSQL'],
      deadline,
      visibility: 'public',
      networkId: testNetworkId,
      price: '2000',
      token_id: testTokenId,
      status: 'open',
      sponsorId: testUserId,
    };
    const [secondProgramInserted] = await db
      .insert(programsV2Table)
      .values(anotherProgram)
      .returning();
    const secondProgramId = secondProgramInserted.id;

    // Create applications to both programs
    const application1: NewApplicationV2 = {
      programId: testProgramId,
      applicantId: testUserId,
      status: 'submitted',
    };
    const application2: NewApplicationV2 = {
      programId: secondProgramId,
      applicantId: testUserId,
      status: 'in_progress',
    };

    const [app1] = await db.insert(applicationsV2Table).values(application1).returning();
    const [app2] = await db.insert(applicationsV2Table).values(application2).returning();

    expect(app1).toBeDefined();
    expect(app2).toBeDefined();
    expect(app1.id).not.toBe(app2.id);
    expect(app1.programId).toBe(testProgramId);
    expect(app2.programId).toBe(secondProgramId);
    expect(app1.status).toBe('submitted');
    expect(app2.status).toBe('in_progress');
  });

  it('should allow multiple applications from different users to the same program', async () => {
    // Create another user
    const anotherUser: NewUserV2 = {
      walletAddress: '0xSecondApplicant1234567890123456789012345678',
      loginType: 'google',
      role: 'user',
      nickname: 'Second',
    };
    const [secondUserInserted] = await db.insert(usersV2Table).values(anotherUser).returning();
    const secondUserId = secondUserInserted.id;

    // Create applications from both users to the same program
    const application1: NewApplicationV2 = {
      programId: testProgramId,
      applicantId: testUserId,
      status: 'submitted',
    };
    const application2: NewApplicationV2 = {
      programId: testProgramId,
      applicantId: secondUserId,
      status: 'submitted',
    };

    const [app1] = await db.insert(applicationsV2Table).values(application1).returning();
    const [app2] = await db.insert(applicationsV2Table).values(application2).returning();

    expect(app1).toBeDefined();
    expect(app2).toBeDefined();
    expect(app1.id).not.toBe(app2.id);
    expect(app1.programId).toBe(testProgramId);
    expect(app2.programId).toBe(testProgramId);
    expect(app1.applicantId).toBe(testUserId);
    expect(app2.applicantId).toBe(secondUserId);
  });
});
