import builder from '@/graphql/builder';

export const PaginationInput = builder.inputType('PaginationInput', {
  fields: (t) => ({
    limit: t.int({ required: false }),
    offset: t.int({ required: false }),
  }),
});
