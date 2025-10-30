import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { type NewNetworkType, networksTable } from '../db/schemas/v2/networks';

async function migrateNetworks() {
  console.log('Starting network migration...');

  const dbUrl = process.env.DEV_DB_URL || process.env.DATABASE_URL;

  if (!dbUrl) {
    console.error('Error: Please define DEV_DB_URL or DATABASE_URL in your .env file.');
    process.exit(1);
  }

  const client = postgres(dbUrl);
  const db = drizzle(client);

  try {
    // 기본 네트워크 데이터 정의
    const networks: NewNetworkType[] = [
      {
        chainId: 8453,
        chainName: 'base',
        mainnet: true,
        exploreUrl: 'https://basescan.org',
      },
      {
        chainId: 42161,
        chainName: 'arbitrum',
        mainnet: true,
        exploreUrl: 'https://arbiscan.io',
      },
      {
        chainId: 102030,
        chainName: 'creditcoin',
        mainnet: true,
      },
      {
        chainId: 41923,
        chainName: 'educhain',
        mainnet: true,
      },
    ];

    // 기존 데이터 삭제 옵션 (환경 변수로 제어)
    const clearExistingData = process.env.CLEAR_EXISTING_NETWORKS === 'true';
    if (clearExistingData) {
      console.log('Clearing existing networks data...');
      await db.execute(sql`TRUNCATE TABLE ${networksTable} RESTART IDENTITY CASCADE`);
      console.log('✅ Existing data cleared.');
    }

    let insertedCount = 0;
    let alreadyExisted = 0;
    let failedCount = 0;

    // 기존 네트워크 확인 (chain_id 기준)
    const existingNetworks = await db.select().from(networksTable);
    const existingChainIds = new Set(existingNetworks.map((n) => n.chainId));

    for (const network of networks) {
      try {
        // chain_id가 이미 존재하는지 확인
        if (existingChainIds.has(network.chainId)) {
          console.log(
            `⚠️  Network with chain_id ${network.chainId} (${network.chainName}) already exists. Skipping.`,
          );
          alreadyExisted++;
          continue;
        }

        await db.insert(networksTable).values(network);
        insertedCount++;
        console.log(
          `✅ Successfully inserted network: ${network.chainName} (chain_id: ${network.chainId})`,
        );
      } catch (error) {
        failedCount++;
        console.error(
          `❌ Failed to insert network: ${network.chainName} (chain_id: ${network.chainId})`,
          error,
        );
      }
    }

    console.log('----------------------------------------');
    console.log(`Migration complete. Inserted ${insertedCount} networks.`);
    console.log(`Networks already existed: ${alreadyExisted}`);
    if (failedCount > 0) {
      console.log(`Failed to insert: ${failedCount}`);
    }
    console.log('----------------------------------------');
  } catch (error) {
    console.error('An error occurred during migration:', error);
    throw error;
  } finally {
    console.log('Closing database connection...');
    await client.end();
    console.log('Connection closed.');
  }
}

migrateNetworks();
