import builder from '@/graphql/builder';
import type { ProgramV2 } from '@/db/schemas';
import { PaginatedProgramV2Type } from './programs';

// Dashboard Overview
export const SponsorHiringActivityType = builder
  .objectRef<{
    openPrograms: number;
    ongoingPrograms: number;
  }>('SponsorHiringActivity')
  .implement({
    fields: (t) => ({
      openPrograms: t.exposeInt('openPrograms', {
        description: 'Number of programs with status open',
      }),
      ongoingPrograms: t.exposeInt('ongoingPrograms', {
        description:
          'Number of programs with ongoing milestones (applications with in_progress or pending_signature status)',
      }),
    }),
  });

export const BuilderJobActivityType = builder
  .objectRef<{
    appliedPrograms: number;
    ongoingPrograms: number;
  }>('BuilderJobActivity')
  .implement({
    fields: (t) => ({
      appliedPrograms: t.exposeInt('appliedPrograms', {
        description: 'Number of programs the builder has applied to (excluding deleted status)',
      }),
      ongoingPrograms: t.exposeInt('ongoingPrograms', {
        description:
          'Number of programs with ongoing milestones (applications with in_progress or pending_signature status)',
      }),
    }),
  });

export const PaymentWeekType = builder
  .objectRef<{
    label: string;
    budget: string;
  }>('PaymentWeek')
  .implement({
    fields: (t) => ({
      label: t.exposeString('label', {
        description: 'Week label (e.g., "1 week", "2 week")',
      }),
      budget: t.exposeString('budget', {
        description: 'Total budget for completed milestones in this week',
      }),
    }),
  });

export const DashboardV2Type = builder
  .objectRef<{
    hiringActivity: { openPrograms: number; ongoingPrograms: number };
    jobActivity: { appliedPrograms: number; ongoingPrograms: number };
    sponsorPaymentOverview: Array<{
      label: string;
      budget: string;
    }>;
    builderPaymentOverview: Array<{
      label: string;
      budget: string;
    }>;
  }>('DashboardV2')
  .implement({
    fields: (t) => ({
      hiringActivity: t.field({
        type: SponsorHiringActivityType,
        resolve: (parent) => parent.hiringActivity,
        description: 'Hiring activity statistics (as sponsor - programs created by user)',
      }),
      jobActivity: t.field({
        type: BuilderJobActivityType,
        resolve: (parent) => parent.jobActivity,
        description: 'Job activity statistics (as builder - programs user has applied to)',
      }),
      sponsorPaymentOverview: t.field({
        type: [PaymentWeekType],
        resolve: (parent) => parent.sponsorPaymentOverview,
        description: 'Payment overview by week for sponsor (4 weeks)',
      }),
      builderPaymentOverview: t.field({
        type: [PaymentWeekType],
        resolve: (parent) => parent.builderPaymentOverview,
        description: 'Payment overview by week for builder (4 weeks)',
      }),
    }),
  });

// Hiring Activity
export const HiringActivityProgramStatusFilterEnum = builder.enumType(
  'HiringActivityProgramStatusFilter',
  {
    values: ['ALL', 'OPEN', 'ONGOING', 'COMPLETED'] as const,
    description: 'Filter for program status: ALL, OPEN, ONGOING, or COMPLETED',
  },
);

export const SponsorHiringActivityCardsType = builder
  .objectRef<{
    all: number;
    open: number;
    ongoing: number;
    completed: number;
  }>('SponsorHiringActivityCards')
  .implement({
    fields: (t) => ({
      all: t.exposeInt('all', {
        description: 'Total number of programs created by sponsor (excluding deleted)',
      }),
      open: t.exposeInt('open', {
        description: 'Number of programs with status open',
      }),
      ongoing: t.exposeInt('ongoing', {
        description:
          'Number of programs with ongoing milestones (applications with in_progress or pending_signature)',
      }),
      completed: t.exposeInt('completed', {
        description: 'Number of programs with status completed',
      }),
    }),
  });

