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
      walletAddress: t.arg.string({ required: true }),
      loginType: t.arg.string({ required: true }),
      email: t.arg.string(),
    },
    resolve: loginResolver,
  }),
}));
