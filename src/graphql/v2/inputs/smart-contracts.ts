import builder from '@/graphql/builder';

export const CreateSmartContractV2Input = builder.inputType('CreateSmartContractV2Input', {
  fields: (t) => ({
    chainInfoId: t.int({ required: true }),
    address: t.string({ required: true }),
    name: t.string({ required: true }),
  }),
});

export const UpdateSmartContractV2Input = builder.inputType('UpdateSmartContractV2Input', {
  fields: (t) => ({
    address: t.string(),
    name: t.string(),
  }),
});
