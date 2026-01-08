import {
  articlesTable,
  articleLikesTable,
  type Article,
  articleCommentsTable,
  type ArticleComment,
  articleCommentReactionsTable,
  articleViewsTable,
} from '@/db/schemas/v2/articles';
import type { Context } from '@/types';
import { and, count, desc, eq, gte, ilike, inArray, isNull, or, sql } from 'drizzle-orm';
import type { CreateArticleInput, UpdateArticleInput } from '../inputs/articles';
import { filesTable } from '@/db/schemas';

export class ArticleService {
  constructor(
    private db: Context['db'],
    private server: Context['server'],
  ) {}

  // article
  async getArticleById(
    id: string,
    userId?: number,
    ipAddress?: string,
  ): Promise<
    Article & {
      likeCount: number;
      commentCount: number;
      isLiked: boolean;
      view: number;
    }
  > {
    const [article] = await this.db.select().from(articlesTable).where(eq(articlesTable.id, id));

    if (!article) {
      throw new Error('Article not found');
    }

    // Check if already viewed
    const viewConditions = [];
    if (userId) {
      viewConditions.push(eq(articleViewsTable.userId, userId));
    } else if (ipAddress) {
      viewConditions.push(
        and(eq(articleViewsTable.ipAddress, ipAddress), isNull(articleViewsTable.userId)),
      );
    }

    if (viewConditions.length > 0) {
      const [existingView] = await this.db
        .select()
        .from(articleViewsTable)
        .where(
          and(
            eq(articleViewsTable.articleId, id),
            or(...viewConditions),
            // 24시간 이내 조회만 체크
            gte(articleViewsTable.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)),
          ),
        )
        .limit(1);

      // 이미 조회한 경우 view 증가하지 않음
      if (!existingView) {
        // Insert view record
        await this.db.insert(articleViewsTable).values({
          articleId: id,
          userId: userId ?? null,
          ipAddress: ipAddress ?? null,
        });

        // Update article view count
        await this.db
          .update(articlesTable)
          .set({ view: sql`${articlesTable.view} + 1` })
          .where(eq(articlesTable.id, id));
      }
    }

    // Get current view count from articles table
    const [updatedArticle] = await this.db
      .select()
      .from(articlesTable)
      .where(eq(articlesTable.id, id));

    if (!updatedArticle) {
      throw new Error('Article not found after update');
    }

    // Get like count
    const [likeCountResult] = await this.db
      .select({ count: count() })
      .from(articleLikesTable)
      .where(eq(articleLikesTable.articleId, id));

    // Get comment count
    const [commentCountResult] = await this.db
      .select({ count: count() })
      .from(articleCommentsTable)
      .where(eq(articleCommentsTable.articleId, id));

    // Check if user liked
    let isLiked = false;
    if (userId) {
      const [like] = await this.db
        .select()
        .from(articleLikesTable)
        .where(and(eq(articleLikesTable.articleId, id), eq(articleLikesTable.userId, userId)))
        .limit(1);
      isLiked = !!like;
    }

