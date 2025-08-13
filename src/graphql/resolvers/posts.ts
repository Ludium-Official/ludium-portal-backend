import {
  type Post,
  filesTable,
  keywordsTable,
  postViewsTable,
  postsTable,
  postsToKeywordsTable,
} from '@/db/schemas';
import type { PaginationInput } from '@/graphql/types/common';
import type { CreatePostInput, UpdatePostInput } from '@/graphql/types/posts';
import type { Context, Root } from '@/types';
import { filterEmptyValues, requireUser, validAndNotEmptyArray } from '@/utils';
import { and, asc, count, desc, eq, ilike, inArray } from 'drizzle-orm';

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

  const [totalCount] = await ctx.db
    .select({ count: count() })
    .from(postsTable)
    .where(and(...filterConditions));

  return {
    data,
    count: totalCount.count,
  };
}

export async function getPostResolver(_root: Root, args: { id: string }, ctx: Context) {
  const [post] = await ctx.db.select().from(postsTable).where(eq(postsTable.id, args.id));

  return post;
}

export async function getPostKeywordsByPostIdResolver(
  _root: Root,
  args: { postId: string },
  ctx: Context,
) {
  const keywordRelations = await ctx.db
    .select()
    .from(postsToKeywordsTable)
    .where(eq(postsToKeywordsTable.postId, args.postId));

  if (!keywordRelations.length) return [];

  return ctx.db
    .select()
    .from(keywordsTable)
    .where(
      inArray(
        keywordsTable.id,
        keywordRelations.map((rel) => rel.keywordId),
      ),
    );
}

export async function createPostResolver(
  _root: Root,
  args: { input: typeof CreatePostInput.$inferInput },
  ctx: Context,
) {
  const user = requireUser(ctx);

  const { title, content, image, keywords, summary } = args.input;

  return ctx.db.transaction(async (t) => {
    const [post] = await t
      .insert(postsTable)
      .values({
        title,
        content,
        summary,
        authorId: user.id,
      })
      .returning();

    if (image) {
      const fileUrl = await ctx.server.fileManager.uploadFile({
        file: image,
        userId: user.id,
      });
      await t.update(postsTable).set({ image: fileUrl }).where(eq(postsTable.id, post.id));
    }

    // Handle keywords
    if (keywords?.length) {
      await t
        .insert(postsToKeywordsTable)
        .values(
          keywords.map((keyword) => ({
            postId: post.id,
            keywordId: keyword,
          })),
        )
        .onConflictDoNothing();
    }

    return post;
  });
}

export async function updatePostResolver(
  _root: Root,
  args: { input: typeof UpdatePostInput.$inferInput },
  ctx: Context,
) {
  const user = requireUser(ctx);

  const postData = filterEmptyValues<Post>(args.input);

  return ctx.db.transaction(async (t) => {
    const [post] = await t
      .update(postsTable)
      .set(postData)
      .where(eq(postsTable.id, args.input.id))
      .returning();

    if (user.id !== post?.authorId && !user.role?.endsWith('admin')) {
      throw new Error('You are not the author of this post');
    }

    // handle keywords
    if (args.input.keywords?.length) {
      await t.delete(postsToKeywordsTable).where(eq(postsToKeywordsTable.postId, args.input.id));
      await t
        .insert(postsToKeywordsTable)
        .values(
          args.input.keywords.map((keyword) => ({ postId: args.input.id, keywordId: keyword })),
        )
        .onConflictDoNothing();
    }

    if (args.input.image) {
      const [avatar] = await t
        .select()
        .from(filesTable)
        .where(eq(filesTable.uploadedById, user.id));
      if (avatar) {
        await ctx.server.fileManager.deleteFile(avatar.id);
      }
      const fileUrl = await ctx.server.fileManager.uploadFile({
        file: args.input.image,
        userId: user.id,
      });
      await t.update(postsTable).set({ image: fileUrl }).where(eq(postsTable.id, post.id));
    }

    return post;
  });
}

export async function getPostViewCountResolver(
  _root: Root,
  args: { postId: string },
  ctx: Context,
) {
  const [result] = await ctx.db
    .select({ count: count() })
    .from(postViewsTable)
    .where(eq(postViewsTable.postId, args.postId));

  return result?.count || 0;
}

export async function incrementPostViewResolver(
  _root: Root,
  args: { postId: string },
  ctx: Context,
) {
  const user = requireUser(ctx);
  const ipAddress = ctx.request.ip || ctx.request.socket.remoteAddress || null;

  // Check if post exists
  const [post] = await ctx.db.select().from(postsTable).where(eq(postsTable.id, args.postId));

  if (!post) {
    throw new Error('Post not found');
  }

  // Check if this view already exists
  const whereConditions = [eq(postViewsTable.postId, args.postId)];

  if (user) {
    whereConditions.push(eq(postViewsTable.userId, user.id));
  } else if (ipAddress) {
    whereConditions.push(eq(postViewsTable.ipAddress, ipAddress));
  }

  const existingView = await ctx.db
    .select()
    .from(postViewsTable)
    .where(and(...whereConditions))
    .limit(1);

  if (existingView.length === 0) {
    // Record new view
    await ctx.db.insert(postViewsTable).values({
      postId: args.postId,
      userId: user?.id || null,
      ipAddress,
    });
  }

  // Return updated view count
  return getPostViewCountResolver(_root, { postId: args.postId }, ctx);
}