export const HiringActivityV2Type = builder
  .objectRef<{
    cards: { all: number; open: number; ongoing: number; completed: number };
    programs: {
      data: (ProgramV2 & { applicationCount: number })[];
      count: number;
    };
  }>('HiringActivityV2')
  .implement({
    fields: (t) => ({
      cards: t.field({
        type: SponsorHiringActivityCardsType,
        resolve: (parent) => parent.cards,
        description: 'Card data with counts (for sponsor)',
      }),
      programs: t.field({
        type: PaginatedProgramV2Type,
        resolve: (parent) => parent.programs,
        description: 'Paginated list of programs',
      }),
    }),
  });

// Job Activity
export const JobActivityProgramStatusFilterEnum = builder.enumType(
  'JobActivityProgramStatusFilter',
  {
    values: ['APPLIED', 'ONGOING', 'COMPLETED'] as const,
    description: 'Filter for program status: APPLIED, ONGOING or COMPLETED',
  },
);
export const BuilderJobActivityCardsType = builder
  .objectRef<{
    applied: number;
    ongoing: number;
    completed: number;
  }>('BuilderJobActivityCards')
  .implement({
    fields: (t) => ({
      applied: t.exposeInt('applied', {
        description: 'Total number of programs builder has applied to (excluding deleted)',
      }),
      ongoing: t.exposeInt('ongoing', {
        description:
          'Number of programs with ongoing milestones (applications with in_progress or pending_signature)',
      }),
      completed: t.exposeInt('completed', {
        description: 'Number of programs with status completed',
      }),
    }),
  });

export const JobActivityV2Type = builder
  .objectRef<{
    cards: { applied: number; ongoing: number; completed: number };
    programs: {
      data: (ProgramV2 & { appliedAt: Date })[];
      count: number;
    };
  }>('JobActivityV2')
  .implement({
    fields: (t) => ({
      cards: t.field({
        type: BuilderJobActivityCardsType,
        resolve: (parent) => parent.cards,
        description: 'Card data with counts (for builder)',
      }),
      programs: t.field({
        type: PaginatedProgramV2Type,
        resolve: (parent) => parent.programs,
        description: 'Paginated list of programs',
      }),
    }),
  });

// Program Overview
export const MilestoneProgressType = builder
  .objectRef<{
    completed: number;
    total: number;
  }>('MilestoneProgress')
  .implement({
    fields: (t) => ({
      completed: t.exposeInt('completed', {
        description: 'Number of completed milestones',
      }),
      total: t.exposeInt('total', {
        description: 'Total number of milestones',
      }),
    }),
  });

export const UpcomingPaymentType = builder
  .objectRef<{
    builder: {
      profileImage: string | null;
      nickname: string | null;
    };
    payment: Array<{
      deadline: Date;
      payout: string;
      tokenId: number;
    }>;
  }>('UpcomingPayment')
  .implement({
    fields: (t) => ({
      builder: t.field({
        type: builder
          .objectRef<{
            profileImage: string | null;
            nickname: string | null;
          }>('BuilderInfo')
          .implement({
            fields: (t) => ({
              profileImage: t.exposeString('profileImage', { nullable: true }),
              nickname: t.exposeString('nickname', { nullable: true }),
            }),
          }),
        resolve: (parent) => parent.builder,
      }),
      payment: t.field({
        type: [
          builder
            .objectRef<{
              deadline: Date;
              payout: string;
              tokenId: number;
            }>('PaymentInfo')
            .implement({
              fields: (t) => ({
                deadline: t.field({
                  type: 'DateTime',
                  resolve: (parent) => parent.deadline,
                }),
                payout: t.exposeString('payout'),
                tokenId: t.exposeInt('tokenId'),
              }),
            }),
        ],
        resolve: (parent) => parent.payment,
      }),
    }),
  });

