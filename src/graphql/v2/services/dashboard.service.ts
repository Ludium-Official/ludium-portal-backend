import { contractsTable, usersV2Table } from '@/db/schemas';
import { applicationsV2Table } from '@/db/schemas/v2/applications';
import { milestonesV2Table } from '@/db/schemas/v2/milestones';
import { programsV2Table, type ProgramV2 } from '@/db/schemas/v2/programs';
import type { Context } from '@/types';
import {
  and,
  count,
  desc,
  eq,
  getTableColumns,
  gte,
  inArray,
  lte,
  lt,
  ne,
  sql,
  ilike,
  isNotNull,
} from 'drizzle-orm';

/**
 * NOTE: Drizzle ORM Type Inference Limitation in Joins
 *
 * This file contains multiple @ts-expect-error suppressions for Drizzle ORM join operations.
 * This is due to a known limitation in Drizzle's type inference system when dealing with
 * join conditions, particularly with UUID and integer foreign key relationships.
 *
 * The issue occurs because Drizzle cannot infer that:
 * - programsV2Table.id (UUID) and applicationsV2Table.programId (UUID) are compatible
 * - milestonesV2Table.applicationId (integer) and applicationsV2Table.id (integer) are compatible
 *
 * Safety: All joins are safe because:
 * 1. Foreign key relationships are properly defined in the schema
 * 2. The types match at runtime (both are UUID or both are integer)
 * 3. The database enforces referential integrity
 *
 * Future improvements:
 * - Monitor Drizzle ORM updates for improved type inference
 * - Consider using type assertions if Drizzle adds support for explicit join types
 * - Document any workarounds as they become available
 */
export class DashboardV2Service {
  constructor(
    private db: Context['db'],
    private server: Context['server'],
  ) {}

  // Dashboard Overview
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
        and(eq(applicationsV2Table.applicantId, builderId), ne(programsV2Table.status, 'deleted')),
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

  async getSponsorPaymentOverview(sponsorId: number): Promise<
    Array<{
      label: string;
      budget: string;
    }>
  > {
    const now = new Date();
    const weeks: Array<{ label: string; budget: string }> = [];

    for (let week = 1; week <= 4; week++) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - week * 7);
      const weekEnd = new Date(now);
      weekEnd.setDate(now.getDate() - (week - 1) * 7);

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

  async getBuilderPaymentOverview(builderId: number): Promise<
    Array<{
      label: string;
      budget: string;
    }>
  > {
    const now = new Date();
    const weeks: Array<{ label: string; budget: string }> = [];

    for (let week = 1; week <= 4; week++) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - week * 7);
      const weekEnd = new Date(now);
      weekEnd.setDate(now.getDate() - (week - 1) * 7);

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

  // Hiring Activity Methods
  async getSponsorHiringActivityCards(sponsorId: number): Promise<{
    all: number;
    open: number;
    ongoing: number;
    completed: number;
  }> {
    // All programs (excluding deleted)
    const [allResult] = await this.db
      .select({ count: count() })
      .from(programsV2Table)
      .where(and(eq(programsV2Table.sponsorId, sponsorId), ne(programsV2Table.status, 'deleted')));

    // Open programs
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

    // Completed programs
    const [completedResult] = await this.db
      .select({ count: count() })
      .from(programsV2Table)
      .where(
        and(
          eq(programsV2Table.sponsorId, sponsorId),
          eq(programsV2Table.status, 'closed'),
          ne(programsV2Table.status, 'deleted'),
          inArray(applicationsV2Table.status, ['completed']),
        ),
      );

    return {
      all: allResult?.count ?? 0,
      open: openResult?.count ?? 0,
      ongoing: ongoingPrograms.length,
      completed: completedResult?.count ?? 0,
    };
  }

