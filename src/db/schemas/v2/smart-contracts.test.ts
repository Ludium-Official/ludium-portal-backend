// @src/db/schemas/v2/smart-contracts.test.ts

import { db } from '@/db/test-db';
import { eq } from 'drizzle-orm';
import { afterEach, describe, expect, it } from 'vitest';
import { networksTable } from './networks';
import { smartContractsTable } from './smart-contracts';

const uniqueChainId = () => Number(String(Date.now()).slice(-7)) + Math.floor(Math.random() * 1000);

describe('SmartContractsTable', () => {
  afterEach(async () => {
    await db.delete(smartContractsTable);
    await db.delete(networksTable);
  });

  it('should create a smart contract with network relation', async () => {
    const [network] = await db
      .insert(networksTable)
      .values({ chainId: uniqueChainId(), chainName: 'sepolia', mainnet: false })
      .returning();

    const contractData = {
      chainInfoId: network.id,
      address: '0x0000000000000000000000000000000000001234',
      name: 'ProgramFactory',
    };

    const [contract] = await db.insert(smartContractsTable).values(contractData).returning();

    expect(contract).toBeDefined();
    expect(contract.chainInfoId).toBe(network.id);
    expect(contract.address).toBe(contractData.address);
    expect(contract.name).toBe('ProgramFactory');

    const rows = await db
      .select()
      .from(smartContractsTable)
      .where(eq(smartContractsTable.chainInfoId, network.id));
    expect(rows).toHaveLength(1);
  });

  it('should enforce 42-char address length', async () => {
    const [network] = await db
      .insert(networksTable)
      .values({ chainId: uniqueChainId(), chainName: 'custom', mainnet: false })
      .returning();

    await expect(
      db.insert(smartContractsTable).values({
        chainInfoId: network.id,
        // invalid length (43)
        address: '0x00000000000000000000000000000000000012344',
        name: 'Invalid',
      }),
    ).rejects.toThrow();
  });

  it('should cascade delete when network is deleted', async () => {
    const [network] = await db
      .insert(networksTable)
      .values({ chainId: uniqueChainId(), chainName: 'localnet', mainnet: false })
      .returning();

    const [contract] = await db
      .insert(smartContractsTable)
      .values({
        chainInfoId: network.id,
        address: '0x000000000000000000000000000000000000abcd',
        name: 'Router',
      })
      .returning();

    expect(contract.id).toBeDefined();

    await db.delete(networksTable).where(eq(networksTable.id, network.id));

    const remaining = await db
      .select()
      .from(smartContractsTable)
      .where(eq(smartContractsTable.chainInfoId, network.id));
    expect(remaining).toHaveLength(0);
  });
});
