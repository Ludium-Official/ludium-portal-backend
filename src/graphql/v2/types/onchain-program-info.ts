import {
  type OnchainProgramInfo as DBOnchainProgram,
  onchainProgramStatusValues,
} from '@/db/schemas/v2/onchain-program-info';
import builder from '@/graphql/builder';

export const OnchainProgramStatusV2Enum = builder.enumType('OnchainProgramStatusV2', {
  values: onchainProgramStatusValues,
});

export const OnchainProgramInfoV2Ref = builder.objectRef<DBOnchainProgram>('OnchainProgramInfoV2');

export const OnchainProgramInfoV2Type = OnchainProgramInfoV2Ref.implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    programId: t.exposeInt('programId'),
    networkId: t.exposeInt('networkId'),
    smartContractId: t.exposeInt('smartContractId'),
    onchainProgramId: t.exposeInt('onchainProgramId'),
    status: t.field({ type: OnchainProgramStatusV2Enum, resolve: (p) => p.status }),
    createdAt: t.field({ type: 'DateTime', resolve: (p) => p.createdAt }),
    tx: t.exposeString('tx'),
  }),
});

export const PaginatedOnchainProgramInfoV2Type = builder
  .objectRef<{ data: DBOnchainProgram[]; count: number }>('PaginatedOnchainProgramInfoV2')
  .implement({
    fields: (t) => ({
      data: t.field({ type: [OnchainProgramInfoV2Type], resolve: (p) => p.data }),
      count: t.exposeInt('count'),
    }),
  });
