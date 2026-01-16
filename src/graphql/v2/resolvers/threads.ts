import type {
  CreateThreadCommentInput,
  CreateThreadInput,
  DeleteThreadCommentInput,
  ThreadsQueryInput,
  ToggleThreadCommentReactionInput,
  ToggleThreadReactionInput,
  UpdateThreadCommentInput,
  UpdateThreadInput,
} from '@/graphql/v2/inputs/threads';
import type { Context, Root } from '@/types';
import { ThreadService } from '../services';

// threads
export async function getThreadResolver(_root: Root, args: { id: string }, ctx: Context) {
  const service = new ThreadService(ctx.db, ctx.server);
  return await service.getThreadById(args.id, ctx.userV2?.id);
}

export async function getThreadsResolver(
  _root: Root,
  args: { input?: typeof ThreadsQueryInput.$inferInput | null },
  ctx: Context,
) {
  const service = new ThreadService(ctx.db, ctx.server);
  const { pagination } = args.input ?? {};

  const paginationOptions = pagination
    ? {
        limit: pagination.limit ?? undefined,
        offset: pagination.offset ?? undefined,
      }
    : undefined;

  return await service.getAllThreads(paginationOptions, ctx.userV2?.id);
}

export async function getMyThreadsResolver(
  _root: Root,
  args: { input?: typeof ThreadsQueryInput.$inferInput | null },
  ctx: Context,
) {
  if (!ctx.userV2) {
    throw new Error('Unauthorized');
  }

  const service = new ThreadService(ctx.db, ctx.server);
  const { pagination } = args.input ?? {};

  const paginationOptions = pagination
    ? {
        limit: pagination.limit ?? undefined,
        offset: pagination.offset ?? undefined,
      }
    : undefined;

  return await service.getMyThreads(ctx.userV2.id, paginationOptions);
}

export async function getTopViewedArticlesResolver(
  _root: Root,
  args: { limit?: number | null },
  ctx: Context,
) {
  const service = new ThreadService(ctx.db, ctx.server);
  return await service.getTopViewedArticles(args.limit ?? 6);
}

export async function createThreadResolver(
  _root: Root,
  args: { input: typeof CreateThreadInput.$inferInput },
  ctx: Context,
) {
  if (!ctx.userV2) {
    throw new Error('Unauthorized');
  }

  const service = new ThreadService(ctx.db, ctx.server);
  return await service.createThread(args.input, ctx.userV2.id);
}

export async function updateThreadResolver(
  _root: Root,
  args: { id: string; input: typeof UpdateThreadInput.$inferInput },
  ctx: Context,
) {
  if (!ctx.userV2) {
    throw new Error('Unauthorized');
  }

  const service = new ThreadService(ctx.db, ctx.server);
  return await service.updateThread(args.id, args.input, ctx.userV2.id);
}

export async function deleteThreadResolver(_root: Root, args: { id: string }, ctx: Context) {
  if (!ctx.userV2) {
    throw new Error('Unauthorized');
  }
  const service = new ThreadService(ctx.db, ctx.server);
  return await service.deleteThread(args.id, ctx.userV2.id);
}

export async function toggleThreadReactionResolver(
  _root: Root,
  args: { input: typeof ToggleThreadReactionInput.$inferInput },
  ctx: Context,
) {
  if (!ctx.userV2) {
    throw new Error('Unauthorized');
  }
  const service = new ThreadService(ctx.db, ctx.server);
  return await service.toggleThreadReaction(
    args.input.threadId,
    ctx.userV2.id,
    args.input.reaction,
  );
}

// comments
export async function getAllThreadCommentsResolver(
  _root: Root,
  args: { threadId: string },
  ctx: Context,
) {
  const service = new ThreadService(ctx.db, ctx.server);
  return await service.getAllComments(args.threadId, ctx.userV2?.id);
}

export async function getThreadChildCommentsResolver(
  _root: Root,
  args: { parentId: string },
  ctx: Context,
) {
  const service = new ThreadService(ctx.db, ctx.server);
  return await service.getChildComments(args.parentId, ctx.userV2?.id);
}

export async function createThreadCommentResolver(
  _root: Root,
  args: { input: typeof CreateThreadCommentInput.$inferInput },
  ctx: Context,
) {
  if (!ctx.userV2) {
    throw new Error('Unauthorized');
  }
  const service = new ThreadService(ctx.db, ctx.server);
  const comment = await service.createComment(
    args.input.threadId,
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

export async function updateThreadCommentResolver(
  _root: Root,
  args: { input: typeof UpdateThreadCommentInput.$inferInput },
  ctx: Context,
) {
  if (!ctx.userV2) {
    throw new Error('Unauthorized');
  }
  const service = new ThreadService(ctx.db, ctx.server);
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

export async function deleteThreadCommentResolver(
  _root: Root,
  args: { input: typeof DeleteThreadCommentInput.$inferInput },
  ctx: Context,
) {
  if (!ctx.userV2) {
    throw new Error('Unauthorized');
  }
  const service = new ThreadService(ctx.db, ctx.server);
  return await service.deleteComment(args.input.commentId, ctx.userV2.id);
}

export async function toggleThreadCommentReactionResolver(
  _root: Root,
  args: { input: typeof ToggleThreadCommentReactionInput.$inferInput },
  ctx: Context,
) {
  if (!ctx.userV2) {
    throw new Error('Unauthorized');
  }
  const service = new ThreadService(ctx.db, ctx.server);
  return await service.toggleCommentReaction(
    args.input.commentId,
    ctx.userV2.id,
    args.input.reaction,
  );
}
