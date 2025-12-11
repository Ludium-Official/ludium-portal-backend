import builder from '@/graphql/builder';

export const CreateContractV2Input = builder.inputType('CreateContractV2Input', {
  fields: (t) => ({
    programId: t.string({ required: true }),
    applicationId: t.int({ required: true }),
    sponsorId: t.int({ required: true }),
    applicantId: t.int({ required: true }),
    smartContractId: t.int({ required: true }),
    onchainContractId: t.int({
      description:
        'On-chain contract ID (optional on creation, will be set after contract execution)',
    }),
    contract_snapshot_cotents: t.field({ type: 'JSON' }),
    contract_snapshot_hash: t.string(),
    builder_signature: t.string(),
  }),
});

export const UpdateContractV2Input = builder.inputType('UpdateContractV2Input', {
  fields: (t) => ({
    onchainContractId: t.int({
      description: 'On-chain contract ID (set after contract execution and payment)',
    }),
    contract_snapshot_cotents: t.field({ type: 'JSON' }),
    contract_snapshot_hash: t.string(),
    builder_signature: t.string(),
  }),
});
