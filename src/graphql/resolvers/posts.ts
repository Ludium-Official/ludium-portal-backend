import { type Post, postsTable } from '@/db/schemas';
import type { PaginationInput } from '@/graphql/types/common';
import type { CreatePostInput, UpdatePostInput } from '@/graphql/types/posts';
import type { Context, Root } from '@/types';
import { filterEmptyValues, validAndNotEmptyArray } from '@/utils';
import { and, asc, count, desc, eq, ilike } from 'drizzle-orm';

export async function getPostsResolver(
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
        return eq(postsTable.authorId, f.value);
      case 'title':
        return ilike(postsTable.title, `%${f.value}%`);
      default:
        return undefined;
    }
  });

  const filterConditions = (await Promise.all(filterPromises)).filter(Boolean);

  let data: Post[] = [];
  if (filterConditions.length > 0) {
    data = await ctx.db
      .select()
      .from(postsTable)
      .where(and(...filterConditions))
      .limit(limit)
      .offset(offset)
      .orderBy(sort === 'asc' ? asc(postsTable.createdAt) : desc(postsTable.createdAt));
  } else {
    data = await ctx.db
      .select()
      .from(postsTable)
      .limit(limit)
      .offset(offset)
      .orderBy(sort === 'asc' ? asc(postsTable.createdAt) : desc(postsTable.createdAt));
  }

  if (!validAndNotEmptyArray(data)) {
    return {
      data: [],
      count: 0,
    };
  }

  const [totalCount] = await ctx.db.select({ count: count() }).from(postsTable);

  return {
    data,
    count: totalCount.count,
  };
}

export async function getPostResolver(_root: Root, args: { id: string }, ctx: Context) {
  const [post] = await ctx.db.select().from(postsTable).where(eq(postsTable.id, args.id));

  return post;
}

export async function createPostResolver(
  _root: Root,
  args: { input: typeof CreatePostInput.$inferInput },
  ctx: Context,
) {
  const user = ctx.server.auth.getUser(ctx.request);
  if (!user) {
    throw new Error('User not found');
  }

  const { title, content } = args.input;

  const [post] = await ctx.db
    .insert(postsTable)
    .values({
      title,
      content,
      authorId: user.id,
    })
    .returning();

  return post;
}

export async function updatePostResolver(
  _root: Root,
  args: { input: typeof UpdatePostInput.$inferInput },
  ctx: Context,
) {
  const user = ctx.server.auth.getUser(ctx.request);
  if (!user) {
    throw new Error('User not found');
  }

  const postData = filterEmptyValues<Post>(args.input);

  const [post] = await ctx.db
    .update(postsTable)
    .set(postData)
    .where(eq(postsTable.id, args.input.id))
    .returning();

  return post;
}
