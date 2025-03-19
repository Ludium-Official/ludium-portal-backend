import type { Role as DBRole, User as DBUser } from '@/db/schemas/users';
import builder from '@/graphql/builder';
import {
  createUserResolver,
  deleteUserResolver,
  getRolesResolver,
  getUserResolver,
  getUsersByRoleResolver,
  getUsersResolver,
  updateUserResolver,
} from '@/graphql/resolvers/users';

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */
export const Link = builder.objectRef<{ url: string; title: string }>('Link').implement({
  fields: (t) => ({
    url: t.exposeString('url'),
    title: t.exposeString('title'),
  }),
});

export const Role = builder.objectRef<DBRole>('Role').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    name: t.exposeString('name'),
    description: t.exposeString('description', { nullable: true }),
  }),
});

export const User = builder.objectRef<DBUser>('User').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    firstName: t.exposeString('firstName', { nullable: true }),
    lastName: t.exposeString('lastName', { nullable: true }),
    email: t.exposeString('email'),
    organizationName: t.exposeString('organizationName', { nullable: true }),
    image: t.exposeString('image', { nullable: true }),
    about: t.exposeString('about', { nullable: true }),
    links: t.field({
      type: [Link],
      nullable: true,
      resolve: (user) => user.links || [],
    }),
  }),
});

/* -------------------------------------------------------------------------- */
/*                                   Inputs                                   */
/* -------------------------------------------------------------------------- */
export const LinkInput = builder.inputType('LinkInput', {
  fields: (t) => ({
    url: t.string(),
    title: t.string(),
  }),
});

export const UserInput = builder.inputType('UserInput', {
  fields: (t) => ({
    firstName: t.string(),
    lastName: t.string(),
    email: t.string({ required: true, validate: { email: true } }),
    password: t.string({ required: true, validate: { minLength: 8 } }),
    organizationName: t.string(),
    image: t.string(),
    about: t.string(),
    links: t.field({ type: [LinkInput] }),
  }),
});

export const UserUpdateInput = builder.inputType('UserUpdateInput', {
  fields: (t) => ({
    id: t.id({ required: true }),
    firstName: t.string(),
    lastName: t.string(),
    organizationName: t.string(),
    image: t.string(),
    about: t.string(),
    links: t.field({ type: [LinkInput] }),
  }),
});

/* -------------------------------------------------------------------------- */
/*                            Queries and mutations                           */
/* -------------------------------------------------------------------------- */
builder.queryFields((t) => ({
  users: t.field({
    authScopes: { admin: true },
    type: [User],
    resolve: getUsersResolver,
  }),
  user: t.field({
    authScopes: { admin: true },
    type: User,
    nullable: true,
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: getUserResolver,
  }),
  roles: t.field({
    authScopes: { admin: true },
    type: [Role],
    resolve: getRolesResolver,
  }),
  usersByRole: t.field({
    authScopes: { sponsor: true },
    type: [User],
    args: {
      role: t.arg.string({ required: true }),
    },
    resolve: getUsersByRoleResolver,
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
}));
