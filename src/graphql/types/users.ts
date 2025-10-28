import { type User as DBUser, keywordTypes, userRoles } from '@/db/schemas';
import builder from '@/graphql/builder';
import { getLinksByUserIdResolver } from '@/graphql/resolvers/links';
import {
  addUserKeywordResolver,
  banUserResolver,
  createUserResolver,
  deleteUserResolver,
  demoteFromAdminResolver,
  getAdminUsersResolver,
  getProfileResolver,
  getUserAvatarResolver,
  getUserByIdResolver,
  getUserInvestmentStatisticsResolver,
  getUserKeywordsByUserIdResolver,
  getUserProgramStatisticsResolver,
  getUsersResolver,
  promoteToAdminResolver,
  removeUserKeywordResolver,
  unbanUserResolver,
  updateProfileResolver,
  updateUserResolver,
} from '@/graphql/resolvers/users';
import { KeywordType, PaginationInput } from '@/graphql/types/common';
import { Link, LinkInput } from '@/graphql/types/links';
import type { InvestmentStatsByStatusType, ProgramStatsByStatusType } from '@/types/users';

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */
export const UserRoleEnum = builder.enumType('UserRole', {
  values: userRoles,
});

export const KeywordTypeEnum = builder.enumType('KeywordType', {
  values: keywordTypes,
});

export const ProgramStatsByStatus = builder
  .objectRef<ProgramStatsByStatusType>('ProgramStatsByStatus')
  .implement({
    fields: (t) => ({
      notConfirmed: t.exposeInt('notConfirmed'),
      confirmed: t.exposeInt('confirmed'),
      published: t.exposeInt('published'),
      paymentRequired: t.exposeInt('paymentRequired'),
      completed: t.exposeInt('completed'),
      refund: t.exposeInt('refund'),
    }),
  });

export const UserProgramStatistics = builder
  .objectRef<{
    asSponsor: ProgramStatsByStatusType;
    asValidator: ProgramStatsByStatusType;
    asBuilder: ProgramStatsByStatusType;
  }>('UserProgramStatistics')
  .implement({
    fields: (t) => ({
      asSponsor: t.field({
        type: ProgramStatsByStatus,
        resolve: (parent) => parent.asSponsor,
      }),
      asValidator: t.field({
        type: ProgramStatsByStatus,
        resolve: (parent) => parent.asValidator,
      }),
      asBuilder: t.field({
        type: ProgramStatsByStatus,
        resolve: (parent) => parent.asBuilder,
      }),
    }),
  });

export const InvestmentStatsByStatus = builder
  .objectRef<InvestmentStatsByStatusType>('InvestmentStatsByStatus')
  .implement({
    fields: (t) => ({
      ready: t.exposeInt('ready'),
      applicationOngoing: t.exposeInt('applicationOngoing'),
      fundingOngoing: t.exposeInt('fundingOngoing'),
      projectOngoing: t.exposeInt('projectOngoing'),
      programCompleted: t.exposeInt('programCompleted'),
      refund: t.exposeInt('refund'),
    }),
  });

export const UserInvestmentStatistics = builder
  .objectRef<{
    asHost: InvestmentStatsByStatusType;
    asProject: InvestmentStatsByStatusType;
    asSupporter: InvestmentStatsByStatusType;
  }>('UserInvestmentStatistics')
  .implement({
    fields: (t) => ({
      asHost: t.field({
        type: InvestmentStatsByStatus,
        resolve: (parent) => parent.asHost,
      }),
      asProject: t.field({
        type: InvestmentStatsByStatus,
        resolve: (parent) => parent.asProject,
      }),
      asSupporter: t.field({
        type: InvestmentStatsByStatus,
        resolve: (parent) => parent.asSupporter,
      }),
    }),
  });

export const User = builder.objectRef<DBUser>('User').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    firstName: t.exposeString('firstName', { nullable: true }),
    lastName: t.exposeString('lastName', { nullable: true }),
    email: t.exposeString('email', { nullable: true }),
    organizationName: t.exposeString('organizationName', { nullable: true }),
    image: t.exposeString('image', { nullable: true }),
    about: t.exposeString('about', { nullable: true }),
    summary: t.exposeString('summary', { nullable: true }),
    loginType: t.exposeString('loginType', { nullable: true }),
    walletAddress: t.exposeString('walletAddress', { nullable: true }),
    role: t.expose('role', { type: UserRoleEnum, nullable: true }),
    banned: t.exposeBoolean('banned'),
    bannedAt: t.expose('bannedAt', { type: 'Date', nullable: true }),
    bannedReason: t.exposeString('bannedReason', { nullable: true }),
    links: t.field({
      type: [Link],
      nullable: true,
      resolve: async (user, _args, ctx) => getLinksByUserIdResolver({}, { userId: user.id }, ctx),
    }),
    avatar: t.field({
      type: 'Upload',
      nullable: true,
      resolve: async (user, _args, ctx) => getUserAvatarResolver({}, { userId: user.id }, ctx),
    }),
    programStatistics: t.field({
      type: UserProgramStatistics,
      nullable: true,
      resolve: async (user, _args, ctx) =>
        getUserProgramStatisticsResolver({}, { userId: user.id }, ctx),
    }),
    investmentStatistics: t.field({
      type: UserInvestmentStatistics,
      nullable: true,
      resolve: async (user, _args, ctx) =>
        getUserInvestmentStatisticsResolver({}, { userId: user.id }, ctx),
    }),
    keywords: t.field({
      type: [KeywordType],
      nullable: true,
      resolve: async (user, _args, ctx) =>
        getUserKeywordsByUserIdResolver({}, { userId: user.id }, ctx),
    }),
    roleKeywords: t.field({
      type: [KeywordType],
      nullable: true,
      resolve: async (user, _args, ctx) =>
        getUserKeywordsByUserIdResolver({}, { userId: user.id, type: 'role' }, ctx),
    }),
    skillKeywords: t.field({
      type: [KeywordType],
      nullable: true,
      resolve: async (user, _args, ctx) =>
        getUserKeywordsByUserIdResolver({}, { userId: user.id, type: 'skill' }, ctx),
    }),
  }),
});

