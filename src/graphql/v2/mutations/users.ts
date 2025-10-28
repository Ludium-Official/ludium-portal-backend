import builder from '@/graphql/builder';
import {
  createUserV2Resolver,
  deleteUserV2Resolver,
  loginV2Resolver,
  updateProfileV2Resolver,
  updateUserV2Resolver,
} from '@/graphql/v2/resolvers/users';
import { CreateUserV2Input, UpdateProfileV2Input, UpdateUserV2Input } from '../inputs/users';
import { LoginTypeEnum } from '../types/users';
import { UserV2Type } from '../types/users';

// ============================================================================
// Authentication Mutations
// ============================================================================

/**
 * Login or create user (upsert) - Returns JWT token
 */
builder.mutationFields((t) => ({
  loginV2: t.field({
    type: 'String',
    args: {
      walletAddress: t.arg.string({
        required: true,
        description: 'User wallet address',
      }),
      loginType: t.arg({
        type: LoginTypeEnum,
        required: true,
        description: 'Login type (google, wallet, farcaster)',
      }),
      email: t.arg.string({
        description: 'User email address (optional)',
      }),
    },
    resolve: loginV2Resolver,
    description: 'Login or create user account and return JWT token',
  }),
}));

// ============================================================================
// User Mutations
// ============================================================================

/**
 * Create a new user
 */
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

/**
 * Update an existing user
 */
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

/**
 * Update current authenticated user's profile
 */
builder.mutationFields((t) => ({
  updateProfileV2: t.field({
    type: UserV2Type,
    authScopes: { user: true },
    args: {
      input: t.arg({
        type: UpdateProfileV2Input,
        required: true,
        description: 'Profile update data',
      }),
    },
    resolve: updateProfileV2Resolver,
    description: 'Update current authenticated user profile',
  }),
}));

/**
 * Delete a user by ID
 */
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
