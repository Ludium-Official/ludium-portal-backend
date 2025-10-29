import 'dotenv/config';
import { eq, inArray, sql } from 'drizzle-orm';
import { drizzle as drizzleDb1 } from 'drizzle-orm/postgres-js';
import { drizzle as drizzleDb2 } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { keywordsTable } from '../db/schemas/keywords';
import { usersTable, usersToKeywordsTable } from '../db/schemas/users';
import { type NewUserV2, usersV2Table } from '../db/schemas/v2/users';

async function migrateUsers() {
  console.log('Starting user migration...');

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
    console.log('Fetching users from DB1...');
    const oldUsers = await db1.select().from(usersTable);
    console.log(`Found ${oldUsers.length} users to migrate.`);

    if (oldUsers.length === 0) {
      console.log('No users to migrate.');
      return;
    }

    const userIds = oldUsers.map((u) => u.id);
    const userKeywords = await db1
      .select({
        userId: usersToKeywordsTable.userId,
        keywordName: keywordsTable.name,
        keywordType: usersToKeywordsTable.type,
      })
      .from(usersToKeywordsTable)
      .leftJoin(keywordsTable, eq(keywordsTable.id, usersToKeywordsTable.keywordId))
      .where(inArray(usersToKeywordsTable.userId, userIds));

    const skillsMap = new Map<string, string[]>();
    for (const uk of userKeywords) {
      if (uk.userId && uk.keywordName) {
        if (!skillsMap.has(uk.userId)) {
          skillsMap.set(uk.userId, []);
        }
        skillsMap.get(uk.userId)?.push(uk.keywordName);
      }
    }

    // 기존 데이터 삭제 옵션 (환경 변수로 제어)
    const clearExistingData = process.env.CLEAR_EXISTING_USERS === 'true';
    if (clearExistingData) {
      console.log('Clearing existing users_v2 data...');
      // TRUNCATE 사용: 테이블 구조는 유지하고 데이터만 삭제
      // RESTART IDENTITY: 시퀀스도 초기화
      // CASCADE: 외래 키로 참조하는 데이터도 함께 삭제
      await db2.execute(sql`TRUNCATE TABLE ${usersV2Table} RESTART IDENTITY CASCADE`);
      console.log('✅ Existing data cleared.');
    }

    let migratedCount = 0;
    let alreaydExisted = 0;
    const existingUsers = await db2.select().from(usersV2Table);

    for (const oldUser of oldUsers) {
      if (!oldUser.walletAddress) {
        console.log(
          `❌ PANIC: walletAddress is null for user ${oldUser.email}. Skipping migration for this user.`,
        );
        continue;
      }

      const imageUrl = oldUser.image?.startsWith('https://') ? oldUser.image : '';
      const newUser: NewUserV2 = {
        // @ts-ignore
        role: oldUser.role === 'superadmin' ? 'admin' : oldUser.role,
        loginType: (oldUser.loginType || 'wallet') as 'google' | 'wallet' | 'farcaster',
        email: oldUser.email,
        walletAddress: oldUser.walletAddress,
        firstName: oldUser.firstName,
        lastName: oldUser.lastName,
        organizationName: oldUser.organizationName,
        profileImage: imageUrl,
        bio: [oldUser.about, oldUser.summary].filter(Boolean).join('\n\n'),
        skills: skillsMap.get(oldUser.id) || [],
        links: oldUser.links ? oldUser.links.map((link) => link.url) : [],
        createdAt: oldUser.createdAt,
        updatedAt: oldUser.updatedAt,
      };

      if (existingUsers.some((u) => u.walletAddress === newUser.walletAddress)) {
        // console.log(
        //   `User with wallet address ${newUser.walletAddress} already exists. Skipping.`,
        // );
        alreaydExisted++;
        continue;
      }

      try {
        await db2.insert(usersV2Table).values(newUser);
        migratedCount++;
        console.log(`✅ Successfully migrated user: ${oldUser.email}`);
      } catch (error) {
        console.error(`❌ Failed to migrate user: ${oldUser.email}`, error);
      }
    }

    console.log('----------------------------------------');
    console.log(`Migration complete. Migrated ${migratedCount} out of ${oldUsers.length} users.`);
    console.log(`Users already existed in DB2: ${alreaydExisted}`);
    console.log('----------------------------------------');
  } catch (error) {
    console.error('An error occurred during migration:', error);
  } finally {
    console.log('Closing database connections...');
    await client1.end();
    await client2.end();
    console.log('Connections closed.');
  }
}

migrateUsers();
