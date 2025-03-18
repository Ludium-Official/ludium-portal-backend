import type { Context } from '@/types';
import SchemaBuilder from '@pothos/core';
import ScopeAuthPlugin from '@pothos/plugin-scope-auth';
import ValidationPlugin from '@pothos/plugin-validation';
import { DateResolver, DateTimeResolver, JSONResolver } from 'graphql-scalars';

const builder = new SchemaBuilder<{
  Context: Context;
  AuthScopes: {
    user: boolean;
    admin: boolean;
    sponsor: boolean;
    validator: boolean;
    builder: boolean;
  };
  Scalars: {
    DateTime: {
      Input: Date;
      Output: Date;
    };
    Date: {
      Input: Date;
      Output: Date;
    };
    JSON: {
      Input: JSON;
      Output: JSON;
    };
  };
}>({
  plugins: [ScopeAuthPlugin, ValidationPlugin],
  scopeAuth: {
    authorizeOnSubscribe: true,
    authScopes: async (context) => ({
      user: context.server.auth.isUser(context.request),
      admin: context.server.auth.isAdmin(context.request),
      sponsor: context.server.auth.isSponsor(context.request),
      validator: context.server.auth.isValidator(context.request),
      builder: context.server.auth.isBuilder(context.request),
    }),
  },
  validationOptions: {
    validationError: (zodError, _args, _context, _info) => {
      return zodError;
    },
  },
});

builder.addScalarType('DateTime', DateTimeResolver);
builder.addScalarType('Date', DateResolver);
builder.addScalarType('JSON', JSONResolver);

builder.queryType({});
builder.mutationType({});

export default builder;
