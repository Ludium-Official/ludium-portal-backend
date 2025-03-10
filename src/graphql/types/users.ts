import type { User as DBUser } from '@/db/schemas/users';
import builder from '@/graphql/builder';
import { createUserResolver, getUsersResolver } from '@/graphql/resolvers/users';

const User = builder.objectRef<DBUser>('User');

builder.objectType(User, {
  fields: (t) => ({
    id: t.exposeID('id'),
    email: t.exposeString('email'),
  }),
});

builder.queryType({
  fields: (t) => ({
    users: t.field({
      type: [User],
      resolve: getUsersResolver,
    }),
  }),
});

builder.mutationType({
  fields: (t) => ({
    createUser: t.field({
      authScopes: { admin: true },
      type: User,
      args: {
        email: t.arg.string({ required: true, validate: { email: true } }),
        password: t.arg.string({ required: true, validate: { minLength: 8 } }),
      },
      resolve: createUserResolver,
    }),
  }),
});
