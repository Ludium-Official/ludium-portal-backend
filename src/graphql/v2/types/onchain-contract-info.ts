import { networksTable } from '@/db/schemas/v2/networks';
import {
  type OnchainContractInfo as DBOnchain,
  onchainContractStatusValues,
} from '@/db/schemas/v2/onchain-contract-info';
import { programsV2Table } from '@/db/schemas/v2/programs';
import { smartContractsTable } from '@/db/schemas/v2/smart-contracts';
import { tokensTable } from '@/db/schemas/v2/tokens';
import builder from '@/graphql/builder';
import type { Context } from '@/types';
import { eq } from 'drizzle-orm';
import { NetworkV2Ref } from './networks';
import { SmartContractV2Ref } from './smart-contracts';
import { TokenV2Type } from './tokens';

export const OnchainContractStatusV2Enum = builder.enumType('OnchainContractStatusV2', {
  values: onchainContractStatusValues,
});

export const OnchainContractInfoV2Ref = builder.objectRef<DBOnchain>('OnchainContractInfoV2');

export const OnchainContractInfoV2Type = OnchainContractInfoV2Ref.implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    programId: t.exposeInt('programId'),
    sponsorId: t.exposeInt('sponsorId'),
    applicantId: t.exposeInt('applicantId'),
    smartContractId: t.exposeInt('smartContractId'),
    onchainContractId: t.exposeInt('onchainContractId'),
    createdAt: t.field({ type: 'DateTime', resolve: (p) => p.createdAt }),
    status: t.field({ type: OnchainContractStatusV2Enum, resolve: (p) => p.status }),
    tx: t.exposeString('tx'),
    token: t.field({
      type: TokenV2Type,
      nullable: true,
      description: 'The token associated with the program of this contract info',
      resolve: async (contractInfo, _args, ctx: Context) => {
        const [program] = await ctx.db
          .select()
          .from(programsV2Table)
          .where(eq(programsV2Table.id, contractInfo.programId))
          .limit(1);

        const [result] = await ctx.db
          .select()
          .from(tokensTable)
          .where(eq(tokensTable.id, program.token_id))
          .limit(1);

        return result || null;
      },
    }),
    smartContract: t.field({
      type: SmartContractV2Ref,
      description: 'The smart contract associated with this onchain contract info',
      resolve: async (onchain, _args, ctx: Context) => {
        const [smartContract] = await ctx.db
          .select()
          .from(smartContractsTable)
          .where(eq(smartContractsTable.id, onchain.smartContractId));

        if (!smartContract) {
          throw new Error(`Smart contract with id ${onchain.smartContractId} not found`);
        }

        return smartContract;
      },
    }),
    network: t.field({
      type: NetworkV2Ref,
      description: 'The network associated with this onchain contract info (via smart contract)',
      resolve: async (onchain, _args, ctx: Context) => {
        // First get the smart contract to find the network
        const [smartContract] = await ctx.db
          .select()
          .from(smartContractsTable)
          .where(eq(smartContractsTable.id, onchain.smartContractId));

        if (!smartContract) {
          throw new Error(`Smart contract with id ${onchain.smartContractId} not found`);
        }

        // Then get the network using chainInfoId from smart contract
        const [network] = await ctx.db
          .select()
          .from(networksTable)
          .where(eq(networksTable.id, smartContract.chainInfoId));

        if (!network) {
          throw new Error(`Network with id ${smartContract.chainInfoId} not found`);
        }

        return network;
      },
    }),
  }),
});

export const PaginatedOnchainContractInfoV2Type = builder
  .objectRef<{ data: DBOnchain[]; count: number }>('PaginatedOnchainContractInfoV2')
  .implement({
    fields: (t) => ({
      data: t.field({ type: [OnchainContractInfoV2Type], resolve: (p) => p.data }),
      count: t.field({ type: 'Int', resolve: (p) => p.count }),
    }),
  });
