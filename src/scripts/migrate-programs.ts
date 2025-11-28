import 'dotenv/config';
import { eq, inArray, sql } from 'drizzle-orm';
import { drizzle as drizzleDb1 } from 'drizzle-orm/postgres-js';
import { drizzle as drizzleDb2 } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { keywordsTable } from '../db/schemas/keywords';
import { programsTable, programsToKeywordsTable } from '../db/schemas/programs';
import { usersTable } from '../db/schemas/users';
import { networksTable } from '../db/schemas/v2/networks';
import { type NewProgramV2, programsV2Table } from '../db/schemas/v2/programs';
import { tokensTable } from '../db/schemas/v2/tokens';
import { usersV2Table } from '../db/schemas/v2/users';

type ProgramStatusV2 = 'open' | 'closed' | 'draft';

type ProgramVisibilityV2 = 'private' | 'restricted' | 'public';

/**
 * V1 status를 V2 status로 매핑
 */
function mapStatus(_v1Status: string): ProgramStatusV2 {
  // const statusMap: Record<string, ProgramStatusV2> = {
  //   pending: 'draft',
  //   payment_required: 'draft',
  //   published: 'open',
  //   completed: 'closed',
  // };

  return 'closed';
}

/**
 * V1 visibility를 V2 visibility로 매핑
 */
function mapVisibility(v1Visibility: string): ProgramVisibilityV2 {
  const visibilityMap: Record<string, ProgramVisibilityV2> = {
    private: 'private',
    restricted: 'restricted',
    public: 'public',
  };

  return visibilityMap[v1Visibility] || 'public';
}

