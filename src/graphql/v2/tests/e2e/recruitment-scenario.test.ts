import { createHash } from 'node:crypto';
import { type NewTokenType, tokensTable, usersV2Table } from '@/db/schemas';
import type { NewUserV2 } from '@/db/schemas';
import { networksTable } from '@/db/schemas/v2/networks';
import { onchainContractInfoTable } from '@/db/schemas/v2/onchain-contract-info';
import { smartContractsTable } from '@/db/schemas/v2/smart-contracts';
import { db } from '@/db/test-db';
import { eq, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { createTestServer } from '../helper';

/**
 * E2E Contract Scenario Test
 *
 * This is an end-to-end test that simulates the complete contract creation workflow:
 * 1. Sponsor creates a program with onchain program info
 * 2. Builders apply to the program
 * 3. Sponsor hires builder1
 * 4. Sponsor creates milestones
 * 5. Generate content hash from milestones
 * 6. Builder checks the contract
 * 7. Sponsor creates onchain contract info (for milestones contract)
 */
describe('E2E Contract Scenario Test', () => {
  let server: FastifyInstance;

  // Users
  let sponsor: NewUserV2;
  let builder1: NewUserV2;
  let builder2: NewUserV2;
  let builder1Id: number;
  let sponsorAuthToken: string;
  let builder1AuthToken: string;
  let builder2AuthToken: string;

  // Network & Token & Smart Contract
  let networkId: number;
  let tokenId: number;
  let smartContractId: number;

  // Program
  let programId: number;

  // Application
  let application1Id: string;
  let application2Id: string;

  // Milestones
  let milestone1Id: string;
  let milestone2Id: string;
  let milestone3Id: string;

  beforeAll(async () => {
    server = await createTestServer();
  });

  beforeEach(async () => {
    // 1. Create users (sponsor, builder1, builder2)
    sponsor = {
      walletAddress: '0xSponsorWalletAddress0000000000000000000000',
      loginType: 'wallet',
      role: 'user',
      email: 'sponsor@test.com',
      firstName: 'Sponsor',
      lastName: 'Test',
    };

    builder1 = {
      walletAddress: '0xBuilder1WalletAddress00000000000000000000000',
      loginType: 'wallet',
      role: 'user',
      email: 'builder1@test.com',
      firstName: 'Builder',
      lastName: 'One',
    };

    builder2 = {
      walletAddress: '0xBuilder2WalletAddress00000000000000000000000',
      loginType: 'wallet',
      role: 'user',
      email: 'builder2@test.com',
      firstName: 'Builder',
      lastName: 'Two',
    };

    await db.insert(usersV2Table).values(sponsor).returning();
    const [insertedBuilder1] = await db.insert(usersV2Table).values(builder1).returning();
    await db.insert(usersV2Table).values(builder2).returning();

    builder1Id = insertedBuilder1.id;

    // 2. Login to get auth tokens
    const loginMutation = `
      mutation LoginV2($walletAddress: String!, $loginType: LoginTypeEnum!, $email: String) {
        loginV2(walletAddress: $walletAddress, loginType: $loginType, email: $email)
      }
    `;

    const sponsorLoginResponse = await server.inject({
      method: 'POST',
      url: '/graphql',
      payload: {
        query: loginMutation,
        variables: {
          walletAddress: sponsor.walletAddress,
          loginType: 'wallet',
          email: sponsor.email,
        },
      },
    });
    sponsorAuthToken = JSON.parse(sponsorLoginResponse.body).data.loginV2;

    const builder1LoginResponse = await server.inject({
      method: 'POST',
      url: '/graphql',
      payload: {
        query: loginMutation,
        variables: {
          walletAddress: builder1.walletAddress,
          loginType: 'wallet',
          email: builder1.email,
        },
      },
    });
    builder1AuthToken = JSON.parse(builder1LoginResponse.body).data.loginV2;

    const builder2LoginResponse = await server.inject({
      method: 'POST',
      url: '/graphql',
      payload: {
        query: loginMutation,
        variables: {
          walletAddress: builder2.walletAddress,
          loginType: 'wallet',
          email: builder2.email,
        },
      },
    });
    builder2AuthToken = JSON.parse(builder2LoginResponse.body).data.loginV2;

    // 3. Seed network (Ethereum Sepolia)
    const [net] = await db
      .insert(networksTable)
      .values({
        chainId: 11155111,
        chainName: 'Sepolia',
        mainnet: false,
        exploreUrl: 'https://sepolia.etherscan.io',
      })
      .returning();
    networkId = net.id;

    // 4. Seed token (USDC on Sepolia)
    const testToken: NewTokenType = {
      chainInfoId: net.id,
      tokenName: 'USDC',
      tokenAddress: '0x1234000000000000000000000000000000000000',
      decimals: 6,
    };
    const [token] = await db.insert(tokensTable).values(testToken).returning();
    tokenId = token.id;

    // 5. Seed smart contract
    const [smartContract] = await db
      .insert(smartContractsTable)
      .values({
        chainInfoId: net.id,
        address: '0xProgram000000000000000000000000000000000',
        name: 'Test Program Contract',
      })
      .returning();
    smartContractId = smartContract.id;
  });

  afterEach(async () => {
    // Clean up all tables
    await db.execute(sql`TRUNCATE TABLE onchain_contract_info RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE milestones_v2 RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE applications_v2 RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE onchain_program_info RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE programs_v2 RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE smart_contracts RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE networks RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE tokens RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE users_v2 RESTART IDENTITY CASCADE`);
  });

  afterAll(async () => {
    await db.execute(sql`TRUNCATE TABLE onchain_contract_info RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE milestones_v2 RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE applications_v2 RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE onchain_program_info RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE programs_v2 RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE smart_contracts RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE networks RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE tokens RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE users_v2 RESTART IDENTITY CASCADE`);
    await server.close();
  });

  it('should complete the full contract scenario', async () => {
    // ==========================================
    // Step 1: Sponsor creates a program with onchain info
    // ==========================================
    console.log('📝 Step 1: Sponsor creates a program with onchain info');

    const createProgramWithOnchainMutation = `
      mutation CreateProgramWithOnchainV2($input: CreateProgramWithOnchainV2Input!) {
        createProgramWithOnchainV2(input: $input) {
          program {
            id # Auto-generated by DB (serial), used for subsequent operations
            title
            description
            status
            networkId
            price
            token_id
          }
          onchain {
            id
            programId # Automatically set from created program.id
            networkId # Automatically set from created program.networkId
            smartContractId
            onchainProgramId
            tx
            status
          }
        }
      }
    `;

    const deadline = new Date();
    deadline.setMonth(deadline.getMonth() + 1);

    const mockTxHash = `0x${'b'.repeat(64)}`; // Mock transaction hash for program creation

    const createProgramResponse = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: {
        authorization: `Bearer ${sponsorAuthToken}`,
      },
      payload: {
        query: createProgramWithOnchainMutation,
        variables: {
          input: {
            program: {
              title: 'E2E Test Program',
              description: 'This is a test program for E2E contract scenario',
              skills: ['Solidity', 'Ethereum', 'Smart Contracts'],
              deadline: deadline.toISOString(),
              visibility: 'public',
              networkId,
              price: '5000',
              token_id: tokenId,
              // status is not allowed - programs are always created as 'draft'
            },
            onchain: {
              smartContractId,
              onchainProgramId: 12345, // Mock onchain program ID
              tx: mockTxHash,
              status: 'active',
            },
          },
        },
      },
    });

    if (createProgramResponse.statusCode !== 200) {
      console.error(
        'Create Program Error:',
        JSON.stringify(JSON.parse(createProgramResponse.body), null, 2),
      );
    }
    expect(createProgramResponse.statusCode).toBe(200);
    const createProgramResult = JSON.parse(createProgramResponse.body);
    if (createProgramResult.errors) {
      console.error('GraphQL errors:', JSON.stringify(createProgramResult.errors, null, 2));
    }
    expect(createProgramResult.errors).toBeUndefined();
    expect(createProgramResult.data).toBeDefined();
    expect(createProgramResult.data.createProgramWithOnchainV2.program).toBeDefined();
    expect(createProgramResult.data.createProgramWithOnchainV2.onchain).toBeDefined();
    programId = Number.parseInt(createProgramResult.data.createProgramWithOnchainV2.program.id, 10);

    console.log('✅ Program created with onchain info:', programId);

    // ==========================================
    // Step 2: Builder1 and Builder2 apply to the program
    // ==========================================
    console.log('📝 Step 2: Builders apply to the program');

    const createApplicationMutation = `
      mutation CreateApplicationV2($input: CreateApplicationV2Input!) {
        createApplicationV2(input: $input) {
          id
          programId
          applicantId
          status
          content
        }
      }
    `;

    // Builder1 applies
    const apply1Response = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: {
        authorization: `Bearer ${builder1AuthToken}`,
      },
      payload: {
        query: createApplicationMutation,
        variables: {
          input: {
            programId: programId.toString(),
            content:
              'I am an experienced smart contract developer. I would love to work on this program.',
          },
        },
      },
    });

    expect(apply1Response.statusCode).toBe(200);
    const apply1Result = JSON.parse(apply1Response.body);
    application1Id = apply1Result.data.createApplicationV2.id;
    console.log('✅ Builder1 applied:', application1Id);

    // Builder2 applies
    const apply2Response = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: {
        authorization: `Bearer ${builder2AuthToken}`,
      },
      payload: {
        query: createApplicationMutation,
        variables: {
          input: {
            programId: programId.toString(),
            content:
              'I have 5 years of experience in Web3 development. Please consider my application.',
          },
        },
      },
    });

    expect(apply2Response.statusCode).toBe(200);
    const apply2Result = JSON.parse(apply2Response.body);
    application2Id = apply2Result.data.createApplicationV2.id;
    console.log('✅ Builder2 applied:', application2Id);

    // ==========================================
    // Step 3: Sponsor hires builder1
    // ==========================================
    console.log('📝 Step 3: Sponsor hires builder1');

    const reviewApplicationMutation = `
      mutation ReviewApplicationV2($id: ID!, $input: ReviewApplicationV2Input!) {
        reviewApplicationV2(id: $id, input: $input) {
          id
          status
          rejectedReason
        }
      }
    `;

    const reviewResponse = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: {
        authorization: `Bearer ${sponsorAuthToken}`,
      },
      payload: {
        query: reviewApplicationMutation,
        variables: {
          id: application1Id,
          input: {
            status: 'hired',
            rejectedReason: 'Welcome aboard! You have been selected for this program.',
          },
        },
      },
    });

    expect(reviewResponse.statusCode).toBe(200);
    const reviewResult = JSON.parse(reviewResponse.body);
    expect(reviewResult.data.reviewApplicationV2.status).toBe('hired');
    console.log('✅ Builder1 hired');

    // ==========================================
    // Step 4: Sponsor creates milestones 1, 2, 3
    // ==========================================
    console.log('📝 Step 4: Sponsor creates milestones');

    const createMilestoneMutation = `
      mutation CreateMilestoneV2($input: CreateMilestoneV2Input!) {
        createMilestoneV2(input: $input) {
          id
          title
          description
          payout
          deadline
        }
      }
    `;

    const deadline1 = new Date();
    deadline1.setDate(deadline1.getDate() + 30);

    // Milestone 1
    const milestone1Response = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: {
        authorization: `Bearer ${sponsorAuthToken}`,
      },
      payload: {
        query: createMilestoneMutation,
        variables: {
          input: {
            programId,
            applicantId: builder1Id.toString(),
            title: 'Milestone 1: Smart Contract Architecture',
            description: 'Design and implement the smart contract architecture',
            payout: '1000',
            deadline: deadline1.toISOString(),
          },
        },
      },
    });

    expect(milestone1Response.statusCode).toBe(200);
    const milestone1Result = JSON.parse(milestone1Response.body);
    milestone1Id = milestone1Result.data.createMilestoneV2.id;
    console.log('✅ Milestone 1 created:', milestone1Id);

    // Milestone 2
    const deadline2 = new Date();
    deadline2.setDate(deadline2.getDate() + 60);

    const milestone2Response = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: {
        authorization: `Bearer ${sponsorAuthToken}`,
      },
      payload: {
        query: createMilestoneMutation,
        variables: {
          input: {
            programId,
            applicantId: builder1Id.toString(),
            title: 'Milestone 2: Frontend Integration',
            description: 'Integrate smart contract with frontend application',
            payout: '2000',
            deadline: deadline2.toISOString(),
          },
        },
      },
    });

    expect(milestone2Response.statusCode).toBe(200);
    const milestone2Result = JSON.parse(milestone2Response.body);
    milestone2Id = milestone2Result.data.createMilestoneV2.id;
    console.log('✅ Milestone 2 created:', milestone2Id);

    // Milestone 3
    const deadline3 = new Date();
    deadline3.setDate(deadline3.getDate() + 90);

    const milestone3Response = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: {
        authorization: `Bearer ${sponsorAuthToken}`,
      },
      payload: {
        query: createMilestoneMutation,
        variables: {
          input: {
            programId,
            applicantId: builder1Id.toString(),
            title: 'Milestone 3: Testing & Deployment',
            description: 'Test the complete system and deploy to mainnet',
            payout: '2000',
            deadline: deadline3.toISOString(),
          },
        },
      },
    });

    expect(milestone3Response.statusCode).toBe(200);
    const milestone3Result = JSON.parse(milestone3Response.body);
    milestone3Id = milestone3Result.data.createMilestoneV2.id;
    console.log('✅ Milestone 3 created:', milestone3Id);

    // ==========================================
    // Step 5: Query milestones and generate content hash
    // ==========================================
    console.log('📝 Step 5: Generate content hash from milestones');

    const milestonesQuery = `
      query GetMilestonesV2($query: MilestonesV2QueryInput) {
        milestonesV2(query: $query) {
          data {
            id
            title
            description
            payout
            deadline
          }
        }
      }
    `;

    const milestonesResponse = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: {
        authorization: `Bearer ${sponsorAuthToken}`,
      },
      payload: {
        query: milestonesQuery,
        variables: {
          query: {
            programId: programId.toString(),
          },
        },
      },
    });

    if (milestonesResponse.statusCode !== 200) {
      console.error(
        'Milestones Query Error:',
        JSON.stringify(JSON.parse(milestonesResponse.body), null, 2),
      );
    }
    expect(milestonesResponse.statusCode).toBe(200);
    const milestonesResult = JSON.parse(milestonesResponse.body);
    const milestones = milestonesResult.data.milestonesV2.data;
    expect(milestones).toHaveLength(3);
    console.log('✅ Retrieved 3 milestones');

    // Generate content hash from milestones
    interface Milestone {
      id: string;
      title: string;
      description: string;
      payout: string;
      deadline: string;
    }

    const milestoneData = JSON.stringify(
      milestones.sort((a: Milestone, b: Milestone) => Number(a.id) - Number(b.id)),
    );
    const contentHash = `0x${createHash('sha256').update(milestoneData).digest('hex')}`;
    console.log('✅ Content hash generated:', contentHash);

    // ==========================================
    // Step 6: Builder checks the contract (query milestones)
    // ==========================================
    console.log('📝 Step 6: Builder checks the contract');

    const builderMilestonesResponse = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: {
        authorization: `Bearer ${builder1AuthToken}`,
      },
      payload: {
        query: milestonesQuery,
        variables: {
          query: {
            programId: programId.toString(),
          },
        },
      },
    });

    expect(builderMilestonesResponse.statusCode).toBe(200);
    const builderMilestonesResult = JSON.parse(builderMilestonesResponse.body);
    expect(builderMilestonesResult.data.milestonesV2.data).toHaveLength(3);
    console.log('✅ Builder verified 3 milestones');

    // ==========================================
    // Step 7: Sponsor creates onchain contract info (for milestones contract)
    // Note: This is different from onchain program info created in Step 1
    // ==========================================
    console.log('📝 Step 7: Sponsor creates onchain contract info (for milestones contract)');

    const createOnchainContractInfoMutation = `
      mutation CreateOnchainContractInfoV2($input: CreateOnchainContractInfoV2Input!) {
        createOnchainContractInfoV2(input: $input) {
          id
          programId
          applicantId
          contentHash
          status
          tx
        }
      }
    `;

    const mockContractTxHash = `0x${'a'.repeat(64)}`; // Mock transaction hash for contract info

    const onchainContractResponse = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: {
        authorization: `Bearer ${sponsorAuthToken}`,
      },
      payload: {
        query: createOnchainContractInfoMutation,
        variables: {
          input: {
            programId: Number.parseInt(programId.toString(), 10),
            applicantId: Number.parseInt(builder1Id.toString(), 10),
            contentHash,
            tx: mockContractTxHash,
            status: 'active',
          },
        },
      },
    });

    if (onchainContractResponse.statusCode !== 200) {
      console.error(
        'Onchain Contract Error:',
        JSON.stringify(JSON.parse(onchainContractResponse.body), null, 2),
      );
    }
    expect(onchainContractResponse.statusCode).toBe(200);
    const onchainContractResult = JSON.parse(onchainContractResponse.body);
    const onchainContractId = onchainContractResult.data.createOnchainContractInfoV2.id;
    expect(onchainContractResult.data.createOnchainContractInfoV2.contentHash).toBe(contentHash);
    console.log('✅ Onchain contract info created:', onchainContractId);

    // ==========================================
    // Final verification
    // ==========================================
    console.log('📝 Final verification');

    // Verify onchain contract info in database
    const [onchainContractInfo] = await db
      .select()
      .from(onchainContractInfoTable)
      .where(eq(onchainContractInfoTable.id, onchainContractId));

    expect(onchainContractInfo).toBeDefined();
    expect(onchainContractInfo.programId).toBe(programId);
    expect(onchainContractInfo.applicantId).toBe(builder1Id);
    expect(onchainContractInfo.contentHash).toBe(contentHash);
    expect(onchainContractInfo.status).toBe('active');

    console.log('✅ E2E Contract Scenario completed successfully!');
  });
});
