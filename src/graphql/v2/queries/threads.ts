import builder from '@/graphql/builder';
import { ThreadsQueryInput } from '../inputs/threads';
import {
  getAllThreadCommentsResolver,
  getMyThreadsResolver,
  getThreadChildCommentsResolver,
  getThreadResolver,
  getThreadsResolver,
  getTopViewedArticlesResolver,
} from '../resolvers/threads';
import { ArticleType } from '../types/articles';
import { PaginatedThreadType, ThreadCommentType, ThreadType } from '../types/threads';

builder.queryFields((t) => ({
  // thread
  thread: t.field({
    type: ThreadType,
    args: {
      id: t.arg.id({
        required: true,
        description: 'Thread ID',
      }),
    },
    resolve: getThreadResolver,
    description: 'Get a single thread by ID',
  }),
  threads: t.field({
    type: PaginatedThreadType,
    args: {
      input: t.arg({
        type: ThreadsQueryInput,
        required: false,
        description: 'Query filters and pagination',
      }),
    },
    resolve: getThreadsResolver,
    description: 'Get a paginated list of threads',
  }),
  myThreads: t.field({
    type: PaginatedThreadType,
    authScopes: { userV2: true },
    args: {
      input: t.arg({
        type: ThreadsQueryInput,
        required: false,
        description: 'Query filters and pagination',
      }),
    },
    resolve: getMyThreadsResolver,
    description: 'Get threads created by the authenticated user',
  }),
  topViewedArticles: t.field({
    type: [ArticleType],
    args: {
      limit: t.arg.int({
        description: 'Number of articles to return (default: 5)',
      }),
    },
    resolve: getTopViewedArticlesResolver,
    description: 'Get top 5 articles by view count in the last 30 days',
  }),
  // comment
  threadComments: t.field({
    type: [ThreadCommentType],
    args: {
      threadId: t.arg.id({
        required: true,
        description: 'Thread ID',
      }),
    },
    resolve: getAllThreadCommentsResolver,
    description: 'Get all comments for a thread (hierarchical structure)',
  }),
  threadChildComments: t.field({
    type: [ThreadCommentType],
    args: {
      parentId: t.arg.id({
        required: true,
        description: 'Parent comment ID',
      }),
    },
    resolve: getThreadChildCommentsResolver,
    description: 'Get child comments for a parent comment',
  }),
}));
