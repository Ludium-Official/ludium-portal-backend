import type { Comment as DBComment } from '@/db/schemas';
import builder from '@/graphql/builder';
import {
  createCommentResolver,
  getCommentRepliesResolver,
  getCommentResolver,
  getCommentsByPostResolver,
  getCommentsResolver,
  updateCommentResolver,
} from '@/graphql/resolvers/comments';
import { getPostResolver } from '@/graphql/resolvers/posts';
import { getUserResolver } from '@/graphql/resolvers/users';
import { PaginationInput } from '@/graphql/types/common';
import { PostType } from '@/graphql/types/posts';
import { User } from '@/graphql/types/users';

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */
export const CommentType = builder.objectRef<DBComment>('Comment');

CommentType.implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    content: t.exposeString('content'),
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
      type: 'Date',
      resolve: (parent) => parent.createdAt,
    }),
    replies: t.field({
      type: [CommentType],
      resolve: (parent, _args, ctx) =>
        parent.parentId === null ? getCommentRepliesResolver({}, { parentId: parent.id }, ctx) : [],
    }),
    post: t.field({
      type: PostType,
      resolve: (parent, _args, ctx) => getPostResolver({}, { id: parent.postId }, ctx),
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
export const CreateCommentInput = builder.inputType('CreateCommentInput', {
  fields: (t) => ({
    postId: t.id({ required: true }),
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
  commentsByPost: t.field({
    type: [CommentType],
    args: {
      postId: t.arg.id({ required: true }),
    },
    resolve: getCommentsByPostResolver,
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
