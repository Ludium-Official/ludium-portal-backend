import { networksTable } from '@/db/schemas/v2/networks';
import type { SmartContract as DBSmartContract } from '@/db/schemas/v2/smart-contracts';
import builder from '@/graphql/builder';
import type { Context } from '@/types';
import { eq } from 'drizzle-orm';
import { NetworkV2Type } from './networks';

export const SmartContractV2Ref = builder.objectRef<DBSmartContract>('SmartContractV2');

export const SmartContractV2Type = SmartContractV2Ref.implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    chainInfoId: t.exposeInt('chainInfoId'),
    address: t.exposeString('address'),
    name: t.exposeString('name'),
    network: t.field({
      type: NetworkV2Type,
      resolve: async (parent, _args, ctx: Context) => {
        const [net] = await ctx.db
          .select()
          .from(networksTable)
          .where(eq(networksTable.id, parent.chainInfoId));
        if (!net) throw new Error('Network not found');
        return net;
      },
    }),
  }),
});

export const PaginatedSmartContractsV2Type = builder
  .objectRef<{ data: DBSmartContract[]; count: number }>('PaginatedSmartContractsV2')
  .implement({
    fields: (t) => ({
      data: t.field({ type: [SmartContractV2Type], resolve: (p) => p.data }),
      count: t.exposeInt('count'),
    }),
  });
