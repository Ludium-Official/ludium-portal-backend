import { filesTable, usersV2Table } from '@/db/schemas';
import { articlesTable } from '@/db/schemas/v2/articles';
import {
  type Thread,
  type ThreadComment,
  threadCommentReactionsTable,
  threadCommentsTable,
  threadReactionsTable,
  threadsTable,
} from '@/db/schemas/v2/threads';
import type { Context } from '@/types';
import { and, count, desc, eq, gte, inArray, isNull } from 'drizzle-orm';
import type { CreateThreadInput, UpdateThreadInput } from '../inputs/threads';

export class ThreadService {
  constructor(
    private db: Context['db'],
    private server: Context['server'],
  ) {}

  async getThreadById(
    id: string,
    userId?: number,
  ): Promise<
    Thread & {
      likeCount: number;
      dislikeCount: number;
      commentCount: number;
      isLiked: boolean;
      isDisliked: boolean;
      authorNickname?: string | null;
      authorProfileImage?: string | null;
    }
  > {
    const [thread] = await this.db.select().from(threadsTable).where(eq(threadsTable.id, id));

    if (!thread) {
      throw new Error('Thread not found');
    }

    const [updatedThread] = await this.db
      .select()
      .from(threadsTable)
      .where(eq(threadsTable.id, id));

    if (!updatedThread) {
      throw new Error('Thread not found after update');
    }

    // Get reaction counts
    const reactions = await this.db
      .select()
      .from(threadReactionsTable)
      .where(eq(threadReactionsTable.threadId, id));

    const likeCount = reactions.filter((r) => r.reaction === 'like').length;
    const dislikeCount = reactions.filter((r) => r.reaction === 'dislike').length;

    // Check if user liked/disliked
    let isLiked = false;
    let isDisliked = false;
    if (userId) {
      const userReaction = reactions.find((r) => r.userId === userId);
      isLiked = userReaction?.reaction === 'like';
      isDisliked = userReaction?.reaction === 'dislike';
    }

    // Get comment count
    const [commentCountResult] = await this.db
      .select({ count: count() })
      .from(threadCommentsTable)
      .where(eq(threadCommentsTable.threadId, id));

    // Get author info
    const [author] = await this.db
      .select({
        nickname: usersV2Table.nickname,
        profileImage: usersV2Table.profileImage,
      })
      .from(usersV2Table)
      .where(eq(usersV2Table.id, updatedThread.authorId));

    return {
      ...updatedThread,
      likeCount,
      dislikeCount,
      commentCount: commentCountResult?.count ?? 0,
      isLiked,
      isDisliked,
      authorNickname: author?.nickname ?? null,
      authorProfileImage: author?.profileImage ?? null,
    };
  }

  async getAllThreads(
    pagination?: {
      limit?: number;
      offset?: number;
    },
    userId?: number,
  ): Promise<{
    data: (Thread & {
      likeCount: number;
      dislikeCount: number;
      commentCount: number;
      isLiked: boolean;
      isDisliked: boolean;
      authorNickname?: string | null;
      authorProfileImage?: string | null;
    })[];
    count: number;
  }> {
    const threads = await this.db
      .select()
      .from(threadsTable)
      .orderBy(desc(threadsTable.createdAt))
      .limit(pagination?.limit ?? 12)
      .offset(pagination?.offset ?? 0);

    const threadIds = threads.map((t) => t.id);
    const authorIds = [...new Set(threads.map((t) => t.authorId))];

    // Get author info
    const authors =
      authorIds.length > 0
        ? await this.db
            .select({
              id: usersV2Table.id,
              nickname: usersV2Table.nickname,
              profileImage: usersV2Table.profileImage,
            })
            .from(usersV2Table)
            .where(inArray(usersV2Table.id, authorIds))
        : [];

    const authorMap = new Map(
      authors.map((a) => [a.id, { nickname: a.nickname, profileImage: a.profileImage }]),
    );

    // Get all reactions
    const allReactions =
      threadIds.length > 0
        ? await this.db
            .select()
            .from(threadReactionsTable)
            .where(inArray(threadReactionsTable.threadId, threadIds))
        : [];

    // Get comment counts
    const commentCounts =
      threadIds.length > 0
        ? await this.db
            .select({
              threadId: threadCommentsTable.threadId,
              count: count(),
            })
            .from(threadCommentsTable)
            .where(inArray(threadCommentsTable.threadId, threadIds))
            .groupBy(threadCommentsTable.threadId)
        : [];

    const commentCountMap = new Map(commentCounts.map((c) => [c.threadId, c.count]));

    // Build result
    const data = threads.map((thread) => {
      const threadReactions = allReactions.filter((r) => r.threadId === thread.id);
      const likeCount = threadReactions.filter((r) => r.reaction === 'like').length;
      const dislikeCount = threadReactions.filter((r) => r.reaction === 'dislike').length;

      const userReaction = userId ? threadReactions.find((r) => r.userId === userId) : undefined;
      const author = authorMap.get(thread.authorId);

      return {
        ...thread,
        likeCount,
        dislikeCount,
        commentCount: commentCountMap.get(thread.id) ?? 0,
        isLiked: userReaction?.reaction === 'like',
        isDisliked: userReaction?.reaction === 'dislike',
        authorNickname: author?.nickname ?? null,
        authorProfileImage: author?.profileImage ?? null,
      };
    });

    const [countResult] = await this.db.select({ count: count() }).from(threadsTable);

    return {
      data,
      count: countResult?.count ?? 0,
    };
  }

