import builder from '@/graphql/builder';
import {
  getBuilderMilestonesResolver,
  getBuilderPaymentOverviewResolver,
  getHiredBuildersResolver,
  getHiringActivityCardsResolver,
  getHiringActivityProgramsResolver,
  getHiringActivityResolver,
  getJobActivityCardsResolver,
  getJobActivityProgramsResolver,
  getJobActivityResolver,
  getMilestoneProgressResolver,
  getSponsorPaymentOverviewResolver,
  getUpcomingPaymentsResolver,
} from '@/graphql/v2/resolvers/dashboard';
import {
  BuilderMilestonesInput,
  HiredBuildersInput,
  HiringActivityProgramsInput,
  JobActivityProgramsInput,
  MilestoneProgressInput,
  UpcomingPaymentsInput,
} from '../inputs/dashboard';
import {
  BuilderJobActivityCardsType,
  BuilderJobActivityType,
  BuilderMilestoneV2Type,
  HiredBuilderV2Type,
  MilestoneProgressType,
  PaymentWeekType,
  SponsorHiringActivityCardsType,
  SponsorHiringActivityType,
  UpcomingPaymentType,
} from '../types/dashboard';
import { PaginatedProgramV2Type } from '../types/programs';

builder.queryFields((t) => ({
  // Dashboard Overview
  hiringActivity: t.field({
    type: SponsorHiringActivityType,
    authScopes: { userV2: true },
    resolve: getHiringActivityResolver,
    description: 'Get hiring activity statistics (as sponsor - programs created by user)',
  }),
  jobActivity: t.field({
    type: BuilderJobActivityType,
    authScopes: { userV2: true },
    resolve: getJobActivityResolver,
    description: 'Get job activity statistics (as builder - programs user has applied to)',
  }),
  sponsorPaymentOverview: t.field({
    type: [PaymentWeekType],
    authScopes: { userV2: true },
    resolve: getSponsorPaymentOverviewResolver,
    description: 'Get payment overview by week for sponsor (4 weeks)',
  }),
  builderPaymentOverview: t.field({
    type: [PaymentWeekType],
    authScopes: { userV2: true },
    resolve: getBuilderPaymentOverviewResolver,
    description: 'Get payment overview by week for builder (4 weeks)',
  }),

  // Hiring Activity
  hiringActivityCards: t.field({
    type: SponsorHiringActivityCardsType,
    authScopes: { userV2: true },
    resolve: getHiringActivityCardsResolver,
    description: 'Get hiring activity cards (counts for sponsor)',
  }),
  hiringActivityPrograms: t.field({
    type: PaginatedProgramV2Type,
    authScopes: { userV2: true },
    args: {
      input: t.arg({
        type: HiringActivityProgramsInput,
        required: true,
        description: 'Hiring activity programs query input (status filter, pagination)',
      }),
    },
    resolve: getHiringActivityProgramsResolver,
    description: 'Get hiring activity programs list',
  }),

  // Job Activity
  jobActivityCards: t.field({
    type: BuilderJobActivityCardsType,
    authScopes: { userV2: true },
    resolve: getJobActivityCardsResolver,
    description: 'Get job activity cards (counts for builder)',
  }),
  jobActivityPrograms: t.field({
    type: PaginatedProgramV2Type,
    authScopes: { userV2: true },
    args: {
      input: t.arg({
        type: JobActivityProgramsInput,
        required: true,
        description: 'Job activity programs query input (status filter, pagination)',
      }),
    },
    resolve: getJobActivityProgramsResolver,
    description: 'Get job activity programs list',
  }),

  // Program Overview
  hiredBuilders: t.field({
    type: builder
      .objectRef<{
        data: Array<{
          id: number;
          role: string;
          nickname: string | null;
          profileImage: string | null;
          status: 'completed' | 'in_progress';
          milestoneCount: number;
          paidAmount: string;
          totalAmount: string;
          tokenId: number;
        }>;
        count: number;
      }>('PaginatedHiredBuilders')
      .implement({
        fields: (t) => ({
          data: t.field({
            type: [HiredBuilderV2Type],
            resolve: (parent) => parent.data,
          }),
          count: t.exposeInt('count'),
        }),
      }),
    authScopes: { userV2: true },
    args: {
      input: t.arg({
        type: HiredBuildersInput,
        required: true,
        description: 'Hired builders query input (programId, pagination)',
      }),
    },
    resolve: getHiredBuildersResolver,
    description: 'Get list of hired builders (for sponsor)',
  }),
  builderMilestones: t.field({
    type: builder
      .objectRef<{
        data: Array<{
          id: number;
          title: string | null;
          status: 'draft' | 'under_review' | 'in_progress' | 'completed' | 'update' | null;
          deadline: Date | null;
          paidAmount: string;
          unpaidAmount: string;
          tokenId: number;
        }>;
        count: number;
      }>('PaginatedBuilderMilestones')
      .implement({
        fields: (t) => ({
          data: t.field({
            type: [BuilderMilestoneV2Type],
            resolve: (parent) => parent.data,
          }),
          count: t.exposeInt('count'),
        }),
      }),
    authScopes: { userV2: true },
    args: {
      input: t.arg({
        type: BuilderMilestonesInput,
        required: true,
        description: 'Builder milestones query input (programId, pagination)',
      }),
    },
    resolve: getBuilderMilestonesResolver,
    description: 'Get list of milestones (for builder)',
  }),
  milestoneProgress: t.field({
    type: MilestoneProgressType,
    authScopes: { userV2: true },
    args: {
      input: t.arg({
        type: MilestoneProgressInput,
        required: true,
        description: 'Milestone progress query input (programId)',
      }),
    },
    resolve: getMilestoneProgressResolver,
    description: 'Get milestone progress (completed/total)',
  }),
  upcomingPayments: t.field({
    type: [UpcomingPaymentType],
    authScopes: { userV2: true },
    args: {
      input: t.arg({
        type: UpcomingPaymentsInput,
        required: true,
        description: 'Upcoming payments query input (programId)',
      }),
    },
    resolve: getUpcomingPaymentsResolver,
    description: 'Get list of upcoming payments (within 7 days based on deadline + 2 days)',
  }),
}));
