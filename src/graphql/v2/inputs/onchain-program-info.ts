import builder from '@/graphql/builder';
import { OnchainProgramStatusV2Enum } from '@/graphql/v2/types';

export const CreateOnchainProgramInfoV2Input = builder.inputType(
  'CreateOnchainProgramInfoV2Input',
  {
    fields: (t) => ({
      programId: t.int({ required: true }),
      networkId: t.int({ required: true }),
      smartContractId: t.int({ required: true }),
      onchainProgramId: t.int({ required: true }),
      tx: t.string({ required: true }),
      status: t.field({ type: OnchainProgramStatusV2Enum }),
    }),
  },
);

export const UpdateOnchainProgramInfoV2Input = builder.inputType(
  'UpdateOnchainProgramInfoV2Input',
  {
    fields: (t) => ({
      status: t.field({ type: OnchainProgramStatusV2Enum }),
      tx: t.string(),
    }),
  },
);

// Helper input for composite create (no programId; networkId is derived from program)
export const OnchainProgramInfoForCreateWithProgramV2Input = builder.inputType(
  'OnchainProgramInfoForCreateWithProgramV2Input',
  {
    fields: (t) => ({
      smartContractId: t.int({ required: true }),
      onchainProgramId: t.int({ required: true }),
      tx: t.string({ required: true }),
      status: t.field({ type: OnchainProgramStatusV2Enum }),
    }),
  },
);
