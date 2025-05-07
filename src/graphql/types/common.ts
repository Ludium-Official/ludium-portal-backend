import type { Keyword as DBKeyword } from '@/db/schemas';
import builder from '@/graphql/builder';

export const SortEnum = builder.enumType('SortEnum', {
  values: ['asc', 'desc'],
});

export const FilterInput = builder.inputType('FilterInput', {
  fields: (t) => ({
    field: t.string({ required: true }),
    value: t.string({ required: true }),
  }),
});

export const PaginationInput = builder.inputType('PaginationInput', {
  fields: (t) => ({
    limit: t.int({ required: false }),
    offset: t.int({ required: false }),
    sort: t.field({ type: SortEnum, required: false }),
    filter: t.field({ type: [FilterInput], required: false }),
  }),
});

export const KeywordType = builder.objectRef<DBKeyword>('Keyword').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    name: t.exposeString('name'),
  }),
});
