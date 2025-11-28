import type { Contracts as DBContract } from '@/db/schemas/v2/contracts';
import builder from '@/graphql/builder';

export const ContractV2Ref = builder.objectRef<DBContract>('ContractV2');

export const ContractV2Type = ContractV2Ref.implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    programId: t.exposeInt('programId'),
    applicationId: t.exposeInt('applicationId'),
    sponsorId: t.exposeInt('sponsorId'),
    applicantId: t.exposeInt('applicantId'),
    smartContractId: t.exposeInt('smartContractId'),
    onchainContractId: t.exposeInt('onchainContractId'),
    contract_snapshot_cotents: t.field({
      type: 'JSON',
      nullable: true,
      resolve: (p) => p.contract_snapshot_cotents as JSON,
    }),
    contract_snapshot_hash: t.exposeString('contract_snapshot_hash', { nullable: true }),
    builder_signature: t.exposeString('builder_signature', { nullable: true }),
    createdAt: t.field({ type: 'DateTime', resolve: (p) => p.createdAt }),
  }),
});

export const PaginatedContractV2Type = builder
  .objectRef<{ data: DBContract[]; count: number }>('PaginatedContractV2')
  .implement({
    fields: (t) => ({
      data: t.field({ type: [ContractV2Type], resolve: (p) => p.data }),
      count: t.field({ type: 'Int', resolve: (p) => p.count }),
    }),
  });