export const HiredBuilderV2Type = builder
  .objectRef<{
    id: number;
    role: string;
    nickname: string | null;
    profileImage: string | null;
    status: 'completed' | 'in_progress';
    milestoneCount: number;
    paidAmount: string;
    totalAmount: string;
    tokenId: number;
  }>('HiredBuilderV2')
  .implement({
    fields: (t) => ({
      id: t.exposeInt('id'),
      role: t.exposeString('role'),
      nickname: t.exposeString('nickname', { nullable: true }),
      profileImage: t.exposeString('profileImage', { nullable: true }),
      status: t.exposeString('status'),
      milestoneCount: t.exposeInt('milestoneCount'),
      paidAmount: t.exposeString('paidAmount'),
      totalAmount: t.exposeString('totalAmount'),
      tokenId: t.exposeInt('tokenId'),
    }),
  });

export const BuilderMilestoneV2Type = builder
  .objectRef<{
    id: number;
    title: string | null;
    status: 'draft' | 'under_review' | 'in_progress' | 'completed' | 'update' | null;
    deadline: Date | null;
    payout: string | null;
    tokenId: number;
  }>('BuilderMilestoneV2')
  .implement({
    fields: (t) => ({
      id: t.exposeID('id', {
        description: 'Milestone unique identifier',
      }),
      title: t.exposeString('title', {
        nullable: true,
        description: 'Milestone title',
      }),
      status: t.field({
        type: 'String',
        resolve: (parent) => parent.status,
        description: 'Milestone status',
      }),
      deadline: t.field({
        type: 'DateTime',
        nullable: true,
        resolve: (parent) => parent.deadline,
        description: 'Milestone deadline',
      }),
      payout: t.exposeString('payout', {
        nullable: true,
        description: 'Milestone payout amount',
      }),
      tokenId: t.exposeInt('tokenId', {
        description: 'Token ID for the milestone',
      }),
    }),
  });

export const ProgramOverviewV2Type = builder
  .objectRef<{
    hiredBuilders?: {
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
    };
    milestones?: {
      data: Array<{
        id: number;
        title: string | null;
        status: 'draft' | 'under_review' | 'in_progress' | 'completed' | 'update' | null;
        deadline: Date | null;
        payout: string | null;
        tokenId: number;
      }>;
      count: number;
    };
    milestoneProgress: { completed: number; total: number };
    upcomingPayments: Array<{
      builder: {
        profileImage: string | null;
        nickname: string | null;
      };
      payment: Array<{
        deadline: Date;
        payout: string;
        tokenId: number;
      }>;
    }>;
  }>('ProgramOverviewV2')
  .implement({
    fields: (t) => ({
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
          }>('PaginatedHiredBuildersV2')
          .implement({
            fields: (t) => ({
              data: t.field({
                type: [HiredBuilderV2Type],
                resolve: (parent) => parent.data,
              }),
              count: t.exposeInt('count'),
            }),
          }),
        nullable: true,
        resolve: (parent) => parent.hiredBuilders,
        description: 'List of hired builders (for sponsor)',
      }),
      milestones: t.field({
        type: builder
          .objectRef<{
            data: Array<{
              id: number;
              title: string | null;
              status: 'draft' | 'under_review' | 'in_progress' | 'completed' | 'update' | null;
              deadline: Date | null;
              payout: string | null;
              tokenId: number;
            }>;
            count: number;
          }>('PaginatedBuilderMilestonesV2')
          .implement({
            fields: (t) => ({
              data: t.field({
                type: [BuilderMilestoneV2Type],
                resolve: (parent) => parent.data,
              }),
              count: t.exposeInt('count'),
            }),
          }),
        nullable: true,
        resolve: (parent) => parent.milestones,
        description: 'List of milestones (for builder)',
      }),
      milestoneProgress: t.field({
        type: MilestoneProgressType,
        resolve: (parent) => parent.milestoneProgress,
        description: 'Milestone progress (completed/total)',
      }),
      upcomingPayments: t.field({
        type: [UpcomingPaymentType],
        resolve: (parent) => parent.upcomingPayments,
        description: 'List of upcoming payments (within 7 days based on deadline + 2 days)',
      }),
    }),
  });
