import builder from '@/graphql/builder';
import { loginResolver } from '@/graphql/resolvers/auth';
builder.queryFields((_t) => ({}));

builder.mutationFields((t) => ({
  login: t.field({
    type: builder.objectRef('User'),
    args: {
      email: t.arg.string({ required: true }),
      userId: t.arg.string({ required: true }),
    },
    resolve: loginResolver,
  }),
}));
