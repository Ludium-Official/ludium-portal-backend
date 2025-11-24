import { networksTable } from '@/db/schemas/v2/networks';
import {
  type OnchainProgramInfo as DBOnchainProgram,
  onchainProgramStatusValues,
} from '@/db/schemas/v2/onchain-program-info';
import { smartContractsTable } from '@/db/schemas/v2/smart-contracts';
import builder from '@/graphql/builder';
import type { Context } from '@/types';
import { eq } from 'drizzle-orm';
import { NetworkV2Ref } from './networks';
import { SmartContractV2Ref } from './smart-contracts';

export const OnchainProgramStatusV2Enum = builder.enumType('OnchainProgramStatusV2', {
  values: onchainProgramStatusValues,
});

export const OnchainProgramInfoV2Ref = builder.objectRef<DBOnchainProgram>('OnchainProgramInfoV2');

export const OnchainProgramInfoV2Type = OnchainProgramInfoV2Ref.implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    networkId: t.exposeInt('networkId'),
    smartContractId: t.exposeInt('smartContractId'),
    onchainProgramId: t.exposeInt('onchainProgramId'),
    status: t.field({ type: OnchainProgramStatusV2Enum, resolve: (p) => p.status }),
    createdAt: t.field({ type: 'DateTime', resolve: (p) => p.createdAt }),
    tx: t.exposeString('tx'),
    network: t.field({
      type: NetworkV2Ref,
      description: 'The network associated with this onchain program info',
      resolve: async (onchain, _args, ctx: Context) => {
        const [network] = await ctx.db
          .select()
          .from(networksTable)
          .where(eq(networksTable.id, onchain.networkId));

        if (!network) {
          throw new Error(`Network with id ${onchain.networkId} not found`);
        }

        return network;
      },
    }),
    smartContract: t.field({
      type: SmartContractV2Ref,
      description: 'The smart contract associated with this onchain program info',
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
  }),
});

export const PaginatedOnchainProgramInfoV2Type = builder
  .objectRef<{ data: DBOnchainProgram[]; count: number }>('PaginatedOnchainProgramInfoV2')
  .implement({
    fields: (t) => ({
      data: t.field({ type: [OnchainProgramInfoV2Type], resolve: (p) => p.data }),
      count: t.exposeInt('count'),
    }),
  });
