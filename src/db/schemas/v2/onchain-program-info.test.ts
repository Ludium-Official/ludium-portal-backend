// @src/db/schemas/v2/onchain-program-info.test.ts

import { db } from '@/db/test-db';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { networksTable } from './networks';
import { onchainProgramInfoTable } from './onchain-program-info';
import { programsV2Table } from './programs';
import { smartContractsTable } from './smart-contracts';
import { tokensTable } from './tokens';
import { usersV2Table } from './users';

const uniqueChainId = () => Number(String(Date.now()).slice(-7)) + Math.floor(Math.random() * 1000);

describe('OnchainProgramInfoTable', () => {
  let networkId: number;
  let tokenId: number;
  let sponsorId: number;
  let programId: number;
  let contractId: number;

  beforeEach(async () => {
    // Seed network
    const [net] = await db
      .insert(networksTable)
      .values({ chainId: uniqueChainId(), chainName: 'sepolia', mainnet: false })
      .returning();
    networkId = net.id;

    // Seed token
    const [tok] = await db
      .insert(tokensTable)
      .values({
        chainInfoId: networkId,
        tokenName: 'USDC',
        tokenAddress: '0x0000000000000000000000000000000000000001',
        decimals: 6,
      })
      .returning();
    tokenId = tok.id;

    // Seed sponsor user
    const [user] = await db
      .insert(usersV2Table)
      .values({
        walletAddress: '0xSponsor000000000000000000000000000000000000',
        loginType: 'wallet',
        role: 'user',
        email: 'sponsor@tests.dev',
        firstName: 'Spo',
        lastName: 'Nsor',
      })
      .returning();
    sponsorId = user.id;

    // Seed program
    const [program] = await db
      .insert(programsV2Table)
      .values({
        title: 'Onchain Program',
        description: 'Test onchain program',
        skills: ['Solidity'],
        deadline: new Date(),
        visibility: 'public',
        networkId,
        price: '0',
        token_id: tokenId,
        status: 'open',
        sponsorId,
      })
      .returning();
    programId = program.id;

    // Seed smart contract
    const [sc] = await db
      .insert(smartContractsTable)
      .values({
        chainInfoId: networkId,
        address: '0x0000000000000000000000000000000000000abc',
        name: 'ProgramFactory',
      })
      .returning();
    contractId = sc.id;
  });

  afterEach(async () => {
    await db.delete(onchainProgramInfoTable);
    await db.delete(programsV2Table);
    await db.delete(smartContractsTable);
    await db.delete(tokensTable);
    await db.delete(usersV2Table);
    await db.delete(networksTable);
  });

  it('should create onchain program info with relations', async () => {
    const [row] = await db
      .insert(onchainProgramInfoTable)
      .values({
        programId,
        networkId,
        smartContractId: contractId,
        onchainProgramId: 1,
        status: 'active',
        tx: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      })
      .returning();

    expect(row).toBeDefined();
    expect(row.programId).toBe(programId);
    expect(row.smartContractId).toBe(contractId);
    expect(row.onchainProgramId).toBe(1);
    expect(row.status).toBe('active');
  });

  it('should cascade delete when program is deleted', async () => {
    const [oci] = await db
      .insert(onchainProgramInfoTable)
      .values({
        programId,
        networkId,
        smartContractId: contractId,
        onchainProgramId: 999,
        status: 'active',
        tx: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      })
      .returning();

    expect(oci.id).toBeDefined();

    await db.delete(programsV2Table).where(eq(programsV2Table.id, programId));

    const remaining = await db
      .select()
      .from(onchainProgramInfoTable)
      .where(eq(onchainProgramInfoTable.programId, programId));
    expect(remaining).toHaveLength(0);
  });
});
