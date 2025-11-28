import builder from '@/graphql/builder';
import { PaginationInput } from '@/graphql/types/common';
import {
  getOnchainContractInfoV2Resolver,
  getOnchainContractInfosByApplicantV2Resolver,
  getOnchainContractInfosByProgramV2Resolver,
  getOnchainContractInfosV2Resolver,
} from '@/graphql/v2/resolvers/onchain-contract-info';
import {
  OnchainContractInfoV2Type,
  PaginatedOnchainContractInfoV2Type,
} from '@/graphql/v2/types/onchain-contract-info';

builder.queryFields((t) => ({
  onchainContractInfosV2: t.field({
    type: PaginatedOnchainContractInfoV2Type,
    authScopes: { userV2: true },
    args: { pagination: t.arg({ type: PaginationInput, required: false }) },
    resolve: getOnchainContractInfosV2Resolver,
  }),
  onchainContractInfoV2: t.field({
    type: OnchainContractInfoV2Type,
    authScopes: { userV2: true },
    args: { id: t.arg.id({ required: true }) },
    resolve: getOnchainContractInfoV2Resolver,
  }),
  onchainContractInfosByProgramV2: t.field({
    type: PaginatedOnchainContractInfoV2Type,
    authScopes: { userV2: true },
    args: {
      programId: t.arg.int({ required: true }),
      pagination: t.arg({ type: PaginationInput, required: false }),
    },
    resolve: getOnchainContractInfosByProgramV2Resolver,
  }),
  onchainContractInfosByApplicantV2: t.field({
    type: PaginatedOnchainContractInfoV2Type,
    authScopes: { userV2: true },
    args: {
      applicantId: t.arg.int({ required: true }),
      pagination: t.arg({ type: PaginationInput, required: false }),
    },
    resolve: getOnchainContractInfosByApplicantV2Resolver,
  }),
}));
