import { applicationsV2Table } from '@/db/schemas/v2/applications';
import { milestonesV2Table } from '@/db/schemas/v2/milestones';
import { programsV2Table } from '@/db/schemas/v2/programs';
import type { Context } from '@/types';
import { and, count, eq, gte, inArray, lt, ne, sql } from 'drizzle-orm';

export class DashboardV2Service {
  constructor(
    private db: Context['db'],
    private server: Context['server'],
  ) {}

  async getSponsorHiringActivity(sponsorId: number): Promise<{
    openPrograms: number;
    ongoingPrograms: number;
  }> {
    // Open programs count
    const [openResult] = await this.db
      .select({ count: count() })
      .from(programsV2Table)
      .where(
        and(
          eq(programsV2Table.sponsorId, sponsorId),
          eq(programsV2Table.status, 'open'),
          ne(programsV2Table.status, 'deleted'),
        ),
      );

    // Ongoing programs: status is 'open' AND has applications with 'in_progress' or 'pending_signature'
    const ongoingPrograms = await this.db
      .select({ programId: programsV2Table.id })
      .from(programsV2Table)
      // @ts-expect-error - Drizzle type compatibility issue with innerJoin
      .innerJoin(applicationsV2Table, eq(programsV2Table.id, applicationsV2Table.programId))
      .where(
        and(
          eq(programsV2Table.sponsorId, sponsorId),
          eq(programsV2Table.status, 'open'),
          ne(programsV2Table.status, 'deleted'),
          inArray(applicationsV2Table.status, ['in_progress', 'pending_signature']),
        ),
      )
      .groupBy(programsV2Table.id);

    return {
      openPrograms: openResult?.count ?? 0,
      ongoingPrograms: ongoingPrograms.length,
    };
  }

  async getBuilderHiringActivity(builderId: number): Promise<{
    appliedPrograms: number;
    ongoingPrograms: number;
  }> {
    // Applied programs count (excluding deleted)
    const [appliedResult] = await this.db
      .select({ count: count() })
      .from(applicationsV2Table)
      // @ts-expect-error - Drizzle type compatibility issue with innerJoin
      .innerJoin(programsV2Table, eq(applicationsV2Table.programId, programsV2Table.id))
      .where(
        and(
          eq(applicationsV2Table.applicantId, builderId),
          ne(programsV2Table.status, 'deleted'),
        ),
      );

    // Ongoing programs: builder has applications with 'in_progress' or 'pending_signature'
    const ongoingPrograms = await this.db
      .select({ programId: programsV2Table.id })
      .from(applicationsV2Table)
      // @ts-expect-error - Drizzle type compatibility issue with innerJoin
      .innerJoin(programsV2Table, eq(applicationsV2Table.programId, programsV2Table.id))
      .where(
        and(
          eq(applicationsV2Table.applicantId, builderId),
          eq(programsV2Table.status, 'open'),
          ne(programsV2Table.status, 'deleted'),
          inArray(applicationsV2Table.status, ['in_progress', 'pending_signature']),
        ),
      )
      .groupBy(programsV2Table.id);

    return {
      appliedPrograms: appliedResult?.count ?? 0,
      ongoingPrograms: ongoingPrograms.length,
    };
  }

  async getSponsorPaymentOverview(sponsorId: number): Promise<Array<{
    label: string;
    budget: string;
  }>> {
    const now = new Date();
    const weeks: Array<{ label: string; budget: string }> = [];

    for (let week = 1; week <= 4; week++) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (week * 7));
      const weekEnd = new Date(now);
      weekEnd.setDate(now.getDate() - ((week - 1) * 7));

      const [result] = await this.db
        .select({
          total: sql<string>`COALESCE(SUM(CAST(${milestonesV2Table.payout} AS NUMERIC)), '0')`,
        })
        .from(milestonesV2Table)
        .where(
          and(
            eq(milestonesV2Table.sponsorId, sponsorId),
            eq(milestonesV2Table.status, 'completed'),
            gte(milestonesV2Table.updatedAt, weekStart),
            lt(milestonesV2Table.updatedAt, weekEnd),
          ),
        );

      weeks.push({
        label: `${week} week`,
        budget: result?.total ?? '0',
      });
    }

    return weeks.reverse(); // 1 week, 2 week, 3 week, 4 week 순서
  }

  async getBuilderPaymentOverview(builderId: number): Promise<Array<{
    label: string;
    budget: string;
  }>> {
    const now = new Date();
    const weeks: Array<{ label: string; budget: string }> = [];

    for (let week = 1; week <= 4; week++) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (week * 7));
      const weekEnd = new Date(now);
      weekEnd.setDate(now.getDate() - ((week - 1) * 7));

      // Get milestones through applications
      const [result] = await this.db
        .select({
          total: sql<string>`COALESCE(SUM(CAST(${milestonesV2Table.payout} AS NUMERIC)), '0')`,
        })
        .from(milestonesV2Table)
        // @ts-expect-error - Drizzle type compatibility issue with innerJoin
        .innerJoin(applicationsV2Table, eq(milestonesV2Table.applicationId, applicationsV2Table.id))
        .where(
          and(
            eq(applicationsV2Table.applicantId, builderId),
            eq(milestonesV2Table.status, 'completed'),
            gte(milestonesV2Table.updatedAt, weekStart),
            lt(milestonesV2Table.updatedAt, weekEnd),
          ),
        );

      weeks.push({
        label: `${week} week`,
        budget: result?.total ?? '0',
      });
    }

    return weeks.reverse(); // 1 week, 2 week, 3 week, 4 week 순서
  }
}