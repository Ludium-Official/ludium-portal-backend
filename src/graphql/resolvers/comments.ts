import { type Comment, commentsTable } from '@/db/schemas';
import type { CreateCommentInput, UpdateCommentInput } from '@/graphql/types/comments';
import type { PaginationInput } from '@/graphql/types/common';
import type { Context, Root } from '@/types';
import { filterEmptyValues, requireUser, validAndNotEmptyArray } from '@/utils';
import { and, asc, count, desc, eq, isNull } from 'drizzle-orm';

export async function getCommentsResolver(
  _root: Root,
  args: {
    pagination?: typeof PaginationInput.$inferInput | null;
    topLevelOnly?: boolean | null;
  },
  ctx: Context,
) {
  const limit = args.pagination?.limit || 10;
  const offset = args.pagination?.offset || 0;
  const sort = args.pagination?.sort || 'desc';
  const filter = args.pagination?.filter || [];
  const topLevelOnly = args.topLevelOnly || false;

  const filterPromises = filter.map(async (f) => {
    switch (f.field) {
      case 'authorId':
        return eq(commentsTable.authorId, f.value);
      case 'postId':
        return eq(commentsTable.postId, f.value);
      default:
        return undefined;
    }
  });

  const baseFilterConditions = (await Promise.all(filterPromises)).filter(Boolean);

  const filterConditions = topLevelOnly
    ? [...baseFilterConditions, isNull(commentsTable.parentId)]
    : baseFilterConditions;

  let data: Comment[] = [];
  if (filterConditions.length > 0) {
    data = await ctx.db
      .select()
      .from(commentsTable)
      .where(and(...filterConditions))
      .limit(limit)
      .offset(offset)
      .orderBy(sort === 'asc' ? asc(commentsTable.createdAt) : desc(commentsTable.createdAt));
  } else {
    data = await ctx.db
      .select()
      .from(commentsTable)
      .limit(limit)
      .offset(offset)
      .orderBy(sort === 'asc' ? asc(commentsTable.createdAt) : desc(commentsTable.createdAt));
  }

  if (!validAndNotEmptyArray(data)) {
    return {
      data: [],
      count: 0,
    };
  }

  const [totalCount] = await ctx.db.select({ count: count() }).from(commentsTable);

  return {
    data,
    count: totalCount.count,
  };
}

export async function getCommentResolver(_root: Root, args: { id: string }, ctx: Context) {
  const [comment] = await ctx.db.select().from(commentsTable).where(eq(commentsTable.id, args.id));

  return comment;
}

export async function getCommentRepliesResolver(
  _root: Root,
  args: { parentId: string },
  ctx: Context,
) {
  const replies = await ctx.db
    .select()
    .from(commentsTable)
    .where(eq(commentsTable.parentId, args.parentId))
    .orderBy(desc(commentsTable.createdAt));

  return replies;
}

export async function getCommentsByPostResolver(
  _root: Root,
  args: { postId: string },
  ctx: Context,
) {
  const comments = await ctx.db
    .select()
    .from(commentsTable)
    .where(eq(commentsTable.postId, args.postId))
    .orderBy(desc(commentsTable.createdAt));

  return comments;
}

export async function createCommentResolver(
  _root: Root,
  args: { input: typeof CreateCommentInput.$inferInput },
  ctx: Context,
) {
  const user = requireUser(ctx);

  const { postId, content, parentId } = args.input;

  if (parentId) {
    const [parentComment] = await ctx.db
      .select()
      .from(commentsTable)
      .where(eq(commentsTable.id, parentId));

    if (!parentComment) {
      throw new Error('Parent comment not found');
    }

    if (parentComment.parentId) {
      throw new Error('Cannot reply to a comment that is already a reply (max nesting depth is 1)');
    }
  }

  const [comment] = await ctx.db
    .insert(commentsTable)
    .values({
      postId,
      content,
      authorId: user.id,
      parentId: parentId || null,
    })
    .returning();

  return comment;
}

export async function updateCommentResolver(
  _root: Root,
  args: { input: typeof UpdateCommentInput.$inferInput },
  ctx: Context,
) {
  requireUser(ctx);

  const commentData = filterEmptyValues<Comment>(args.input);

  const [comment] = await ctx.db
    .update(commentsTable)
    .set(commentData)
    .where(eq(commentsTable.id, args.input.id))
    .returning();

  return comment;
}
