import builder from '@/graphql/builder';
import {
  CreateOnchainContractInfoV2Input,
  UpdateOnchainContractInfoV2Input,
} from '@/graphql/v2/inputs/onchain-contract-info';
import {
  createOnchainContractInfoV2Resolver,
  deleteOnchainContractInfoV2Resolver,
  updateOnchainContractInfoV2Resolver,
} from '@/graphql/v2/resolvers/onchain-contract-info';
import { OnchainContractInfoV2Type } from '@/graphql/v2/types/onchain-contract-info';

builder.mutationField('createOnchainContractInfoV2', (t) =>
  t.field({
    type: OnchainContractInfoV2Type,
    authScopes: { userV2: true },
    args: { input: t.arg({ type: CreateOnchainContractInfoV2Input, required: true }) },
    resolve: createOnchainContractInfoV2Resolver,
  }),
);

builder.mutationField('updateOnchainContractInfoV2', (t) =>
  t.field({
    type: OnchainContractInfoV2Type,
    authScopes: { userV2: true },
    args: {
      id: t.arg.id({ required: true }),
      input: t.arg({ type: UpdateOnchainContractInfoV2Input, required: true }),
    },
    resolve: updateOnchainContractInfoV2Resolver,
  }),
);

builder.mutationField('deleteOnchainContractInfoV2', (t) =>
  t.field({
    type: OnchainContractInfoV2Type,
    authScopes: { userV2: true },
    args: { id: t.arg.id({ required: true }) },
    resolve: deleteOnchainContractInfoV2Resolver,
  }),
);