  async getMyThreads(
    authorId: number,
    pagination?: {
      limit?: number;
      offset?: number;
    },
  ): Promise<{
    data: (Thread & {
      likeCount: number;
      dislikeCount: number;
      commentCount: number;
      isLiked: boolean;
      isDisliked: boolean;
      authorNickname?: string | null;
      authorProfileImage?: string | null;
    })[];
    count: number;
  }> {
    const threads = await this.db
      .select()
      .from(threadsTable)
      .where(eq(threadsTable.authorId, authorId))
      .orderBy(desc(threadsTable.createdAt))
      .limit(pagination?.limit ?? 12)
      .offset(pagination?.offset ?? 0);

    const threadIds = threads.map((t) => t.id);

    const [author] = await this.db
      .select({
        nickname: usersV2Table.nickname,
        profileImage: usersV2Table.profileImage,
      })
      .from(usersV2Table)
      .where(eq(usersV2Table.id, authorId));

    const allReactions =
      threadIds.length > 0
        ? await this.db
            .select()
            .from(threadReactionsTable)
            .where(inArray(threadReactionsTable.threadId, threadIds))
        : [];

    const commentCounts =
      threadIds.length > 0
        ? await this.db
            .select({
              threadId: threadCommentsTable.threadId,
              count: count(),
            })
            .from(threadCommentsTable)
            .where(inArray(threadCommentsTable.threadId, threadIds))
            .groupBy(threadCommentsTable.threadId)
        : [];

    const commentCountMap = new Map(commentCounts.map((c) => [c.threadId, c.count]));

    const data = threads.map((thread) => {
      const threadReactions = allReactions.filter((r) => r.threadId === thread.id);
      const likeCount = threadReactions.filter((r) => r.reaction === 'like').length;
      const dislikeCount = threadReactions.filter((r) => r.reaction === 'dislike').length;

      const userReaction = threadReactions.find((r) => r.userId === authorId);

      return {
        ...thread,
        likeCount,
        dislikeCount,
        commentCount: commentCountMap.get(thread.id) ?? 0,
        isLiked: userReaction?.reaction === 'like',
        isDisliked: userReaction?.reaction === 'dislike',
        authorNickname: author?.nickname ?? null,
        authorProfileImage: author?.profileImage ?? null,
      };
    });

    const [countResult] = await this.db
      .select({ count: count() })
      .from(threadsTable)
      .where(eq(threadsTable.authorId, authorId));

    return {
      data,
      count: countResult?.count ?? 0,
    };
  }

  async getTopViewedArticles(limit: number): Promise<Array<typeof articlesTable.$inferSelect>> {
    const dateFilter = new Date();
    dateFilter.setDate(dateFilter.getDate() - 7); // 7 days

    const articles = await this.db
      .select()
      .from(articlesTable)
      .where(
        and(
          eq(articlesTable.status, 'published'),
          eq(articlesTable.type, 'article'),
          gte(articlesTable.createdAt, dateFilter),
        ),
      )
      .orderBy(desc(articlesTable.view))
      .limit(limit);

    return articles;
  }

