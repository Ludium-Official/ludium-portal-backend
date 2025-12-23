import builder from '@/graphql/builder';
import {
  createPortfolioV2Resolver,
  deletePortfolioV2Resolver,
  updatePortfolioV2Resolver,
} from '@/graphql/v2/resolvers/portfolios';
import { CreatePortfolioV2Input, UpdatePortfolioV2Input } from '../inputs/portfolios';
import { PortfolioV2Type } from '../types/portfolios';

builder.mutationField('createPortfolioV2', (t) =>
  t.field({
    type: PortfolioV2Type,
    authScopes: { userV2: true },
    args: {
      input: t.arg({
        type: CreatePortfolioV2Input,
        required: true,
        description: 'Portfolio creation input',
      }),
    },
    resolve: createPortfolioV2Resolver,
    description: 'Create a new portfolio',
  }),
);

builder.mutationField('updatePortfolioV2', (t) =>
  t.field({
    type: PortfolioV2Type,
    authScopes: { userV2: true },
    args: {
      input: t.arg({
        type: UpdatePortfolioV2Input,
        required: true,
        description: 'Portfolio update input',
      }),
    },
    resolve: updatePortfolioV2Resolver,
    description: 'Update an existing portfolio',
  }),
);

builder.mutationField('deletePortfolioV2', (t) =>
  t.field({
    type: 'Boolean',
    authScopes: { userV2: true },
    args: {
      id: t.arg.id({
        required: true,
        description: 'Portfolio ID to delete',
      }),
    },
    resolve: deletePortfolioV2Resolver,
    description: 'Delete a portfolio (hard delete)',
  }),
);
