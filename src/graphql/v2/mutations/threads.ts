import builder from '@/graphql/builder';
import {
  CreateThreadCommentInput,
  CreateThreadInput,
  DeleteThreadCommentInput,
  ToggleThreadCommentReactionInput,
  ToggleThreadReactionInput,
  UpdateThreadCommentInput,
  UpdateThreadInput,
} from '../inputs/threads';
import {
  createThreadCommentResolver,
  createThreadResolver,
  deleteThreadCommentResolver,
  deleteThreadResolver,
  toggleThreadCommentReactionResolver,
  toggleThreadReactionResolver,
  updateThreadCommentResolver,
  updateThreadResolver,
} from '../resolvers/threads';
import { ThreadCommentType, ThreadType } from '../types/threads';

builder.mutationField('createThread', (t) =>
  t.field({
    type: ThreadType,
    authScopes: { userV2: true },
    args: {
      input: t.arg({
        type: CreateThreadInput,
        required: true,
      }),
    },
    resolve: createThreadResolver,
    description: 'Create a new thread',
  }),
);

builder.mutationField('updateThread', (t) =>
  t.field({
    type: ThreadType,
    authScopes: { userV2: true },
    args: {
      id: t.arg.id({
        required: true,
        description: 'Thread ID',
      }),
      input: t.arg({
        type: UpdateThreadInput,
        required: true,
      }),
    },
    resolve: updateThreadResolver,
    description: 'Update a thread (content only)',
  }),
);

builder.mutationField('deleteThread', (t) =>
  t.field({
    type: 'Boolean',
    authScopes: { userV2: true },
    args: {
      id: t.arg.id({
        required: true,
        description: 'Thread ID',
      }),
    },
    resolve: deleteThreadResolver,
    description: 'Delete a thread',
  }),
);

builder.mutationField('toggleThreadReaction', (t) =>
  t.field({
    type: builder
      .objectRef<{
        isLiked: boolean;
        isDisliked: boolean;
        likeCount: number;
        dislikeCount: number;
      }>('ThreadReactionResult')
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
        type: ToggleThreadReactionInput,
        required: true,
      }),
    },
    resolve: toggleThreadReactionResolver,
    description: 'Toggle like/dislike on a thread',
  }),
);

builder.mutationField('createThreadComment', (t) =>
  t.field({
    type: ThreadCommentType,
    authScopes: { userV2: true },
    args: {
      input: t.arg({
        type: CreateThreadCommentInput,
        required: true,
      }),
    },
    resolve: createThreadCommentResolver,
    description: 'Create a comment on a thread',
  }),
);

builder.mutationField('updateThreadComment', (t) =>
  t.field({
    type: ThreadCommentType,
    authScopes: { userV2: true },
    args: {
      input: t.arg({
        type: UpdateThreadCommentInput,
        required: true,
      }),
    },
    resolve: updateThreadCommentResolver,
    description: 'Update a comment',
  }),
);

builder.mutationField('deleteThreadComment', (t) =>
  t.field({
    type: 'Boolean',
    authScopes: { userV2: true },
    args: {
      input: t.arg({
        type: DeleteThreadCommentInput,
        required: true,
      }),
    },
    resolve: deleteThreadCommentResolver,
    description: 'Delete a comment',
  }),
);

builder.mutationField('toggleThreadCommentReaction', (t) =>
  t.field({
    type: builder
      .objectRef<{
        isLiked: boolean;
        isDisliked: boolean;
        likeCount: number;
        dislikeCount: number;
      }>('ThreadCommentReactionResult')
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
        type: ToggleThreadCommentReactionInput,
        required: true,
      }),
    },
    resolve: toggleThreadCommentReactionResolver,
    description: 'Toggle like/dislike on a comment',
  }),
);
