import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { networksTable } from '../db/schemas/v2/networks';
import { type NewTokenType, tokensTable } from '../db/schemas/v2/tokens';

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

    // 토큰 주소 정보 (제공된 정보 기반)
    const tokenAddresses: Record<string, Record<string, string>> = {
      base: {
        USDT: '0xfde4c96c8593536e31f229ea8f37b2ada2699bb2',
        USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      },
      arbitrum: {
        USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
        USDC: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
      },
      educhain: {
        USDT: '0x7277cc818e3f3ffbb169c6da9cc77fc2d2a34895',
        USDC: '0x836d275563bab5e93fd6ca62a95db7065da94342',
      },
    };

    // 토큰 데이터 정의 (currency, network)
    // 네이티브 토큰은 0x0 주소 사용
    const tokenData: Array<{ currency: string; network: string }> = [
      { currency: 'ETH', network: 'base' },
      { currency: 'CTC', network: 'creditcoin' },
      { currency: 'EDU', network: 'educhain' },
      { currency: 'ETH', network: 'arbitrum' },
      { currency: 'USDT', network: 'base' },
      { currency: 'USDC', network: 'base' },
      { currency: 'USDT', network: 'arbitrum' },
      { currency: 'USDC', network: 'arbitrum' },
      { currency: 'USDT', network: 'educhain' },
      { currency: 'USDC', network: 'educhain' },
    ];

    // 기존 데이터 삭제 옵션 (환경 변수로 제어)
    const clearExistingData = process.env.CLEAR_EXISTING_TOKENS === 'true';
    if (clearExistingData) {
      console.log('Clearing existing tokens data...');
      await db.execute(sql`TRUNCATE TABLE ${tokensTable} RESTART IDENTITY CASCADE`);
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

        // 토큰 주소 찾기 (제공된 정보에서 우선, 없으면 0x0)
        const networkName = token.network.toLowerCase();
        const currencyName = token.currency.toUpperCase();
        const tokenAddress =
          tokenAddresses[networkName]?.[currencyName] ||
          '0x0000000000000000000000000000000000000000';

        const newToken: NewTokenType = {
          chainInfoId: networkId,
          tokenName: token.currency,
          tokenAddress,
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
