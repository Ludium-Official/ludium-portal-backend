import builder from '@/graphql/builder';
import {
  createUserV2Resolver,
  deleteUserV2Resolver,
  loginV2Resolver,
  updateUserV2Resolver,
  updateProfileSectionV2Resolver,
  requestEmailVerificationV2Resolver,
  verifyEmailV2Resolver,
  updateAboutSectionV2Resolver,
  updateExpertiseSectionV2Resolver,
  updateWorkExperienceSectionV2Resolver,
  updateEducationSectionV2Resolver,
} from '@/graphql/v2/resolvers/users';
import {
  CreateUserV2Input,
  UpdateProfileSectionV2Input,
  UpdateUserV2Input,
  RequestEmailVerificationV2Input,
  UpdateAboutSectionV2Input,
  UpdateExpertiseSectionV2Input,
  UpdateWorkExperienceSectionV2Input,
  UpdateEducationSectionV2Input,
} from '../inputs/users';
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
  updateProfileSectionV2: t.field({
    type: UserV2Type,
    authScopes: { userV2: true },
    args: {
      input: t.arg({
        type: UpdateProfileSectionV2Input,
        required: true,
      }),
    },
    resolve: updateProfileSectionV2Resolver,
    description: 'Update profile section (nickname, email, location, profileImage)',
  }),
}));

/**
 * Request email verification code
 */
builder.mutationFields((t) => ({
  requestEmailVerificationV2: t.field({
    type: 'Boolean',
    authScopes: { userV2: true },
    args: {
      input: t.arg({
        type: RequestEmailVerificationV2Input,
        required: true,
      }),
    },
    resolve: requestEmailVerificationV2Resolver,
    description: 'Request email verification code',
  }),
}));

/**
 * Verify email with code
 */
builder.mutationFields((t) => ({
  verifyEmailV2: t.field({
    type: 'Boolean',
    authScopes: { userV2: true },
    args: {
      email: t.arg.string({ required: true }),
      verificationCode: t.arg.string({ required: true }),
    },
    resolve: verifyEmailV2Resolver,
    description: 'Verify email with verification code',
  }),
}));

/**
 * Update About Section
 */
builder.mutationFields((t) => ({
  updateAboutSectionV2: t.field({
    type: UserV2Type,
    authScopes: { userV2: true },
    args: {
      input: t.arg({
        type: UpdateAboutSectionV2Input,
        required: true,
      }),
    },
    resolve: updateAboutSectionV2Resolver,
    description: 'Update about section (max 1000 characters)',
  }),
}));

/**
 * Update Expertise Section
 */
builder.mutationFields((t) => ({
  updateExpertiseSectionV2: t.field({
    type: UserV2Type,
    authScopes: { userV2: true },
    args: {
      input: t.arg({
        type: UpdateExpertiseSectionV2Input,
        required: true,
      }),
    },
    resolve: updateExpertiseSectionV2Resolver,
    description: 'Update expertise section (role, skills, languages)',
  }),
}));

/**
 * Update Work Experience Section
 */
builder.mutationFields((t) => ({
  updateWorkExperienceSectionV2: t.field({
    type: UserV2Type,
    authScopes: { userV2: true },
    args: {
      input: t.arg({
        type: UpdateWorkExperienceSectionV2Input,
        required: true,
      }),
    },
    resolve: updateWorkExperienceSectionV2Resolver,
    description: 'Update work experience section',
  }),
}));

/**
 * Update Education Section
 */
builder.mutationFields((t) => ({
  updateEducationSectionV2: t.field({
    type: UserV2Type,
    authScopes: { userV2: true },
    args: {
      input: t.arg({
        type: UpdateEducationSectionV2Input,
        required: true,
      }),
    },
    resolve: updateEducationSectionV2Resolver,
    description: 'Update education section',
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
