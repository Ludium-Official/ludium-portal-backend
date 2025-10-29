import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { networksTable } from '../db/schemas/v2/networks';
import { tokensTable, type NewTokenType } from '../db/schemas/v2/tokens';

async function migrateTokens() {
  console.log('Starting token migration...');

  const dbUrl = process.env.DEV_DB_URL || process.env.DATABASE_URL;

  if (!dbUrl) {
    console.error('Error: Please define DEV_DB_URL or DATABASE_URL in your .env file.');
    process.exit(1);
  }

  const client = postgres(dbUrl);
  const db = drizzle(client);

  try {
    // 네트워크 조회
    console.log('Fetching networks from database...');
    const networks = await db.select().from(networksTable);
    const networkMap = new Map<string, number>();
    for (const network of networks) {
      networkMap.set(network.chainName.toLowerCase(), network.id);
    }

    if (networks.length === 0) {
      console.error('❌ No networks found. Please run migrate-networks first.');
      process.exit(1);
    }

    console.log(`Found ${networks.length} networks in database.`);

    // 토큰 데이터 정의 (currency, network)
    const tokenData: Array<{ currency: string; network: string }> = [
      { currency: 'ETH', network: 'base' },
      { currency: 'CTC', network: 'creditcoin' },
      { currency: 'EDU', network: 'educhain' },
      { currency: 'USDT', network: 'base' },
      { currency: 'USDT', network: 'arbitrum' },
      { currency: 'ETH', network: 'educhain' },
      { currency: 'ETH', network: 'arbitrum' },
      { currency: 'USDC', network: 'arbitrum' },
      { currency: 'USDT', network: 'educhain' },
    ];

    // 기존 데이터 삭제 옵션 (환경 변수로 제어)
    const clearExistingData = process.env.CLEAR_EXISTING_TOKENS === 'true';
    if (clearExistingData) {
      console.log('Clearing existing tokens data...');
      await db.execute(sql`TRUNCATE TABLE ${tokensTable} RESTART IDENTITY`);
      console.log('✅ Existing data cleared.');
    }

    let insertedCount = 0;
    let alreadyExisted = 0;
    let failedCount = 0;
    let skippedCount = 0;

    // 기존 토큰 확인 (chainInfoId + tokenName 조합으로 중복 체크)
    const existingTokens = await db.select().from(tokensTable);
    const existingTokenKeys = new Set(existingTokens.map((t) => `${t.chainInfoId}-${t.tokenName}`));

    for (const token of tokenData) {
      try {
        const networkId = networkMap.get(token.network.toLowerCase());

        if (!networkId) {
          console.warn(
            `⚠️  Network "${token.network}" not found. Skipping token ${token.currency}.`,
          );
          skippedCount++;
          continue;
        }

        const tokenKey = `${networkId}-${token.currency}`;
        if (existingTokenKeys.has(tokenKey)) {
          console.log(`⚠️  Token ${token.currency} on ${token.network} already exists. Skipping.`);
          alreadyExisted++;
          continue;
        }

        const newToken: NewTokenType = {
          chainInfoId: networkId,
          tokenName: token.currency,
          tokenAddress: '0x0', // 일단 모두 0x0으로 설정
        };

        await db.insert(tokensTable).values(newToken);
        insertedCount++;
        console.log(
          `✅ Successfully inserted token: ${token.currency} on ${token.network} (network_id: ${networkId})`,
        );
      } catch (error) {
        failedCount++;
        console.error(`❌ Failed to insert token: ${token.currency} on ${token.network}`, error);
      }
    }

    console.log('----------------------------------------');
    console.log(`Migration complete. Inserted ${insertedCount} tokens.`);
    console.log(`Tokens already existed: ${alreadyExisted}`);
    if (skippedCount > 0) {
      console.log(`Skipped (network not found): ${skippedCount}`);
    }
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

migrateTokens();