    return {
      ...updatedArticle,
      likeCount: likeCountResult?.count ?? 0,
      commentCount: commentCountResult?.count ?? 0,
      isLiked,
    };
  }

  async getAllArticles(
    filters: {
      filter?: 'LATEST' | 'TRENDING' | 'NEWSLETTER' | 'CAMPAIGN';
      authorId?: number;
      search?: string;
    },
    pagination?: {
      limit?: number;
      offset?: number;
    },
  ): Promise<{
    data: (Article & {
      view: number;
    })[];
    count: number;
  }> {
    const conditions = [];

    let articleType: 'article' | 'newsletter' | 'campaign' | undefined;
    let orderBy: typeof articlesTable.createdAt | typeof articlesTable.view | undefined;
    let dateFilter: Date | undefined;

    if (filters.filter) {
      switch (filters.filter) {
        case 'LATEST':
          articleType = 'article';
          orderBy = articlesTable.createdAt;
          break;
        case 'TRENDING':
          articleType = 'article';
          orderBy = articlesTable.view;
          // 일주일 기준 필터링
          dateFilter = new Date();
          dateFilter.setDate(dateFilter.getDate() - 7);
          break;
        case 'NEWSLETTER':
          articleType = 'newsletter';
          orderBy = articlesTable.createdAt;
          break;
        case 'CAMPAIGN':
          articleType = 'campaign';
          orderBy = articlesTable.createdAt;
          break;
      }
    }

    if (articleType) {
      conditions.push(eq(articlesTable.type, articleType));
    }

    if (dateFilter) {
      conditions.push(gte(articlesTable.createdAt, dateFilter));
    }

    if (filters.authorId) {
      conditions.push(eq(articlesTable.authorId, filters.authorId));
    }
    if (filters.search) {
      conditions.push(ilike(articlesTable.title, `%${filters.search}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const orderByClause =
      orderBy === articlesTable.view ? desc(articlesTable.view) : desc(articlesTable.createdAt);

    // Get articles
    const articles = await this.db
      .select()
      .from(articlesTable)
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(pagination?.limit ?? 12)
      .offset(pagination?.offset ?? 0);

    // Get count
    const [countResult] = await this.db
      .select({ count: count() })
      .from(articlesTable)
      .where(whereClause);

    const data = articles.map((article) => ({
      ...article,
    }));

    return {
      data,
      count: countResult?.count ?? 0,
    };
  }

  async getRecommendedArticles(
    type: 'article' | 'newsletter' | 'campaign',
  ): Promise<Array<Article>> {
    // TODO: 실제 추천 알고리즘에 따라 수정 (지금은 랜덤)
    const articles = await this.db
      .select()
      .from(articlesTable)
      .where(and(eq(articlesTable.type, type), eq(articlesTable.status, 'published')))
      .orderBy(sql`RANDOM()`)
      .limit(6);

    if (articles.length === 0) {
      return [];
    }

    return articles.map((article) => ({
      ...article,
    }));
  }

  async createArticle(
    input: typeof CreateArticleInput.$inferInput,
    authorId: number,
    isAdmin: boolean,
  ): Promise<Article> {
    if (input.title.length > 130) {
      throw new Error('Title must be 130 characters or less');
    }

    const category = input.category ? input.category : 'article';
    let isPin = false;

    if (isAdmin && input.isPin === true) {
      const [pinnedCountResult] = await this.db
        .select({ count: count() })
        .from(articlesTable)
        .where(eq(articlesTable.isPin, true));

      const pinnedCount = pinnedCountResult?.count ?? 0;

      if (pinnedCount >= 2) {
        if (!input.unpinArticleId) {
          throw new Error(
            'Cannot pin: 2 articles are already pinned. Please provide unpinArticleId to unpin an existing pinned article.',
          );
        }

        await this.db
          .update(articlesTable)
          .set({ isPin: false })
          .where(eq(articlesTable.id, input.unpinArticleId));
      }

      isPin = true;
    }

    let coverImageUrl = '';
    if (input.coverImage) {
      coverImageUrl = await this.server.fileManager.uploadFile({
        file: input.coverImage,
        userId: String(authorId),
        directory: 'articles/cover-images',
      });
    }

    const values = {
      title: input.title,
      description: input.description,
      coverImage: coverImageUrl,
      status: 'pending' as const,
      type: category,
      isPin,
      authorId,
      view: 0,
    };

    const [article] = await this.db.insert(articlesTable).values(values).returning();

    return article;
  }

  async updateArticle(
    id: string,
    input: typeof UpdateArticleInput.$inferInput,
    authorId: number,
    isAdmin: boolean,
  ): Promise<Article> {
    const [existing] = await this.db.select().from(articlesTable).where(eq(articlesTable.id, id));
    if (!existing) {
      throw new Error('Article not found');
    }

    // Check if user is the author or admin
    if (!isAdmin && existing.authorId !== authorId) {
      throw new Error('You are not authorized to update this article');
    }

    if (input.title && input.title.length > 130) {
      throw new Error('Title must be 130 characters or less');
    }

    const updateValues: Partial<typeof articlesTable.$inferInsert> = {};

    if (input.title !== undefined && input.title !== null) updateValues.title = input.title;
    if (input.description !== undefined && input.description !== null)
      updateValues.description = input.description;
    if (input.status !== undefined && input.status !== null) updateValues.status = input.status;
    if (input.coverImage !== undefined && input.coverImage !== null) {
      if (existing.coverImage) {
        const urlPattern = /https:\/\/storage\.googleapis\.com\/[^/]+\/(.+)/;
        const match = existing.coverImage.match(urlPattern);
        if (match) {
          const filePath = match[1];
          const [existingFile] = await this.db
            .select()
            .from(filesTable)
            .where(eq(filesTable.path, filePath))
            .limit(1);

          if (existingFile) {
            await this.server.fileManager.deleteFile(existingFile.id);
          }
        }
      }

      const fileUrl = await this.server.fileManager.uploadFile({
        file: input.coverImage,
        userId: String(authorId),
        directory: 'articles/cover-images',
      });
      updateValues.coverImage = fileUrl;
    }

    // Update category, isPin (admin only)
    if (isAdmin) {
      if (input.category !== undefined && input.category !== null) {
        updateValues.type = input.category;
      }

      if (input.isPin !== undefined) {
        if (input.isPin === true) {
          const [pinnedCountResult] = await this.db
            .select({ count: count() })
            .from(articlesTable)
            .where(and(eq(articlesTable.isPin, true), sql`${articlesTable.id} != ${id}`));

          const pinnedCount = pinnedCountResult?.count ?? 0;

          if (pinnedCount >= 2) {
            if (!input.unpinArticleId) {
              throw new Error(
                'Cannot pin: 2 articles are already pinned. Please provide unpinArticleId to unpin an existing pinned article.',
              );
            }

            await this.db
              .update(articlesTable)
              .set({ isPin: false })
              .where(eq(articlesTable.id, input.unpinArticleId));
          }

          updateValues.isPin = true;
        } else {
          updateValues.isPin = false;
        }
      }
    }

    const [updated] = await this.db
      .update(articlesTable)
      .set(updateValues)
      .where(eq(articlesTable.id, id))
      .returning();

    return updated;
  }

  async deleteArticle(id: string, authorId: number): Promise<boolean> {
    const [existing] = await this.db
      .select()
      .from(articlesTable)
      .where(and(eq(articlesTable.id, id), eq(articlesTable.authorId, authorId)));

    if (!existing) {
      throw new Error('Article not found or you are not the author');
    }

    await this.db.delete(articlesTable).where(eq(articlesTable.id, id));

    return true;
  }

  async toggleArticleLike(articleId: string, userId: number): Promise<boolean> {
    // number -> string으로 변경
    // Check if article exists
    const [article] = await this.db
      .select()
      .from(articlesTable)
      .where(eq(articlesTable.id, articleId));

    if (!article) {
      throw new Error('Article not found');
    }

    // Check if already liked
    const [existingLike] = await this.db
      .select()
      .from(articleLikesTable)
      .where(and(eq(articleLikesTable.articleId, articleId), eq(articleLikesTable.userId, userId)))
      .limit(1);

    if (existingLike) {
      // Unlike
      await this.db
        .delete(articleLikesTable)
        .where(
          and(eq(articleLikesTable.articleId, articleId), eq(articleLikesTable.userId, userId)),
        );
      return false;
    }
    // Like
    await this.db.insert(articleLikesTable).values({
      articleId,
      userId,
    });
    return true;
  }

  // comments
  async getAllComments(
    articleId: string,
    userId?: number,
  ): Promise<
    Array<
      ArticleComment & {
        likeCount: number;
        dislikeCount: number;
        isLiked?: boolean;
        isDisliked?: boolean;
        replies: Array<ArticleComment & { likeCount: number; dislikeCount: number }>;
      }
    >
  > {
    // 1. get all comments
    const allComments = await this.db
      .select()
      .from(articleCommentsTable)
      .where(eq(articleCommentsTable.articleId, articleId))
      .orderBy(desc(articleCommentsTable.createdAt));

    const commentIds = allComments.map((c) => c.id);

    // 2. get all like/dislike count
    const reactions =
      commentIds.length > 0
        ? await this.db
            .select({
              commentId: articleCommentReactionsTable.commentId,
              reaction: articleCommentReactionsTable.reaction,
              userId: articleCommentReactionsTable.userId,
            })
            .from(articleCommentReactionsTable)
            .where(inArray(articleCommentReactionsTable.commentId, commentIds))
        : [];

    // 3. 메모리에서 계층 구조 구성
    type CommentWithReplies = ArticleComment & {
      likeCount: number;
      dislikeCount: number;
      isLiked?: boolean;
      isDisliked?: boolean;
      replies: Array<ArticleComment & { likeCount: number; dislikeCount: number }>;
    };
    const commentMap = new Map<string, CommentWithReplies>();
    const rootComments: Array<
      ArticleComment & {
        likeCount: number;
        dislikeCount: number;
        isLiked?: boolean;
        isDisliked?: boolean;
        replies: Array<ArticleComment & { likeCount: number; dislikeCount: number }>;
      }
    > = [];

    // 모든 댓글을 맵에 추가
    for (const comment of allComments) {
      commentMap.set(comment.id, {
        ...comment,
        likeCount: 0,
        dislikeCount: 0,
        isLiked: false,
        isDisliked: false,
        replies: [],
      });
    }

    // 4. 각 댓글의 모든 하위 자식 댓글 확인 (재귀적으로)
    const commentHasDescendants = new Map<string, boolean>();
    for (const comment of allComments) {
      if (comment.deletedAt === null) {
        // 삭제되지 않은 댓글만 확인
        const descendants = this.getAllDescendantIds(comment.id, allComments);
        commentHasDescendants.set(comment.id, descendants.length > 0);
      } else {
        // 삭제된 댓글도 하위 자식이 있는지 확인
        const descendants = this.getAllDescendantIds(comment.id, allComments);
        commentHasDescendants.set(comment.id, descendants.length > 0);
      }
    }

    // 5. check user's like/dislike status
    const userReactions = userId ? reactions.filter((r) => r.userId === userId) : [];
    const userReactionMap = new Map(userReactions.map((r) => [r.commentId, r.reaction]));

    // 6. calculate like/dislike count
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

    // 7. 계층 구조 구성 및 삭제된 댓글 처리
    for (const comment of allComments) {
      const hasDescendants = commentHasDescendants.get(comment.id) ?? false;
      const isDeleted = comment.deletedAt !== null;

      // 삭제된 댓글 처리 로직
      if (isDeleted) {
        // 모든 하위 자식 댓글이 없으면 반환하지 않음
        if (!hasDescendants) {
          continue; // 이 댓글은 결과에 포함하지 않음
        }
      }

      // 하위 자식이 있으면 content를 빈 문자열로 (삭제된 경우)
      const processedComment = isDeleted && hasDescendants ? { ...comment, content: '' } : comment;

      const commentWithReactions = {
        ...processedComment,
        likeCount: reactionCountMap.get(comment.id)?.likes ?? 0,
        dislikeCount: reactionCountMap.get(comment.id)?.dislikes ?? 0,
        isLiked: userReactionMap.get(comment.id) === 'like',
        isDisliked: userReactionMap.get(comment.id) === 'dislike',
        replies: [],
      };

      // commentMap 업데이트
      const commentInMap = commentMap.get(comment.id);
      if (commentInMap) {
        commentInMap.likeCount = commentWithReactions.likeCount;
        commentInMap.dislikeCount = commentWithReactions.dislikeCount;
        commentInMap.isLiked = commentWithReactions.isLiked;
        commentInMap.isDisliked = commentWithReactions.isDisliked;
        // content 업데이트 (삭제된 경우)
        if (isDeleted && hasDescendants) {
          commentInMap.content = '';
        }
      }

      if (processedComment.parentId) {
        // 대댓글인 경우 부모의 replies에 추가
        const parent = commentMap.get(processedComment.parentId);
        console.log(parent);
        if (parent) {
          // 부모가 삭제되었지만 하위 자식이 있는 경우도 처리
          const parentHasDescendants =
            commentHasDescendants.get(processedComment.parentId) ?? false;
          const parentIsDeleted = parent.deletedAt !== null;

          if (parentIsDeleted && !parentHasDescendants) {
            // 부모가 삭제되었고 하위 자식이 없으면 부모를 건너뛰고 최상위로
            rootComments.push(commentWithReactions);
          } else {
            // 부모의 replies에 추가 - commentMap에서 가져온 객체 사용
            const childComment = commentMap.get(comment.id);
            if (childComment) {
              parent.replies.push(childComment);
            }
          }
        } else {
          // 부모가 필터링된 경우 최상위로
          rootComments.push(commentWithReactions);
        }
      }
      // 최상위 댓글은 여기서 추가하지 않음 (나중에 처리)
    }

    // 8. 최상위 댓글만 rootComments에 추가 (replies가 이미 채워진 상태)
    for (const comment of allComments) {
      const hasDescendants = commentHasDescendants.get(comment.id) ?? false;
      const isDeleted = comment.deletedAt !== null;

      // 삭제된 댓글 처리
      if (isDeleted && !hasDescendants) {
        continue;
      }

      // 최상위 댓글만 추가
      if (!comment.parentId) {
        const rootComment = commentMap.get(comment.id);
        if (rootComment) {
          rootComments.push(rootComment);
        }
      }
    }

    return rootComments;
  }

  async getChildComments(
    parentId: string,
    userId?: number,
  ): Promise<
    Array<
      ArticleComment & {
        likeCount: number;
        dislikeCount: number;
        isLiked?: boolean;
        isDisliked?: boolean;
      }
    >
  > {
    const replies = await this.db
      .select()
      .from(articleCommentsTable)
      .where(eq(articleCommentsTable.parentId, parentId))
      .orderBy(desc(articleCommentsTable.createdAt));

    const commentIds = replies.map((r) => r.id);
    const reactions =
      commentIds.length > 0
        ? await this.db
            .select({
              commentId: articleCommentReactionsTable.commentId,
              reaction: articleCommentReactionsTable.reaction,
              userId: articleCommentReactionsTable.userId,
            })
            .from(articleCommentReactionsTable)
            .where(inArray(articleCommentReactionsTable.commentId, commentIds))
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

    return replies.map((reply) => ({
      ...reply,
      likeCount: reactionCountMap.get(reply.id)?.likes ?? 0,
      dislikeCount: reactionCountMap.get(reply.id)?.dislikes ?? 0,
      isLiked: userReactionMap.get(reply.id) === 'like',
      isDisliked: userReactionMap.get(reply.id) === 'dislike',
    }));
  }

  async createComment(
    articleId: string,
    authorId: number,
    content: string,
    parentId?: string,
  ): Promise<typeof articleCommentsTable.$inferSelect> {
    // Check if article exists
    const [article] = await this.db
      .select()
      .from(articlesTable)
      .where(eq(articlesTable.id, articleId));

    if (!article) {
      throw new Error('Article not found');
    }

    // If parentId is provided, verify it exists
    if (parentId) {
      const [parent] = await this.db
        .select()
        .from(articleCommentsTable)
        .where(eq(articleCommentsTable.id, parentId));

      if (!parent) {
        throw new Error('Parent comment not found');
      }
    }

    const [comment] = await this.db
      .insert(articleCommentsTable)
      .values({
        articleId,
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
  ): Promise<typeof articleCommentsTable.$inferSelect> {
    const [existing] = await this.db
      .select()
      .from(articleCommentsTable)
      .where(eq(articleCommentsTable.id, commentId));

    if (!existing) {
      throw new Error('Comment not found');
    }

    if (existing.authorId !== authorId) {
      throw new Error('You are not authorized to update this comment');
    }

    const [updated] = await this.db
      .update(articleCommentsTable)
      .set({ content, updatedAt: new Date() })
      .where(eq(articleCommentsTable.id, commentId))
      .returning();

    return updated;
  }

  async deleteComment(commentId: string, authorId: number): Promise<boolean> {
    const [existing] = await this.db
      .select()
      .from(articleCommentsTable)
      .where(eq(articleCommentsTable.id, commentId));

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
      .update(articleCommentsTable)
      .set({ deletedAt: new Date() })
      .where(eq(articleCommentsTable.id, commentId));

    return true;
  }

  async toggleCommentReaction(
    commentId: string,
    userId: number,
    reaction: 'like' | 'dislike',
  ): Promise<{ isLiked: boolean; isDisliked: boolean; likeCount: number; dislikeCount: number }> {
    const [comment] = await this.db
      .select()
      .from(articleCommentsTable)
      .where(eq(articleCommentsTable.id, commentId));

    if (!comment) {
      throw new Error('Comment not found');
    }

    const [existing] = await this.db
      .select()
      .from(articleCommentReactionsTable)
      .where(
        and(
          eq(articleCommentReactionsTable.commentId, commentId),
          eq(articleCommentReactionsTable.userId, userId),
        ),
      )
      .limit(1);

    if (existing) {
      if (existing.reaction === reaction) {
        await this.db
          .delete(articleCommentReactionsTable)
          .where(
            and(
              eq(articleCommentReactionsTable.commentId, commentId),
              eq(articleCommentReactionsTable.userId, userId),
            ),
          );
      } else {
        await this.db
          .update(articleCommentReactionsTable)
          .set({ reaction })
          .where(
            and(
              eq(articleCommentReactionsTable.commentId, commentId),
              eq(articleCommentReactionsTable.userId, userId),
            ),
          );
      }
    } else {
      await this.db.insert(articleCommentReactionsTable).values({
        commentId,
        userId,
        reaction,
      });
    }

    const allReactions = await this.db
      .select()
      .from(articleCommentReactionsTable)
      .where(eq(articleCommentReactionsTable.commentId, commentId));

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

  private getAllDescendantIds(
    commentId: string,
    allComments: ArticleComment[],
    visited: Set<string> = new Set(),
  ): string[] {
    if (visited.has(commentId)) {
      return [];
    }
    visited.add(commentId);

    const descendants: string[] = [];
    const directChildren = allComments.filter(
      (c) => c.parentId === commentId && c.deletedAt === null,
    );

    for (const child of directChildren) {
      descendants.push(child.id);
      const grandChildren = this.getAllDescendantIds(child.id, allComments, visited);
      descendants.push(...grandChildren);
    }

    return descendants;
  }
}
