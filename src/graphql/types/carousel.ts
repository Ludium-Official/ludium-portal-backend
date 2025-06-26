import { type CarouselItem as DbCarouselItem, carouselItemTypes } from '@/db/schemas';
import type { Post } from '@/db/schemas/posts';
import type { Program } from '@/db/schemas/programs';
import builder from '@/graphql/builder';
import {
  createCarouselItemResolver,
  deleteCarouselItemResolver,
  getCarouselItemsResolver,
  reorderCarouselItemsResolver,
  updateCarouselItemResolver,
} from '@/graphql/resolvers/carousel';
import { PostType } from './posts';
import { ProgramType } from './programs';

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */
export const CarouselItemTypeEnum = builder.enumType('CarouselItemType', {
  values: carouselItemTypes,
});

export const CarouselItemType = builder.objectRef<DbCarouselItem>('CarouselItem').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    itemType: t.field({
      type: CarouselItemTypeEnum,
      resolve: (item) => item.itemType,
    }),
    itemId: t.exposeString('itemId'),
    displayOrder: t.exposeInt('displayOrder'),
    isActive: t.exposeBoolean('isActive'),
  }),
});

// Union type for carousel item data
export const CarouselItemDataUnion = builder.unionType('CarouselItemData', {
  types: [ProgramType, PostType],
  resolveType: (value) => {
    if ('price' in value && 'deadline' in value) {
      return ProgramType;
    }
    if ('title' in value && 'content' in value) {
      return PostType;
    }
    throw new Error('Unknown carousel item data type');
  },
});

// Enriched carousel item type that includes the actual data
export const EnrichedCarouselItemType = builder
  .objectRef<{
    id: string;
    itemType: 'program' | 'post';
    itemId: string;
    displayOrder: number;
    isActive: boolean;
    data: Program | Post;
  }>('EnrichedCarouselItem')
  .implement({
    fields: (t) => ({
      id: t.exposeID('id'),
      itemType: t.field({
        type: CarouselItemTypeEnum,
        resolve: (item) => item.itemType,
      }),
      itemId: t.exposeString('itemId'),
      displayOrder: t.exposeInt('displayOrder'),
      isActive: t.exposeBoolean('isActive'),
      data: t.field({
        type: CarouselItemDataUnion,
        resolve: (item) => item.data,
      }),
    }),
  });

/* -------------------------------------------------------------------------- */
/*                                   Inputs                                   */
/* -------------------------------------------------------------------------- */
export const CreateCarouselItemInput = builder.inputType('CreateCarouselItemInput', {
  fields: (t) => ({
    itemType: t.field({ type: CarouselItemTypeEnum, required: true }),
    itemId: t.string({ required: true }),
    displayOrder: t.int({ required: true }),
    isActive: t.boolean({ required: true }),
  }),
});

export const UpdateCarouselItemInput = builder.inputType('UpdateCarouselItemInput', {
  fields: (t) => ({
    id: t.string({ required: true }),
    itemType: t.field({ type: CarouselItemTypeEnum }),
    itemId: t.string(),
    displayOrder: t.int(),
    isActive: t.boolean(),
  }),
});

export const ReorderCarouselItemInput = builder.inputType('ReorderCarouselItemInput', {
  fields: (t) => ({
    id: t.string({ required: true }),
    displayOrder: t.int({ required: true }),
  }),
});

/* -------------------------------------------------------------------------- */
/*                            Queries and mutations                           */
/* -------------------------------------------------------------------------- */
builder.queryFields((t) => ({
  carouselItems: t.field({
    type: [EnrichedCarouselItemType],
    resolve: getCarouselItemsResolver,
  }),
}));

builder.mutationFields((t) => ({
  createCarouselItem: t.field({
    type: CarouselItemType,
    authScopes: { admin: true },
    args: { input: t.arg({ type: CreateCarouselItemInput, required: true }) },
    resolve: createCarouselItemResolver,
  }),
  updateCarouselItem: t.field({
    type: CarouselItemType,
    authScopes: { admin: true },
    args: { input: t.arg({ type: UpdateCarouselItemInput, required: true }) },
    resolve: updateCarouselItemResolver,
  }),
  deleteCarouselItem: t.field({
    type: CarouselItemType,
    authScopes: { admin: true },
    args: { id: t.arg.id({ required: true }) },
    resolve: deleteCarouselItemResolver,
  }),
  reorderCarouselItems: t.field({
    type: [CarouselItemType],
    authScopes: { admin: true },
    args: { items: t.arg({ type: [ReorderCarouselItemInput], required: true }) },
    resolve: reorderCarouselItemsResolver,
  }),
}));
