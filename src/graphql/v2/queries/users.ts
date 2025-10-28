import builder from '@/graphql/builder';
import {
  getProfileV2Resolver,
  getUserV2Resolver,
  getUsersV2Resolver,
  queryUsersV2Resolver,
} from '@/graphql/v2/resolvers/users';
import { UserV2QueryFilterInput, UsersV2QueryInput } from '../inputs/users';
import { PaginatedUsersV2Type, UserV2Type } from '../types/users';

// ============================================================================
// User Queries
// ============================================================================

/**
 * Get current user's profile (authenticated user)
 */
builder.queryFields((t) => ({
  profileV2: t.field({
    type: UserV2Type,
    authScopes: { userV2: true },
    resolve: getProfileV2Resolver,
    description: 'Get current authenticated user profile',
  }),
}));

/**
 * Get a single user by ID
 */
builder.queryFields((t) => ({
  userV2: t.field({
    type: UserV2Type,
    args: {
      id: t.arg.id({
        required: true,
        description: 'User ID',
      }),
    },
    resolve: getUserV2Resolver,
    description: 'Get a single user by ID',
  }),
}));

/**
 * Get paginated list of users with filtering, searching, and sorting
 * This is the main unified query for retrieving users
 */
builder.queryFields((t) => ({
  usersV2: t.field({
    type: PaginatedUsersV2Type,
    args: {
      query: t.arg({
        type: UsersV2QueryInput,
        description: 'Query options including pagination, filtering, searching, and sorting',
      }),
    },
    resolve: getUsersV2Resolver,
    description: 'Get paginated list of users with comprehensive filtering options',
  }),
}));

/**
 * Query users with dynamic field=value filtering (AND logic)
 * Useful for exact field matching without pagination
 */
builder.queryFields((t) => ({
  queryUsersV2: t.field({
    type: [UserV2Type],
    args: {
      filter: t.arg({
        type: [UserV2QueryFilterInput],
        description: 'Dynamic filter criteria (field=value pairs combined with AND logic)',
      }),
    },
    resolve: queryUsersV2Resolver,
    description: 'Query users with dynamic field=value filters (AND condition, no pagination)',
  }),
}));
