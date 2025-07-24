import {
  type Investment,
  type NewInvestment,
  type Program,
  applicationsTable,
  investmentsTable,
  milestonesTable,
  programsTable,
  userTierAssignmentsTable,
  usersTable,
} from '@/db/schemas';
import type { PaginationInput } from '@/graphql/types/common';
import type { CreateInvestmentInput, ReclaimInvestmentInput } from '@/graphql/types/investments';
import type { Args, Context, Root } from '@/types';
import { requireUser } from '@/utils';
import { and, count, desc, eq, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

// Get investments with optional filters
export async function getInvestmentsResolver(
  _root: Root,
  args: {
    pagination?: typeof PaginationInput.$inferInput | null;
    projectId?: string | null;
    supporterId?: string | null;
  },
  ctx: Context,
) {
  const limit = args.pagination?.limit || 10;
  const offset = args.pagination?.offset || 0;
  const sort = args.pagination?.sort || 'desc';

  const conditions = [];
  if (args.projectId) {
    conditions.push(eq(investmentsTable.applicationId, args.projectId));
  }
  if (args.supporterId) {
    conditions.push(eq(investmentsTable.userId, args.supporterId));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const data = await ctx.db
    .select()
    .from(investmentsTable)
    .where(whereClause)
    .limit(limit)
    .offset(offset)
    .orderBy(sort === 'asc' ? investmentsTable.createdAt : desc(investmentsTable.createdAt));

  const [totalCount] = await ctx.db
    .select({ count: count() })
    .from(investmentsTable)
    .where(whereClause);

  return {
    data,
    count: totalCount.count,
  };
}

// Get single investment by ID
export async function getInvestmentResolver(_root: Root, args: { id: string }, ctx: Context) {
  const [investment] = await ctx.db
    .select()
    .from(investmentsTable)
    .where(eq(investmentsTable.id, args.id));

  if (!investment) {
    throw new Error('Investment not found');
  }

  return investment;
}

// Create new investment
export async function createInvestmentResolver(
  _root: Root,
  args: { input: typeof CreateInvestmentInput.$inferInput },
  ctx: Context,
) {
  const user = requireUser(ctx);
  const { projectId, amount, txHash } = args.input;

  return ctx.db.transaction(async (t) => {
    // Get application (project) details
    const [application] = await t
      .select()
      .from(applicationsTable)
      .where(eq(applicationsTable.id, projectId));

    if (!application) {
      throw new Error('Project not found');
    }

    // Get program details
    const [program] = await t
      .select()
      .from(programsTable)
      .where(eq(programsTable.id, application.programId));

    if (!program || program.type !== 'funding') {
      throw new Error('Project is not part of a funding program');
    }
    const now = new Date();

    // Check if funding period is active
    if (program.fundingStartDate && program.fundingEndDate) {
      if (now < program.fundingStartDate || now > program.fundingEndDate) {
        throw new Error('Funding period is not active');
      }
    }

    // Check funding limit
    if (program.maxFundingAmount && application.fundingTarget) {
      // Calculate current funding
      const [currentFunding] = await t
        .select({
          total: sql<string>`COALESCE(SUM(CAST(amount AS NUMERIC)), 0)`,
        })
        .from(investmentsTable)
        .where(
          and(
            eq(investmentsTable.applicationId, projectId),
            eq(investmentsTable.status, 'confirmed'),
          ),
        );

      const totalAfterInvestment =
        Number.parseFloat(currentFunding.total) + Number.parseFloat(amount);
      const target = Number.parseFloat(application.fundingTarget);

      if (totalAfterInvestment > target) {
        throw new Error('Investment would exceed funding target');
      }
    }

    // Check tier-based restrictions
    let tier = null;
    if (program.fundingCondition === 'tier') {
      const [tierAssignment] = await t
        .select()
        .from(userTierAssignmentsTable)
        .where(
          and(
            eq(userTierAssignmentsTable.programId, program.id),
            eq(userTierAssignmentsTable.userId, user.id),
          ),
        );

      if (!tierAssignment) {
        throw new Error('You are not assigned to any tier for this program');
      }

      tier = tierAssignment.tier;

      // Check investment amount against tier limit
      const maxAmount = Number.parseFloat(tierAssignment.maxInvestmentAmount);
      if (Number.parseFloat(amount) > maxAmount) {
        throw new Error(`Investment exceeds your tier limit of ${maxAmount}`);
      }

      // Check total investments from this user
      const [userTotal] = await t
        .select({
          total: sql<string>`COALESCE(SUM(CAST(amount AS NUMERIC)), 0)`,
        })
        .from(investmentsTable)
        .where(
          and(
            eq(investmentsTable.applicationId, projectId),
            eq(investmentsTable.userId, user.id),
            eq(investmentsTable.status, 'confirmed'),
          ),
        );

      const userTotalAfter = Number.parseFloat(userTotal.total) + Number.parseFloat(amount);
      if (userTotalAfter > maxAmount) {
        throw new Error(`Total investments would exceed your tier limit of ${maxAmount}`);
      }
    }

    // Create investment record
    const investmentData: NewInvestment = {
      applicationId: projectId,
      userId: user.id,
      amount,
      tier,
      txHash,
      status: txHash ? 'confirmed' : 'pending',
    };

    const [investment] = await t.insert(investmentsTable).values(investmentData).returning();

    // Send notification to project owner
    await ctx.server.pubsub.publish('notifications', t, {
      type: 'application',
      action: 'created',
      recipientId: application.applicantId,
      entityId: projectId,
      metadata: {
        investmentId: investment.id,
        amount,
        investor: user.email,
      },
    });

    return investment;
  });
}

// Reclaim investment
export async function reclaimInvestmentResolver(
  _root: Root,
  args: { input: typeof ReclaimInvestmentInput.$inferInput },
  ctx: Context,
) {
  const user = requireUser(ctx);
  const { investmentId, txHash } = args.input;

  return ctx.db.transaction(async (t) => {
    // Get investment details
    const [investment] = await t
      .select()
      .from(investmentsTable)
      .where(eq(investmentsTable.id, investmentId));

    if (!investment) {
      throw new Error('Investment not found');
    }

    if (investment.userId !== user.id) {
      throw new Error('You can only reclaim your own investments');
    }

    if (investment.status === 'refunded') {
      throw new Error('Investment already refunded');
    }

    if (investment.status !== 'confirmed') {
      throw new Error('Only confirmed investments can be refunded');
    }

    // Check if project failed or milestone was missed
    const [application] = await t
      .select()
      .from(applicationsTable)
      .where(eq(applicationsTable.id, investment.applicationId));

    if (!application) {
      throw new Error('Project not found');
    }

    const [program] = await t
      .select()
      .from(programsTable)
      .where(eq(programsTable.id, application.programId));

    if (!program) {
      throw new Error('Program not found');
    }

    const canReclaim = await checkReclaimEligibility(investment.applicationId, program, t);

    if (!canReclaim) {
      throw new Error('Investment is not eligible for reclaim');
    }

    // Update investment status
    const [updatedInvestment] = await t
      .update(investmentsTable)
      .set({
        status: 'refunded',
        reclaimTxHash: txHash,
        reclaimedAt: new Date(),
      })
      .where(eq(investmentsTable.id, investmentId))
      .returning();

    // Send notification
    await ctx.server.pubsub.publish('notifications', t, {
      type: 'application',
      action: 'completed',
      recipientId: application.applicantId,
      entityId: investment.applicationId,
      metadata: {
        investmentId: investment.id,
        amount: investment.amount,
        action: 'refunded',
      },
    });

    return updatedInvestment;
  });
}

// Helper function to check reclaim eligibility
async function checkReclaimEligibility(
  applicationId: string,
  program: Program,
  db: PostgresJsDatabase,
): Promise<boolean> {
  // Check if funding target was not met
  const [application] = await db
    .select()
    .from(applicationsTable)
    .where(eq(applicationsTable.id, applicationId));

  if (
    !application.fundingSuccessful &&
    program.fundingEndDate &&
    new Date() > program.fundingEndDate
  ) {
    return true; // Funding period ended without reaching target
  }

  // Check for missed milestones
  const [milestones] = await db
    .select()
    .from(milestonesTable)
    .where(
      and(
        eq(milestonesTable.applicationId, applicationId),
        eq(milestonesTable.status, 'pending'),
        sql`${milestonesTable.deadline} < NOW()`,
      ),
    );

  if (milestones) {
    return true; // Milestone deadline was missed
  }

  return false;
}

// Get investment project (for Investment type)
export async function getInvestmentProjectResolver(root: Investment, _args: Args, ctx: Context) {
  const [application] = await ctx.db
    .select()
    .from(applicationsTable)
    .where(eq(applicationsTable.id, root.applicationId));

  return application;
}

// Get investment supporter (for Investment type)
export async function getInvestmentSupporterResolver(root: Investment, _args: Args, ctx: Context) {
  const [user] = await ctx.db.select().from(usersTable).where(eq(usersTable.id, root.userId));

  return user;
}
