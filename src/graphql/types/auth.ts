import builder from '@/graphql/builder';
import { loginResolver } from '@/graphql/resolvers/auth';

export interface LoginResponse {
  token: string;
  userRoles: string[];
}

export const LoginResponseType = builder.objectRef<LoginResponse>('LoginResponse').implement({
  fields: (t) => ({
    token: t.exposeString('token'),
    userRoles: t.exposeStringList('userRoles'),
  }),
});

builder.queryFields((_t) => ({}));

builder.mutationFields((t) => ({
  login: t.field({
    type: LoginResponseType,
    args: {
      email: t.arg.string({ required: true }),
      userId: t.arg.string({ required: true }),
    },
    resolve: loginResolver,
  }),
}));
