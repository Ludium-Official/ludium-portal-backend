import { programsV2Table } from '@/db/schemas/v2/programs';
import { DashboardV2Service } from '@/graphql/v2/services/dashboard.service';
import type { Context, Root } from '@/types';
import { and, eq, sql } from 'drizzle-orm';
import type {
  HiringActivityProgramsInput,
  JobActivityProgramsInput,
  HiredBuildersInput,
  BuilderMilestonesInput,
  MilestoneProgressInput,
  UpcomingPaymentsInput,
} from '@/graphql/v2/inputs/dashboard';

// Dashboard Overview
export async function getHiringActivityResolver(
  _root: Root,
  _args: Record<string, never>,
  ctx: Context,
) {
  if (!ctx.userV2) {
    throw new Error('Unauthorized');
  }
  const service = new DashboardV2Service(ctx.db, ctx.server);
  return await service.getSponsorHiringActivity(ctx.userV2.id);
}

export async function getJobActivityResolver(
  _root: Root,
  _args: Record<string, never>,
  ctx: Context,
) {
  if (!ctx.userV2) {
    throw new Error('Unauthorized');
  }
  const service = new DashboardV2Service(ctx.db, ctx.server);
  return await service.getBuilderHiringActivity(ctx.userV2.id);
}

export async function getSponsorPaymentOverviewResolver(
  _root: Root,
  _args: Record<string, never>,
  ctx: Context,
) {
  if (!ctx.userV2) {
    throw new Error('Unauthorized');
  }
  const service = new DashboardV2Service(ctx.db, ctx.server);
  return await service.getSponsorPaymentOverview(ctx.userV2.id);
}

export async function getBuilderPaymentOverviewResolver(
  _root: Root,
  _args: Record<string, never>,
  ctx: Context,
) {
  if (!ctx.userV2) {
    throw new Error('Unauthorized');
  }
  const service = new DashboardV2Service(ctx.db, ctx.server);
  return await service.getBuilderPaymentOverview(ctx.userV2.id);
}

// Hiring Activity
export async function getHiringActivityCardsResolver(
  _root: Root,
  _args: Record<string, never>,
  ctx: Context,
) {
  if (!ctx.userV2) {
    throw new Error('Unauthorized');
  }
  const service = new DashboardV2Service(ctx.db, ctx.server);
  const userId = ctx.userV2.id;

  // Check if user is sponsor
  const [sponsorCheck] = await ctx.db
    .select({ count: sql<number>`count(*)` })
    .from(programsV2Table)
    .where(eq(programsV2Table.sponsorId, userId));

  const isSponsor = sponsorCheck && Number(sponsorCheck.count) > 0;

  if (!isSponsor) {
    return { all: 0, open: 0, ongoing: 0, completed: 0 };
  }

  return await service.getSponsorHiringActivityCards(userId);
}

export async function getHiringActivityProgramsResolver(
  _root: Root,
  args: { input: typeof HiringActivityProgramsInput.$inferInput },
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
    return { data: [], count: 0 };
  }

  return await service.getSponsorHiringActivityPrograms(
    userId,
    statusFilter,
    paginationOptions,
    search ?? undefined,
  );
}

// Job Activity
export async function getJobActivityCardsResolver(
  _root: Root,
  _args: Record<string, never>,
  ctx: Context,
) {
  if (!ctx.userV2) {
    throw new Error('Unauthorized');
  }
  const service = new DashboardV2Service(ctx.db, ctx.server);
  return await service.getBuilderJobActivityCards(ctx.userV2.id);
}

export async function getJobActivityProgramsResolver(
  _root: Root,
  args: { input: typeof JobActivityProgramsInput.$inferInput },
  ctx: Context,
) {
  if (!ctx.userV2) {
    throw new Error('Unauthorized');
  }
  const service = new DashboardV2Service(ctx.db, ctx.server);
  const userId = ctx.userV2.id;
  const { status, search, pagination } = args.input;
  const statusFilter: 'APPLIED' | 'ONGOING' | 'COMPLETED' = status ?? 'APPLIED';

  const paginationOptions = pagination
    ? {
        limit: pagination.limit ?? undefined,
        offset: pagination.offset ?? undefined,
      }
    : undefined;

  return await service.getBuilderJobActivityPrograms(
    userId,
    statusFilter,
    paginationOptions,
    search ?? undefined,
  );
}

// Program Overview
export async function getHiredBuildersResolver(
  _root: Root,
  args: { input: typeof HiredBuildersInput.$inferInput },
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

  // Check if user is sponsor
  const [sponsorCheck] = await ctx.db
    .select({ count: sql<number>`count(*)` })
    .from(programsV2Table)
    .where(and(eq(programsV2Table.id, programId), eq(programsV2Table.sponsorId, userId)));
  const isSponsor = sponsorCheck && Number(sponsorCheck.count) > 0;

  if (!isSponsor) {
    return { data: [], count: 0 };
  }

  return await service.getHiredBuilders(programId, userId, paginationOptions);
}

export async function getBuilderMilestonesResolver(
  _root: Root,
  args: { input: typeof BuilderMilestonesInput.$inferInput },
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

  return await service.getBuilderMilestones(programId, userId, paginationOptions);
}

export async function getMilestoneProgressResolver(
  _root: Root,
  args: { input: typeof MilestoneProgressInput.$inferInput },
  ctx: Context,
) {
  if (!ctx.userV2) {
    throw new Error('Unauthorized');
  }
  const service = new DashboardV2Service(ctx.db, ctx.server);
  const userId = ctx.userV2.id;
  const { programId } = args.input;

  // Check if user is sponsor
  const [sponsorCheck] = await ctx.db
    .select({ count: sql<number>`count(*)` })
    .from(programsV2Table)
    .where(and(eq(programsV2Table.id, programId), eq(programsV2Table.sponsorId, userId)));
  const isSponsor = sponsorCheck && Number(sponsorCheck.count) > 0;

  return await service.getMilestoneProgress(programId, userId, isSponsor);
}

export async function getUpcomingPaymentsResolver(
  _root: Root,
  args: { input: typeof UpcomingPaymentsInput.$inferInput },
  ctx: Context,
) {
  if (!ctx.userV2) {
    throw new Error('Unauthorized');
  }
  const service = new DashboardV2Service(ctx.db, ctx.server);
  const userId = ctx.userV2.id;
  const { programId } = args.input;

  // Check if user is sponsor
  const [sponsorCheck] = await ctx.db
    .select({ count: sql<number>`count(*)` })
    .from(programsV2Table)
    .where(and(eq(programsV2Table.id, programId), eq(programsV2Table.sponsorId, userId)));
  const isSponsor = sponsorCheck && Number(sponsorCheck.count) > 0;

  return await service.getUpcomingPayments(programId, userId, isSponsor);
}
