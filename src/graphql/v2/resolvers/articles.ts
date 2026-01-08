import { ArticleService } from '@/graphql/v2/services/article.service';
import type { Context, Root } from '@/types';
import type {
  CreateArticleInput,
  UpdateArticleInput,
  ArticlesQueryInput,
  CreateArticleCommentInput,
  UpdateArticleCommentInput,
  DeleteArticleCommentInput,
  ToggleArticleCommentReactionInput,
} from '@/graphql/v2/inputs/articles';

// articles
export async function getArticleResolver(_root: Root, args: { id: string }, ctx: Context) {
  const service = new ArticleService(ctx.db, ctx.server);
  const ipAddress = ctx.request.ip || ctx.request.socket.remoteAddress || undefined;
  return await service.getArticleById(args.id, ctx.userV2?.id, ipAddress);
}

export async function getArticlesResolver(
  _root: Root,
  args: { input?: typeof ArticlesQueryInput.$inferInput | null },
  ctx: Context,
) {
  const service = new ArticleService(ctx.db, ctx.server);
  const { filter, authorId, search, pagination } = args.input ?? {};

  const filters = {
    filter: filter ?? undefined,
    authorId: authorId ? Number(authorId) : undefined,
    search: search ?? undefined,
  };

  const paginationOptions = pagination
    ? {
        limit: pagination.limit ?? undefined,
        offset: pagination.offset ?? undefined,
      }
    : undefined;

  return await service.getAllArticles(filters, paginationOptions);
}

export async function getRecommendedArticlesResolver(
  _root: Root,
  args: { type: 'article' | 'newsletter' | 'campaign'; limit?: number },
  ctx: Context,
) {
  const service = new ArticleService(ctx.db, ctx.server);
  return await service.getRecommendedArticles(args.type);
}

export async function createArticleResolver(
  _root: Root,
  args: { input: typeof CreateArticleInput.$inferInput },
  ctx: Context,
) {
  if (!ctx.userV2) {
    throw new Error('Unauthorized');
  }

  const isAdmin = ctx.userV2.role === 'admin';
  const service = new ArticleService(ctx.db, ctx.server);

  return await service.createArticle(args.input, ctx.userV2.id, isAdmin);
}

export async function updateArticleResolver(
  _root: Root,
  args: { id: string; input: typeof UpdateArticleInput.$inferInput },
  ctx: Context,
) {
  if (!ctx.userV2) {
    throw new Error('Unauthorized');
  }

  const isAdmin = ctx.userV2.role === 'admin';
  const service = new ArticleService(ctx.db, ctx.server);
  return await service.updateArticle(args.id, args.input, ctx.userV2.id, isAdmin);
}

export async function deleteArticleResolver(_root: Root, args: { id: string }, ctx: Context) {
  if (!ctx.userV2) {
    throw new Error('Unauthorized');
  }
  const service = new ArticleService(ctx.db, ctx.server);
  return await service.deleteArticle(args.id, ctx.userV2.id);
}

export async function toggleArticleLikeResolver(
  _root: Root,
  args: { articleId: string },
  ctx: Context,
) {
  if (!ctx.userV2) {
    throw new Error('Unauthorized');
  }
  const service = new ArticleService(ctx.db, ctx.server);
  return await service.toggleArticleLike(args.articleId, ctx.userV2.id);
}

// comments
export async function getAllCommentsResolver(
  _root: Root,
  args: { articleId: string },
  ctx: Context,
) {
  const service = new ArticleService(ctx.db, ctx.server);
  return await service.getAllComments(args.articleId, ctx.userV2?.id);
}

export async function getChildCommentsResolver(
  _root: Root,
  args: { parentId: string },
  ctx: Context,
) {
  const service = new ArticleService(ctx.db, ctx.server);
  return await service.getChildComments(args.parentId, ctx.userV2?.id);
}

export async function createCommentResolver(
  _root: Root,
  args: { input: typeof CreateArticleCommentInput.$inferInput },
  ctx: Context,
) {
  if (!ctx.userV2) {
    throw new Error('Unauthorized');
  }
  const service = new ArticleService(ctx.db, ctx.server);
  const comment = await service.createComment(
    args.input.articleId,
    ctx.userV2.id,
    args.input.content,
    args.input.parentId ?? undefined,
  );

  return {
    ...comment,
    likeCount: 0,
    dislikeCount: 0,
    isLiked: false,
    isDisliked: false,
    replies: [],
  };
}

export async function updateCommentResolver(
  _root: Root,
  args: { input: typeof UpdateArticleCommentInput.$inferInput },
  ctx: Context,
) {
  if (!ctx.userV2) {
    throw new Error('Unauthorized');
  }
  const service = new ArticleService(ctx.db, ctx.server);
  const comment = await service.updateComment(
    args.input.commentId,
    ctx.userV2.id,
    args.input.content,
  );

  return {
    ...comment,
    likeCount: 0,
    dislikeCount: 0,
    isLiked: false,
    isDisliked: false,
    replies: [],
  };
}

export async function deleteCommentResolver(
  _root: Root,
  args: { input: typeof DeleteArticleCommentInput.$inferInput },
  ctx: Context,
) {
  if (!ctx.userV2) {
    throw new Error('Unauthorized');
  }
  const service = new ArticleService(ctx.db, ctx.server);
  return await service.deleteComment(args.input.commentId, ctx.userV2.id);
}

export async function toggleCommentReactionResolver(
  _root: Root,
  args: { input: typeof ToggleArticleCommentReactionInput.$inferInput },
  ctx: Context,
) {
  if (!ctx.userV2) {
    throw new Error('Unauthorized');
  }
  const service = new ArticleService(ctx.db, ctx.server);
  return await service.toggleCommentReaction(
    args.input.commentId,
    ctx.userV2.id,
    args.input.reaction,
  );
}
