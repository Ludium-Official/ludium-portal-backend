import { applicationsTable, investmentsTable, milestonesTable, programsTable } from '@/db/schemas';
import type { DB } from '@/types';
import { and, eq, sql } from 'drizzle-orm';

export async function getMilestoneNotificationMetadata(milestoneId: string, db: DB) {
  const [milestone] = await db
    .select()
    .from(milestonesTable)
    .where(eq(milestonesTable.id, milestoneId));

  if (!milestone) {
    return {};
  }

  const [application] = await db
    .select()
    .from(applicationsTable)
    .where(eq(applicationsTable.id, milestone.applicationId));

  if (!application) {
    return {
      milestoneName: milestone.title,
      milestonePrice: milestone.price,
      currency: milestone.currency,
      milestoneStatus: milestone.status,
    };
  }

  const [program] = await db
    .select()
    .from(programsTable)
    .where(eq(programsTable.id, application.programId));

  // Calculate funding progress for funding programs
  let fundingProgress = null;
  if (program?.type === 'funding') {
    const targetAmount = application.fundingTarget || application.price;
    if (targetAmount) {
      const [result] = await db
        .select({
          total: sql<string>`COALESCE(SUM(CAST(amount AS NUMERIC)), 0)`,
        })
        .from(investmentsTable)
        .where(
          and(
            eq(investmentsTable.applicationId, application.id),
            eq(investmentsTable.status, 'confirmed'),
          ),
        );

      const currentAmount = Number.parseFloat(result?.total || '0');
      const target = Number.parseFloat(targetAmount);
      const percentage = target > 0 ? Math.min((currentAmount / target) * 100, 100) : 0;

      fundingProgress = {
        currentAmount: currentAmount.toString(),
        targetAmount: targetAmount,
        percentage: Math.round(percentage * 100) / 100,
      };
    }
  }

  return {
    milestoneName: milestone.title,
    milestonePrice: milestone.price,
    currency: program?.currency || milestone.currency,
    network: program?.network,
    milestoneStatus: milestone.status,
    applicationName: application.name,
    programName: program?.name,
    programType: program?.type,
    fundingProgress,
  };
}
