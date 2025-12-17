import builder from '@/graphql/builder';
import {
  getDashboardV2Resolver,
  getHiringActivityV2Resolver,
  getJobActivityV2Resolver,
  getProgramOverviewV2Resolver,
} from '@/graphql/v2/resolvers/dashboard';
import {
  HiringActivityV2Input,
  JobActivityV2Input,
  ProgramOverviewV2Input,
} from '../inputs/dashboard';
import {
  DashboardV2Type,
  HiringActivityV2Type,
  JobActivityV2Type,
  ProgramOverviewV2Type,
} from '../types/dashboard';

builder.queryFields((t) => ({
  dashboardV2: t.field({
    type: DashboardV2Type,
    authScopes: { userV2: true },
    resolve: getDashboardV2Resolver,
    description: 'Get dashboard data for current authenticated user',
  }),
  hiringActivityV2: t.field({
    type: HiringActivityV2Type,
    authScopes: { userV2: true },
    args: {
      input: t.arg({
        type: HiringActivityV2Input,
        required: true,
        description: 'Hiring activity query input (status filter, pagination)',
      }),
    },
    resolve: getHiringActivityV2Resolver,
    description: 'Get hiring activity data (cards and programs list)',
  }),
  jobActivityV2: t.field({
    type: JobActivityV2Type,
    authScopes: { userV2: true },
    args: {
      input: t.arg({
        type: JobActivityV2Input,
        required: true,
        description: 'Job activity query input (status filter, pagination)',
      }),
    },
    resolve: getJobActivityV2Resolver,
    description: 'Get job activity data (cards and programs list)',
  }),
  programOverviewV2: t.field({
    type: ProgramOverviewV2Type,
    authScopes: { userV2: true },
    args: {
      input: t.arg({
        type: ProgramOverviewV2Input,
        required: true,
        description: 'Program overview query input (programId, pagination)',
      }),
    },
    resolve: getProgramOverviewV2Resolver,
    description:
      'Get program overview data (hired builders/milestones, milestone progress, upcoming payments)',
  }),
}));
