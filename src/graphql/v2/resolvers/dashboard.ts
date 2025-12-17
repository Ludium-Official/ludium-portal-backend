import { programsV2Table } from '@/db/schemas/v2/programs';
import { DashboardV2Service } from '@/graphql/v2/services/dashboard.service';
import type { Context, Root } from '@/types';
import { eq, sql } from 'drizzle-orm';
import type { HiringActivityV2Input, ProgramOverviewV2Input } from '@/graphql/v2/inputs/dashboard';

export async function getDashboardV2Resolver(
  _root: Root,
  _args: Record<string, never>,
  ctx: Context,
) {
  if (!ctx.userV2) {
    throw new Error('Unauthorized');
  }

  const service = new DashboardV2Service(ctx.db, ctx.server);
  const userId = ctx.userV2.id;

  const [hiringActivity, jobActivity, sponsorPaymentOverview, builderPaymentOverview] =
    await Promise.all([
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

export async function getHiringActivityV2Resolver(
  _root: Root,
  args: { input: typeof HiringActivityV2Input.$inferInput },
  ctx: Context,
) {
  if (!ctx.userV2) {
    throw new Error('Unauthorized');
  }

  const service = new DashboardV2Service(ctx.db, ctx.server);
  const userId = ctx.userV2.id;
  const { status, search, pagination } = args.input;
  const statusFilter: 'ALL' | 'OPEN' | 'ONGOING' | 'COMPLETED' = status ?? 'ALL';

  const paginationOptions = pagination
    ? {
        limit: pagination.limit ?? undefined,
        offset: pagination.offset ?? undefined,
      }
    : undefined;

  // Check if user is sponsor
  const [sponsorCheck] = await ctx.db
    .select({ count: sql<number>`count(*)` })
    .from(programsV2Table)
    .where(eq(programsV2Table.sponsorId, userId));

  const isSponsor = sponsorCheck && Number(sponsorCheck.count) > 0;

  if (!isSponsor) {
    return {
      cards: { all: 0, open: 0, ongoing: 0, completed: 0 },
      programs: { data: [], count: 0 },
    };
  }

  const [cards, programs] = await Promise.all([
    service.getSponsorHiringActivityCards(userId),
    service.getSponsorHiringActivityPrograms(
      userId,
      statusFilter,
      paginationOptions,
      search ?? undefined,
    ),
  ]);

  return {
    cards,
    programs,
  };
}

export async function getProgramOverviewV2Resolver(
  _root: Root,
  args: { input: typeof ProgramOverviewV2Input.$inferInput },
  ctx: Context,
) {
  if (!ctx.userV2) {
    throw new Error('Unauthorized');
  }

  const service = new DashboardV2Service(ctx.db, ctx.server);
  const userId = ctx.userV2.id;
  const { programId, pagination } = args.input;

  const paginationOptions = pagination
    ? {
        limit: pagination.limit ?? undefined,
        offset: pagination.offset ?? undefined,
      }
    : undefined;

  // Check if user is sponsor (has created this program)
  const [sponsorCheck] = await ctx.db
    .select({ count: sql<number>`count(*)` })
    .from(programsV2Table)
    .where(eq(programsV2Table.id, programId));

  const isSponsor = sponsorCheck && Number(sponsorCheck.count) > 0;

  if (isSponsor) {
    // Sponsor view: hired builders, milestone progress, upcoming payments
    const [hiredBuilders, milestoneProgress, upcomingPayments] = await Promise.all([
      service.getHiredBuilders(programId, userId, paginationOptions),
      service.getMilestoneProgress(programId, userId, true),
      service.getUpcomingPayments(programId, userId, true),
    ]);

    return {
      hiredBuilders,
      milestones: undefined,
      milestoneProgress,
      upcomingPayments,
    };
  }

  // Builder view: milestones, milestone progress, upcoming payments
  const [milestones, milestoneProgress, upcomingPayments] = await Promise.all([
    service.getBuilderMilestones(programId, userId, paginationOptions),
    service.getMilestoneProgress(programId, userId, false),
    service.getUpcomingPayments(programId, userId, false),
  ]);

  return {
    hiredBuilders: undefined,
    milestones,
    milestoneProgress,
    upcomingPayments,
  };
}
