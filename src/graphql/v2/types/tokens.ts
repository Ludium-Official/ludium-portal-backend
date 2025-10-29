import type { TokenType as DBToken } from '@/db/schemas/v2/tokens';
import builder from '@/graphql/builder';

export const TokenV2Ref = builder.objectRef<DBToken>('TokenV2');

export const TokenV2Type = TokenV2Ref.implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    chainInfoId: t.exposeInt('chainInfoId'),
    tokenName: t.exposeString('tokenName'),
    tokenAddress: t.exposeString('tokenAddress'),
  }),
});

export const PaginatedTokensV2Type = builder
  .objectRef<{ data: DBToken[]; count: number }>('PaginatedTokensV2')
  .implement({
    fields: (t) => ({
      data: t.field({ type: [TokenV2Type], resolve: (p) => p.data }),
      count: t.field({ type: 'Int', resolve: (p) => p.count }),
    }),
  });
