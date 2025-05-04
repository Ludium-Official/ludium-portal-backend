import type { Post as DBPost } from '@/db/schemas';
import builder from '@/graphql/builder';
import {
  createPostResolver,
  getPostResolver,
  getPostsResolver,
  updatePostResolver,
} from '@/graphql/resolvers/posts';
import { getUserResolver } from '@/graphql/resolvers/users';
import { User } from '@/graphql/types/users';
import { PaginationInput } from './common';

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */
export const PostType = builder.objectRef<DBPost>('Post').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    title: t.exposeString('title'),
    content: t.exposeString('content'),
    author: t.field({
      type: User,
      resolve: (parent, _args, ctx) => getUserResolver({}, { id: parent.authorId }, ctx),
    }),
  }),
});

export const PaginatedPostsType = builder
  .objectRef<{ data: DBPost[]; count: number }>('PaginatedPosts')
  .implement({
    fields: (t) => ({
      data: t.field({ type: [PostType], resolve: (parent) => parent.data }),
      count: t.field({ type: 'Int', resolve: (parent) => parent.count }),
    }),
  });

/* -------------------------------------------------------------------------- */
/*                                   Inputs                                   */
/* -------------------------------------------------------------------------- */
export const CreatePostInput = builder.inputType('CreatePostInput', {
  fields: (t) => ({
    title: t.string({ required: true }),
    content: t.string({ required: true }),
  }),
});

export const UpdatePostInput = builder.inputType('UpdatePostInput', {
  fields: (t) => ({
    id: t.id({ required: true }),
    title: t.string(),
    content: t.string(),
  }),
});

/* -------------------------------------------------------------------------- */
/*                            Queries and mutations                           */
/* -------------------------------------------------------------------------- */
builder.queryFields((t) => ({
  posts: t.field({
    type: PaginatedPostsType,
    args: {
      pagination: t.arg({ type: PaginationInput, required: false }),
    },
    resolve: getPostsResolver,
  }),
  post: t.field({
    type: PostType,
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: getPostResolver,
  }),
}));

builder.mutationFields((t) => ({
  createPost: t.field({
    type: PostType,
    authScopes: { user: true },
    args: {
      input: t.arg({ type: CreatePostInput, required: true }),
    },
    resolve: createPostResolver,
  }),
  updatePost: t.field({
    type: PostType,
    authScopes: { user: true },
    args: {
      input: t.arg({ type: UpdatePostInput, required: true }),
    },
    resolve: updatePostResolver,
  }),
}));
