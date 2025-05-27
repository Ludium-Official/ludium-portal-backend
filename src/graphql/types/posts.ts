import type { Post as DBPost } from '@/db/schemas';
import builder from '@/graphql/builder';
import {
  createPostResolver,
  getPostKeywordsByPostIdResolver,
  getPostResolver,
  getPostsResolver,
  updatePostResolver,
} from '@/graphql/resolvers/posts';
import { getUserResolver } from '@/graphql/resolvers/users';
import { KeywordType, PaginationInput } from '@/graphql/types/common';
import { User } from '@/graphql/types/users';

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */
export const PostType = builder.objectRef<DBPost>('Post').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    title: t.exposeString('title'),
    content: t.exposeString('content'),
    image: t.exposeString('image'),
    author: t.field({
      type: User,
      resolve: (parent, _args, ctx) => getUserResolver({}, { id: parent.authorId }, ctx),
    }),
    keywords: t.field({
      type: [KeywordType],
      resolve: async (post, _args, ctx) =>
        getPostKeywordsByPostIdResolver({}, { postId: post.id }, ctx),
    }),
    createdAt: t.expose('createdAt', { type: 'Date' }),
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
    summary: t.string({ required: true }),
    keywords: t.idList(),
    image: t.field({ type: 'Upload' }),
  }),
});

export const UpdatePostInput = builder.inputType('UpdatePostInput', {
  fields: (t) => ({
    id: t.id({ required: true }),
    title: t.string(),
    content: t.string(),
    summary: t.string(),
    keywords: t.idList(),
    image: t.field({ type: 'Upload' }),
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
