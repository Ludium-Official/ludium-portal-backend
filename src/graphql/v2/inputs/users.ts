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
    nickname: t.string({
      description: 'User nickname',
    }),
    location: t.string({
      description: 'User location/timezone (e.g., "(GMT+09:00) Korea Standard Time - Seoul")',
    }),
    profileImage: t.string({
      description: 'User profile image URL',
    }),
    about: t.string({
      description: 'User about section (max 1000 characters)',
      validate: { maxLength: 1000 },
    }),
    userRole: t.string({
      description: 'User professional role (e.g., "Web Developer")',
    }),
    skills: t.stringList({
      description: 'User skills array',
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
    nickname: t.string({
      description: 'User nickname',
    }),
    location: t.string({
      description: 'User location/timezone (e.g., "(GMT+09:00) Korea Standard Time - Seoul")',
    }),
    profileImage: t.string({
      description: 'User profile image URL',
    }),
    about: t.string({
      description: 'User about section (max 1000 characters)',
      validate: { maxLength: 1000 },
    }),
    userRole: t.string({
      description: 'User professional role (e.g., "Web Developer")',
    }),
    skills: t.stringList({
      description: 'User skills array',
    }),
    role: t.field({
      type: UserRoleEnum,
      description: 'User role',
    }),
  }),
});

/**
 * Input type for updating current user's profile
 */
export const UpdateProfileSectionV2Input = builder.inputType('UpdateProfileSectionV2Input', {
  fields: (t) => ({
    nickname: t.string({
      required: true,
      description: 'User nickname (required)',
    }),
    email: t.string({
      required: true,
      description: 'User email address (required)',
      validate: { email: true },
    }),
    location: t.string({
      required: true,
      description: 'User location/timezone (required)',
    }),
    profileImage: t.field({
      type: 'Upload',
      description: 'User profile image (optional)',
    }),
    verificationCode: t.string({
      description: 'Email verification code (required if email is new or changed)',
    }),
  }),
});

export const UpdateAboutSectionV2Input = builder.inputType('UpdateAboutSectionV2Input', {
  fields: (t) => ({
    about: t.string({
      required: true,
      description: 'User about section (max 1000 characters, required)',
      validate: { maxLength: 1000 },
    }),
  }),
});

export const LanguageV2Input = builder.inputType('LanguageV2Input', {
  fields: (t) => ({
    language: t.string({ required: true }),
    proficiency: t.string({ required: true }),
  }),
});

export const UpdateExpertiseSectionV2Input = builder.inputType('UpdateExpertiseSectionV2Input', {
  fields: (t) => ({
    role: t.string({
      required: true,
      description: 'User professional role (required)',
    }),
    skills: t.stringList({
      description: 'User skills array',
    }),
    languages: t.field({
      type: [LanguageV2Input],
      description: 'User languages list',
    }),
  }),
});

export const WorkExperienceV2Input = builder.inputType('WorkExperienceV2Input', {
  fields: (t) => ({
    id: t.id({
      description: 'Work experience ID (for update, omit for create)',
    }),
    company: t.string({ required: true }),
    role: t.string({ required: true }),
    employmentType: t.string({ required: true }),
    currentWork: t.boolean({ required: true }),
    startYear: t.int({ required: true }),
    startMonth: t.string(),
    endYear: t.int(),
    endMonth: t.string(),
  }),
});

export const UpdateWorkExperienceSectionV2Input = builder.inputType(
  'UpdateWorkExperienceSectionV2Input',
  {
    fields: (t) => ({
      workExperiences: t.field({
        type: [WorkExperienceV2Input],
        required: true,
        description: 'List of work experiences (for delete, send empty array or omit the item)',
      }),
    }),
  },
);

export const EducationV2Input = builder.inputType('EducationV2Input', {
  fields: (t) => ({
    id: t.id({
      description: 'Education ID (for update, omit for create)',
    }),
    school: t.string({ required: true }),
    degree: t.string(),
    study: t.string(),
    attendedStartDate: t.int(),
    attendedEndDate: t.int(),
  }),
});

export const UpdateEducationSectionV2Input = builder.inputType('UpdateEducationSectionV2Input', {
  fields: (t) => ({
    educations: t.field({
      type: [EducationV2Input],
      required: true,
      description: 'List of educations (for delete, send empty array or omit the item)',
    }),
  }),
});

export const RequestEmailVerificationV2Input = builder.inputType(
  'RequestEmailVerificationV2Input',
  {
    fields: (t) => ({
      email: t.string({
        required: true,
        description: 'Email address to verify',
        validate: { email: true },
      }),
    }),
  },
);

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
      description: 'Field name to filter by (walletAddress, email, role, loginType, nickname)',
    }),
    value: t.string({
      description: 'Value to filter for',
    }),
  }),
});
