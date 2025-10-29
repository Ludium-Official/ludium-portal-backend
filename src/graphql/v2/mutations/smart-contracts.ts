import builder from '@/graphql/builder';
import {
  CreateSmartContractV2Input,
  UpdateSmartContractV2Input,
} from '@/graphql/v2/inputs/smart-contracts';
import {
  createSmartContractV2Resolver,
  deleteSmartContractV2Resolver,
  updateSmartContractV2Resolver,
} from '@/graphql/v2/resolvers/smart-contracts';
import { SmartContractV2Type } from '@/graphql/v2/types/smart-contracts';

builder.mutationField('createSmartContractV2', (t) =>
  t.field({
    type: SmartContractV2Type,
    authScopes: { userV2: true },
    args: { input: t.arg({ type: CreateSmartContractV2Input, required: true }) },
    resolve: createSmartContractV2Resolver,
  }),
);

builder.mutationField('updateSmartContractV2', (t) =>
  t.field({
    type: SmartContractV2Type,
    authScopes: { userV2: true },
    args: {
      id: t.arg.id({ required: true }),
      input: t.arg({ type: UpdateSmartContractV2Input, required: true }),
    },
    resolve: updateSmartContractV2Resolver,
  }),
);

builder.mutationField('deleteSmartContractV2', (t) =>
  t.field({
    type: SmartContractV2Type,
    authScopes: { userV2: true },
    args: { id: t.arg.id({ required: true }) },
    resolve: deleteSmartContractV2Resolver,
  }),
);
