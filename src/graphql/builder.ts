import type { Context, UploadFile } from '@/types';
import { isPromise } from '@/utils';
import SchemaBuilder from '@pothos/core';
import ScopeAuthPlugin from '@pothos/plugin-scope-auth';
import SmartSubscriptionsPlugin, {
  subscribeOptionsFromIterator,
} from '@pothos/plugin-smart-subscriptions';
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
    programSponsor: {
      programId: string;
    };
    programValidator: {
      programId: string;
    };
    programBuilder: {
      applicationId: string;
    };
    milestoneBuilder: {
      milestoneId: string;
    };
    programParticipant: {
      programId: string;
    };
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
  plugins: [ScopeAuthPlugin, ValidationPlugin, SmartSubscriptionsPlugin],
  scopeAuth: {
    authorizeOnSubscribe: true,
    authScopes: async (context) => ({
      user: context.server.auth.isUser(context.request),
      admin: context.server.auth.isAdmin(context.request),
      programSponsor: async ({ programId }) => {
        return await context.server.auth.isProgramSponsor(context.request, programId);
      },
      programValidator: async ({ programId }) => {
        return await context.server.auth.isProgramValidator(context.request, programId);
      },
      programBuilder: async ({ applicationId }) => {
        return await context.server.auth.isProgramBuilder(context.request, applicationId);
      },
      milestoneBuilder: async ({ milestoneId }) => {
        return await context.server.auth.isMilestoneBuilder(context.request, milestoneId);
      },
      programParticipant: async ({ programId }) => {
        const roles = await context.server.auth.getProgramRoles(context.request, programId);
        return roles.length > 0;
      },
    }),
  },
  validationOptions: {
    validationError: (zodError, _args, _context, _info) => {
      return zodError;
    },
  },
  smartSubscriptions: {
    ...subscribeOptionsFromIterator((name, ctx) => ctx.server.pubsub.asyncIterableIterator(name)),
  },
});

builder.addScalarType('DateTime', DateTimeResolver);
builder.addScalarType('Date', DateResolver);
builder.addScalarType('JSON', JSONResolver);
builder.addScalarType('Upload', GraphQLUpload);

builder.queryType({});
builder.mutationType({});
builder.subscriptionType({});

export default builder;
