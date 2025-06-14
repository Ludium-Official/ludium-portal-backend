import type { User as DBUser } from '@/db/schemas';
import builder from '@/graphql/builder';
import { getLinksByUserIdResolver } from '@/graphql/resolvers/links';
import {
  createUserResolver,
  deleteUserResolver,
  getProfileResolver,
  getUserAvatarResolver,
  getUserByIdResolver,
  getUsersResolver,
  updateProfileResolver,
  updateUserResolver,
} from '@/graphql/resolvers/users';
import { PaginationInput } from '@/graphql/types/common';
import { Link, LinkInput } from '@/graphql/types/links';

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */
export const User = builder.objectRef<DBUser>('User').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    firstName: t.exposeString('firstName', { nullable: true }),
    lastName: t.exposeString('lastName', { nullable: true }),
    email: t.exposeString('email'),
    organizationName: t.exposeString('organizationName', { nullable: true }),
    image: t.exposeString('image', { nullable: true }),
    about: t.exposeString('about', { nullable: true }),
    summary: t.exposeString('summary'),
    loginType: t.exposeString('loginType', { nullable: true }),
    walletAddress: t.exposeString('walletAddress', { nullable: true }),
    isAdmin: t.exposeBoolean('isAdmin'),
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
  user: t.field({
    type: User,
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: getUserByIdResolver,
  }),
  profile: t.field({
    type: User,
    authScopes: { user: true },
    resolve: getProfileResolver,
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
}));
