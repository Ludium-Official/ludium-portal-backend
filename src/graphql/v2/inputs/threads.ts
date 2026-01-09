import builder from '@/graphql/builder';
import { PaginationInput } from '@/graphql/types/common';

export const CreateThreadInput = builder.inputType('CreateThreadInput', {
  fields: (t) => ({
    content: t.string({
      required: true,
      description: 'Thread content',
    }),
  }),
});

export const UpdateThreadInput = builder.inputType('UpdateThreadInput', {
  fields: (t) => ({
    content: t.string({
      required: true,
      description: 'Updated thread content',
    }),
  }),
});

export const ThreadsQueryInput = builder.inputType('ThreadsQueryInput', {
  fields: (t) => ({
    pagination: t.field({
      type: PaginationInput,
      description: 'Pagination options',
    }),
  }),
});

export const CreateThreadCommentInput = builder.inputType('CreateThreadCommentInput', {
  fields: (t) => ({
    threadId: t.id({
      required: true,
      description: 'Thread ID',
    }),
    content: t.string({
      required: true,
      description: 'Comment content',
    }),
    parentId: t.id({
      description: 'Parent comment ID for nested comments',
    }),
  }),
});

export const UpdateThreadCommentInput = builder.inputType('UpdateThreadCommentInput', {
  fields: (t) => ({
    commentId: t.id({
      required: true,
      description: 'Comment ID to update',
    }),
    content: t.string({
      required: true,
      description: 'Updated comment content',
    }),
  }),
});

export const DeleteThreadCommentInput = builder.inputType('DeleteThreadCommentInput', {
  fields: (t) => ({
    commentId: t.id({
      required: true,
      description: 'Comment ID to delete',
    }),
  }),
});

export const ThreadReactionEnum = builder.enumType('ThreadReaction', {
  values: ['like', 'dislike'] as const,
});

export const ToggleThreadReactionInput = builder.inputType('ToggleThreadReactionInput', {
  fields: (t) => ({
    threadId: t.id({
      required: true,
      description: 'Thread ID',
    }),
    reaction: t.field({
      type: ThreadReactionEnum,
      required: true,
      description: 'Reaction type (like or dislike)',
    }),
  }),
});

export const ThreadCommentReactionEnum = builder.enumType('ThreadCommentReaction', {
  values: ['like', 'dislike'] as const,
});

export const ToggleThreadCommentReactionInput = builder.inputType(
  'ToggleThreadCommentReactionInput',
  {
    fields: (t) => ({
      commentId: t.id({
        required: true,
        description: 'Comment ID',
      }),
      reaction: t.field({
        type: ThreadCommentReactionEnum,
        required: true,
        description: 'Reaction type (like or dislike)',
      }),
    }),
  },
);