export const PaginatedUsersType = builder
  .objectRef<{ data: DBUser[]; count: number }>('PaginatedUsers')
  .implement({
    fields: (t) => ({
      data: t.field({ type: [User], resolve: (parent) => parent.data }),
      count: t.field({ type: 'Int', resolve: (parent) => parent.count }),
    }),
  });

/* -------------------------------------------------------------------------- */
/*                                   Inputs                                   */
/* -------------------------------------------------------------------------- */
export const UserInput = builder.inputType('UserInput', {
  fields: (t) => ({
    firstName: t.string(),
    lastName: t.string(),
    email: t.string({ required: true, validate: { email: true } }),
    password: t.string({ required: true, validate: { minLength: 8 } }),
    organizationName: t.string(),
    image: t.field({ type: 'Upload' }),
    about: t.string(),
    summary: t.string(),
    links: t.field({ type: [LinkInput] }),
    keywords: t.stringList(),
    loginType: t.string(),
    walletAddress: t.string(),
  }),
});

export const UserUpdateInput = builder.inputType('UserUpdateInput', {
  fields: (t) => ({
    id: t.id({ required: true }),
    firstName: t.string(),
    lastName: t.string(),
    email: t.string({ validate: { email: true } }),
    organizationName: t.string(),
    image: t.field({ type: 'Upload' }),
    about: t.string(),
    summary: t.string(),
    links: t.field({ type: [LinkInput] }),
    keywords: t.stringList(),
    roleKeywords: t.stringList(),
    skillKeywords: t.stringList(),
    loginType: t.string(),
    walletAddress: t.string(),
  }),
});

/* -------------------------------------------------------------------------- */
/*                            Queries and mutations                           */
/* -------------------------------------------------------------------------- */
builder.queryFields((t) => ({
  users: t.field({
    type: PaginatedUsersType,
    args: {
      pagination: t.arg({ type: PaginationInput, required: false }),
    },
    resolve: getUsersResolver,
  }),
  // Admin user management query
  adminUsers: t.field({
    type: PaginatedUsersType,
    authScopes: { admin: true },
    args: {
      pagination: t.arg({ type: PaginationInput, required: false }),
      includesBanned: t.arg.boolean({ required: false }),
      onlyBanned: t.arg.boolean({ required: false }),
      role: t.arg({ type: UserRoleEnum, required: false }),
    },
    resolve: getAdminUsersResolver,
  }),
  user: t.field({
    type: User,
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: getUserByIdResolver,
  }),
  // V1 profile - deprecated, use V2 profile instead
  profile: t.field({
    type: User,
    authScopes: { user: true },
    resolve: getProfileResolver,
    description: 'Get current user profile (deprecated: use profileV2 instead)',
  }),
}));

builder.mutationFields((t) => ({
  createUser: t.field({
    authScopes: { admin: true },
    type: User,
    args: {
      input: t.arg({ type: UserInput, required: true }),
    },
    resolve: createUserResolver,
  }),
  updateUser: t.field({
    authScopes: { admin: true },
    type: User,
    args: {
      input: t.arg({ type: UserUpdateInput, required: true }),
    },
    resolve: updateUserResolver,
  }),
  deleteUser: t.field({
    authScopes: { admin: true },
    type: User,
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: deleteUserResolver,
  }),
  updateProfile: t.field({
    authScopes: { user: true },
    type: User,
    args: {
      input: t.arg({ type: UserUpdateInput, required: true }),
    },
    resolve: updateProfileResolver,
  }),
  addUserKeyword: t.field({
    type: KeywordType,
    authScopes: (_, args) => ({
      self: { userId: args.userId },
      admin: true,
    }),
    args: {
      userId: t.arg.id({ required: true }),
      keyword: t.arg.string({ required: true }),
      type: t.arg({ type: KeywordTypeEnum, required: false }),
    },
    resolve: addUserKeywordResolver,
  }),
  removeUserKeyword: t.field({
    type: 'Boolean',
    authScopes: (_, args) => ({
      self: { userId: args.userId },
      admin: true,
    }),
    args: {
      userId: t.arg.id({ required: true }),
      keyword: t.arg.string({ required: true }),
      type: t.arg({ type: KeywordTypeEnum, required: false }),
    },
    resolve: removeUserKeywordResolver,
  }),
  // User ban management
  banUser: t.field({
    type: User,
    authScopes: { admin: true },
    args: {
      userId: t.arg.id({ required: true }),
      reason: t.arg.string({ required: false }),
    },
    resolve: banUserResolver,
  }),
  unbanUser: t.field({
    type: User,
    authScopes: { admin: true },
    args: {
      userId: t.arg.id({ required: true }),
    },
    resolve: unbanUserResolver,
  }),
  // Role management
  promoteToAdmin: t.field({
    type: User,
    authScopes: { admin: true },
    args: {
      userId: t.arg.id({ required: true }),
    },
    resolve: promoteToAdminResolver,
  }),
  demoteFromAdmin: t.field({
    type: User,
    authScopes: { admin: true },
    args: {
      userId: t.arg.id({ required: true }),
    },
    resolve: demoteFromAdminResolver,
  }),
}));
