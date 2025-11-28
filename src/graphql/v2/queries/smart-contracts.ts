import builder from '@/graphql/builder';
import { PaginationInput } from '@/graphql/types/common';
import {
  getSmartContractV2Resolver,
  getSmartContractsV2Resolver,
} from '@/graphql/v2/resolvers/smart-contracts';
import {
  PaginatedSmartContractsV2Type,
  SmartContractV2Type,
} from '@/graphql/v2/types/smart-contracts';

builder.queryFields((t) => ({
  smartContractsV2: t.field({
    type: PaginatedSmartContractsV2Type,
    args: {
      pagination: t.arg({ type: PaginationInput }),
      chainInfoId: t.arg.int(),
    },
    resolve: getSmartContractsV2Resolver,
  }),
  smartContractV2: t.field({
    type: SmartContractV2Type,
    args: { id: t.arg.id({ required: true }) },
    resolve: getSmartContractV2Resolver,
  }),
}));
