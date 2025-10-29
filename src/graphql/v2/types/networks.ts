import type { NetworkType as DBNetwork } from '@/db/schemas/v2/networks';
import builder from '@/graphql/builder';

export const NetworkV2Ref = builder.objectRef<DBNetwork>('NetworkV2');

export const NetworkV2Type = NetworkV2Ref.implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    chainId: t.exposeInt('chainId'),
    chainName: t.exposeString('chainName'),
    mainnet: t.exposeBoolean('mainnet'),
    exploreUrl: t.exposeString('exploreUrl', { nullable: true }),
  }),
});

export const PaginatedNetworksV2Type = builder
  .objectRef<{ data: DBNetwork[]; count: number }>('PaginatedNetworksV2')
  .implement({
    fields: (t) => ({
      data: t.field({ type: [NetworkV2Type], resolve: (p) => p.data }),
      count: t.field({ type: 'Int', resolve: (p) => p.count }),
    }),
  });
