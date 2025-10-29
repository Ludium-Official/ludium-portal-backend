import builder from '@/graphql/builder';
import { PaginationInput } from '@/graphql/types/common';
import {
  getOnchainProgramInfoV2Resolver,
  getOnchainProgramInfosByProgramV2Resolver,
  getOnchainProgramInfosBySmartContractV2Resolver,
  getOnchainProgramInfosV2Resolver,
} from '@/graphql/v2/resolvers/onchain-program-info';
import {
  OnchainProgramInfoV2Type,
  PaginatedOnchainProgramInfoV2Type,
} from '@/graphql/v2/types/onchain-program-info';

builder.queryFields((t) => ({
  onchainProgramInfosV2: t.field({
    type: PaginatedOnchainProgramInfoV2Type,
    authScopes: { userV2: true },
    args: { pagination: t.arg({ type: PaginationInput }) },
    resolve: getOnchainProgramInfosV2Resolver,
  }),
  onchainProgramInfoV2: t.field({
    type: OnchainProgramInfoV2Type,
    authScopes: { userV2: true },
    args: { id: t.arg.id({ required: true }) },
    resolve: getOnchainProgramInfoV2Resolver,
  }),
  onchainProgramInfosByProgramV2: t.field({
    type: PaginatedOnchainProgramInfoV2Type,
    authScopes: { userV2: true },
    args: {
      programId: t.arg.int({ required: true }),
      pagination: t.arg({ type: PaginationInput }),
    },
    resolve: getOnchainProgramInfosByProgramV2Resolver,
  }),
  onchainProgramInfosBySmartContractV2: t.field({
    type: PaginatedOnchainProgramInfoV2Type,
    authScopes: { userV2: true },
    args: {
      smartContractId: t.arg.int({ required: true }),
      pagination: t.arg({ type: PaginationInput }),
    },
    resolve: getOnchainProgramInfosBySmartContractV2Resolver,
  }),
}));
