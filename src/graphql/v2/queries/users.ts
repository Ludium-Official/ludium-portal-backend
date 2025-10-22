import builder from '@/graphql/builder';
import {
  getUserV2Resolver,
  getUsersV2Resolver,
  searchUsersV2Resolver,
} from '@/graphql/v2/resolvers/users';
import { UserV2FilterInput } from '../inputs/users';
import {
  PaginatedUsersV2Type,
  UserV2SearchInput,
  UserV2Type,
  UsersV2PaginationInput,
} from '../types/users';

// Single User Query
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

// Users List Query
builder.queryFields((t) => ({
  usersV2: t.field({
    type: PaginatedUsersV2Type,
    args: {
      pagination: t.arg({
        type: UsersV2PaginationInput,
        description: 'Pagination and filtering options',
      }),
    },
    resolve: getUsersV2Resolver,
    description: 'Get paginated list of users',
  }),
}));

// Search Users Query
builder.queryFields((t) => ({
  searchUsersV2: t.field({
    type: PaginatedUsersV2Type,
    args: {
      search: t.arg({
        type: UserV2SearchInput,
        required: true,
        description: 'Search criteria',
      }),
      pagination: t.arg({
        type: UsersV2PaginationInput,
        description: 'Pagination options',
      }),
    },
    resolve: searchUsersV2Resolver,
    description: 'Search users with advanced filtering',
  }),
}));

// Filter Users Query
builder.queryFields((t) => ({
  filterUsersV2: t.field({
    type: PaginatedUsersV2Type,
    args: {
      filter: t.arg({
        type: UserV2FilterInput,
        required: true,
        description: 'Filter criteria',
      }),
      pagination: t.arg({
        type: UsersV2PaginationInput,
        description: 'Pagination options',
      }),
    },
    resolve: getUsersV2Resolver, // Reuse the same resolver with filter
    description: 'Filter users with specific criteria',
  }),
}));