  private async uploadImages(
    images: Promise<import('@/types').UploadFile>[] | null | undefined,
    userId: number,
  ): Promise<string[] | null> {
    if (!images || images.length === 0) {
      return null;
    }

    const uploadPromises = images.map((imagePromise) =>
      this.server.fileManager.uploadFile({
        file: imagePromise,
        userId: String(userId),
        directory: 'threads',
      }),
    );

    const imageUrls = await Promise.all(uploadPromises);
    return imageUrls;
  }

  private async deleteExistingImages(imageUrls: string[] | null): Promise<void> {
    if (!imageUrls || imageUrls.length === 0) {
      return;
    }

    const urlPattern = /https:\/\/storage\.googleapis\.com\/[^/]+\/(.+)/;

    for (const imageUrl of imageUrls) {
      const match = imageUrl.match(urlPattern);
      if (match) {
        const filePath = match[1];
        const [existingFile] = await this.db
          .select()
          .from(filesTable)
          .where(eq(filesTable.path, filePath))
          .limit(1);

        if (existingFile) {
          try {
            await this.server.fileManager.deleteFile(existingFile.id);
          } catch (error) {
            // Log error but don't fail the operation
            this.server.log.warn({
              msg: 'Failed to delete existing portfolio image',
              fileId: existingFile.id,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      }
    }
  }

  async createThread(
    input: typeof CreateThreadInput.$inferInput,
    authorId: number,
  ): Promise<Thread> {
    const imageUrls = await this.uploadImages(input.images, authorId);

    const [thread] = await this.db
      .insert(threadsTable)
      .values({
        content: input.content,
        images: imageUrls,
        authorId,
      })
      .returning();

    return thread;
  }

  async updateThread(
    id: string,
    input: typeof UpdateThreadInput.$inferInput,
    authorId: number,
  ): Promise<Thread> {
    const [existing] = await this.db.select().from(threadsTable).where(eq(threadsTable.id, id));
    if (!existing) {
      throw new Error('Thread not found');
    }

    if (existing.authorId !== authorId) {
      throw new Error('You are not authorized to update this thread');
    }

    const updateData: Partial<{ content: string; images: string[] | null }> = {};

    if (input.content !== undefined && input.content !== null) {
      updateData.content = input.content;
    }

    // Handle image updates
    if (input.existingImageUrls !== undefined || input.newImages !== undefined) {
      // images to delete (existing - to keep)
      const imagesToDelete =
        input.existingImageUrls !== undefined
          ? (existing.images ?? []).filter((url) => !input.existingImageUrls?.includes(url))
          : [];

      if (imagesToDelete.length > 0) {
        try {
          await this.deleteExistingImages(imagesToDelete);
        } catch (error) {
          this.server.log.warn({
            msg: 'Failed to delete some thread images, continuing with update',
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // images to add (new)
      const newImageUrls = await this.uploadImages(input.newImages, authorId);

      const finalImages = [
        ...(input.existingImageUrls ?? existing.images ?? []),
        ...(newImageUrls ?? []),
      ];

      updateData.images = finalImages.length > 0 ? finalImages : null;
    }

    const [updated] = await this.db
      .update(threadsTable)
      .set(updateData)
      .where(eq(threadsTable.id, id))
      .returning();

    return updated;
  }

  async deleteThread(id: string, authorId: number): Promise<boolean> {
    const [existing] = await this.db
      .select()
      .from(threadsTable)
      .where(and(eq(threadsTable.id, id), eq(threadsTable.authorId, authorId)));

    if (!existing) {
      throw new Error('Thread not found or you are not the author');
    }

    if (existing.images && existing.images.length > 0) {
      await this.deleteExistingImages(existing.images);
    }

    await this.db.delete(threadsTable).where(eq(threadsTable.id, id));

    return true;
  }

  async toggleThreadReaction(
    threadId: string,
    userId: number,
    reaction: 'like' | 'dislike',
  ): Promise<{ isLiked: boolean; isDisliked: boolean; likeCount: number; dislikeCount: number }> {
    const [thread] = await this.db.select().from(threadsTable).where(eq(threadsTable.id, threadId));

    if (!thread) {
      throw new Error('Thread not found');
    }

    const [existing] = await this.db
      .select()
      .from(threadReactionsTable)
      .where(
        and(eq(threadReactionsTable.threadId, threadId), eq(threadReactionsTable.userId, userId)),
      )
      .limit(1);

    if (existing) {
      if (existing.reaction === reaction) {
        // Remove reaction
        await this.db
          .delete(threadReactionsTable)
          .where(
            and(
              eq(threadReactionsTable.threadId, threadId),
              eq(threadReactionsTable.userId, userId),
            ),
          );
      } else {
        // Change reaction
        await this.db
          .update(threadReactionsTable)
          .set({ reaction })
          .where(
            and(
              eq(threadReactionsTable.threadId, threadId),
              eq(threadReactionsTable.userId, userId),
            ),
          );
      }
    } else {
      // Add new reaction
      await this.db.insert(threadReactionsTable).values({
        threadId,
        userId,
        reaction,
      });
    }

    const allReactions = await this.db
      .select()
      .from(threadReactionsTable)
      .where(eq(threadReactionsTable.threadId, threadId));

    const likeCount = allReactions.filter((r) => r.reaction === 'like').length;
    const dislikeCount = allReactions.filter((r) => r.reaction === 'dislike').length;

    const userReaction = allReactions.find((r) => r.userId === userId);

    return {
      isLiked: userReaction?.reaction === 'like',
      isDisliked: userReaction?.reaction === 'dislike',
      likeCount,
      dislikeCount,
    };
  }

  // Comments methods (similar to article service)
  async getAllComments(
    threadId: string,
    userId?: number,
  ): Promise<
    Array<
      ThreadComment & {
        likeCount: number;
        dislikeCount: number;
        isLiked?: boolean;
        isDisliked?: boolean;
        replyCount: number;
        authorNickname?: string;
        authorProfileImage?: string | null;
      }
    >
  > {
    // Similar to article service getAllComments
    // ... (copy pattern from article service)
    const rootComments = await this.db
      .select()
      .from(threadCommentsTable)
      .where(and(eq(threadCommentsTable.threadId, threadId), isNull(threadCommentsTable.parentId)))
      .orderBy(desc(threadCommentsTable.createdAt));

    // ... rest of the logic similar to article service
    // (author info, reactions, counts, etc.)
    const rootCommentIds = rootComments.map((c) => c.id);
    const authorIds = [...new Set(rootComments.map((c) => c.authorId))];

    const authors =
      authorIds.length > 0
        ? await this.db
            .select({
              id: usersV2Table.id,
              nickname: usersV2Table.nickname,
              profileImage: usersV2Table.profileImage,
            })
            .from(usersV2Table)
            .where(inArray(usersV2Table.id, authorIds))
        : [];

    const authorMap = new Map(
      authors.map((a) => [a.id, { nickname: a.nickname, profileImage: a.profileImage }]),
    );

    const childCountMap = new Map<string, number>();
    if (rootCommentIds.length > 0) {
      const childComments = await this.db
        .select({
          parentId: threadCommentsTable.parentId,
        })
        .from(threadCommentsTable)
        .where(
          and(
            eq(threadCommentsTable.threadId, threadId),
            inArray(threadCommentsTable.parentId, rootCommentIds),
          ),
        );

      for (const child of childComments) {
        if (child.parentId) {
          const currentCount = childCountMap.get(child.parentId) ?? 0;
          childCountMap.set(child.parentId, currentCount + 1);
        }
      }
    }

    const allCommentIds = rootComments.map((c) => c.id);
    const reactions =
      allCommentIds.length > 0
        ? await this.db
            .select({
              commentId: threadCommentReactionsTable.commentId,
              reaction: threadCommentReactionsTable.reaction,
              userId: threadCommentReactionsTable.userId,
            })
            .from(threadCommentReactionsTable)
            .where(inArray(threadCommentReactionsTable.commentId, allCommentIds))
        : [];

    const userReactions = userId ? reactions.filter((r) => r.userId === userId) : [];
    const userReactionMap = new Map(userReactions.map((r) => [r.commentId, r.reaction]));

    const reactionCountMap = new Map<string, { likes: number; dislikes: number }>();
    for (const r of reactions) {
      const existing = reactionCountMap.get(r.commentId) || { likes: 0, dislikes: 0 };
      if (r.reaction === 'like') {
        existing.likes++;
      } else {
        existing.dislikes++;
      }
      reactionCountMap.set(r.commentId, existing);
    }

    const result = [];
    for (const comment of rootComments) {
      const isDeleted = comment.deletedAt !== null;
      const replyCount = childCountMap.get(comment.id) ?? 0;

      if (isDeleted && replyCount === 0) {
        continue;
      }

      const author = authorMap.get(comment.authorId);

      result.push({
        ...comment,
        content: isDeleted ? '' : comment.content,
        likeCount: reactionCountMap.get(comment.id)?.likes ?? 0,
        dislikeCount: reactionCountMap.get(comment.id)?.dislikes ?? 0,
        isLiked: userReactionMap.get(comment.id) === 'like',
        isDisliked: userReactionMap.get(comment.id) === 'dislike',
        replyCount,
        authorNickname: author?.nickname ?? undefined,
        authorProfileImage: author?.profileImage ?? undefined,
      });
    }

    return result;
  }

  async getChildComments(
    parentId: string,
    userId?: number,
  ): Promise<
    Array<
      ThreadComment & {
        likeCount: number;
        dislikeCount: number;
        isLiked?: boolean;
        isDisliked?: boolean;
        replyCount: number;
        authorNickname?: string;
        authorProfileImage?: string | null;
      }
    >
  > {
    // Similar to article service getChildComments
    const replies = await this.db
      .select()
      .from(threadCommentsTable)
      .where(eq(threadCommentsTable.parentId, parentId))
      .orderBy(desc(threadCommentsTable.createdAt));

    // ... (similar pattern to article service)
    const commentIds = replies.map((r) => r.id);
    const authorIds = [...new Set(replies.map((r) => r.authorId))];

    const authors =
      authorIds.length > 0
        ? await this.db
            .select({
              id: usersV2Table.id,
              nickname: usersV2Table.nickname,
              profileImage: usersV2Table.profileImage,
            })
            .from(usersV2Table)
            .where(inArray(usersV2Table.id, authorIds))
        : [];

    const authorMap = new Map(
      authors.map((a) => [a.id, { nickname: a.nickname, profileImage: a.profileImage }]),
    );

    const childCountMap = new Map<string, number>();
    if (commentIds.length > 0) {
      const childComments = await this.db
        .select({
          parentId: threadCommentsTable.parentId,
        })
        .from(threadCommentsTable)
        .where(inArray(threadCommentsTable.parentId, commentIds));

      for (const child of childComments) {
        if (child.parentId) {
          const currentCount = childCountMap.get(child.parentId) ?? 0;
          childCountMap.set(child.parentId, currentCount + 1);
        }
      }
    }

    const reactions =
      commentIds.length > 0
        ? await this.db
            .select({
              commentId: threadCommentReactionsTable.commentId,
              reaction: threadCommentReactionsTable.reaction,
              userId: threadCommentReactionsTable.userId,
            })
            .from(threadCommentReactionsTable)
            .where(inArray(threadCommentReactionsTable.commentId, commentIds))
        : [];

    const userReactions = userId ? reactions.filter((r) => r.userId === userId) : [];
    const userReactionMap = new Map(userReactions.map((r) => [r.commentId, r.reaction]));

    const reactionCountMap = new Map<string, { likes: number; dislikes: number }>();
    for (const r of reactions) {
      const existing = reactionCountMap.get(r.commentId) || { likes: 0, dislikes: 0 };
      if (r.reaction === 'like') {
        existing.likes++;
      } else {
        existing.dislikes++;
      }
      reactionCountMap.set(r.commentId, existing);
    }

    return replies
      .map((reply) => {
        const author = authorMap.get(reply.authorId);
        const isDeleted = reply.deletedAt !== null;
        const replyCount = childCountMap.get(reply.id) ?? 0;

        return {
          ...reply,
          content: isDeleted ? '' : reply.content,
          likeCount: reactionCountMap.get(reply.id)?.likes ?? 0,
          dislikeCount: reactionCountMap.get(reply.id)?.dislikes ?? 0,
          isLiked: userReactionMap.get(reply.id) === 'like',
          isDisliked: userReactionMap.get(reply.id) === 'dislike',
          replyCount,
          authorNickname: author?.nickname ?? undefined,
          authorProfileImage: author?.profileImage ?? undefined,
        };
      })
      .filter((reply) => {
        const isDeleted = reply.deletedAt !== null;
        const replyCount = reply.replyCount ?? 0;
        return !(isDeleted && replyCount === 0);
      });
  }

  async createComment(
    threadId: string,
    authorId: number,
    content: string,
    parentId?: string,
  ): Promise<typeof threadCommentsTable.$inferSelect> {
    const [thread] = await this.db.select().from(threadsTable).where(eq(threadsTable.id, threadId));

    if (!thread) {
      throw new Error('Thread not found');
    }

    if (parentId) {
      const [parent] = await this.db
        .select()
        .from(threadCommentsTable)
        .where(eq(threadCommentsTable.id, parentId));

      if (!parent) {
        throw new Error('Parent comment not found');
      }
    }

    const [comment] = await this.db
      .insert(threadCommentsTable)
      .values({
        threadId,
        authorId,
        content,
        parentId: parentId ?? null,
      })
      .returning();

    return comment;
  }

  async updateComment(
    commentId: string,
    authorId: number,
    content: string,
  ): Promise<typeof threadCommentsTable.$inferSelect> {
    const [existing] = await this.db
      .select()
      .from(threadCommentsTable)
      .where(eq(threadCommentsTable.id, commentId));

    if (!existing) {
      throw new Error('Comment not found');
    }

    if (existing.authorId !== authorId) {
      throw new Error('You are not authorized to update this comment');
    }

    const [updated] = await this.db
      .update(threadCommentsTable)
      .set({ content, updatedAt: new Date() })
      .where(eq(threadCommentsTable.id, commentId))
      .returning();

    return updated;
  }

  async deleteComment(commentId: string, authorId: number): Promise<boolean> {
    const [existing] = await this.db
      .select()
      .from(threadCommentsTable)
      .where(eq(threadCommentsTable.id, commentId));

    if (!existing) {
      throw new Error('Comment not found');
    }

    if (existing.authorId !== authorId) {
      throw new Error('You are not authorized to delete this comment');
    }

    if (existing.deletedAt !== null) {
      throw new Error('Comment is already deleted');
    }

    await this.db
      .update(threadCommentsTable)
      .set({ deletedAt: new Date() })
      .where(eq(threadCommentsTable.id, commentId));

    return true;
  }

  async toggleCommentReaction(
    commentId: string,
    userId: number,
    reaction: 'like' | 'dislike',
  ): Promise<{ isLiked: boolean; isDisliked: boolean; likeCount: number; dislikeCount: number }> {
    const [comment] = await this.db
      .select()
      .from(threadCommentsTable)
      .where(eq(threadCommentsTable.id, commentId));

    if (!comment) {
      throw new Error('Comment not found');
    }

    const [existing] = await this.db
      .select()
      .from(threadCommentReactionsTable)
      .where(
        and(
          eq(threadCommentReactionsTable.commentId, commentId),
          eq(threadCommentReactionsTable.userId, userId),
        ),
      )
      .limit(1);

    if (existing) {
      if (existing.reaction === reaction) {
        await this.db
          .delete(threadCommentReactionsTable)
          .where(
            and(
              eq(threadCommentReactionsTable.commentId, commentId),
              eq(threadCommentReactionsTable.userId, userId),
            ),
          );
      } else {
        await this.db
          .update(threadCommentReactionsTable)
          .set({ reaction })
          .where(
            and(
              eq(threadCommentReactionsTable.commentId, commentId),
              eq(threadCommentReactionsTable.userId, userId),
            ),
          );
      }
    } else {
      await this.db.insert(threadCommentReactionsTable).values({
        commentId,
        userId,
        reaction,
      });
    }

    const allReactions = await this.db
      .select()
      .from(threadCommentReactionsTable)
      .where(eq(threadCommentReactionsTable.commentId, commentId));

    const likeCount = allReactions.filter((r) => r.reaction === 'like').length;
    const dislikeCount = allReactions.filter((r) => r.reaction === 'dislike').length;

    const userReaction = allReactions.find((r) => r.userId === userId);

    return {
      isLiked: userReaction?.reaction === 'like',
      isDisliked: userReaction?.reaction === 'dislike',
      likeCount,
      dislikeCount,
    };
  }
}