  async getSponsorHiringActivityPrograms(
    sponsorId: number,
    status: 'ALL' | 'OPEN' | 'ONGOING' | 'COMPLETED',
    pagination?: { limit?: number; offset?: number },
    search?: string,
  ): Promise<{
    data: (ProgramV2 & { applicationCount: number })[];
    count: number;
  }> {
    const limit = pagination?.limit || 5;
    const offset = pagination?.offset || 0;

    let whereCondition = and(
      eq(programsV2Table.sponsorId, sponsorId),
      ne(programsV2Table.status, 'deleted'),
    );

    if (search) {
      whereCondition = and(whereCondition, ilike(programsV2Table.title, `%${search}%`));
    }

    if (status === 'OPEN') {
      whereCondition = and(
        eq(programsV2Table.sponsorId, sponsorId),
        eq(programsV2Table.status, 'open'),
        ne(programsV2Table.status, 'deleted'),
      );
      if (search) {
        whereCondition = and(whereCondition, ilike(programsV2Table.title, `%${search}%`));
      }
    } else if (status === 'COMPLETED') {
      const completedProgramIds = await this.db
        .select({ programId: programsV2Table.id })
        .from(programsV2Table)
        // @ts-expect-error - Drizzle type compatibility issue with innerJoin
        .innerJoin(applicationsV2Table, eq(programsV2Table.id, applicationsV2Table.programId))
        .where(
          and(
            eq(programsV2Table.sponsorId, sponsorId),
            eq(programsV2Table.status, 'closed'),
            ne(programsV2Table.status, 'deleted'),
            inArray(applicationsV2Table.status, ['completed']),
          ),
        )
        .groupBy(programsV2Table.id);

      const programIds = completedProgramIds.map((p) => p.programId);
      if (programIds.length === 0) {
        return { data: [], count: 0 };
      }

      whereCondition = and(
        eq(programsV2Table.sponsorId, sponsorId),
        inArray(programsV2Table.id, programIds),
        ne(programsV2Table.status, 'deleted'),
      );
      if (search) {
        whereCondition = and(whereCondition, ilike(programsV2Table.title, `%${search}%`));
      }
    } else if (status === 'ONGOING') {
      const ongoingProgramIds = await this.db
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

      const programIds = ongoingProgramIds.map((p) => p.programId);
      if (programIds.length === 0) {
        return { data: [], count: 0 };
      }

      whereCondition = and(
        eq(programsV2Table.sponsorId, sponsorId),
        inArray(programsV2Table.id, programIds),
        ne(programsV2Table.status, 'deleted'),
      );
      if (search) {
        whereCondition = and(whereCondition, ilike(programsV2Table.title, `%${search}%`));
      }
    }

    const data = await this.db
      .select({
        ...getTableColumns(programsV2Table),
        applicationCount: count(applicationsV2Table.id).as('application_count'),
      })
      .from(programsV2Table)
      // @ts-expect-error - Drizzle type compatibility issue with leftJoin
      .leftJoin(applicationsV2Table, eq(programsV2Table.id, applicationsV2Table.programId))
      .where(whereCondition)
      .groupBy(programsV2Table.id)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(programsV2Table.createdAt));

    const [totalCount] = await this.db
      .select({ count: count() })
      .from(programsV2Table)
      .where(whereCondition);

    const programs = data.map((row) => {
      const { applicationCount, ...program } = row;
      return {
        ...(program as ProgramV2),
        applicationCount: Number(applicationCount) || 0,
      };
    });

