import 'dotenv/config';
import {
  type NewOnchainProgramInfo,
  onchainProgramInfoTable,
  smartContractsTable,
} from '@/db/schemas';
import { sql } from 'drizzle-orm';
import { drizzle as drizzleDb1 } from 'drizzle-orm/postgres-js';
import { drizzle as drizzleDb2 } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { programsTable } from '../db/schemas/programs';
import { networksTable } from '../db/schemas/v2/networks';
import { programsV2Table } from '../db/schemas/v2/programs';

/**
 * V1 status를 OnchainProgramStatusValues로 매핑
 */
function mapStatus(v1Status: string): NewOnchainProgramInfo['status'] {
  const statusMap: Record<string, NewOnchainProgramInfo['status']> = {
    completed: 'completed',
  };

  return statusMap[v1Status ?? 'active'] ?? 'active';
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
        network: programsTable.network,
        educhain_id: programsTable.educhainProgramId,
        status: programsTable.status,
        type: programsTable.type,
        tx_hash: programsTable.txHash,
        createdAt: programsTable.createdAt,
        updatedAt: programsTable.updatedAt,
      })
      .from(programsTable);

    console.log(`Found ${v1Programs.length} programs to migrate.`);

    if (v1Programs.length === 0) {
      console.log('No programs to migrate.');
      return;
    }

    // V2 데이터 조회
    console.log('Fetching V2 reference data...');
    const v2Networks = await db2.select().from(networksTable);
    const v2SmartContracts = await db2.select().from(smartContractsTable);
    const v2Programs = await db2.select().from(programsV2Table);

    const networkNameToId = new Map<string, number>();
    for (const network of v2Networks) {
      networkNameToId.set(network.chainName.toLowerCase(), network.id);
    }

    console.log(
      `Found ${v2Networks.length} networks, ${v2SmartContracts.length} smart contracts, ${v2Programs.length} programs.`,
    );

    // 기존 데이터 삭제 옵션
    const clearExistingData = process.env.CLEAR_EXISTING_ONCHAIN_PROGRAM_INFO === 'true';
    if (clearExistingData) {
      console.log('Clearing existing onchain_program_info data...');
      await db2.execute(sql`TRUNCATE TABLE ${onchainProgramInfoTable} RESTART IDENTITY CASCADE`);
      console.log('✅ Existing data cleared.');
    }

    let migratedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const v1Program of v1Programs) {
      try {
        if (v1Program.type === 'funding') {
          console.warn(`⚠️  Funding program not supported. Skipping program ${v1Program.name}.`);
          skippedCount++;
          continue;
        }

        if (!v1Program.educhain_id || !v1Program.tx_hash) {
          console.warn(
            `⚠️  Educhain ID or TX hash not found. Skipping program ${v1Program.id} (${v1Program.name}).`,
          );
          skippedCount++;
          continue;
        }

        // token_id 찾기: currency + network 조합
        const v1EduchainId = v1Program.educhain_id;
        const v1TxHash = v1Program.tx_hash;

        // network_id는 token의 network에서 가져오기
        const networkId =
          networkNameToId.get(v1Program.network?.toLowerCase() ?? 'educhain') ?? 'educhain';
        const smartContractId =
          v2SmartContracts.find((s) => s.chainInfoId === networkId && s.name === 'LdRecruitment')
            ?.id ?? 999;

        const v2ProgramId = v2Programs.find((p) => p.title === v1Program.name)?.id ?? 999;
        const newOnchainProgramInfo: NewOnchainProgramInfo = {
          programId: v2ProgramId,
          networkId: networkId as number,
          smartContractId: smartContractId,
          onchainProgramId: v1EduchainId,
          status: mapStatus(v1Program.status ?? 'active'),
          tx: v1TxHash ?? '',
          createdAt: v1Program.createdAt,
        };

        await db2.insert(onchainProgramInfoTable).values(newOnchainProgramInfo);
        migratedCount++;
        // console.log(
        //   `✅ Successfully migrated onchain program info: ${v1Program.name} (id: ${v2ProgramId})`,
        // );
      } catch (error) {
        failedCount++;
        console.error(
          `❌ Failed to migrate onchain program info: ${v1Program.name} (educhain_id: ${v1Program.educhain_id}, tx_hash: ${v1Program.tx_hash})`,
          error,
        );
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
