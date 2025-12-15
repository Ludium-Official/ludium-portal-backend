import type { Context, Root } from '@/types';
import { DashboardV2Service } from '@/graphql/v2/services/dashboard.service';

export async function getDashboardV2Resolver(_root: Root, _args: {}, ctx: Context) {
  if (!ctx.userV2) {
    throw new Error('Unauthorized');
  }

  const service = new DashboardV2Service(ctx.db, ctx.server);
  const userId = ctx.userV2.id;

  const [hiringActivity, jobActivity, sponsorPaymentOverview, builderPaymentOverview] = await Promise.all([
    service.getSponsorHiringActivity(userId),
    service.getBuilderHiringActivity(userId),
    service.getSponsorPaymentOverview(userId),
    service.getBuilderPaymentOverview(userId),
  ]);

  return {
    hiringActivity,
    jobActivity,
    sponsorPaymentOverview,
    builderPaymentOverview,
  };
}