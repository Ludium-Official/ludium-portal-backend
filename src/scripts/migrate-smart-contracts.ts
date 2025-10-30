import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { networksTable } from '../db/schemas/v2/networks';
import { type NewSmartContract, smartContractsTable } from '../db/schemas/v2/smart-contracts';

interface ContractInfo {
  address: string;
  deployer: string;
  verified: boolean;
}

interface NetworkDeployment {
  network: string;
  chainId: number;
  deployer: string;
  timestamp: string;
  contracts: Record<string, ContractInfo>;
}

interface DeployedContracts {
  [networkKey: string]: NetworkDeployment;
}

async function migrateSmartContracts() {
  console.log('Starting smart contracts migration...');

  const dbUrl = process.env.DEV_DB_URL || process.env.DATABASE_URL;

  if (!dbUrl) {
    console.error('Error: Please define DEV_DB_URL or DATABASE_URL in your .env file.');
    process.exit(1);
  }

  const client = postgres(dbUrl);
  const db = drizzle(client);

  try {
    // 네트워크 조회 (chainId로 매핑)
    console.log('Fetching networks from database...');
    const networks = await db.select().from(networksTable);
    const networkMapByChainId = new Map<number, number>();
    for (const network of networks) {
      networkMapByChainId.set(network.chainId, network.id);
    }

    if (networks.length === 0) {
      console.error('❌ No networks found. Please run migrate-networks first.');
      process.exit(1);
    }

    console.log(`Found ${networks.length} networks in database.`);

    // JSON 파일 읽기
    console.log('Reading deployed-contract.json...');
    // 프로젝트 루트 기준으로 src/scripts/deployed-contract.json 경로 사용
    const jsonPath = join(process.cwd(), 'src', 'scripts', 'deployed-contract.json');
    const jsonContent = readFileSync(jsonPath, 'utf-8');
    const deployedContracts: DeployedContracts = JSON.parse(jsonContent);

    console.log(`Found ${Object.keys(deployedContracts).length} networks in JSON file.`);

    // 기존 데이터 삭제 옵션 (환경 변수로 제어)
    const clearExistingData = process.env.CLEAR_EXISTING_SMART_CONTRACTS === 'true';
    if (clearExistingData) {
      console.log('Clearing existing smart_contracts data...');
      await db.execute(sql`TRUNCATE TABLE ${smartContractsTable} RESTART IDENTITY CASCADE`);
      console.log('✅ Existing data cleared.');
    }

    // 기존 컨트랙트 확인 (chainInfoId + address 조합으로 중복 체크)
    const existingContracts = await db.select().from(smartContractsTable);
    const existingContractKeys = new Set(
      existingContracts.map((c) => `${c.chainInfoId}-${c.address.toLowerCase()}`),
    );

    let insertedCount = 0;
    let alreadyExisted = 0;
    let failedCount = 0;
    let skippedCount = 0;

    // 각 네트워크의 컨트랙트들을 순회
    for (const [networkKey, networkData] of Object.entries(deployedContracts)) {
      const chainInfoId = networkMapByChainId.get(networkData.chainId);

      if (!chainInfoId) {
        console.warn(
          `⚠️  Network with chainId ${networkData.chainId} (${networkKey}) not found. Skipping.`,
        );
        skippedCount++;
        continue;
      }

      console.log(`\n📦 Processing network: ${networkKey} (chainId: ${networkData.chainId})`);

      // 각 컨트랙트를 순회하며 삽입
      for (const [contractName, contractInfo] of Object.entries(networkData.contracts)) {
        try {
          const contractKey = `${chainInfoId}-${contractInfo.address.toLowerCase()}`;

          if (existingContractKeys.has(contractKey)) {
            console.log(
              `⚠️  Contract ${contractName} (${contractInfo.address}) already exists. Skipping.`,
            );
            alreadyExisted++;
            continue;
          }

          const newContract: NewSmartContract = {
            chainInfoId,
            address: contractInfo.address,
            name: contractName,
          };

          await db.insert(smartContractsTable).values(newContract);
          insertedCount++;
          console.log(
            `✅ Successfully inserted contract: ${contractName} (${contractInfo.address}) on ${networkKey}`,
          );
        } catch (error) {
          failedCount++;
          console.error(
            `❌ Failed to insert contract: ${contractName} (${contractInfo.address}) on ${networkKey}`,
            error,
          );
        }
      }
    }

    console.log('\n----------------------------------------');
    console.log(`Migration complete. Inserted ${insertedCount} smart contracts.`);
    console.log(`Contracts already existed: ${alreadyExisted}`);
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

migrateSmartContracts();
