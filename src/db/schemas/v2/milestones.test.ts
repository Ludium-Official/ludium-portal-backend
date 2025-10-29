import { db } from '@/db/test-db';
import { sql } from 'drizzle-orm';
import { type NewMilestoneV2, milestonesV2Table } from './milestones';
import { type NewNetworkType, networksTable } from './networks';
import { type NewProgramV2, programsV2Table } from './programs';
import { type NewTokenType, tokensTable } from './tokens';
import { type NewUserV2, usersV2Table } from './users';

describe('Milestones V2 Table', () => {
  let testUserId: number;
  let testProgramId: number;
  let testNetworkId: number;
  let testTokenId: number;

  beforeAll(async () => {
    // Create a test user
    const testUser: NewUserV2 = {
      walletAddress: '0xMilestoneUser123456789012345678901234567890',
      loginType: 'wallet',
      role: 'user',
      firstName: 'Milestone',
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
      title: 'Test Program for Milestones',
      description: 'A test program for testing milestones.',
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
    // Clean up only milestones table
    await db.execute(sql`TRUNCATE TABLE milestones_v2 RESTART IDENTITY`);
  });

  afterAll(async () => {
    // Clean up programs and users at the end
    await db.execute(sql`TRUNCATE TABLE programs_v2 RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE tokens RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE networks RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE users_v2 RESTART IDENTITY CASCADE`);
  });

  it('should create and retrieve a new milestone', async () => {
    const milestoneDeadline = new Date('2025-12-31');
    const newMilestone: NewMilestoneV2 = {
      programId: testProgramId,
      applicantId: testUserId,
      title: 'First Milestone',
      description: 'Complete the basic setup',
      payout: '100',
      deadline: milestoneDeadline,
    };

    const insertedMilestones = await db.insert(milestonesV2Table).values(newMilestone).returning();
    const milestone = insertedMilestones[0];

    expect(milestone).toBeDefined();
    expect(milestone.programId).toBe(newMilestone.programId);
    expect(milestone.applicantId).toBe(newMilestone.applicantId);
    expect(milestone.title).toBe(newMilestone.title);
    expect(milestone.description).toBe(newMilestone.description);
    expect(milestone.payout).toBe(newMilestone.payout);
    expect(milestone.deadline).toEqual(milestoneDeadline);
    expect(milestone.createdAt).toBeDefined();
    expect(milestone.updatedAt).toBeDefined();

    const selectedMilestones = await db
      .select()
      .from(milestonesV2Table)
      .where(sql`${milestonesV2Table.id} = ${milestone.id}`);
    const selectedMilestone = selectedMilestones[0];

    expect(selectedMilestone).toBeDefined();
    expect(selectedMilestone.id).toBe(milestone.id);
    expect(selectedMilestone.title).toBe(newMilestone.title);
    expect(selectedMilestone.description).toBe(newMilestone.description);
  });

  it('should create a milestone with long title and description', async () => {
    const milestoneDeadline = new Date('2025-12-31');
    const newMilestone: NewMilestoneV2 = {
      programId: testProgramId,
      applicantId: testUserId,
      title: 'This is a very long milestone title that tests the varchar length limit',
      description:
        'This is a very long description that tests the text field. It can contain multiple sentences and paragraphs to describe the milestone in detail.',
      payout: '500',
      deadline: milestoneDeadline,
    };

    const [milestone] = await db.insert(milestonesV2Table).values(newMilestone).returning();

    expect(milestone).toBeDefined();
    expect(milestone.title).toBe(newMilestone.title);
    expect(milestone.description).toBe(newMilestone.description);
  });

  it('should create a milestone with high payout value', async () => {
    const milestoneDeadline = new Date('2025-12-31');
    const newMilestone: NewMilestoneV2 = {
      programId: testProgramId,
      applicantId: testUserId,
      title: 'High Value Milestone',
      description: 'A milestone with a very high payout',
      payout: '1000000',
      deadline: milestoneDeadline,
    };

    const [milestone] = await db.insert(milestonesV2Table).values(newMilestone).returning();

    expect(milestone).toBeDefined();
    expect(milestone.payout).toBe('1000000');
  });

  it('should create a milestone with past deadline', async () => {
    const pastDeadline = new Date('2020-01-01');
    const newMilestone: NewMilestoneV2 = {
      programId: testProgramId,
      applicantId: testUserId,
      title: 'Past Milestone',
      description: 'A milestone with a past deadline',
      payout: '50',
      deadline: pastDeadline,
    };

    const [milestone] = await db.insert(milestonesV2Table).values(newMilestone).returning();

    expect(milestone).toBeDefined();
    expect(milestone.deadline).toEqual(pastDeadline);
  });

  it('should enforce foreign key constraint for programId', async () => {
    const milestoneDeadline = new Date('2025-12-31');
    const newMilestone: NewMilestoneV2 = {
      programId: 999999, // Non-existent program ID
      applicantId: testUserId,
      title: 'Invalid Milestone',
      description: 'This should fail',
      payout: '100',
      deadline: milestoneDeadline,
    };

    await expect(db.insert(milestonesV2Table).values(newMilestone)).rejects.toThrow();
  });

  it('should enforce foreign key constraint for applicantId', async () => {
    const milestoneDeadline = new Date('2025-12-31');
    const newMilestone: NewMilestoneV2 = {
      programId: testProgramId,
      applicantId: 999999, // Non-existent user ID
      title: 'Invalid Milestone',
      description: 'This should fail',
      payout: '100',
      deadline: milestoneDeadline,
    };

    await expect(db.insert(milestonesV2Table).values(newMilestone)).rejects.toThrow();
  });

  it('should cascade delete milestones when program is deleted', async () => {
    // Create a milestone
    const milestoneDeadline = new Date('2025-12-31');
    const newMilestone: NewMilestoneV2 = {
      programId: testProgramId,
      applicantId: testUserId,
      title: 'Milestone to be deleted',
      description: 'This milestone will be deleted',
      payout: '200',
      deadline: milestoneDeadline,
    };
    await db.insert(milestonesV2Table).values(newMilestone);

    // Delete the program
    await db.delete(programsV2Table).where(sql`${programsV2Table.id} = ${testProgramId}`);

    // Verify the milestone was also deleted
    const milestones = await db
      .select()
      .from(milestonesV2Table)
      .where(sql`${milestonesV2Table.programId} = ${testProgramId}`);
    expect(milestones).toHaveLength(0);

    // Clean up: recreate the program for other tests
    const deadline = new Date();
    const testProgram: NewProgramV2 = {
      title: 'Test Program for Milestones',
      description: 'A test program for testing milestones.',
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

  it('should cascade delete milestones when applicant is deleted', async () => {
    // Create another user and program
    const anotherUser: NewUserV2 = {
      walletAddress: '0xAnotherMilestoneUser123456789012345678901234567',
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

    // Create a milestone
    const milestoneDeadline = new Date('2025-12-31');
    const newMilestone: NewMilestoneV2 = {
      programId: anotherProgramId,
      applicantId: anotherUserId,
      title: 'Milestone to be deleted',
      description: 'This milestone will be deleted',
      payout: '300',
      deadline: milestoneDeadline,
    };
    await db.insert(milestonesV2Table).values(newMilestone);

    // Delete the applicant user
    await db.delete(usersV2Table).where(sql`${usersV2Table.id} = ${anotherUserId}`);

    // Verify the milestone was also deleted
    const milestones = await db
      .select()
      .from(milestonesV2Table)
      .where(sql`${milestonesV2Table.applicantId} = ${anotherUserId}`);
    expect(milestones).toHaveLength(0);
  });

  it('should allow multiple milestones for the same program and applicant', async () => {
    const milestone1Deadline = new Date('2025-06-30');
    const milestone2Deadline = new Date('2025-12-31');

    const milestone1: NewMilestoneV2 = {
      programId: testProgramId,
      applicantId: testUserId,
      title: 'First Milestone',
      description: 'Initial milestone',
      payout: '100',
      deadline: milestone1Deadline,
    };
    const milestone2: NewMilestoneV2 = {
      programId: testProgramId,
      applicantId: testUserId,
      title: 'Second Milestone',
      description: 'Follow-up milestone',
      payout: '200',
      deadline: milestone2Deadline,
    };

    const [milestone1Inserted] = await db.insert(milestonesV2Table).values(milestone1).returning();
    const [milestone2Inserted] = await db.insert(milestonesV2Table).values(milestone2).returning();

    expect(milestone1Inserted).toBeDefined();
    expect(milestone2Inserted).toBeDefined();
    expect(milestone1Inserted.id).not.toBe(milestone2Inserted.id);
    expect(milestone1Inserted.programId).toBe(testProgramId);
    expect(milestone2Inserted.programId).toBe(testProgramId);
    expect(milestone1Inserted.applicantId).toBe(testUserId);
    expect(milestone2Inserted.applicantId).toBe(testUserId);
    expect(milestone1Inserted.title).toBe('First Milestone');
    expect(milestone2Inserted.title).toBe('Second Milestone');
  });

  it('should allow milestones for different programs', async () => {
    // Create another program
    const deadline = new Date();
    const anotherProgram: NewProgramV2 = {
      title: 'MongoDB Program',
      description: 'Another test program for milestones.',
      skills: ['MongoDB', 'Express'],
      deadline,
      visibility: 'private',
      networkId: testNetworkId,
      price: '2000',
      token_id: testTokenId,
      status: 'draft',
      sponsorId: testUserId,
    };
    const [secondProgramInserted] = await db
      .insert(programsV2Table)
      .values(anotherProgram)
      .returning();
    const secondProgramId = secondProgramInserted.id;

    const milestone1Deadline = new Date('2025-06-30');
    const milestone2Deadline = new Date('2025-12-31');

    const milestone1: NewMilestoneV2 = {
      programId: testProgramId,
      applicantId: testUserId,
      title: 'Milestone in Program 1',
      description: 'First milestone',
      payout: '150',
      deadline: milestone1Deadline,
    };
    const milestone2: NewMilestoneV2 = {
      programId: secondProgramId,
      applicantId: testUserId,
      title: 'Milestone in Program 2',
      description: 'Second milestone',
      payout: '250',
      deadline: milestone2Deadline,
    };

    const [milestone1Inserted] = await db.insert(milestonesV2Table).values(milestone1).returning();
    const [milestone2Inserted] = await db.insert(milestonesV2Table).values(milestone2).returning();

    expect(milestone1Inserted).toBeDefined();
    expect(milestone2Inserted).toBeDefined();
    expect(milestone1Inserted.programId).toBe(testProgramId);
    expect(milestone2Inserted.programId).toBe(secondProgramId);
    expect(milestone1Inserted.title).toBe('Milestone in Program 1');
    expect(milestone2Inserted.title).toBe('Milestone in Program 2');
  });
});
