import builder from '@/graphql/builder';
import { PaginationInput } from '@/graphql/types/common';
import {
  getTokenV2Resolver,
  getTokensByNetworkV2Resolver,
  getTokensV2Resolver,
} from '@/graphql/v2/resolvers/tokens';
import { PaginatedTokensV2Type, TokenV2Type } from '@/graphql/v2/types/tokens';

builder.queryFields((t) => ({
  tokensV2: t.field({
    type: PaginatedTokensV2Type,
    args: { pagination: t.arg({ type: PaginationInput, required: false }) },
    resolve: getTokensV2Resolver,
  }),
  tokenV2: t.field({
    type: TokenV2Type,
    args: { id: t.arg.id({ required: true }) },
    resolve: getTokenV2Resolver,
  }),
  tokensByNetworkV2: t.field({
    type: PaginatedTokensV2Type,
    args: {
      networkId: t.arg.int({ required: true }),
      pagination: t.arg({ type: PaginationInput, required: false }),
    },
    resolve: getTokensByNetworkV2Resolver,
  }),
}));
