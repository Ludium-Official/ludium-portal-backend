import builder from '@/graphql/builder';
import { LoginTypeEnum, UserRoleEnum } from '../types/users';

// ============================================================================
// Mutation Inputs
// ============================================================================

/**
 * Input type for creating a new user
 */
export const CreateUserV2Input = builder.inputType('CreateUserV2Input', {
  fields: (t) => ({
    // Required fields
    loginType: t.field({
      type: LoginTypeEnum,
      required: true,
      description: 'User login type',
    }),
    walletAddress: t.string({
      required: true,
      description: 'User wallet address',
    }),

    // Optional fields
    email: t.string({
      description: 'User email address',
      validate: { email: true },
    }),
    role: t.field({
      type: UserRoleEnum,
      description: 'User role (defaults to user)',
    }),
    firstName: t.string({
      description: 'User first name',
    }),
    lastName: t.string({
      description: 'User last name',
    }),
    organizationName: t.string({
      description: 'User organization name',
    }),
    profileImage: t.string({
      description: 'User profile image URL',
    }),
    bio: t.string({
      description: 'User bio/description',
    }),
    skills: t.stringList({
      description: 'User skills array',
    }),
    links: t.stringList({
      description: 'User links array',
    }),
  }),
});

/**
 * Input type for updating an existing user
 */
export const UpdateUserV2Input = builder.inputType('UpdateUserV2Input', {
  fields: (t) => ({
    // ID is required for updates
    id: t.id({
      required: true,
      description: 'User ID to update',
    }),

    // Optional fields that can be updated
    email: t.string({
      description: 'User email address',
      validate: { email: true },
    }),
    walletAddress: t.string({
      description: 'User wallet address',
    }),
    firstName: t.string({
      description: 'User first name',
    }),
    lastName: t.string({
      description: 'User last name',
    }),
    organizationName: t.string({
      description: 'User organization name',
    }),
    profileImage: t.string({
      description: 'User profile image URL',
    }),
    bio: t.string({
      description: 'User bio/description',
    }),
    skills: t.stringList({
      description: 'User skills array',
    }),
    links: t.stringList({
      description: 'User links array',
    }),
    role: t.field({
      type: UserRoleEnum,
      description: 'User role',
    }),
  }),
});

/**
 * Input type for updating current user's profile
 * Similar to UpdateUserV2Input but without the id field (uses authenticated user's ID)
 */
export const UpdateProfileV2Input = builder.inputType('UpdateProfileV2Input', {
  fields: (t) => ({
    // Optional fields that can be updated in profile
    email: t.string({
      description: 'User email address',
      validate: { email: true },
    }),
    firstName: t.string({
      description: 'User first name',
    }),
    lastName: t.string({
      description: 'User last name',
    }),
    organizationName: t.string({
      description: 'User organization name',
    }),
    profileImage: t.field({
      type: 'Upload',
      description: 'User profile image URL',
    }),
    bio: t.string({
      description: 'User bio/description',
    }),
    skills: t.stringList({
      description: 'User skills array',
    }),
    links: t.stringList({
      description: 'User links array',
    }),
  }),
});

// ============================================================================
// Query Inputs
// ============================================================================

/**
 * Unified pagination and filtering input for users queries
 * Combines pagination, sorting, searching, and filtering in one input type
 */
export const UsersV2QueryInput = builder.inputType('UsersV2QueryInput', {
  fields: (t) => ({
    // Pagination
    page: t.int({
      description: 'Page number (1-based)',
      defaultValue: 1,
    }),
    limit: t.int({
      description: 'Number of items per page',
      defaultValue: 10,
    }),

    // Sorting
    sortBy: t.string({
      description: 'Field to sort by (createdAt, updatedAt, firstName, lastName)',
      defaultValue: 'createdAt',
    }),
    sortOrder: t.string({
      description: 'Sort order (asc/desc)',
      defaultValue: 'desc',
    }),

    // Search
    search: t.string({
      description: 'Search term for walletAddress, email, firstName, lastName',
    }),

    // Filters
    role: t.field({
      type: UserRoleEnum,
      description: 'Filter by user role',
    }),
    loginType: t.field({
      type: LoginTypeEnum,
      description: 'Filter by login type',
    }),
    hasEmail: t.boolean({
      description: 'Filter users with/without email',
    }),
  }),
});

/**
 * Input type for dynamic field-value filtering
 * Supports querying users with specific field values using AND logic
 */
export const UserV2QueryFilterInput = builder.inputType('UserV2QueryFilterInput', {
  fields: (t) => ({
    field: t.string({
      required: true,
      description:
        'Field name to filter by (walletAddress, email, role, loginType, firstName, lastName, organizationName)',
    }),
    value: t.string({
      description: 'Value to filter for',
    }),
  }),
});
