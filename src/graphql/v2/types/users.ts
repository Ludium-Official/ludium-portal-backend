import { programsV2Table } from '@/db/schemas/v2/programs';
import { type UserV2 as DBUser, loginTypesV2, userV2Roles } from '@/db/schemas/v2/users';
import builder from '@/graphql/builder';
import type { Context } from '@/types';
import { eq } from 'drizzle-orm';
import { ProgramV2Type } from './programs';
import type { LanguageV2 } from '@/db/schemas/v2/user-language';
import type { WorkExperienceV2 } from '@/db/schemas/v2/user-work-experiences';
import type { EducationV2 } from '@/db/schemas/v2/user-educations';

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
 * User V2 Object Reference
 * Export this to avoid circular dependencies
 */
export const UserV2Ref = builder.objectRef<DBUser>('UserV2');

/**
 * User V2 GraphQL type
 * Represents a user entity with all its properties
 */
export const UserV2Type = UserV2Ref.implement({
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
    email: t.exposeString('email', {
      nullable: true,
      description: 'User email address',
    }),
    walletAddress: t.exposeString('walletAddress', {
      description: 'User wallet address',
    }),

    // Profile fields
    profileImage: t.exposeString('profileImage', {
      nullable: true,
      description: 'User profile image URL',
    }),
    nickname: t.exposeString('nickname', {
      nullable: true,
      description: 'User nickname',
    }),
    location: t.exposeString('location', {
      nullable: true,
      description: 'User location/timezone (e.g., "(GMT+09:00) Korea Standard Time - Seoul")',
    }),

    about: t.exposeString('about', {
      nullable: true,
      description: 'User about (max 1000)',
    }),

    userRole: t.exposeString('userRole', {
      nullable: true,
      description: 'User professional role (e.g., "Web Developer")',
    }),
    skills: t.exposeStringList('skills', {
      nullable: true,
      description: 'User skills list',
    }),

    // Relations - DataLoader
    languages: t.field({
      type: [LanguageV2Type],
      description: 'User languages',
      resolve: async (user, _args, ctx: Context) => {
        return await ctx.loaders.languages.load(user.id);
      },
    }),
    workExperiences: t.field({
      type: [WorkExperienceV2Type],
      description: 'User work experiences',
      resolve: async (user, _args, ctx: Context) => {
        return await ctx.loaders.workExperiences.load(user.id);
      },
    }),
    educations: t.field({
      type: [EducationV2Type],
      description: 'User education history',
      resolve: async (user, _args, ctx: Context) => {
        return await ctx.loaders.educations.load(user.id);
      },
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

    // Relations - User's created programs
    createdPrograms: t.field({
      type: [ProgramV2Type],
      description: 'Programs created by this user',
      resolve: async (user, _args, ctx: Context) => {
        // Fetch programs created by this user
        const programs = await ctx.db
          .select()
          .from(programsV2Table)
          .where(eq(programsV2Table.sponsorId, user.id));
        return programs ?? [];
      },
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

export const LanguageV2Ref = builder.objectRef<LanguageV2>('LanguageV2');
export const LanguageV2Type = LanguageV2Ref.implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    userId: t.exposeInt('userId'),
    language: t.exposeString('language'),
    proficiency: t.exposeString('proficiency'),
  }),
});

export const WorkExperienceV2Ref = builder.objectRef<WorkExperienceV2>('WorkExperienceV2');
export const WorkExperienceV2Type = WorkExperienceV2Ref.implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    userId: t.exposeInt('userId'),
    company: t.exposeString('company'),
    role: t.exposeString('role'),
    employmentType: t.exposeString('employmentType'),
    currentWork: t.exposeBoolean('currentWork'),
    startYear: t.exposeInt('startYear'),
    startMonth: t.exposeString('startMonth', { nullable: true }),
    endYear: t.exposeInt('endYear', { nullable: true }),
    endMonth: t.exposeString('endMonth', { nullable: true }),
  }),
});

export const EducationV2Ref = builder.objectRef<EducationV2>('EducationV2');
export const EducationV2Type = EducationV2Ref.implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    userId: t.exposeInt('userId'),
    school: t.exposeString('school'),
    degree: t.exposeString('degree', { nullable: true }),
    study: t.exposeString('study', { nullable: true }),
    attendedStartDate: t.exposeInt('attendedStartDate', { nullable: true }),
    attendedEndDate: t.exposeInt('attendedEndDate', { nullable: true }),
  }),
});
