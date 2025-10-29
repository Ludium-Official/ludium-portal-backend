import builder from '@/graphql/builder';
import {
  CreateOnchainProgramInfoV2Input,
  UpdateOnchainProgramInfoV2Input,
} from '@/graphql/v2/inputs/onchain-program-info';
import {
  createOnchainProgramInfoV2Resolver,
  deleteOnchainProgramInfoV2Resolver,
  updateOnchainProgramInfoV2Resolver,
} from '@/graphql/v2/resolvers/onchain-program-info';
import { OnchainProgramInfoV2Type } from '@/graphql/v2/types/onchain-program-info';

builder.mutationField('createOnchainProgramInfoV2', (t) =>
  t.field({
    type: OnchainProgramInfoV2Type,
    authScopes: { userV2: true },
    args: { input: t.arg({ type: CreateOnchainProgramInfoV2Input, required: true }) },
    resolve: createOnchainProgramInfoV2Resolver,
  }),
);

builder.mutationField('updateOnchainProgramInfoV2', (t) =>
  t.field({
    type: OnchainProgramInfoV2Type,
    authScopes: { userV2: true },
    args: {
      id: t.arg.id({ required: true }),
      input: t.arg({ type: UpdateOnchainProgramInfoV2Input, required: true }),
    },
    resolve: updateOnchainProgramInfoV2Resolver,
  }),
);

builder.mutationField('deleteOnchainProgramInfoV2', (t) =>
  t.field({
    type: OnchainProgramInfoV2Type,
    authScopes: { userV2: true },
    args: { id: t.arg.id({ required: true }) },
    resolve: deleteOnchainProgramInfoV2Resolver,
  }),
);
