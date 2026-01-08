import builder from '@/graphql/builder';
import {
  createArticleResolver,
  updateArticleResolver,
  deleteArticleResolver,
  toggleArticleLikeResolver,
  createCommentResolver,
  deleteCommentResolver,
  updateCommentResolver,
  toggleCommentReactionResolver,
} from '@/graphql/v2/resolvers/articles';
import {
  CreateArticleInput,
  UpdateArticleInput,
  CreateArticleCommentInput,
  UpdateArticleCommentInput,
  DeleteArticleCommentInput,
  ToggleArticleCommentReactionInput,
} from '../inputs/articles';
import { ArticleType, ArticleCommentType } from '../types/articles';

builder.mutationField('createArticle', (t) =>
  t.field({
    type: ArticleType,
    authScopes: { userV2: true },
    args: {
      input: t.arg({
        type: CreateArticleInput,
        required: true,
      }),
    },
    resolve: createArticleResolver,
    description: 'Create a new article',
  }),
);

builder.mutationField('updateArticle', (t) =>
  t.field({
    type: ArticleType,
    authScopes: { userV2: true },
    args: {
      id: t.arg.id({
        required: true,
        description: 'Article ID',
      }),
      input: t.arg({
        type: UpdateArticleInput,
        required: true,
      }),
    },
    resolve: updateArticleResolver,
    description: 'Update an article',
  }),
);

builder.mutationField('deleteArticle', (t) =>
  t.field({
    type: 'Boolean',
    authScopes: { userV2: true },
    args: {
      id: t.arg.id({
        required: true,
        description: 'Article ID',
      }),
    },
    resolve: deleteArticleResolver,
    description: 'Delete an article',
  }),
);

builder.mutationField('toggleArticleLike', (t) =>
  t.field({
    type: 'Boolean',
    authScopes: { userV2: true },
    args: {
      articleId: t.arg.id({
        required: true,
        description: 'Article ID',
      }),
    },
    resolve: toggleArticleLikeResolver,
    description: 'Toggle like on an article (like if not liked, unlike if liked)',
  }),
);

builder.mutationField('createArticleComment', (t) =>
  t.field({
    type: ArticleCommentType,
    authScopes: { userV2: true },
    args: {
      input: t.arg({
        type: CreateArticleCommentInput,
        required: true,
      }),
    },
    resolve: createCommentResolver,
    description: 'Create a comment on an article',
  }),
);

builder.mutationField('updateArticleComment', (t) =>
  t.field({
    type: ArticleCommentType,
    authScopes: { userV2: true },
    args: {
      input: t.arg({
        type: UpdateArticleCommentInput,
        required: true,
      }),
    },
    resolve: updateCommentResolver,
    description: 'Update a comment',
  }),
);

builder.mutationField('deleteArticleComment', (t) =>
  t.field({
    type: 'Boolean',
    authScopes: { userV2: true },
    args: {
      input: t.arg({
        type: DeleteArticleCommentInput,
        required: true,
      }),
    },
    resolve: deleteCommentResolver,
    description: 'Delete a comment',
  }),
);

builder.mutationField('toggleArticleCommentReaction', (t) =>
  t.field({
    type: builder
      .objectRef<{
        isLiked: boolean;
        isDisliked: boolean;
        likeCount: number;
        dislikeCount: number;
      }>('CommentReactionResult')
      .implement({
        fields: (t) => ({
          isLiked: t.exposeBoolean('isLiked'),
          isDisliked: t.exposeBoolean('isDisliked'),
          likeCount: t.exposeInt('likeCount'),
          dislikeCount: t.exposeInt('dislikeCount'),
        }),
      }),
    authScopes: { userV2: true },
    args: {
      input: t.arg({
        type: ToggleArticleCommentReactionInput,
        required: true,
      }),
    },
    resolve: toggleCommentReactionResolver,
    description: 'Toggle like/dislike on a comment',
  }),
);
