// @src/db/schemas/v2/networks.test.ts

import { db } from '@/db/test-db';
import { eq } from 'drizzle-orm';
import { afterEach, describe, expect, it } from 'vitest';
import { networksTable } from './networks';
import { tokensTable } from './tokens';

describe('NetworksTable', () => {
  // Clean up after each test
  afterEach(async () => {
    await db.delete(networksTable);
  });

  it('should create a network', async () => {
    const networkData = {
      chainId: 1,
      chainName: 'ethereum',
      mainnet: true,
      exploreUrl: 'https://etherscan.io',
    };

    const [network] = await db.insert(networksTable).values(networkData).returning();

    expect(network).toBeDefined();
    expect(network.chainId).toBe(1);
    expect(network.chainName).toBe('ethereum');
    expect(network.mainnet).toBe(true);
    expect(network.exploreUrl).toBe('https://etherscan.io');
  });

  it('should create a testnet network', async () => {
    const networkData = {
      chainId: 11155111,
      chainName: 'sepolia',
      mainnet: false,
      exploreUrl: 'https://sepolia.etherscan.io',
    };

    const [network] = await db.insert(networksTable).values(networkData).returning();

    expect(network).toBeDefined();
    expect(network.chainId).toBe(11155111);
    expect(network.chainName).toBe('sepolia');
    expect(network.mainnet).toBe(false);
    expect(network.exploreUrl).toBe('https://sepolia.etherscan.io');
  });

  it('should enforce unique chain_id constraint', async () => {
    const networkData = {
      chainId: 9999, // Use unique chain_id for this test
      chainName: 'ethereum',
      mainnet: true,
    };

    // First insert should succeed
    await db.insert(networksTable).values(networkData);

    // Second insert with same chain_id should fail
    await expect(
      db.insert(networksTable).values({
        ...networkData,
        chainName: 'ethereum-duplicate',
      }),
    ).rejects.toThrow();
  });

  it('should allow null explore_url', async () => {
    const networkData = {
      chainId: 137,
      chainName: 'polygon',
      mainnet: true,
      exploreUrl: null,
    };

    const [network] = await db.insert(networksTable).values(networkData).returning();

    expect(network).toBeDefined();
    expect(network.exploreUrl).toBeNull();
  });

  it('should default mainnet to false', async () => {
    const networkData = {
      chainId: 80001,
      chainName: 'mumbai',
      // mainnet not specified, should default to false
    };

    const [network] = await db.insert(networksTable).values(networkData).returning();

    expect(network.mainnet).toBe(false);
  });

  it('should query networks by mainnet status', async () => {
    // Insert test data with unique chain_ids
    await db.insert(networksTable).values([
      { chainId: 1001, chainName: 'ethereum', mainnet: true },
      { chainId: 1002, chainName: 'sepolia', mainnet: false },
      { chainId: 1003, chainName: 'polygon', mainnet: true },
    ]);

    const mainnets = await db.select().from(networksTable).where(eq(networksTable.mainnet, true));

    const testnets = await db.select().from(networksTable).where(eq(networksTable.mainnet, false));

    expect(mainnets).toHaveLength(2);
    expect(testnets).toHaveLength(1);
    expect(mainnets.map((n) => n.chainName)).toContain('ethereum');
    expect(mainnets.map((n) => n.chainName)).toContain('polygon');
    expect(testnets.map((n) => n.chainName)).toContain('sepolia');
  });

  it('should handle cascade delete with tokens', async () => {
    // Create a network with unique chain_id
    const [network] = await db
      .insert(networksTable)
      .values({
        chainId: 2001,
        chainName: 'ethereum',
        mainnet: true,
      })
      .returning();

    // Create tokens for this network
    await db.insert(tokensTable).values([
      {
        chainInfoId: network.id,
        tokenName: 'USDC',
        tokenAddress: '0xA0b86a33E6441b8C4C8C0C4C8C0C4C8C0C4C8C0',
        decimals: 6,
      },
      {
        chainInfoId: network.id,
        tokenName: 'ETH',
        tokenAddress: '0x0000000000000000000000000000000000000000',
        decimals: 18,
      },
    ]);

    // Verify tokens exist
    const tokens = await db
      .select()
      .from(tokensTable)
      .where(eq(tokensTable.chainInfoId, network.id));
    expect(tokens).toHaveLength(2);

    // Delete network (should cascade delete tokens)
    await db.delete(networksTable).where(eq(networksTable.id, network.id));

    // Verify tokens are deleted
    const remainingTokens = await db
      .select()
      .from(tokensTable)
      .where(eq(tokensTable.chainInfoId, network.id));
    expect(remainingTokens).toHaveLength(0);
  });
});
