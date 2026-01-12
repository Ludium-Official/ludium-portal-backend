import builder from '@/graphql/builder';
import {
  getAllCommentsResolver,
  getArticleResolver,
  getArticlesResolver,
  getChildCommentsResolver,
  getPinnedArticlesResolver,
  getRecommendedArticlesResolver,
} from '@/graphql/v2/resolvers/articles';
import { ArticlesQueryInput } from '../inputs/articles';
import {
  ArticleCommentType,
  ArticleType,
  ArticleTypeEnum,
  PaginatedArticleType,
} from '../types/articles';

builder.queryFields((t) => ({
  // article
  article: t.field({
    type: ArticleType,
    args: {
      id: t.arg.id({
        required: true,
        description: 'Article ID',
      }),
    },
    resolve: getArticleResolver,
    description: 'Get a single article by ID',
  }),
  articles: t.field({
    type: PaginatedArticleType,
    args: {
      input: t.arg({
        type: ArticlesQueryInput,
        required: false,
        description: 'Query filters and pagination',
      }),
    },
    resolve: getArticlesResolver,
    description: 'Get a paginated list of articles',
  }),
  recommendedArticles: t.field({
    type: [ArticleType],
    args: {
      type: t.arg({
        type: ArticleTypeEnum,
        required: true,
        description: 'Article type (article, newsletter, campaign)',
      }),
    },
    resolve: getRecommendedArticlesResolver,
    description: 'Get recommended articles by type',
  }),
  pinnedArticles: t.field({
    type: [ArticleType],
    args: {
      type: t.arg({
        type: ArticleTypeEnum,
        required: true,
        description: 'Article type (article, newsletter, campaign)',
      }),
    },
    resolve: getPinnedArticlesResolver,
    description: 'Get all pinned articles',
  }),
  // comment
  articleComments: t.field({
    type: [ArticleCommentType],
    args: {
      articleId: t.arg.id({
        required: true,
        description: 'Article ID',
      }),
    },
    resolve: getAllCommentsResolver,
    description: 'Get all comments for an article (hierarchical structure)',
  }),
  articleChildComments: t.field({
    type: [ArticleCommentType],
    args: {
      parentId: t.arg.id({
        required: true,
        description: 'Parent comment ID',
      }),
    },
    resolve: getChildCommentsResolver,
    description: 'Get child comments for a parent comment',
  }),
}));
