import builder from '@/graphql/builder';
import {
  getApplicationV2Resolver,
  getApplicationsByProgramV2Resolver,
  getApplicationsV2Resolver,
  getMyApplicationsV2Resolver,
} from '@/graphql/v2/resolvers/applications';
import {
  ApplicationsByProgramV2QueryInput,
  ApplicationsV2QueryInput,
  MyApplicationsV2QueryInput,
} from '../inputs/applications';
import { ApplicationV2Type, PaginatedApplicationsV2Type } from '../types/applications';

builder.queryFields((t) => ({
  applicationV2: t.field({
    type: ApplicationV2Type,
    args: {
      id: t.arg.id({
        required: true,
        description: 'Application ID',
      }),
    },
    resolve: getApplicationV2Resolver,
    description: 'Get a single application by ID',
  }),
}));

builder.queryFields((t) => ({
  applicationsV2: t.field({
    type: PaginatedApplicationsV2Type,
    args: {
      query: t.arg({
        type: ApplicationsV2QueryInput,
        description: 'Query options including pagination and filtering',
      }),
    },
    resolve: getApplicationsV2Resolver,
    description: 'Get paginated list of applications with filtering options',
  }),
  applicationsByProgramV2: t.field({
    type: PaginatedApplicationsV2Type,
    authScopes: { userV2: true },
    args: {
      query: t.arg({
        type: ApplicationsByProgramV2QueryInput,
        required: true,
        description: 'Program ID and pagination options',
      }),
    },
    resolve: getApplicationsByProgramV2Resolver,
    description: 'Get all applications for a specific program (only by program creator)',
  }),
  myApplicationsV2: t.field({
    type: PaginatedApplicationsV2Type,
    authScopes: { userV2: true },
    args: {
      query: t.arg({
        type: MyApplicationsV2QueryInput,
        description: 'Pagination options',
      }),
    },
    resolve: getMyApplicationsV2Resolver,
    description: 'Get all applications submitted by the current user',
  }),
}));
