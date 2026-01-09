import type { Thread as DBThread, ThreadComment as DBThreadComment } from '@/db/schemas/v2/threads';
import builder from '@/graphql/builder';

// Thread Type
export const ThreadRef = builder.objectRef<
  DBThread & {
    likeCount?: number;
    dislikeCount?: number;
    commentCount?: number;
    isLiked?: boolean;
    isDisliked?: boolean;
    authorNickname?: string | null;
    authorProfileImage?: string | null;
  }
>('Thread');

export const ThreadType = ThreadRef.implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    content: t.exposeString('content'),
    createdAt: t.field({
      type: 'DateTime',
      resolve: (thread) => thread.createdAt,
    }),
    updatedAt: t.field({
      type: 'DateTime',
      resolve: (thread) => thread.updatedAt,
    }),
    likeCount: t.field({
      type: 'Int',
      description: 'Number of likes',
      resolve: (thread) => {
        return (thread as DBThread & { likeCount?: number }).likeCount ?? 0;
      },
    }),
    dislikeCount: t.field({
      type: 'Int',
      description: 'Number of dislikes',
      resolve: (thread) => {
        return (thread as DBThread & { dislikeCount?: number }).dislikeCount ?? 0;
      },
    }),
    replyCount: t.field({
      type: 'Int',
      description: 'Number of comments',
      resolve: (thread) => {
        return (thread as DBThread & { commentCount?: number }).commentCount ?? 0;
      },
    }),
    isLiked: t.field({
      type: 'Boolean',
      description: 'Whether the currently authenticated user has liked this thread',
      resolve: (thread) => {
        return (thread as DBThread & { isLiked?: boolean }).isLiked ?? false;
      },
    }),
    isDisliked: t.field({
      type: 'Boolean',
      description: 'Whether the currently authenticated user has disliked this thread',
      resolve: (thread) => {
        return (thread as DBThread & { isDisliked?: boolean }).isDisliked ?? false;
      },
    }),
    authorNickname: t.field({
      type: 'String',
      nullable: true,
      description: 'Author nickname',
      resolve: (thread) => {
        return (thread as DBThread & { authorNickname?: string | null }).authorNickname ?? null;
      },
    }),
    authorProfileImage: t.field({
      type: 'String',
      nullable: true,
      description: 'Author profile image URL',
      resolve: (thread) => {
        return (
          (thread as DBThread & { authorProfileImage?: string | null }).authorProfileImage ?? null
        );
      },
    }),
  }),
});

// Paginated Threads
export const PaginatedThreadType = builder
  .objectRef<{
    data: (DBThread & {
      likeCount?: number;
      dislikeCount?: number;
      commentCount?: number;
      isLiked?: boolean;
      isDisliked?: boolean;
      authorNickname?: string | null;
      authorProfileImage?: string | null;
    })[];
    count: number;
  }>('PaginatedThread')
  .implement({
    fields: (t) => ({
      data: t.field({
        type: [ThreadType],
        resolve: (parent) => parent.data,
      }),
      count: t.exposeInt('count'),
    }),
  });

// ThreadComment Type
export const ThreadCommentRef = builder.objectRef<
  DBThreadComment & {
    likeCount: number;
    dislikeCount: number;
    isLiked?: boolean;
    isDisliked?: boolean;
    replies?: Array<
      DBThreadComment & {
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
>('ThreadComment');

export const ThreadCommentType = ThreadCommentRef.implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    threadId: t.exposeID('threadId'),
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
      type: [ThreadCommentRef],
      nullable: true,
      resolve: (comment) => comment.replies ?? [],
    }),
    replyCount: t.field({
      type: 'Int',
      description: 'Number of child comments',
      resolve: (comment) => {
        return (comment as DBThreadComment & { replyCount?: number }).replyCount ?? 0;
      },
    }),
    authorNickname: t.field({
      type: 'String',
      nullable: true,
      description: 'Author nickname',
      resolve: (comment) => {
        return (comment as DBThreadComment & { authorNickname?: string }).authorNickname ?? null;
      },
    }),
    authorProfileImage: t.field({
      type: 'String',
      nullable: true,
      description: 'Author profile image URL',
      resolve: (comment) => {
        return (
          (comment as DBThreadComment & { authorProfileImage?: string | null })
            .authorProfileImage ?? null
        );
      },
    }),
  }),
});
