import type { Context } from '@/types';
import SchemaBuilder from '@pothos/core';
import ScopeAuthPlugin from '@pothos/plugin-scope-auth';
import ValidationPlugin from '@pothos/plugin-validation';

const builder = new SchemaBuilder<{
  Context: Context;
  AuthScopes: {
    public: boolean;
    user: boolean;
    admin: boolean;
  };
}>({
  plugins: [ScopeAuthPlugin, ValidationPlugin],
  authScopes: async (context) => ({
    public: true,
    user: context.server.auth.isUser(context.request),
    admin: context.server.auth.isAdmin(context.request),
  }),
  scopeAuthOptions: {
    authorizeOnSubscribe: true,
  },
  validationOptions: {
    validationError: (zodError, _args, _context, _info) => {
      return zodError;
    },
  },
});

export default builder;
