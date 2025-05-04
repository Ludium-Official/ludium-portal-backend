import { type Comment, commentsTable } from '@/db/schemas';
import type { CreateCommentInput, UpdateCommentInput } from '@/graphql/types/comments';
import type { PaginationInput } from '@/graphql/types/common';
import type { Context, Root } from '@/types';
import { filterEmptyValues, validAndNotEmptyArray } from '@/utils';
import { and, asc, count, desc, eq } from 'drizzle-orm';

export async function getCommentsResolver(
  _root: Root,
  args: { pagination?: typeof PaginationInput.$inferInput | null },
  ctx: Context,
) {
  const limit = args.pagination?.limit || 10;
  const offset = args.pagination?.offset || 0;
  const sort = args.pagination?.sort || 'desc';
  const filter = args.pagination?.filter || [];

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

  const filterConditions = (await Promise.all(filterPromises)).filter(Boolean);

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

export async function createCommentResolver(
  _root: Root,
  args: { input: typeof CreateCommentInput.$inferInput },
  ctx: Context,
) {
  const user = ctx.server.auth.getUser(ctx.request);
  if (!user) {
    throw new Error('User not found');
  }

  const { postId, content } = args.input;

  const [comment] = await ctx.db
    .insert(commentsTable)
    .values({
      postId,
      content,
      authorId: user.id,
    })
    .returning();

  return comment;
}

export async function updateCommentResolver(
  _root: Root,
  args: { input: typeof UpdateCommentInput.$inferInput },
  ctx: Context,
) {
  const user = ctx.server.auth.getUser(ctx.request);
  if (!user) {
    throw new Error('User not found');
  }

  const commentData = filterEmptyValues<Comment>(args.input);

  const [comment] = await ctx.db
    .update(commentsTable)
    .set(commentData)
    .where(eq(commentsTable.id, args.input.id))
    .returning();

  return comment;
}
