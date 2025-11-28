import builder from '@/graphql/builder';

export const ApplicationMilestoneStatusType = builder
  .objectRef<{
    allCompleted: boolean;
    completedCount: number;
    totalCount: number;
  }>('ApplicationMilestoneStatus')
  .implement({
    fields: (t) => ({
      allCompleted: t.exposeBoolean('allCompleted', {
        description: 'Whether all milestones for the application are completed',
      }),
      completedCount: t.exposeInt('completedCount', {
        description: 'Number of completed milestones',
      }),
      totalCount: t.exposeInt('totalCount', {
        description: 'Total number of milestones for the application',
      }),
    }),
  });
