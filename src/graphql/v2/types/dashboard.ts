import builder from '@/graphql/builder';

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
        description: 'Number of programs with ongoing milestones (applications with in_progress or pending_signature status)',
      }),
    }),
  });

export const BuilderHiringActivityType = builder
  .objectRef<{
    appliedPrograms: number;
    ongoingPrograms: number;
  }>('BuilderHiringActivity')
  .implement({
    fields: (t) => ({
      appliedPrograms: t.exposeInt('appliedPrograms', {
        description: 'Number of programs the builder has applied to (excluding deleted status)',
      }),
      ongoingPrograms: t.exposeInt('ongoingPrograms', {
        description: 'Number of programs with ongoing milestones (applications with in_progress or pending_signature status)',
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
            type: BuilderHiringActivityType,
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