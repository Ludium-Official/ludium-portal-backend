import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { drizzle as drizzleDb1 } from 'drizzle-orm/postgres-js';
import { drizzle as drizzleDb2 } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { applicationsTable } from '../db/schemas/applications';
import { programsTable } from '../db/schemas/programs';
import { usersTable } from '../db/schemas/users';
import { type NewApplicationV2, applicationsV2Table } from '../db/schemas/v2/applications';
import { programsV2Table } from '../db/schemas/v2/programs';
import { usersV2Table } from '../db/schemas/v2/users';

type ApplicationStatusV2 = 'applied' | 'hired' | 'rejected';

/**
 * V1 status를 V2 status로 매핑
 */
function mapStatus(v1Status: string): ApplicationStatusV2 {
  const statusMap: Record<string, ApplicationStatusV2> = {
    pending: 'applied',
    submitted: 'applied',
    rejected: 'rejected',
    accepted: 'hired',
    completed: 'hired',
  };

  // 디비 데이터
  //   status   |
  // ---------+
  // accepted | -> hired
  // rejected | -> rejected
  // pending  | -> applied
  // completed| -> hired

  return statusMap[v1Status] || 'applied';
}

async function migrateApplications() {
  console.log('Starting application migration...');

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
    // V1 applications 조회
    console.log('Fetching applications from V1 database...');
    const v1Applications = await db1
      .select({
        id: applicationsTable.id,
        programId: applicationsTable.programId,
        applicantId: applicationsTable.applicantId,
        status: applicationsTable.status,
        name: applicationsTable.name,
        content: applicationsTable.content,
        summary: applicationsTable.summary,
        metadata: applicationsTable.metadata,
        price: applicationsTable.price,
        rejectionReason: applicationsTable.rejectionReason,
        createdAt: applicationsTable.createdAt,
        updatedAt: applicationsTable.updatedAt,
      })
      .from(applicationsTable);

    console.log(`Found ${v1Applications.length} applications to migrate.`);

    if (v1Applications.length === 0) {
      console.log('No applications to migrate.');
      return;
    }

    // V2 데이터 조회
    console.log('Fetching V2 reference data...');
    const v2Programs = await db2.select().from(programsV2Table);
    const v2Users = await db2.select().from(usersV2Table);

    // V1 programs 조회 (program name으로 매핑용)
    const v1Programs = await db1
      .select({
        id: programsTable.id,
        name: programsTable.name,
      })
      .from(programsTable);

    // V1 users 조회 (walletAddress 매핑용)
    const v1Users = await db1
      .select({
        id: usersTable.id,
        walletAddress: usersTable.walletAddress,
      })
      .from(usersTable);

    // 매핑 테이블 생성
    const v1ProgramIdToName = new Map<string, string>();
    for (const program of v1Programs) {
      v1ProgramIdToName.set(program.id, program.name);
    }

    const programNameToV2Id = new Map<string, number>();
    for (const program of v2Programs) {
      programNameToV2Id.set(program.title, program.id);
    }

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

    console.log(`Found ${v2Programs.length} V2 programs, ${v2Users.length} V2 users.`);

    // 기존 데이터 삭제 옵션
    const clearExistingData = process.env.CLEAR_EXISTING_APPLICATIONS === 'true';
    if (clearExistingData) {
      console.log('Clearing existing applications_v2 data...');
      await db2.execute(sql`TRUNCATE TABLE ${applicationsV2Table} RESTART IDENTITY CASCADE`);
      console.log('✅ Existing data cleared.');
    }

    let migratedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const v1Application of v1Applications) {
      try {
        // program_id 매핑: V1 program id -> program name -> V2 program id
        const programName = v1ProgramIdToName.get(v1Application.programId);
        if (!programName) {
          console.warn(
            `⚠️  Program name not found for program ${v1Application.programId}. Skipping application ${v1Application.id}.`,
          );
          skippedCount++;
          continue;
        }

        const v2ProgramId = programNameToV2Id.get(programName);
        if (!v2ProgramId) {
          console.warn(
            `⚠️  V2 program not found for program name "${programName}" (V1 id: ${v1Application.programId}). Skipping application ${v1Application.id}.`,
          );
          skippedCount++;
          continue;
        }

        // applicant_id 매핑: V1 uuid -> walletAddress -> V2 user id
        const walletAddress = v1UserIdToWalletAddress.get(v1Application.applicantId);
        if (!walletAddress) {
          console.warn(
            `⚠️  Applicant wallet address not found for user ${v1Application.applicantId}. Skipping application ${v1Application.id}.`,
          );
          skippedCount++;
          continue;
        }

        const v2UserId = walletAddressToV2UserId.get(walletAddress);
        if (!v2UserId) {
          console.warn(
            `⚠️  V2 user not found for wallet address ${walletAddress} (V1 user id: ${v1Application.applicantId}). Skipping application ${v1Application.id}.`,
          );
          skippedCount++;
          continue;
        }

        // content 생성: name, summary, content를 합침
        const contentParts = [
          'name',
          v1Application.name,
          'summary',
          v1Application.summary,
          'content',
          v1Application.content,
        ]
          .filter(Boolean)
          .join('\n\n');
        const content = contentParts || '';

        const newApplication: NewApplicationV2 = {
          programId: v2ProgramId,
          applicantId: v2UserId,
          status: mapStatus(v1Application.status || 'pending'),
          title: v1Application.name,
          content,
          rejectedReason: v1Application.rejectionReason || '',
          picked: false,
          createdAt: v1Application.createdAt,
          updatedAt: v1Application.updatedAt,
        };

        await db2.insert(applicationsV2Table).values(newApplication);
        migratedCount++;
        console.log(
          `✅ Successfully migrated application: ${v1Application.name} (id: ${v1Application.id})`,
        );
      } catch (error) {
        failedCount++;
        console.error(
          `❌ Failed to migrate application: ${v1Application.id} (${v1Application.name})`,
          error,
        );
      }
    }

    console.log('----------------------------------------');
    console.log(
      `Migration complete. Migrated ${migratedCount} out of ${v1Applications.length} applications.`,
    );
    console.log(`Applications skipped: ${skippedCount}`);
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

migrateApplications();
