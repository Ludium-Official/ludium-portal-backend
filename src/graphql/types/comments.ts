import type { Comment as DBComment } from '@/db/schemas';
import builder from '@/graphql/builder';
import {
  createCommentResolver,
  getCommentResolver,
  getCommentsResolver,
  updateCommentResolver,
} from '@/graphql/resolvers/comments';
import { getUserResolver } from '@/graphql/resolvers/users';
import { User } from '@/graphql/types/users';
import { PaginationInput } from './common';

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */
export const CommentType = builder.objectRef<DBComment>('Comment').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    content: t.exposeString('content'),
    author: t.field({
      type: User,
      resolve: (parent, _args, ctx) => getUserResolver({}, { id: parent.authorId }, ctx),
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
    },
    resolve: getCommentsResolver,
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
