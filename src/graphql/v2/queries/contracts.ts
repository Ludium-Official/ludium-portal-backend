import builder from '@/graphql/builder';
import { PaginationInput } from '@/graphql/types/common';
import {
  getContractV2Resolver,
  getContractsByApplicantV2Resolver,
  getContractsByApplicationV2Resolver,
  getContractsByProgramV2Resolver,
  getContractsBySponsorV2Resolver,
  getContractsV2Resolver,
} from '@/graphql/v2/resolvers/contracts';
import { ContractV2Type, PaginatedContractV2Type } from '@/graphql/v2/types/contracts';

builder.queryFields((t) => ({
  contractsV2: t.field({
    type: PaginatedContractV2Type,
    authScopes: { userV2: true },
    args: { pagination: t.arg({ type: PaginationInput, required: false }) },
    resolve: getContractsV2Resolver,
  }),
  contractV2: t.field({
    type: ContractV2Type,
    authScopes: { userV2: true },
    args: { id: t.arg.id({ required: true }) },
    resolve: getContractV2Resolver,
  }),
  contractsByProgramV2: t.field({
    type: PaginatedContractV2Type,
    authScopes: { userV2: true },
    args: {
      programId: t.arg.string({ required: true }),
      pagination: t.arg({ type: PaginationInput, required: false }),
    },
    resolve: getContractsByProgramV2Resolver,
  }),
  contractsByApplicantV2: t.field({
    type: PaginatedContractV2Type,
    authScopes: { userV2: true },
    args: {
      applicantId: t.arg.int({ required: true }),
      pagination: t.arg({ type: PaginationInput, required: false }),
    },
    resolve: getContractsByApplicantV2Resolver,
  }),
  contractsBySponsorV2: t.field({
    type: PaginatedContractV2Type,
    authScopes: { userV2: true },
    args: {
      sponsorId: t.arg.int({ required: true }),
      pagination: t.arg({ type: PaginationInput, required: false }),
    },
    resolve: getContractsBySponsorV2Resolver,
  }),
  contractsByApplicationV2: t.field({
    type: PaginatedContractV2Type,
    authScopes: { userV2: true },
    args: {
      applicationId: t.arg.int({ required: true }),
      pagination: t.arg({ type: PaginationInput, required: false }),
    },
    resolve: getContractsByApplicationV2Resolver,
  }),
}));
