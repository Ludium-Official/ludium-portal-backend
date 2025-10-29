// @src/db/schemas/v2/tokens.test.ts

import { db } from '@/db/test-db';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { type NetworkType, networksTable } from './networks';
import { tokensTable } from './tokens';

describe('TokensTable', () => {
  let testNetwork: NetworkType;

  beforeEach(async () => {
    // Create a test network for each test with unique chain_id
    const [network] = await db
      .insert(networksTable)
      .values({
        chainId: Math.floor(Math.random() * 10000) + 3000, // Random unique chain_id
        chainName: 'ethereum',
        mainnet: true,
        exploreUrl: 'https://etherscan.io',
      })
      .returning();
    testNetwork = network;
  });

  afterEach(async () => {
    // Clean up tokens and networks after each test
    await db.delete(tokensTable);
    await db.delete(networksTable);
  });

  it('should create a token', async () => {
    const tokenData = {
      chainInfoId: testNetwork.id,
      tokenName: 'USDC',
      tokenAddress: '0xA0b86a33E6441b8C4C8C0C4C8C0C4C8C0C4C8C0',
    };

    const [token] = await db.insert(tokensTable).values(tokenData).returning();

    expect(token).toBeDefined();
    expect(token.chainInfoId).toBe(testNetwork.id);
    expect(token.tokenName).toBe('USDC');
    expect(token.tokenAddress).toBe('0xA0b86a33E6441b8C4C8C0C4C8C0C4C8C0C4C8C0');
  });

  it('should create multiple tokens for the same network', async () => {
    const tokensData = [
      {
        chainInfoId: testNetwork.id,
        tokenName: 'USDC',
        tokenAddress: '0xA0b86a33E6441b8C4C8C0C4C8C0C4C8C0C4C8C0',
      },
      {
        chainInfoId: testNetwork.id,
        tokenName: 'ETH',
        tokenAddress: '0x0000000000000000000000000000000000000000',
      },
      {
        chainInfoId: testNetwork.id,
        tokenName: 'WETH',
        tokenAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      },
    ];

    const tokens = await db.insert(tokensTable).values(tokensData).returning();

    expect(tokens).toHaveLength(3);
    expect(tokens.map((t) => t.tokenName)).toContain('USDC');
    expect(tokens.map((t) => t.tokenName)).toContain('ETH');
    expect(tokens.map((t) => t.tokenName)).toContain('WETH');
  });

  it('should enforce foreign key constraint', async () => {
    const tokenData = {
      chainInfoId: 99999, // Non-existent network ID
      tokenName: 'USDC',
      tokenAddress: '0xA0b86a33E6441b8C4C8C0C4C8C0C4C8C0C4C8C0',
    };

    await expect(db.insert(tokensTable).values(tokenData)).rejects.toThrow();
  });

  it('should allow same token name on different networks', async () => {
    // Create another network
    const [network2] = await db
      .insert(networksTable)
      .values({
        chainId: Math.floor(Math.random() * 10000) + 4000, // Random unique chain_id
        chainName: 'polygon',
        mainnet: true,
        exploreUrl: 'https://polygonscan.com',
      })
      .returning();

    const tokensData = [
      {
        chainInfoId: testNetwork.id,
        tokenName: 'USDC',
        tokenAddress: '0xA0b86a33E6441b8C4C8C0C4C8C0C4C8C0C4C8C0',
      },
      {
        chainInfoId: network2.id,
        tokenName: 'USDC',
        tokenAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      },
    ];

    const tokens = await db.insert(tokensTable).values(tokensData).returning();

    expect(tokens).toHaveLength(2);
    expect(tokens[0].tokenName).toBe('USDC');
    expect(tokens[1].tokenName).toBe('USDC');
    expect(tokens[0].chainInfoId).toBe(testNetwork.id);
    expect(tokens[1].chainInfoId).toBe(network2.id);
  });

  it('should query tokens by network', async () => {
    // Create tokens for the test network
    await db.insert(tokensTable).values([
      {
        chainInfoId: testNetwork.id,
        tokenName: 'USDC',
        tokenAddress: '0xA0b86a33E6441b8C4C8C0C4C8C0C4C8C0C4C8C0',
      },
      {
        chainInfoId: testNetwork.id,
        tokenName: 'ETH',
        tokenAddress: '0x0000000000000000000000000000000000000000',
      },
    ]);

    // Create another network with different tokens
    const [network2] = await db
      .insert(networksTable)
      .values({
        chainId: Math.floor(Math.random() * 10000) + 5000, // Random unique chain_id
        chainName: 'polygon',
        mainnet: true,
      })
      .returning();

    await db.insert(tokensTable).values({
      chainInfoId: network2.id,
      tokenName: 'MATIC',
      tokenAddress: '0x0000000000000000000000000000000000000000',
    });

    // Query tokens for the first network
    const tokens = await db
      .select()
      .from(tokensTable)
      .where(eq(tokensTable.chainInfoId, testNetwork.id));

    expect(tokens).toHaveLength(2);
    expect(tokens.map((t) => t.tokenName)).toContain('USDC');
    expect(tokens.map((t) => t.tokenName)).toContain('ETH');
  });

  it('should handle 42 character token addresses', async () => {
    const address42 = `0x${'A'.repeat(40)}`; // 42 character address
    const tokenData = {
      chainInfoId: testNetwork.id,
      tokenName: 'LONG',
      tokenAddress: address42,
    };

    const [token] = await db.insert(tokensTable).values(tokenData).returning();

    expect(token.tokenAddress).toBe(address42);
  });

  it('should handle special characters in token names', async () => {
    const tokenData = [
      {
        chainInfoId: testNetwork.id,
        tokenName: 'USDC-USD',
        tokenAddress: '0xA0b86a33E6441b8C4C8C0C4C8C0C4C8C0C4C8C0',
      },
      {
        chainInfoId: testNetwork.id,
        tokenName: 'WETH/ETH',
        tokenAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      },
    ];

    const tokens = await db.insert(tokensTable).values(tokenData).returning();

    expect(tokens).toHaveLength(2);
    expect(tokens[0].tokenName).toBe('USDC-USD');
    expect(tokens[1].tokenName).toBe('WETH/ETH');
  });

  it('should cascade delete when network is deleted', async () => {
    // Create tokens
    await db.insert(tokensTable).values([
      {
        chainInfoId: testNetwork.id,
        tokenName: 'USDC',
        tokenAddress: '0xA0b86a33E6441b8C4C8C0C4C8C0C4C8C0C4C8C0',
      },
      {
        chainInfoId: testNetwork.id,
        tokenName: 'ETH',
        tokenAddress: '0x0000000000000000000000000000000000000000',
      },
    ]);

    // Verify tokens exist
    const tokens = await db
      .select()
      .from(tokensTable)
      .where(eq(tokensTable.chainInfoId, testNetwork.id));
    expect(tokens).toHaveLength(2);

    // Delete network
    await db.delete(networksTable).where(eq(networksTable.id, testNetwork.id));

    // Verify tokens are cascade deleted
    const remainingTokens = await db
      .select()
      .from(tokensTable)
      .where(eq(tokensTable.chainInfoId, testNetwork.id));
    expect(remainingTokens).toHaveLength(0);
  });
});
