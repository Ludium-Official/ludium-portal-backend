import builder from '@/graphql/builder';
import { CreateContractV2Input, UpdateContractV2Input } from '@/graphql/v2/inputs/contracts';
import {
  createContractV2Resolver,
  deleteContractV2Resolver,
  updateContractV2Resolver,
} from '@/graphql/v2/resolvers/contracts';
import { ContractV2Type } from '@/graphql/v2/types/contracts';

builder.mutationField('createContractV2', (t) =>
  t.field({
    type: ContractV2Type,
    authScopes: { userV2: true },
    args: { input: t.arg({ type: CreateContractV2Input, required: true }) },
    resolve: createContractV2Resolver,
  }),
);

builder.mutationField('updateContractV2', (t) =>
  t.field({
    type: ContractV2Type,
    authScopes: { userV2: true },
    args: {
      id: t.arg.id({ required: true }),
      input: t.arg({ type: UpdateContractV2Input, required: true }),
    },
    resolve: updateContractV2Resolver,
  }),
);

builder.mutationField('deleteContractV2', (t) =>
  t.field({
    type: ContractV2Type,
    authScopes: { userV2: true },
    args: { id: t.arg.id({ required: true }) },
    resolve: deleteContractV2Resolver,
  }),
);
