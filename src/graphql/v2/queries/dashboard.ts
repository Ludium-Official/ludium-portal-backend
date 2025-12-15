import builder from '@/graphql/builder';
import { getDashboardV2Resolver } from '@/graphql/v2/resolvers/dashboard';
import { DashboardV2Type } from '../types/dashboard';

builder.queryFields((t) => ({
  dashboardV2: t.field({
    type: DashboardV2Type,
    authScopes: { userV2: true },
    resolve: getDashboardV2Resolver,
    description: 'Get dashboard data for current authenticated user',
  }),
}));