import { type UserV2 as DBUser, loginTypesV2, userV2Roles } from '@/db/schemas/v2/usersV2';
import builder from '@/graphql/builder';

// ============================================================================
// Enums
// ============================================================================

export const LoginTypeEnum = builder.enumType('LoginTypeEnum', {
  values: loginTypesV2,
});

export const UserRoleEnum = builder.enumType('UserRoleV2', {
  // V2로 변경
  values: userV2Roles,
});

// ============================================================================
// Object Types
// ============================================================================

/**
 * User V2 GraphQL type
 * Represents a user entity with all its properties
 */
export const UserV2Type = builder.objectRef<DBUser>('UserV2').implement({
  fields: (t) => ({
    // Primary fields
    id: t.exposeID('id', {
      description: 'User unique identifier',
    }),
    role: t.expose('role', {
      type: UserRoleEnum,
      description: 'User role (user or admin)',
    }),
    loginType: t.expose('loginType', {
      type: LoginTypeEnum,
      description: 'Authentication method used by the user',
    }),
    walletAddress: t.exposeString('walletAddress', {
      description: 'User wallet address',
    }),
    email: t.exposeString('email', {
      nullable: true,
      description: 'User email address',
    }),

    // Profile fields
    firstName: t.exposeString('firstName', {
      nullable: true,
      description: 'User first name',
    }),
    lastName: t.exposeString('lastName', {
      nullable: true,
      description: 'User last name',
    }),
    organizationName: t.exposeString('organizationName', {
      nullable: true,
      description: 'User organization name',
    }),
    profileImage: t.exposeString('profileImage', {
      nullable: true,
      description: 'User profile image URL',
    }),
    bio: t.exposeString('bio', {
      nullable: true,
      description: 'User biography',
    }),
    skills: t.exposeStringList('skills', {
      nullable: true,
      description: 'User skills list',
    }),
    links: t.exposeStringList('links', {
      nullable: true,
      description: 'User external links',
    }),

    // Timestamps
    createdAt: t.expose('createdAt', {
      type: 'Date',
      description: 'User creation timestamp',
    }),
    updatedAt: t.expose('updatedAt', {
      type: 'Date',
      description: 'User last update timestamp',
    }),
  }),
});

/**
 * Paginated users response type
 * Contains users list with pagination metadata
 */
export const PaginatedUsersV2Type = builder
  .objectRef<{
    users: DBUser[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  }>('PaginatedUsersV2')
  .implement({
    fields: (t) => ({
      users: t.field({
        type: [UserV2Type],
        resolve: (parent) => parent.users,
        description: 'List of users for the current page',
      }),
      totalCount: t.field({
        type: 'Int',
        resolve: (parent) => parent.totalCount,
        description: 'Total number of users matching the query',
      }),
      totalPages: t.field({
        type: 'Int',
        resolve: (parent) => parent.totalPages,
        description: 'Total number of pages',
      }),
      currentPage: t.field({
        type: 'Int',
        resolve: (parent) => parent.currentPage,
        description: 'Current page number',
      }),
      hasNextPage: t.field({
        type: 'Boolean',
        resolve: (parent) => parent.hasNextPage,
        description: 'Whether there is a next page',
      }),
      hasPreviousPage: t.field({
        type: 'Boolean',
        resolve: (parent) => parent.hasPreviousPage,
        description: 'Whether there is a previous page',
      }),
    }),
  });
