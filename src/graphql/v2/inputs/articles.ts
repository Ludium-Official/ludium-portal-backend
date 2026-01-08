import builder from '@/graphql/builder';
import { PaginationInput } from '@/graphql/types/common';
import { ArticleStatusEnum, ArticleTypeEnum } from '../types/articles';

export const ArticleFilterEnum = builder.enumType('ArticleFilter', {
  values: ['LATEST', 'TRENDING', 'NEWSLETTER', 'CAMPAIGN'] as const,
  description:
    'Filter type for articles: LATEST (latest articles), TRENDING (trending articles in last week), NEWSLETTER (newsletter type), CAMPAIGN (campaign type)',
});

export const CreateArticleInput = builder.inputType('CreateArticleInput', {
  fields: (t) => ({
    title: t.string({
      required: true,
      description: 'Article title (max 130 characters)',
    }),
    description: t.string({
      required: true,
      description: 'Article description in markdown format',
    }),
    coverImage: t.field({
      type: 'Upload',
      required: true,
      description: 'Cover image file',
    }),
    category: t.field({
      type: ArticleTypeEnum,
      description: 'Article category (default: article)',
    }),
    isPin: t.boolean({
      description: 'Whether to pin this article (default: false, admin only)',
    }),
    unpinArticleId: t.id({
      description: 'Article ID to unpin when pinning would exceed 2 pinned articles (admin only)',
    }),
  }),
});

export const UpdateArticleInput = builder.inputType('UpdateArticleInput', {
  fields: (t) => ({
    title: t.string({
      description: 'Article title (max 130 characters)',
    }),
    description: t.string({
      description: 'Article description in markdown format',
    }),
    coverImage: t.field({
      type: 'Upload',
      description: 'Cover image file',
    }),
    status: t.field({
      type: ArticleStatusEnum,
      description: 'Article status (published or pending)',
    }),
    category: t.field({
      type: ArticleTypeEnum,
      description: 'Article category (admin only)',
    }),
    isPin: t.boolean({
      description: 'Whether to pin this article (admin only)',
    }),
    unpinArticleId: t.id({
      description: 'Article ID to unpin when pinning would exceed 2 pinned articles (admin only)',
    }),
  }),
});

export const ArticlesQueryInput = builder.inputType('ArticlesQueryInput', {
  fields: (t) => ({
    filter: t.field({
      type: ArticleFilterEnum,
      required: false,
      description: 'Filter type: LATEST, TRENDING, NEWSLETTER, or CAMPAIGN',
    }),
    status: t.field({
      type: ArticleStatusEnum,
      description: 'Filter by status',
    }),
    type: t.field({
      type: ArticleTypeEnum,
      description: 'Filter by type (category)',
    }),
    authorId: t.id({
      description: 'Filter by author ID',
    }),
    search: t.string({
      description: 'Search by title',
    }),
    pagination: t.field({
      type: PaginationInput,
      description: 'Pagination options',
    }),
  }),
});

export const CreateArticleCommentInput = builder.inputType('CreateArticleCommentInput', {
  fields: (t) => ({
    articleId: t.id({
      required: true,
      description: 'Article ID',
    }),
    content: t.string({
      required: true,
      description: 'Comment content',
    }),
    parentId: t.id({
      description: 'Parent comment ID for nested comments',
    }),
  }),
});

export const UpdateArticleCommentInput = builder.inputType('UpdateArticleCommentInput', {
  fields: (t) => ({
    commentId: t.id({
      required: true,
      description: 'Comment ID to update',
    }),
    content: t.string({
      required: true,
      description: 'Updated comment content',
    }),
  }),
});

export const DeleteArticleCommentInput = builder.inputType('DeleteArticleCommentInput', {
  fields: (t) => ({
    commentId: t.id({
      required: true,
      description: 'Comment ID to delete',
    }),
  }),
});

export const ArticleCommentReactionEnum = builder.enumType('ArticleCommentReaction', {
  values: ['like', 'dislike'] as const,
});

export const ToggleArticleCommentReactionInput = builder.inputType(
  'ToggleArticleCommentReactionInput',
  {
    fields: (t) => ({
      commentId: t.id({
        required: true,
        description: 'Comment ID',
      }),
      reaction: t.field({
        type: ArticleCommentReactionEnum,
        required: true,
        description: 'Reaction type (like or dislike)',
      }),
    }),
  },
);
