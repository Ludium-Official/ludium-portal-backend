import builder from '@/graphql/builder';

export const CreateTokenV2Input = builder.inputType('CreateTokenV2Input', {
  fields: (t) => ({
    chainInfoId: t.int({ required: true }),
    tokenName: t.string({ required: true }),
    tokenAddress: t.string({ required: true }),
    decimals: t.int({ required: true }),
  }),
});

export const UpdateTokenV2Input = builder.inputType('UpdateTokenV2Input', {
  fields: (t) => ({
    chainInfoId: t.int(),
    tokenName: t.string(),
    tokenAddress: t.string(),
    decimals: t.int(),
  }),
});
