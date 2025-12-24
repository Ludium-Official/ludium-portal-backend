import builder from '@/graphql/builder';
import {
  getMyPortfoliosV2Resolver,
  getPortfolioV2Resolver,
  getPortfoliosByUserIdV2Resolver,
} from '@/graphql/v2/resolvers/portfolios';
import { PortfolioV2Type } from '../types/portfolios';

builder.queryFields((t) => ({
  portfolioV2: t.field({
    type: PortfolioV2Type,
    args: {
      id: t.arg.id({
        required: true,
        description: 'Portfolio ID',
      }),
    },
    resolve: getPortfolioV2Resolver,
    description: 'Get a single portfolio by ID',
  }),

  portfoliosByUserIdV2: t.field({
    type: [PortfolioV2Type],
    authScopes: { userV2: true },
    args: {
      userId: t.arg.id({
        required: true,
        description: 'User ID to get portfolios for',
      }),
    },
    resolve: getPortfoliosByUserIdV2Resolver,
    description: 'Get all portfolios for a specific user',
  }),

  myPortfoliosV2: t.field({
    type: [PortfolioV2Type],
    authScopes: { userV2: true },
    resolve: getMyPortfoliosV2Resolver,
    description: 'Get all portfolios for the current authenticated user',
  }),
}));
