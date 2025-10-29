import builder from '@/graphql/builder';
import { CreateNetworkV2Input, UpdateNetworkV2Input } from '@/graphql/v2/inputs/networks';
import {
  createNetworkV2Resolver,
  deleteNetworkV2Resolver,
  updateNetworkV2Resolver,
} from '@/graphql/v2/resolvers/networks';
import { NetworkV2Type } from '@/graphql/v2/types/networks';

builder.mutationField('createNetworkV2', (t) =>
  t.field({
    type: NetworkV2Type,
    authScopes: { userV2: true },
    args: { input: t.arg({ type: CreateNetworkV2Input, required: true }) },
    resolve: createNetworkV2Resolver,
  }),
);

builder.mutationField('updateNetworkV2', (t) =>
  t.field({
    type: NetworkV2Type,
    authScopes: { userV2: true },
    args: {
      id: t.arg.id({ required: true }),
      input: t.arg({ type: UpdateNetworkV2Input, required: true }),
    },
    resolve: updateNetworkV2Resolver,
  }),
);

builder.mutationField('deleteNetworkV2', (t) =>
  t.field({
    type: NetworkV2Type,
    authScopes: { userV2: true },
    args: { id: t.arg.id({ required: true }) },
    resolve: deleteNetworkV2Resolver,
  }),
);
