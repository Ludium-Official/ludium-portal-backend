import builder from '@/graphql/builder';
import { PaginationInput } from '@/graphql/types/common';
import { getNetworkV2Resolver, getNetworksV2Resolver } from '@/graphql/v2/resolvers/networks';
import { NetworkV2Type, PaginatedNetworksV2Type } from '@/graphql/v2/types/networks';

builder.queryFields((t) => ({
  networksV2: t.field({
    type: PaginatedNetworksV2Type,
    authScopes: { userV2: true },
    args: { pagination: t.arg({ type: PaginationInput, required: false }) },
    resolve: getNetworksV2Resolver,
  }),
  networkV2: t.field({
    type: NetworkV2Type,
    authScopes: { userV2: true },
    args: { id: t.arg.id({ required: true }) },
    resolve: getNetworkV2Resolver,
  }),
}));