async function migratePrograms() {
  console.log('Starting program migration...');

  const db1Url = process.env.PROD_DB_URL;
  const db2Url = process.env.DEV_DB_URL;

  if (!db1Url || !db2Url) {
    console.error('Error: Please define PROD_DB_URL and DEV_DB_URL in your .env file.');
    process.exit(1);
  }

  const client1 = postgres(db1Url);
  const db1 = drizzleDb1(client1);

  const client2 = postgres(db2Url);
  const db2 = drizzleDb2(client2);

  try {
    // V1 programs 조회 (필요한 컬럼만)
    console.log('Fetching programs from V1 database...');
    const v1Programs = await db1
      .select({
        id: programsTable.id,
        name: programsTable.name,
        summary: programsTable.summary,
        description: programsTable.description,
        price: programsTable.price,
        currency: programsTable.currency,
        deadline: programsTable.deadline,
        creatorId: programsTable.sponsorId,
        status: programsTable.status,
        visibility: programsTable.visibility,
        network: programsTable.network,
        type: programsTable.type,
        createdAt: programsTable.createdAt,
        updatedAt: programsTable.updatedAt,
      })
      .from(programsTable);

    console.log(`Found ${v1Programs.length} programs to migrate.`);

    if (v1Programs.length === 0) {
      console.log('No programs to migrate.');
      return;
    }

    // V1 programs의 keywords 조회
    console.log('Fetching program keywords from V1 database...');
    const programIds = v1Programs.map((p) => p.id);
    const programKeywords = await db1
      .select({
        programId: programsToKeywordsTable.programId,
        keywordName: keywordsTable.name,
      })
      .from(programsToKeywordsTable)
      // @ts-expect-error - Drizzle ORM type inference issue with leftJoin
      .leftJoin(keywordsTable, eq(keywordsTable.id, programsToKeywordsTable.keywordId))
      .where(inArray(programsToKeywordsTable.programId, programIds));

    const skillsMap = new Map<string, string[]>();
    for (const pk of programKeywords) {
      if (pk.programId && pk.keywordName) {
        if (!skillsMap.has(pk.programId)) {
          skillsMap.set(pk.programId, []);
        }
        skillsMap.get(pk.programId)?.push(pk.keywordName);
      }
    }

    console.log(`Found keywords for ${skillsMap.size} programs.`);

    // V2 데이터 조회
    console.log('Fetching V2 reference data...');
    const v2Users = await db2.select().from(usersV2Table);
    const v2Networks = await db2.select().from(networksTable);
    const v2Tokens = await db2.select().from(tokensTable);

    // V1 users 조회 (walletAddress 매핑용)
    const v1Users = await db1
      .select({
        id: usersTable.id,
        walletAddress: usersTable.walletAddress,
      })
      .from(usersTable);

    // 매핑 테이블 생성
    const v1UserIdToWalletAddress = new Map<string, string>();
    for (const user of v1Users) {
      if (user.walletAddress) {
        v1UserIdToWalletAddress.set(user.id, user.walletAddress);
      }
    }

    const walletAddressToV2UserId = new Map<string, number>();
    for (const user of v2Users) {
      walletAddressToV2UserId.set(user.walletAddress, user.id);
    }

    const networkNameToId = new Map<string, number>();
    for (const network of v2Networks) {
      networkNameToId.set(network.chainName.toLowerCase(), network.id);
    }

    const tokenMap = new Map<string, number>(); // "currency-network" -> token_id
    for (const token of v2Tokens) {
      const network = v2Networks.find((n) => n.id === token.chainInfoId);
      if (network) {
        const key = `${token.tokenName.toLowerCase()}-${network.chainName.toLowerCase()}`;
        tokenMap.set(key, token.id);
      }
    }

    console.log(
      `Found ${v2Users.length} V2 users, ${v2Networks.length} networks, ${v2Tokens.length} tokens.`,
    );

    // 기존 데이터 삭제 옵션
    const clearExistingData = process.env.CLEAR_EXISTING_PROGRAMS === 'true';
    if (clearExistingData) {
      console.log('Clearing existing programs_v2 data...');
      await db2.execute(sql`TRUNCATE TABLE ${programsV2Table} RESTART IDENTITY CASCADE`);
      console.log('✅ Existing data cleared.');
    }

    let migratedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const v1Program of v1Programs) {
      try {
        // creator_id 매핑: V1 uuid -> walletAddress -> V2 user id
        const walletAddress = v1UserIdToWalletAddress.get(v1Program.creatorId);
        if (!walletAddress) {
          console.warn(
            `⚠️  Creator wallet address not found for program ${v1Program.id} (creator_id: ${v1Program.creatorId}). Skipping.`,
          );
          skippedCount++;
          continue;
        }

        const v2UserId = walletAddressToV2UserId.get(walletAddress);
        if (!v2UserId) {
          console.warn(
            `⚠️  V2 user not found for wallet address ${walletAddress} (program ${v1Program.id}). Skipping.`,
          );
          skippedCount++;
          continue;
        }

        // token_id 찾기: currency + network 조합
        const v1Network = (v1Program.network || 'educhain').toLowerCase();
        const currency = (v1Program.currency || 'ETH').toLowerCase();
        const tokenKey = `${currency}-${v1Network}`;
        const tokenId = tokenMap.get(tokenKey);

        if (!tokenId) {
          console.warn(
            `⚠️  Token not found for ${v1Program.currency} on ${v1Network} (program ${v1Program.id}). Skipping.`,
          );
          skippedCount++;
          continue;
        }

        // network_id는 token의 network에서 가져오기
        const token = v2Tokens.find((t) => t.id === tokenId);
        const networkId = token
          ? v2Networks.find((n) => n.id === token.chainInfoId)?.id
          : undefined;

        if (!networkId) {
          console.warn(
            `⚠️  Network not found for token ${tokenId} (program ${v1Program.id}). Skipping.`,
          );
          skippedCount++;
          continue;
        }

        if (v1Program.type === 'funding') {
          console.warn(
            `⚠️  Funding program not supported. Skipping program ${v1Program.id} (${v1Program.name}).`,
          );
          skippedCount++;
          continue;
        }

        const newProgram: NewProgramV2 = {
          title: v1Program.name,
          description: ['summary', v1Program.summary, 'description', v1Program.description]
            .filter(Boolean)
            .join('\n\n'),
          skills: skillsMap.get(v1Program.id) || [],
          deadline: v1Program.deadline,
          status: mapStatus(v1Program.status || 'draft'),
          visibility: mapVisibility(v1Program.visibility || 'public'),
          networkId,
          price: v1Program.price,
          token_id: tokenId,
          sponsorId: v2UserId,
          createdAt: v1Program.createdAt,
          updatedAt: v1Program.updatedAt,
        };

        await db2.insert(programsV2Table).values(newProgram);
        migratedCount++;
        console.log(`✅ Successfully migrated program: ${v1Program.name} (id: ${v1Program.id})`);
      } catch (error) {
        failedCount++;
        console.error(`❌ Failed to migrate program: ${v1Program.id} (${v1Program.name})`, error);
      }
    }

    console.log('----------------------------------------');
    console.log(
      `Migration complete. Migrated ${migratedCount} out of ${v1Programs.length} programs.`,
    );
    console.log(`Programs skipped: ${skippedCount}`);
    if (failedCount > 0) {
      console.log(`Failed to migrate: ${failedCount}`);
    }
    console.log('----------------------------------------');
  } catch (error) {
    console.error('An error occurred during migration:', error);
    throw error;
  } finally {
    console.log('Closing database connections...');
    await client1.end();
    await client2.end();
    console.log('Connections closed.');
  }
}

migratePrograms();
