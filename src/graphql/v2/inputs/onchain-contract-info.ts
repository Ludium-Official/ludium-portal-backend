import builder from '@/graphql/builder';
import { OnchainContractStatusV2Enum } from '@/graphql/v2/types/onchain-contract-info';

export const CreateOnchainContractInfoV2Input = builder.inputType(
  'CreateOnchainContractInfoV2Input',
  {
    fields: (t) => ({
      programId: t.string({ required: true }),
      sponsorId: t.int({ required: true }),
      applicantId: t.int({ required: true }),
      smartContractId: t.int({ required: true }),
      onchainContractId: t.int({ required: true }),
      tx: t.string({ required: true }),
      status: t.field({ type: OnchainContractStatusV2Enum }),
    }),
  },
);

export const UpdateOnchainContractInfoV2Input = builder.inputType(
  'UpdateOnchainContractInfoV2Input',
  {
    fields: (t) => ({
      tx: t.string(),
      status: t.field({ type: OnchainContractStatusV2Enum }),
    }),
  },
);
