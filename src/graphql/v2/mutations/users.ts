import builder from '@/graphql/builder';
import {
  createEducationV2Resolver,
  createUserV2Resolver,
  createWorkExperienceV2Resolver,
  deleteEducationV2Resolver,
  deleteUserV2Resolver,
  deleteWorkExperienceV2Resolver,
  loginV2Resolver,
  requestEmailVerificationV2Resolver,
  updateAboutSectionV2Resolver,
  updateEducationV2Resolver,
  updateExpertiseSectionV2Resolver,
  updateProfileSectionV2Resolver,
  updateUserV2Resolver,
  updateWorkExperienceV2Resolver,
  verifyEmailV2Resolver,
} from '@/graphql/v2/resolvers/users';
import {
  CreateEducationV2Input,
  CreateUserV2Input,
  CreateWorkExperienceV2Input,
  RequestEmailVerificationV2Input,
  UpdateAboutSectionV2Input,
  UpdateEducationV2Input,
  UpdateExpertiseSectionV2Input,
  UpdateProfileSectionV2Input,
  UpdateUserV2Input,
  UpdateWorkExperienceV2Input,
} from '../inputs/users';
import { EducationV2Type, LoginTypeEnum, WorkExperienceV2Type } from '../types/users';
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
 * Create / Update / Delete Work Experience
 */
builder.mutationFields((t) => ({
  createWorkExperienceV2: t.field({
    type: WorkExperienceV2Type,
    authScopes: { userV2: true },
    args: {
      input: t.arg({
        type: CreateWorkExperienceV2Input,
        required: true,
      }),
    },
    resolve: createWorkExperienceV2Resolver,
    description: 'Create a new work experience',
  }),

  updateWorkExperienceV2: t.field({
    type: WorkExperienceV2Type,
    authScopes: { userV2: true },
    args: {
      input: t.arg({
        type: UpdateWorkExperienceV2Input,
        required: true,
      }),
    },
    resolve: updateWorkExperienceV2Resolver,
    description: 'Update an existing work experience',
  }),

  deleteWorkExperienceV2: t.field({
    type: 'Boolean',
    authScopes: { userV2: true },
    args: {
      id: t.arg.id({
        required: true,
        description: 'Work experience ID to delete',
      }),
    },
    resolve: deleteWorkExperienceV2Resolver,
    description: 'Delete a work experience (hard delete)',
  }),
}));

/**
 * Create / Update / Delete Education
 */
builder.mutationFields((t) => ({
  createEducationV2: t.field({
    type: EducationV2Type,
    authScopes: { userV2: true },
    args: {
      input: t.arg({
        type: CreateEducationV2Input,
        required: true,
      }),
    },
    resolve: createEducationV2Resolver,
    description: 'Create a new education',
  }),

  updateEducationV2: t.field({
    type: EducationV2Type,
    authScopes: { userV2: true },
    args: {
      input: t.arg({
        type: UpdateEducationV2Input,
        required: true,
      }),
    },
    resolve: updateEducationV2Resolver,
    description: 'Update an existing education',
  }),

  deleteEducationV2: t.field({
    type: 'Boolean',
    authScopes: { userV2: true },
    args: {
      id: t.arg.id({
        required: true,
        description: 'Education ID to delete',
      }),
    },
    resolve: deleteEducationV2Resolver,
    description: 'Delete an education (hard delete)',
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
