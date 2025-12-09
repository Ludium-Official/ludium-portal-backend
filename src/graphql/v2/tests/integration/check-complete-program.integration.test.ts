import { type NewApplicationV2, applicationsV2Table } from '@/db/schemas/v2/applications';
import { type NewNetworkType, networksTable } from '@/db/schemas/v2/networks';
import { type NewProgramV2, programsV2Table } from '@/db/schemas/v2/programs';
import { type NewTokenType, tokensTable } from '@/db/schemas/v2/tokens';
import { type NewUserV2, usersV2Table } from '@/db/schemas/v2/users';
import { db } from '@/db/test-db';
import { sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createTestServer } from '../helper';

describe('checkCompleteProgram Query', () => {
  let server: FastifyInstance;
  let sponsor: NewUserV2 & { id: number };
  let applicant1: NewUserV2 & { id: number };
  let applicant2: NewUserV2 & { id: number };
  let program: NewProgramV2 & { id: string };
  let network: NewNetworkType & { id: number };
  let token: NewTokenType & { id: number };

  beforeAll(async () => {
    server = await createTestServer();
    await server.ready();

    // Create network and token
    const [insertedNetwork] = await db
      .insert(networksTable)
      .values({
        chainId: 1,
        chainName: 'ethereum',
        mainnet: true,
        exploreUrl: 'https://etherscan.io',
      })
      .returning();
    network = insertedNetwork;

    const [insertedToken] = await db
      .insert(tokensTable)
      .values({
        chainInfoId: network.id,
        tokenName: 'USDC',
        tokenAddress: '0xA0b86a33E6441b8C4C8C0C4C8C0C4C8C0C4C8C0',
        decimals: 6,
      })
      .returning();
    token = insertedToken;

    // Create users
    const [insertedSponsor] = await db
      .insert(usersV2Table)
      .values({
        walletAddress: '0xSponsorCheckComplete',
        loginType: 'wallet',
        role: 'user',
      })
      .returning();
    sponsor = insertedSponsor;

    const [insertedApplicant1] = await db
      .insert(usersV2Table)
      .values({
        walletAddress: '0xApplicant1CheckComplete',
        loginType: 'wallet',
        role: 'user',
      })
      .returning();
    applicant1 = insertedApplicant1;

    const [insertedApplicant2] = await db
      .insert(usersV2Table)
      .values({
        walletAddress: '0xApplicant2CheckComplete',
        loginType: 'wallet',
        role: 'user',
      })
      .returning();
    applicant2 = insertedApplicant2;
  });

  afterEach(async () => {
    await db.execute(sql`TRUNCATE TABLE applications_v2 RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE programs_v2 RESTART IDENTITY CASCADE`);
  });

  afterAll(async () => {
    await db.execute(sql`TRUNCATE TABLE users_v2 RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE tokens RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE networks RESTART IDENTITY CASCADE`);
    await server.close();
  });

  const createProgram = async () => {
    const [insertedProgram] = await db
      .insert(programsV2Table)
      .values({
        title: 'Test Program',
        description: 'Description',
        skills: ['React'],
        deadline: new Date(),
        visibility: 'public',
        networkId: network.id,
        price: '100',
        token_id: token.id,
        status: 'open',
        sponsorId: sponsor.id,
      })
      .returning();
    return insertedProgram;
  };

  const createApplication = async (
    programId: string,
    applicantId: number,
    status: NewApplicationV2['status'] = 'in_progress',
  ) => {
    await db.insert(applicationsV2Table).values({
      programId,
      applicantId,
      status,
    });
  };

  it('should return allCompleted: true when all applications are completed', async () => {
    program = await createProgram();
    await createApplication(program.id, applicant1.id, 'completed');
    await createApplication(program.id, applicant2.id, 'completed');

    const response = await server.inject({
      method: 'POST',
      url: '/graphql',
      payload: {
        query: `
          query CheckCompleteProgram($programId: ID!) {
            checkCompleteProgram(programId: $programId) {
              allCompleted
              completedCount
              totalCount
            }
          }
        `,
        variables: {
          programId: program.id.toString(),
        },
      },
    });

    const json = response.json();
    expect(json.errors).toBeUndefined();
    expect(json.data.checkCompleteProgram).toEqual({
      allCompleted: true,
      completedCount: 2,
      totalCount: 2,
    });
  });

  it('should return allCompleted: false when some applications are incomplete', async () => {
    program = await createProgram();
    await createApplication(program.id, applicant1.id, 'completed');
    await createApplication(program.id, applicant2.id, 'in_progress');

    const response = await server.inject({
      method: 'POST',
      url: '/graphql',
      payload: {
        query: `
          query CheckCompleteProgram($programId: ID!) {
            checkCompleteProgram(programId: $programId) {
              allCompleted
              completedCount
              totalCount
            }
          }
        `,
        variables: {
          programId: program.id.toString(),
        },
      },
    });

    const json = response.json();
    expect(json.errors).toBeUndefined();
    expect(json.data.checkCompleteProgram).toEqual({
      allCompleted: false,
      completedCount: 1,
      totalCount: 2,
    });
  });

  it('should return allCompleted: false when there are no applications', async () => {
    program = await createProgram();

    const response = await server.inject({
      method: 'POST',
      url: '/graphql',
      payload: {
        query: `
          query CheckCompleteProgram($programId: ID!) {
            checkCompleteProgram(programId: $programId) {
              allCompleted
              completedCount
              totalCount
            }
          }
        `,
        variables: {
          programId: program.id.toString(),
        },
      },
    });

    const json = response.json();
    expect(json.errors).toBeUndefined();
    expect(json.data.checkCompleteProgram).toEqual({
      allCompleted: false,
      completedCount: 0,
      totalCount: 0,
    });
  });
});
