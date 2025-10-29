import builder from '@/graphql/builder';
import { OnchainContractStatusV2Enum } from '@/graphql/v2/types/onchain-contract-info';

export const CreateOnchainContractInfoV2Input = builder.inputType(
  'CreateOnchainContractInfoV2Input',
  {
    fields: (t) => ({
      programId: t.int({ required: true }),
      applicantId: t.int({ required: true }),
      contentHash: t.string({ required: true }),
      tx: t.string({ required: true }),
      status: t.field({ type: OnchainContractStatusV2Enum }),
    }),
  },
);

export const UpdateOnchainContractInfoV2Input = builder.inputType(
  'UpdateOnchainContractInfoV2Input',
  {
    fields: (t) => ({
      contentHash: t.string(),
      tx: t.string(),
      status: t.field({ type: OnchainContractStatusV2Enum }),
    }),
  },
);
