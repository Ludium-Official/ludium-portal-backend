import {
  type OnchainContractInfo as DBOnchain,
  onchainContractStatusValues,
} from '@/db/schemas/v2/onchain-contract-info';
import builder from '@/graphql/builder';

export const OnchainContractStatusV2Enum = builder.enumType('OnchainContractStatusV2', {
  values: onchainContractStatusValues,
});

export const OnchainContractInfoV2Ref = builder.objectRef<DBOnchain>('OnchainContractInfoV2');

export const OnchainContractInfoV2Type = OnchainContractInfoV2Ref.implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    programId: t.exposeInt('programId'),
    applicantId: t.exposeInt('applicantId'),
    contentHash: t.exposeString('contentHash'),
    createdAt: t.field({ type: 'DateTime', resolve: (p) => p.createdAt }),
    status: t.field({ type: OnchainContractStatusV2Enum, resolve: (p) => p.status }),
    tx: t.exposeString('tx'),
  }),
});

export const PaginatedOnchainContractInfoV2Type = builder
  .objectRef<{ data: DBOnchain[]; count: number }>('PaginatedOnchainContractInfoV2')
  .implement({
    fields: (t) => ({
      data: t.field({ type: [OnchainContractInfoV2Type], resolve: (p) => p.data }),
      count: t.field({ type: 'Int', resolve: (p) => p.count }),
    }),
  });
