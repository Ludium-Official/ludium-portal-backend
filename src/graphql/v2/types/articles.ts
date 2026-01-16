import type {
  Article as DBArticle,
  ArticleComment as DBArticleComment,
} from '@/db/schemas/v2/articles';
import { articleStatusValues, articleTypeValues } from '@/db/schemas/v2/articles';
import { usersV2Table } from '@/db/schemas/v2/users';
import builder from '@/graphql/builder';
import type { Context } from '@/types';
import { eq } from 'drizzle-orm';
import { UserV2Ref } from './users';

// Enums
export const ArticleStatusEnum = builder.enumType('ArticleStatus', {
  values: articleStatusValues,
});

export const ArticleTypeEnum = builder.enumType('ArticleType', {
  values: articleTypeValues,
});

// Article Type
export const ArticleRef = builder.objectRef<
  DBArticle & {
    likeCount?: number;
    commentCount?: number;
    isLiked?: boolean;
  }
>('Article');

export const ArticleType = ArticleRef.implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    title: t.exposeString('title'),
    description: t.exposeString('description', {
      description: 'Article description in markdown format',
    }),
    coverImage: t.exposeString('coverImage', {
      description: 'Cover image URL or path',
    }),
    status: t.field({
      type: ArticleStatusEnum,
      resolve: (article) => article.status,
    }),
    type: t.field({
      type: ArticleTypeEnum,
      resolve: (article) => article.type,
      description: 'Article category (article, newsletter, campaign)',
    }),
    isPin: t.exposeBoolean('isPin', {
      description: 'Whether this article is pinned',
    }),
    view: t.exposeInt('view', {
      description: 'Number of views',
    }),
    createdAt: t.field({
      type: 'DateTime',
      resolve: (article) => article.createdAt,
    }),
    updatedAt: t.field({
      type: 'DateTime',
      resolve: (article) => article.updatedAt,
    }),
    author: t.field({
      type: UserV2Ref,
      resolve: async (article, _args, ctx: Context) => {
        const [author] = await ctx.db
          .select()
          .from(usersV2Table)
          .where(eq(usersV2Table.id, article.authorId));

        if (!author) {
          throw new Error(`Author with id ${article.authorId} not found`);
        }

        return author;
      },
    }),
    likeCount: t.field({
      type: 'Int',
      description: 'Number of likes',
      resolve: (article) => {
        return (article as DBArticle & { likeCount?: number }).likeCount ?? 0;
      },
    }),
    commentCount: t.field({
      type: 'Int',
      description: 'Number of comments',
      resolve: (article) => {
        return (article as DBArticle & { commentCount?: number }).commentCount ?? 0;
      },
    }),
    isLiked: t.field({
      type: 'Boolean',
      description: 'Whether the currently authenticated user has liked this article',
      resolve: (article) => {
        return (article as DBArticle & { isLiked?: boolean }).isLiked ?? false;
      },
    }),
  }),
});

// Paginated Articles
export const PaginatedArticleType = builder
  .objectRef<{
    data: (DBArticle & {
      likeCount?: number;
      commentCount?: number;
      isLiked?: boolean;
    })[];
    count: number;
  }>('PaginatedArticle')
  .implement({
    fields: (t) => ({
      data: t.field({
        type: [ArticleType],
        resolve: (parent) => parent.data,
      }),
      count: t.exposeInt('count'),
    }),
  });

// ArticleComment Type
export const ArticleCommentRef = builder.objectRef<
  DBArticleComment & {
    likeCount: number;
    dislikeCount: number;
    isLiked?: boolean;
    isDisliked?: boolean;
    replies?: Array<
      DBArticleComment & {
        likeCount: number;
        dislikeCount: number;
        isLiked?: boolean;
        isDisliked?: boolean;
      }
    >;
    replyCount?: number;
    authorNickname?: string;
    authorProfileImage?: string | null;
  }
>('ArticleComment');

export const ArticleCommentType = ArticleCommentRef.implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    articleId: t.exposeID('articleId'),
    authorId: t.exposeInt('authorId'),
    content: t.exposeString('content'),
    parentId: t.exposeID('parentId', { nullable: true }),
    createdAt: t.field({
      type: 'DateTime',
      resolve: (comment) => comment.createdAt,
    }),
    updatedAt: t.field({
      type: 'DateTime',
      resolve: (comment) => comment.updatedAt,
    }),
    deletedAt: t.field({
      type: 'DateTime',
      nullable: true,
      resolve: (comment) => comment.deletedAt,
    }),
    likeCount: t.exposeInt('likeCount'),
    dislikeCount: t.exposeInt('dislikeCount'),
    isLiked: t.field({
      type: 'Boolean',
      nullable: true,
      resolve: (comment) => comment.isLiked ?? false,
    }),
    isDisliked: t.field({
      type: 'Boolean',
      nullable: true,
      resolve: (comment) => comment.isDisliked ?? false,
    }),
    replies: t.field({
      type: [ArticleCommentRef],
      nullable: true,
      resolve: (comment) => comment.replies ?? [],
    }),
    replyCount: t.field({
      type: 'Int',
      description: 'Number of child comments',
      resolve: (comment) => {
        return (comment as DBArticleComment & { replyCount?: number }).replyCount ?? 0;
      },
    }),
    authorNickname: t.field({
      type: 'String',
      nullable: true,
      description: 'Author nickname',
      resolve: (comment) => {
        return (comment as DBArticleComment & { authorNickname?: string }).authorNickname ?? null;
      },
    }),
    authorProfileImage: t.field({
      type: 'String',
      nullable: true,
      description: 'Author profile image URL',
      resolve: (comment) => {
        return (
          (comment as DBArticleComment & { authorProfileImage?: string | null })
            .authorProfileImage ?? null
        );
      },
    }),
  }),
});
