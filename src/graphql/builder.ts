import type { Context, UploadFile } from '@/types';
import { isPromise } from '@/utils';
import SchemaBuilder from '@pothos/core';
import ScopeAuthPlugin from '@pothos/plugin-scope-auth';
import ValidationPlugin from '@pothos/plugin-validation';
import { GraphQLError, GraphQLScalarType } from 'graphql';
import { DateResolver, DateTimeResolver, JSONResolver } from 'graphql-scalars';

const GraphQLUpload = new GraphQLScalarType({
  name: 'Upload',
  parseValue: (value: unknown) => {
    if (
      value != null &&
      typeof value === 'object' &&
      'promise' in value &&
      isPromise(value.promise)
    ) {
      return value.promise;
    }
    if (isPromise(value)) {
      return value;
    }
    throw new GraphQLError('Upload value invalid.', {});
  },
  serialize: (value: unknown) => value as Promise<UploadFile>,
  parseLiteral: (ast) => {
    throw new GraphQLError('Upload literal unsupported.', { nodes: ast });
  },
});

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
    Upload: {
      Input: Promise<UploadFile>;
      Output: Promise<UploadFile | null>;
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
builder.addScalarType('Upload', GraphQLUpload);

builder.queryType({});
builder.mutationType({});

export default builder;
