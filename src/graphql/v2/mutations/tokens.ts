import builder from '@/graphql/builder';
import { CreateTokenV2Input, UpdateTokenV2Input } from '@/graphql/v2/inputs/tokens';
import {
  createTokenV2Resolver,
  deleteTokenV2Resolver,
  updateTokenV2Resolver,
} from '@/graphql/v2/resolvers/tokens';
import { TokenV2Type } from '@/graphql/v2/types/tokens';

builder.mutationField('createTokenV2', (t) =>
  t.field({
    type: TokenV2Type,
    authScopes: { userV2: true },
    args: { input: t.arg({ type: CreateTokenV2Input, required: true }) },
    resolve: createTokenV2Resolver,
  }),
);

builder.mutationField('updateTokenV2', (t) =>
  t.field({
    type: TokenV2Type,
    authScopes: { userV2: true },
    args: {
      id: t.arg.id({ required: true }),
      input: t.arg({ type: UpdateTokenV2Input, required: true }),
    },
    resolve: updateTokenV2Resolver,
  }),
);

builder.mutationField('deleteTokenV2', (t) =>
  t.field({
    type: TokenV2Type,
    authScopes: { userV2: true },
    args: { id: t.arg.id({ required: true }) },
    resolve: deleteTokenV2Resolver,
  }),
);
