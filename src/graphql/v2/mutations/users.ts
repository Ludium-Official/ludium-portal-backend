import builder from '@/graphql/builder';
import {
  createUserV2Resolver,
  deleteUserV2Resolver,
  updateUserV2Resolver,
} from '@/graphql/v2/resolvers/users';
import { CreateUserV2Input, UpdateUserV2Input } from '../inputs/users';
import { UserV2Type } from '../types/users';

// Create User Mutation
builder.mutationFields((t) => ({
  createUserV2: t.field({
    type: UserV2Type,
    args: {
      input: t.arg({
        type: CreateUserV2Input,
        required: true,
        description: 'User creation data',
      }),
    },
    resolve: createUserV2Resolver,
    description: 'Create a new user',
  }),
}));

// Update User Mutation
builder.mutationFields((t) => ({
  updateUserV2: t.field({
    type: UserV2Type,
    args: {
      input: t.arg({
        type: UpdateUserV2Input,
        required: true,
        description: 'User update data',
      }),
    },
    resolve: updateUserV2Resolver,
    description: 'Update an existing user',
  }),
}));

// Delete User Mutation
builder.mutationFields((t) => ({
  deleteUserV2: t.field({
    type: 'Boolean',
    args: {
      id: t.arg.id({
        required: true,
        description: 'User ID to delete',
      }),
    },
    resolve: deleteUserV2Resolver,
    description: 'Delete a user by ID',
  }),
}));

// Bulk Operations
builder.mutationFields((t) => ({
  bulkUpdateUsersV2: t.field({
    type: ['Boolean'],
    args: {
      ids: t.arg.idList({
        required: true,
        description: 'List of user IDs to update',
      }),
      input: t.arg({
        type: UpdateUserV2Input,
        required: true,
        description: 'Update data to apply to all users',
      }),
    },
    resolve: async (_, args, ctx) => {
      // Implementation for bulk update
      const results = [];
      for (const id of args.ids) {
        try {
          await updateUserV2Resolver(_, { input: { ...args.input, id } }, ctx);
          results.push(true);
        } catch (error) {
          ctx.server.log.error(
            `Failed to update user ${id}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
          results.push(false);
        }
      }
      return results;
    },
    description: 'Update multiple users at once',
  }),
}));

builder.mutationFields((t) => ({
  bulkDeleteUsersV2: t.field({
    type: ['Boolean'],
    args: {
      ids: t.arg.idList({
        required: true,
        description: 'List of user IDs to delete',
      }),
    },
    resolve: async (_, args, ctx) => {
      // Implementation for bulk delete
      const results = [];
      for (const id of args.ids) {
        try {
          await deleteUserV2Resolver(_, { id }, ctx);
          results.push(true);
        } catch (error) {
          ctx.server.log.error(
            `Failed to delete user ${id}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
          results.push(false);
        }
      }
      return results;
    },
    description: 'Delete multiple users at once',
  }),
}));