    return {
      data: programs,
      count: totalCount.count,
    };
  }

  // Job Activity Methods
  async getBuilderJobActivityCards(builderId: number): Promise<{
    applied: number;
    ongoing: number;
    completed: number;
  }> {
    // Applied programs count (excluding deleted)
    const [appliedResult] = await this.db
      .select({ count: count() })
      .from(applicationsV2Table)
      // @ts-expect-error - Drizzle type compatibility issue with innerJoin
      .innerJoin(programsV2Table, eq(applicationsV2Table.programId, programsV2Table.id))
      .where(
        and(eq(applicationsV2Table.applicantId, builderId), ne(programsV2Table.status, 'deleted')),
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

    // Completed programs: 프로그램이 closed이고 application이 completed
    const [completedResult] = await this.db
      .select({ count: count() })
      .from(applicationsV2Table)
      // @ts-expect-error - Drizzle type compatibility issue with innerJoin
      .innerJoin(programsV2Table, eq(applicationsV2Table.programId, programsV2Table.id))
      .where(
        and(
          eq(applicationsV2Table.applicantId, builderId),
          eq(programsV2Table.status, 'closed'),
          ne(programsV2Table.status, 'deleted'),
          eq(applicationsV2Table.status, 'completed'),
        ),
      );

    return {
      applied: appliedResult?.count ?? 0,
      ongoing: ongoingPrograms.length,
      completed: completedResult?.count ?? 0,
    };
  }

  async getBuilderJobActivityPrograms(
    builderId: number,
    status: 'APPLIED' | 'ONGOING' | 'COMPLETED',
    pagination?: { limit?: number; offset?: number },
    search?: string,
  ): Promise<{
    data: (ProgramV2 & { appliedAt: Date })[];
    count: number;
  }> {
    const limit = pagination?.limit || 5;
    const offset = pagination?.offset || 0;

    // Get application program IDs first
    let whereCondition: ReturnType<typeof and> = eq(applicationsV2Table.applicantId, builderId);

    if (status === 'ONGOING') {
      whereCondition = and(
        eq(applicationsV2Table.applicantId, builderId),
        inArray(applicationsV2Table.status, ['in_progress', 'pending_signature']),
      );
    } else if (status === 'COMPLETED') {
      whereCondition = and(
        eq(applicationsV2Table.applicantId, builderId),
        eq(applicationsV2Table.status, 'completed'),
      );
    }

    const applicationProgramIds = await this.db
      .selectDistinct({
        programId: applicationsV2Table.programId,
        appliedAt: applicationsV2Table.createdAt,
        status: applicationsV2Table.status,
      })
      .from(applicationsV2Table)
      .where(whereCondition)
      .orderBy(desc(applicationsV2Table.createdAt))
      .limit(limit)
      .offset(offset);

    if (applicationProgramIds.length === 0) {
      return { data: [], count: 0 };
    }

    const programIds = applicationProgramIds.map((a) => a.programId);
    const appliedAtMap = new Map(applicationProgramIds.map((a) => [a.programId, a.appliedAt]));

    let programWhereCondition = and(
      inArray(programsV2Table.id, programIds),
      ne(programsV2Table.status, 'deleted'),
    );

    if (status === 'COMPLETED') {
      programWhereCondition = and(
        inArray(programsV2Table.id, programIds),
        eq(programsV2Table.status, 'closed'),
        ne(programsV2Table.status, 'deleted'),
      );
    } else if (status === 'ONGOING') {
      programWhereCondition = and(
        inArray(programsV2Table.id, programIds),
        eq(programsV2Table.status, 'open'),
        ne(programsV2Table.status, 'deleted'),
      );
    }

    // Add search condition if provided
    if (search) {
      programWhereCondition = and(
        programWhereCondition,
        ilike(programsV2Table.title, `%${search}%`),
      );
    }

    const data = await this.db
      .select({
        ...getTableColumns(programsV2Table),
      })
      .from(programsV2Table)
      // @ts-expect-error - Drizzle type compatibility issue with leftJoin
      .leftJoin(applicationsV2Table, eq(programsV2Table.id, applicationsV2Table.programId))
      .where(programWhereCondition)
      .groupBy(programsV2Table.id)
      .orderBy(desc(programsV2Table.createdAt));

    // Get total count
    const totalApplicationQuery = this.db
      .selectDistinct({ programId: applicationsV2Table.programId })
      .from(applicationsV2Table)
      .where(whereCondition);

    const totalApplicationProgramIds = await totalApplicationQuery;
    const totalProgramIds = totalApplicationProgramIds.map((a) => a.programId);

    let totalCountWhereCondition = and(
      inArray(programsV2Table.id, totalProgramIds),
      ne(programsV2Table.status, 'deleted'),
    );

    if (status === 'COMPLETED') {
      totalCountWhereCondition = and(
        inArray(programsV2Table.id, totalProgramIds),
        eq(programsV2Table.status, 'closed'),
        ne(programsV2Table.status, 'deleted'),
      );
    } else if (status === 'ONGOING') {
      totalCountWhereCondition = and(
        inArray(programsV2Table.id, totalProgramIds),
        eq(programsV2Table.status, 'open'),
        ne(programsV2Table.status, 'deleted'),
      );
    }

    if (search) {
      totalCountWhereCondition = and(
        totalCountWhereCondition,
        ilike(programsV2Table.title, `%${search}%`),
      );
    }

    const [totalCount] = await this.db
      .select({ count: count() })
      .from(programsV2Table)
      .where(totalCountWhereCondition);

    const programs = data
      .map((row) => {
        const { ...program } = row;
        const appliedAt = appliedAtMap.get(program.id);
        if (!appliedAt) return null;
        return {
          ...(program as ProgramV2),
          appliedAt,
        };
      })
      .filter((p): p is ProgramV2 & { appliedAt: Date } => p !== null);

    return {
      data: programs,
      count: totalCount.count,
    };
  }

  // Program Overview Methods
  async getHiredBuilders(
    programId: string,
    sponsorId: number,
    pagination?: { limit?: number; offset?: number },
  ): Promise<{
    data: Array<{
      id: number;
      role: string;
      nickname: string | null;
      profileImage: string | null;
      status: 'completed' | 'in_progress';
      milestoneCount: number;
      paidAmount: string;
      totalAmount: string;
      tokenId: number;
    }>;
    count: number;
  }> {
    const limit = pagination?.limit || 5;
    const offset = pagination?.offset || 0;

    // Verify program belongs to sponsor
    const [program] = await this.db
      .select()
      .from(programsV2Table)
      .where(and(eq(programsV2Table.id, programId), eq(programsV2Table.sponsorId, sponsorId)));

    if (!program) {
      throw new Error('Program not found or access denied');
    }

    // Get distinct builders
    const builders = await this.db
      .selectDistinct({
        ...getTableColumns(usersV2Table),
        status: sql<'completed' | 'in_progress'>`
        CASE 
          WHEN (
            SELECT COUNT(*)::int 
            FROM ${milestonesV2Table} 
            WHERE ${milestonesV2Table.applicationId} = ${applicationsV2Table.id}
          ) > 0 
          AND (
            SELECT COUNT(*)::int 
            FROM ${milestonesV2Table} 
            WHERE ${milestonesV2Table.applicationId} = ${applicationsV2Table.id}
              AND ${milestonesV2Table.status} = 'completed'
          ) = (
            SELECT COUNT(*)::int 
            FROM ${milestonesV2Table} 
            WHERE ${milestonesV2Table.applicationId} = ${applicationsV2Table.id}
          )
          THEN 'completed'
          ELSE 'in_progress'
        END
      `,
        milestoneCount: sql<number>`COALESCE(
        (SELECT COUNT(*)::int 
         FROM ${milestonesV2Table} 
         WHERE ${milestonesV2Table.applicationId} = ${applicationsV2Table.id}
        ), 0
      )`,
        paidAmount: sql<string>`COALESCE(
        (SELECT SUM(CAST(${milestonesV2Table.payout} AS NUMERIC))
         FROM ${milestonesV2Table}
         WHERE ${milestonesV2Table.applicationId} = ${applicationsV2Table.id}
           AND ${milestonesV2Table.status} = 'completed'
           AND ${milestonesV2Table.payout_tx} IS NOT NULL
        ), '0'
      )`,
        totalAmount: sql<string>`COALESCE(
        (SELECT SUM(CAST(${milestonesV2Table.payout} AS NUMERIC))
         FROM ${milestonesV2Table}
         WHERE ${milestonesV2Table.applicationId} = ${applicationsV2Table.id}
        ), '0'
      )`,
        tokenId: sql<number>`${program.token_id}`,
      })
      .from(usersV2Table)
      // @ts-expect-error - Drizzle type compatibility issue with innerJoin
      .innerJoin(applicationsV2Table, eq(usersV2Table.id, applicationsV2Table.applicantId))
      .where(
        and(
          eq(applicationsV2Table.programId, programId),
          inArray(applicationsV2Table.status, ['in_progress', 'pending_signature', 'completed']),
        ),
      )
      .limit(limit)
      .offset(offset);

    const [totalCount] = await this.db
      .select({ count: sql<number>`COUNT(DISTINCT ${applicationsV2Table.applicantId})` })
      .from(applicationsV2Table)
      .where(
        and(
          eq(applicationsV2Table.programId, programId),
          inArray(applicationsV2Table.status, ['in_progress', 'pending_signature', 'completed']),
        ),
      );

    return {
      data: builders,
      count: Number(totalCount.count) || 0,
    };
  }

  async getBuilderMilestones(
    programId: string,
    builderId: number,
    pagination?: { limit?: number; offset?: number },
  ): Promise<{
    data: Array<{
      id: number;
      title: string | null;
      status: 'draft' | 'under_review' | 'in_progress' | 'completed' | 'update' | null;
      deadline: Date | null;
      payout: string | null;
      tokenId: number;
    }>;
    count: number;
  }> {
    const limit = pagination?.limit || 5;
    const offset = pagination?.offset || 0;

    // Get application for this program and builder
    const [application] = await this.db
      .select()
      .from(applicationsV2Table)
      .where(
        and(
          eq(applicationsV2Table.programId, programId),
          eq(applicationsV2Table.applicantId, builderId),
        ),
      );

    if (!application) {
      throw new Error('Application not found');
    }

    // Get program to access token_id
    const [program] = await this.db
      .select()
      .from(programsV2Table)
      .where(eq(programsV2Table.id, programId));

    if (!program) {
      throw new Error('Program not found');
    }

    // Get milestones for this application with status: in_progress, update, completed
    const milestones = await this.db
      .select({
        id: milestonesV2Table.id,
        title: milestonesV2Table.title,
        status: milestonesV2Table.status,
        deadline: milestonesV2Table.deadline,
        payout: milestonesV2Table.payout,
      })
      .from(milestonesV2Table)
      .where(
        and(
          eq(milestonesV2Table.applicationId, application.id),
          inArray(milestonesV2Table.status, ['in_progress', 'update', 'completed']),
        ),
      )
      .limit(limit)
      .offset(offset)
      .orderBy(desc(milestonesV2Table.createdAt));

    // For milestones with status 'update', get data from latest contract's milestone_contents
    const updateMilestones = milestones.filter((m) => m.status === 'update');

    if (updateMilestones.length > 0) {
      // Get latest contract for this application
      const [latestContract] = await this.db
        .select()
        .from(contractsTable)
        .where(eq(contractsTable.applicationId, application.id))
        .orderBy(desc(contractsTable.createdAt))
        .limit(1);

      if (latestContract?.contract_snapshot_cotents) {
        const snapshotContents = latestContract.contract_snapshot_cotents as {
          milestone_contents?: Array<{
            id: number;
            title?: string | null;
            status?: 'draft' | 'under_review' | 'in_progress' | 'completed' | 'update' | null;
            deadline?: Date | null;
            payout?: string | null;
            [key: string]: unknown;
          }>;
        };

        // Replace milestones with data from contract snapshot
        for (let i = 0; i < updateMilestones.length; i++) {
          const milestone = updateMilestones[i];
          const contractMilestone = snapshotContents.milestone_contents?.find(
            (mc) => mc.id === milestone.id,
          );

          if (contractMilestone) {
            const milestoneIndex = milestones.indexOf(milestone);
            milestones[milestoneIndex] = {
              id: milestone.id,
              title: contractMilestone.title ?? milestone.title,
              status: contractMilestone.status ?? 'in_progress',
              deadline: contractMilestone.deadline ?? milestone.deadline,
              payout: contractMilestone.payout ?? milestone.payout,
            };
          }
        }
      }
    }

    const milestonesWithTokenId = milestones.map((milestone) => ({
      id: milestone.id,
      title: milestone.title,
      status: milestone.status,
      deadline: milestone.deadline,
      payout: milestone.payout,
      tokenId: program.token_id,
    }));

    const [totalCount] = await this.db
      .select({ count: count() })
      .from(milestonesV2Table)
      .where(
        and(
          eq(milestonesV2Table.applicationId, application.id),
          inArray(milestonesV2Table.status, ['in_progress', 'update', 'completed']),
        ),
      );

    return {
      data: milestonesWithTokenId,
      count: totalCount.count,
    };
  }

  async getMilestoneProgress(
    programId: string,
    userId: number,
    isSponsor: boolean,
  ): Promise<{
    completed: number;
    total: number;
  }> {
    if (isSponsor) {
      // For sponsor
      const hiredApplications = await this.db
        .select({ id: applicationsV2Table.id })
        .from(applicationsV2Table)
        .where(
          and(
            eq(applicationsV2Table.programId, programId),
            inArray(applicationsV2Table.status, ['in_progress', 'pending_signature', 'completed']),
          ),
        );

      if (hiredApplications.length === 0) {
        return { completed: 0, total: 0 };
      }

      const applicationIds = hiredApplications.map((app) => app.id);

      const [totalResult] = await this.db
        .select({ count: count() })
        .from(milestonesV2Table)
        .where(inArray(milestonesV2Table.applicationId, applicationIds));

      const [completedResult] = await this.db
        .select({ count: count() })
        .from(milestonesV2Table)
        .where(
          and(
            inArray(milestonesV2Table.applicationId, applicationIds),
            eq(milestonesV2Table.status, 'completed'),
          ),
        );

      return {
        completed: completedResult?.count ?? 0,
        total: totalResult?.count ?? 0,
      };
    }

    // For builder
    const [application] = await this.db
      .select()
      .from(applicationsV2Table)
      .where(
        and(
          eq(applicationsV2Table.programId, programId),
          eq(applicationsV2Table.applicantId, userId),
        ),
      );

    if (!application) {
      return { completed: 0, total: 0 };
    }

    const [totalResult] = await this.db
      .select({ count: count() })
      .from(milestonesV2Table)
      .where(eq(milestonesV2Table.applicationId, application.id));

    const [completedResult] = await this.db
      .select({ count: count() })
      .from(milestonesV2Table)
      .where(
        and(
          eq(milestonesV2Table.applicationId, application.id),
          eq(milestonesV2Table.status, 'completed'),
        ),
      );

    return {
      completed: completedResult?.count ?? 0,
      total: totalResult?.count ?? 0,
    };
  }

  async getUpcomingPayments(
    programId: string,
    userId: number,
    isSponsor: boolean,
  ): Promise<
    Array<{
      builder: {
        profileImage: string | null;
        nickname: string | null;
      };
      payment: Array<{
        deadline: Date;
        payout: string;
        tokenId: number;
      }>;
    }>
  > {
    const now = new Date();
    const deadlineLimit = new Date(now);
    deadlineLimit.setDate(now.getDate() + 7); // 7 days from now

    const [program] = await this.db
      .select()
      .from(programsV2Table)
      .where(eq(programsV2Table.id, programId));

    if (!program) {
      return [];
    }

    let milestones: Array<{
      id: number;
      applicationId: number;
      payout: string | null;
      deadline: Date;
      applicantId: number;
      profileImage: string | null;
      nickname: string | null;
    }>;

    if (isSponsor) {
      // For sponsor
      const hiredApplications = await this.db
        .select({ id: applicationsV2Table.id })
        .from(applicationsV2Table)
        .where(
          and(
            eq(applicationsV2Table.programId, programId),
            inArray(applicationsV2Table.status, ['in_progress', 'pending_signature', 'completed']),
          ),
        );

      if (hiredApplications.length === 0) {
        return [];
      }

      const applicationIds = hiredApplications.map((app) => app.id);

      milestones = await this.db
        .select({
          id: milestonesV2Table.id,
          applicationId: milestonesV2Table.applicationId,
          payout: milestonesV2Table.payout,
          deadline: milestonesV2Table.deadline,
          applicantId: applicationsV2Table.applicantId,
          profileImage: usersV2Table.profileImage,
          nickname: usersV2Table.nickname,
        })
        .from(milestonesV2Table)
        // @ts-expect-error - Drizzle type compatibility issue with innerJoin
        .innerJoin(applicationsV2Table, eq(milestonesV2Table.applicationId, applicationsV2Table.id))
        // @ts-expect-error - Drizzle type compatibility issue with innerJoin
        .innerJoin(usersV2Table, eq(applicationsV2Table.applicantId, usersV2Table.id))
        .where(
          and(
            inArray(milestonesV2Table.applicationId, applicationIds),
            lte(milestonesV2Table.deadline, deadlineLimit),
            gte(milestonesV2Table.deadline, now),
            isNotNull(milestonesV2Table.deadline),
          ),
        )
        .orderBy(milestonesV2Table.deadline);
    } else {
      // For builder: milestones in their application
      const [application] = await this.db
        .select()
        .from(applicationsV2Table)
        .where(
          and(
            eq(applicationsV2Table.programId, programId),
            eq(applicationsV2Table.applicantId, userId),
          ),
        );

      if (!application) {
        return [];
      }

      milestones = await this.db
        .select({
          id: milestonesV2Table.id,
          applicationId: milestonesV2Table.applicationId,
          payout: milestonesV2Table.payout,
          deadline: milestonesV2Table.deadline,
          applicantId: applicationsV2Table.applicantId,
          profileImage: usersV2Table.profileImage,
          nickname: usersV2Table.nickname,
        })
        .from(milestonesV2Table)
        // @ts-expect-error - Drizzle type compatibility issue with innerJoin
        .innerJoin(applicationsV2Table, eq(milestonesV2Table.applicationId, applicationsV2Table.id))
        // @ts-expect-error - Drizzle type compatibility issue with innerJoin
        .innerJoin(usersV2Table, eq(applicationsV2Table.applicantId, usersV2Table.id))
        .where(
          and(
            eq(milestonesV2Table.applicationId, application.id),
            lte(milestonesV2Table.deadline, deadlineLimit),
            gte(milestonesV2Table.deadline, now),
            isNotNull(milestonesV2Table.deadline),
          ),
        )
        .orderBy(milestonesV2Table.deadline);
    }

    const builderMap = new Map<
      number,
      {
        builder: {
          profileImage: string | null;
          nickname: string | null;
        };
        payments: Array<{
          deadline: Date;
          payout: string;
          tokenId: number;
        }>;
      }
    >();

    for (const milestone of milestones) {
      const paymentDeadline = new Date(milestone.deadline);
      paymentDeadline.setDate(paymentDeadline.getDate() + 2); // Add 2 days buffer

      if (!builderMap.has(milestone.applicantId)) {
        builderMap.set(milestone.applicantId, {
          builder: {
            profileImage: milestone.profileImage,
            nickname: milestone.nickname,
          },
          payments: [],
        });
      }

      const builderData = builderMap.get(milestone.applicantId);
      if (builderData) {
        builderData.payments.push({
          deadline: paymentDeadline,
          payout: milestone.payout || '',
          tokenId: program.token_id,
        });
      }
    }

    return Array.from(builderMap.values()).map((item) => ({
      builder: {
        profileImage: item.builder.profileImage ?? '',
        nickname: item.builder.nickname ?? '',
      },
      payment: item.payments.map((payment) => ({
        deadline: payment.deadline,
        payout: payment.payout,
        tokenId: payment.tokenId,
      })),
    }));
  }
}
