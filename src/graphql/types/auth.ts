import builder from '@/graphql/builder';
import { loginResolver } from '@/graphql/resolvers/auth';

export interface LoginResponse {
  token: string;
  userRoles: string[];
}

builder.queryFields((_t) => ({}));

builder.mutationFields((t) => ({
  login: t.field({
    type: 'String',
    args: {
      email: t.arg.string({ required: true }),
      userId: t.arg.id({ required: true }),
    },
    resolve: loginResolver,
  }),
}));
