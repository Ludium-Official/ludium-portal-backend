import builder from '@/graphql/builder';

export const CreateNetworkV2Input = builder.inputType('CreateNetworkV2Input', {
  fields: (t) => ({
    chainId: t.int({ required: true }),
    chainName: t.string({ required: true }),
    mainnet: t.boolean({ required: true }),
    exploreUrl: t.string(),
  }),
});

export const UpdateNetworkV2Input = builder.inputType('UpdateNetworkV2Input', {
  fields: (t) => ({
    chainId: t.int(),
    chainName: t.string(),
    mainnet: t.boolean(),
    exploreUrl: t.string(),
  }),
});
