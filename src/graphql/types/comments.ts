import type { Comment as DBComment } from '@/db/schemas';
import builder from '@/graphql/builder';
import {
  createCommentResolver,
  getCommentRepliesResolver,
  getCommentResolver,
  getCommentsByCommentableResolver,
  getCommentsResolver,
  updateCommentResolver,
} from '@/graphql/resolvers/comments';
import { getUserResolver } from '@/graphql/resolvers/users';
import { PaginationInput } from '@/graphql/types/common';
import { User } from '@/graphql/types/users';

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

export const CommentType = builder.objectRef<DBComment>('Comment');

CommentType.implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    content: t.exposeString('content'),
    commentableType: t.exposeString('commentableType'),
    commentableId: t.exposeString('commentableId'),
    author: t.field({
      type: User,
      resolve: (parent, _args, ctx) => getUserResolver({}, { id: parent.authorId }, ctx),
    }),
    parent: t.field({
      type: CommentType,
      resolve: (parent, _args, ctx) =>
        parent.parentId === null ? null : getCommentResolver({}, { id: parent.parentId }, ctx),
    }),
    createdAt: t.field({
      type: 'DateTime',
      resolve: (parent) => parent.createdAt,
    }),
    replies: t.field({
      type: [CommentType],
      resolve: (parent, _args, ctx) =>
        parent.parentId === null ? getCommentRepliesResolver({}, { parentId: parent.id }, ctx) : [],
    }),
  }),
});

export const PaginatedCommentsType = builder
  .objectRef<{ data: DBComment[]; count: number }>('PaginatedComments')
  .implement({
    fields: (t) => ({
      data: t.field({ type: [CommentType], resolve: (parent) => parent.data }),
      count: t.field({ type: 'Int', resolve: (parent) => parent.count }),
    }),
  });

/* -------------------------------------------------------------------------- */
/*                                   Inputs                                   */
/* -------------------------------------------------------------------------- */

export const CommentableTypeEnum = builder.enumType('CommentableTypeEnum', {
  values: ['post', 'program', 'milestone', 'application'] as const,
});

export const CreateCommentInput = builder.inputType('CreateCommentInput', {
  fields: (t) => ({
    commentableType: t.field({ type: CommentableTypeEnum, required: true }),
    commentableId: t.id({ required: true }),
    content: t.string({ required: true }),
    parentId: t.id({ required: false }),
  }),
});

export const UpdateCommentInput = builder.inputType('UpdateCommentInput', {
  fields: (t) => ({
    id: t.id({ required: true }),
    content: t.string(),
  }),
});

/* -------------------------------------------------------------------------- */
/*                            Queries and mutations                           */
/* -------------------------------------------------------------------------- */
builder.queryFields((t) => ({
  comments: t.field({
    type: PaginatedCommentsType,
    args: {
      pagination: t.arg({ type: PaginationInput, required: false }),
      topLevelOnly: t.arg({ type: 'Boolean', defaultValue: false }),
    },
    resolve: getCommentsResolver,
  }),
  commentsByCommentable: t.field({
    type: [CommentType],
    args: {
      commentableType: t.arg({ type: CommentableTypeEnum, required: true }),
      commentableId: t.arg.id({ required: true }),
    },
    resolve: getCommentsByCommentableResolver,
  }),
  comment: t.field({
    type: CommentType,
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: getCommentResolver,
  }),
}));

builder.mutationFields((t) => ({
  createComment: t.field({
    type: CommentType,
    authScopes: { user: true },
    args: {
      input: t.arg({ type: CreateCommentInput, required: true }),
    },
    resolve: createCommentResolver,
  }),
  updateComment: t.field({
    type: CommentType,
    authScopes: { user: true },
    args: {
      input: t.arg({ type: UpdateCommentInput, required: true }),
    },
    resolve: updateCommentResolver,
  }),
}));
