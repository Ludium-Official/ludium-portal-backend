import { feesTable, programsTable } from '@/db/schemas';
import type { Context, Root } from '@/types';
import { requireUser } from '@/utils';
import { and, eq, sql } from 'drizzle-orm';

/**
 * Claim fees for a program
 * Host can claim accumulated fees after funding period + pending period
 */
export async function claimProgramFeesResolver(
  _root: Root,
  args: {
    programId: string;
    txHash: string;
  },
  ctx: Context,
) {
  const user = requireUser(ctx);

  return ctx.db.transaction(async (t) => {
    // Get program details
    const [program] = await t
      .select()
      .from(programsTable)
      .where(eq(programsTable.id, args.programId));

    if (!program) {
      throw new Error('Program not found');
    }

    // Check if user is the program host
    if (program.creatorId !== user.id) {
      throw new Error('Only the program host can claim fees');
    }

    // Check if funding period has ended and pending period has passed
    const now = new Date();
    if (!program.fundingEndDate) {
      throw new Error('Program does not have a funding end date');
    }

    // Add 1 day pending period after funding ends (as per PRD)
    const pendingEndDate = new Date(program.fundingEndDate);
    pendingEndDate.setDate(pendingEndDate.getDate() + 1);

    if (now < pendingEndDate) {
      throw new Error('Cannot claim fees yet. Pending period has not ended.');
    }

    // Check if fees have already been claimed
    const [existingClaim] = await t
      .select()
      .from(feesTable)
      .where(
        and(
          eq(feesTable.programId, args.programId),
          eq(feesTable.claimedBy, user.id),
          eq(feesTable.status, 'claimed'),
        ),
      );

    if (existingClaim) {
      throw new Error('Fees have already been claimed for this program');
    }

    // Calculate total fees available
    // This would typically come from the smart contract, but we'll calculate from investments
    const [feeData] = await t
      .select({
        totalFees: sql<string>`
          COALESCE(
            SUM(
              CAST(i.amount AS NUMERIC) * 
              COALESCE(CAST(${program.feePercentage || '3'} AS NUMERIC) / 100, 0.03)
            ), 
            0
          )
        `,
      })
      .from(sql`investments i`)
      .innerJoin(sql`applications a`, sql`a.id = i.application_id`)
      .where(sql`a.program_id = ${args.programId} AND i.status = 'confirmed'`);

    const totalFees = feeData?.totalFees || '0';

    // Create fee claim record
    const [feeClaim] = await t
      .insert(feesTable)
      .values({
        programId: args.programId,
        claimedBy: user.id,
        amount: totalFees,
        txHash: args.txHash,
        status: 'claimed',
        claimedAt: new Date(),
      })
      .returning();

    // Send notification
    await ctx.server.pubsub.publish('notifications', t, {
      type: 'program',
      action: 'completed',
      recipientId: user.id,
      entityId: args.programId,
      metadata: {
        amount: totalFees,
        txHash: args.txHash,
      },
    });

    return feeClaim;
  });
}

/**
 * Get claimable fees for a program
 */
export async function getClaimableFeesResolver(
  _root: Root,
  args: {
    programId: string;
  },
  ctx: Context,
) {
  const user = requireUser(ctx);

  // Get program details
  const [program] = await ctx.db
    .select()
    .from(programsTable)
    .where(eq(programsTable.id, args.programId));

  if (!program) {
    throw new Error('Program not found');
  }

  // Check if user is the program host
  if (program.creatorId !== user.id) {
    return {
      amount: '0',
      canClaim: false,
      reason: 'You are not the program host',
    };
  }

  // Check if funding period has ended and pending period has passed
  const now = new Date();
  if (!program.fundingEndDate) {
    return {
      amount: '0',
      canClaim: false,
      reason: 'Program does not have a funding end date',
    };
  }

  const pendingEndDate = new Date(program.fundingEndDate);
  pendingEndDate.setDate(pendingEndDate.getDate() + 1);

  if (now < pendingEndDate) {
    return {
      amount: '0',
      canClaim: false,
      reason: `Pending period ends at ${pendingEndDate.toISOString()}`,
      pendingEndDate,
    };
  }

  // Check if already claimed
  const [existingClaim] = await ctx.db
    .select()
    .from(feesTable)
    .where(
      and(
        eq(feesTable.programId, args.programId),
        eq(feesTable.claimedBy, user.id),
        eq(feesTable.status, 'claimed'),
      ),
    );

  if (existingClaim) {
    return {
      amount: existingClaim.amount,
      canClaim: false,
      reason: 'Fees have already been claimed',
      claimedAt: existingClaim.claimedAt || undefined,
    };
  }

  // Calculate claimable fees
  const [feeData] = await ctx.db
    .select({
      totalFees: sql<string>`
        COALESCE(
          SUM(
            CAST(i.amount AS NUMERIC) * 
            COALESCE(CAST(${program.feePercentage || '3'} AS NUMERIC) / 100, 0.03)
          ), 
          0
        )
      `,
    })
    .from(sql`investments i`)
    .innerJoin(sql`applications a`, sql`a.id = i.application_id`)
    .where(sql`a.program_id = ${args.programId} AND i.status = 'confirmed'`);

  return {
    amount: feeData?.totalFees || '0',
    canClaim: true,
    feePercentage: program.feePercentage || 3,
  };
}
