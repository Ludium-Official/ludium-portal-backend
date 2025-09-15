import { type PayoutStatusEnum, milestonePayoutsTable } from '@/db/schemas';
import type { PaginationInput } from '@/graphql/types/common';
import type { ProcessPayoutsInput } from '@/graphql/types/milestone-payouts';
import type { Context, Root } from '@/types';
import { requireUser } from '@/utils';
import { and, count, desc, eq } from 'drizzle-orm';

// Get milestone payouts with optional filters
export async function getMilestonePayoutsResolver(
  _root: Root,
  args: {
    pagination?: typeof PaginationInput.$inferInput | null;
    milestoneId?: string | null;
    investmentId?: string | null;
    status?: PayoutStatusEnum | null;
  },
  ctx: Context,
) {
  const limit = args.pagination?.limit || 10;
  const offset = args.pagination?.offset || 0;
  const sort = args.pagination?.sort || 'desc';

  const conditions = [];
  if (args.milestoneId) {
    conditions.push(eq(milestonePayoutsTable.milestoneId, args.milestoneId));
  }
  if (args.investmentId) {
    conditions.push(eq(milestonePayoutsTable.investmentId, args.investmentId));
  }
  if (args.status) {
    conditions.push(eq(milestonePayoutsTable.status, args.status));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const data = await ctx.db
    .select()
    .from(milestonePayoutsTable)
    .where(whereClause)
    .limit(limit)
    .offset(offset)
    .orderBy(
      sort === 'asc' ? milestonePayoutsTable.createdAt : desc(milestonePayoutsTable.createdAt),
    );

  const [totalCount] = await ctx.db
    .select({ count: count() })
    .from(milestonePayoutsTable)
    .where(whereClause);

  return {
    data,
    count: totalCount.count,
  };
}

// Get single milestone payout by ID
export async function getMilestonePayoutResolver(_root: Root, args: { id: string }, ctx: Context) {
  const [payout] = await ctx.db
    .select()
    .from(milestonePayoutsTable)
    .where(eq(milestonePayoutsTable.id, args.id));

  return payout;
}

// Process milestone payouts (trigger smart contract interactions)
export async function processMilestonePayoutsResolver(
  _root: Root,
  args: { input: typeof ProcessPayoutsInput.$inferInput },
  ctx: Context,
) {
  const _user = requireUser(ctx);
  const { milestoneId, contractAddress } = args.input;

  // Get all pending payouts for this milestone
  const pendingPayouts = await ctx.db
    .select()
    .from(milestonePayoutsTable)
    .where(
      and(
        eq(milestonePayoutsTable.milestoneId, milestoneId),
        eq(milestonePayoutsTable.status, 'pending'),
      ),
    );

  if (pendingPayouts.length === 0) {
    throw new Error('No pending payouts found for this milestone');
  }

  // Update status to processing
  await ctx.db
    .update(milestonePayoutsTable)
    .set({ status: 'processing' })
    .where(
      and(
        eq(milestonePayoutsTable.milestoneId, milestoneId),
        eq(milestonePayoutsTable.status, 'pending'),
      ),
    );

  // TODO: Here we would trigger the smart contract interaction service
  // For now, we'll just mark them as needing processing
  // The actual contract interaction will be implemented in the next task

  ctx.server.log.info(
    `Milestone payouts initiated for milestone ${milestoneId} with contract ${contractAddress}`,
  );
  ctx.server.log.info(`Processing ${pendingPayouts.length} payouts`);

  // Return the payouts that are being processed
  return pendingPayouts.map((payout) => ({
    ...payout,
    status: 'processing' as const,
  }));
}
