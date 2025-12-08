import { type ProgramV2, programsV2Table } from '@/db/schemas';
import { type ApplicationV2, applicationsV2Table } from '@/db/schemas/v2/applications';
import { networksTable } from '@/db/schemas/v2/networks';
import { tokensTable } from '@/db/schemas/v2/tokens';
import { usersV2Table } from '@/db/schemas/v2/users';
import type { CreateProgramV2Input, UpdateProgramV2Input } from '@/graphql/v2/inputs/programs';
import type { Context } from '@/types';
import { and, count, desc, eq, getTableColumns, inArray, ne, sql } from 'drizzle-orm';

export class ProgramV2Service {
  constructor(private db: Context['db']) {}

  async getMany(query?: {
    limit?: number;
    page?: number;
    offset?: number;
    status?: ProgramV2['status'];
  }): Promise<{
    data: (ProgramV2 & { applicationCount: number })[];
    count: number;
  }> {
    const limit = query?.limit || 10;
    let offset = query?.offset;

    if (offset === undefined) {
      const page = query?.page || 1;
      offset = (page - 1) * limit;
    }

    // Filter by status if provided, otherwise default to 'open'
    const statusFilter = query?.status || 'open';
    const whereCondition = eq(programsV2Table.status, statusFilter);

    const visibilityFilter = 'public';
    const visibilityCondition = eq(programsV2Table.visibility, visibilityFilter);

    const data = await this.db
      .select({
        ...getTableColumns(programsV2Table),
        applicationCount: count(applicationsV2Table.id).as('application_count'),
      })
      .from(programsV2Table)
      // @ts-expect-error - Drizzle type compatibility issue with leftJoin
      .leftJoin(applicationsV2Table, eq(programsV2Table.id, applicationsV2Table.programId))
      .where(and(whereCondition, visibilityCondition, ne(programsV2Table.status, 'deleted')))
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

  async getById(id: string): Promise<ProgramV2 & { applicationCount: number }> {
    const [result] = await this.db
      .select({
        ...getTableColumns(programsV2Table),
        sponsor: getTableColumns(usersV2Table),
        network: getTableColumns(networksTable),
        token: getTableColumns(tokensTable),
        applicationCount: count(applicationsV2Table.id).as('application_count'),
      })
      .from(programsV2Table)
      // @ts-expect-error - Drizzle type compatibility issue with leftJoin
      .leftJoin(usersV2Table, eq(programsV2Table.sponsorId, usersV2Table.id))
      // @ts-expect-error - Drizzle type compatibility issue with leftJoin
      .leftJoin(networksTable, eq(programsV2Table.networkId, networksTable.id))
      // @ts-expect-error - Drizzle type compatibility issue with leftJoin
      .leftJoin(tokensTable, eq(programsV2Table.token_id, tokensTable.id))
      // @ts-expect-error - Drizzle type compatibility issue with leftJoin
      .leftJoin(applicationsV2Table, eq(programsV2Table.id, applicationsV2Table.programId))
      .where(and(eq(programsV2Table.id, id), ne(programsV2Table.status, 'deleted')))
      .groupBy(programsV2Table.id, usersV2Table.id, networksTable.id, tokensTable.id);

    if (!result) {
      throw new Error('Program not found');
    }

    // Extract program data (joined data is not needed in return type)
    const { sponsor, network, token, applicationCount, ...program } = result;
    return {
      ...(program as ProgramV2),
      applicationCount: Number(applicationCount) || 0,
    };
  }

  async create(
    input: typeof CreateProgramV2Input.$inferInput,
    sponsorId: number,
  ): Promise<ProgramV2> {
    const values = {
      ...input,
      invitedMembers: input.invitedMembers ?? [],
      sponsorId,
    };
    const [newProgram] = await this.db.insert(programsV2Table).values(values).returning();
    return newProgram;
  }

  async update(id: string, input: typeof UpdateProgramV2Input.$inferInput): Promise<ProgramV2> {
    // First, get the current program to check its status
    const [currentProgram] = await this.db
      .select()
      .from(programsV2Table)
      .where(eq(programsV2Table.id, id));

    if (!currentProgram) {
      throw new Error('Program not found');
    }

    const values: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined && value !== null) {
        if (key === 'deadline') {
          values[key] = value instanceof Date ? value : new Date(value as string);
        } else {
          values[key] = value;
        }
      }
    }

    const [updatedProgram] = await this.db
      .update(programsV2Table)
      .set(values)
      .where(eq(programsV2Table.id, id))
      .returning();

    if (!updatedProgram) {
      throw new Error('Program not found');
    }
    return updatedProgram;
  }

  async delete(id: string): Promise<ProgramV2> {
    const [currentProgram] = await this.db
      .select()
      .from(programsV2Table)
      .where(eq(programsV2Table.id, id));

      if(!currentProgram) {
        throw new Error('Program not found');
      }

      if (currentProgram.status === 'deleted') {
        throw new Error('Program is already deleted');
      }

    const [deletedProgram] = await this.db
      .update(programsV2Table)
      .set({
        status: 'deleted',
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(programsV2Table.id, id))
      .returning();

    if (!deletedProgram) {
      throw new Error('Program not found');
    }
    return deletedProgram;
  }

  async complete(id: string): Promise<ProgramV2> {
    // First check if program exists and user is the sponsor
    const [program] = await this.db
      .select()
      .from(programsV2Table)
      .where(eq(programsV2Table.id, id));

    if (!program) {
      throw new Error('Program not found');
    }

    const [completedProgram] = await this.db
      .update(programsV2Table)
      .set({
        status: 'closed',
        updatedAt: new Date(),
      })
      .where(eq(programsV2Table.id, id))
      .returning();

    return completedProgram;
  }

  async getBySponsorId(
    sponsorId: number,
    pagination?: { limit?: number; offset?: number },
  ): Promise<{
    data: (ProgramV2 & { applicationCount: number })[];
    count: number;
  }> {
    const limit = pagination?.limit || 10;
    const offset = pagination?.offset || 0;

    const data = await this.db
      .select({
        ...getTableColumns(programsV2Table),
        sponsor: getTableColumns(usersV2Table),
        network: getTableColumns(networksTable),
        token: getTableColumns(tokensTable),
        applicationCount: count(applicationsV2Table.id).as('application_count'),
      })
      .from(programsV2Table)
      // @ts-expect-error - Drizzle type compatibility issue with leftJoin
      .leftJoin(usersV2Table, eq(programsV2Table.sponsorId, usersV2Table.id))
      // @ts-expect-error - Drizzle type compatibility issue with leftJoin
      .leftJoin(networksTable, eq(programsV2Table.networkId, networksTable.id))
      // @ts-expect-error - Drizzle type compatibility issue with leftJoin
      .leftJoin(tokensTable, eq(programsV2Table.token_id, tokensTable.id))
      // @ts-expect-error - Drizzle type compatibility issue with leftJoin
      .leftJoin(applicationsV2Table, eq(programsV2Table.id, applicationsV2Table.programId))
      .where(and(eq(programsV2Table.sponsorId, sponsorId), ne(programsV2Table.status, 'deleted')))
      .groupBy(programsV2Table.id, usersV2Table.id, networksTable.id, tokensTable.id)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(programsV2Table.createdAt));

    const [totalCount] = await this.db
      .select({ count: count() })
      .from(programsV2Table)
      .where(and(eq(programsV2Table.sponsorId, sponsorId), ne(programsV2Table.status, 'deleted')));

      // Extract program data (joined data is not needed in return type)
    const programs = data.map((row) => {
      const { sponsor, network, token, applicationCount, ...program } = row;
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

  async getByBuilderId(
    builderId: number,
    pagination?: { limit?: number; offset?: number },
  ): Promise<{
    data: (ProgramV2 & {
      applicationCount: number;
      myApplication?: ApplicationV2;
    })[];
    count: number;
  }> {
    const limit = pagination?.limit || 10;
    const offset = pagination?.offset || 0;

    // 먼저 builder가 지원한 program ID들을 조회
    const applicationProgramIds = await this.db
      .selectDistinct({
        programId: applicationsV2Table.programId,
        createdAt: applicationsV2Table.createdAt,
      })
      .from(applicationsV2Table)
      .where(eq(applicationsV2Table.applicantId, builderId))
      .orderBy(desc(applicationsV2Table.createdAt))
      .limit(limit)
      .offset(offset);

    if (applicationProgramIds.length === 0) {
      return { data: [], count: 0 };
    }

    const programIds = applicationProgramIds.map((a) => a.programId);

    // 프로그램들 조회
    const data = await this.db
      .select({
        ...getTableColumns(programsV2Table),
        sponsor: getTableColumns(usersV2Table),
        network: getTableColumns(networksTable),
        token: getTableColumns(tokensTable),
        applicationCount: count(applicationsV2Table.id).as('application_count'),
      })
      .from(programsV2Table)
      // @ts-expect-error - Drizzle type compatibility issue with leftJoin
      .leftJoin(usersV2Table, eq(programsV2Table.sponsorId, usersV2Table.id))
      // @ts-expect-error - Drizzle type compatibility issue with leftJoin
      .leftJoin(networksTable, eq(programsV2Table.networkId, networksTable.id))
      // @ts-expect-error - Drizzle type compatibility issue with leftJoin
      .leftJoin(tokensTable, eq(programsV2Table.token_id, tokensTable.id))
      // @ts-expect-error - Drizzle type compatibility issue with leftJoin
      .leftJoin(applicationsV2Table, eq(programsV2Table.id, applicationsV2Table.programId))
      .where(and(inArray(programsV2Table.id, programIds), ne(programsV2Table.status, 'deleted')))
      .groupBy(programsV2Table.id, usersV2Table.id, networksTable.id, tokensTable.id);

    // 각 프로그램에 대한 builder의 application 조회
    const applications = await this.db
      .select()
      .from(applicationsV2Table)
      .where(
        and(
          inArray(applicationsV2Table.programId, programIds),
          eq(applicationsV2Table.applicantId, builderId),
        ),
      );

    const applicationMap = new Map(applications.map((app) => [app.programId, app]));

    const [totalCount] = await this.db
      .select({
        count: sql<number>`COUNT(DISTINCT ${applicationsV2Table.programId})`,
      })
      .from(applicationsV2Table)
      .where(eq(applicationsV2Table.applicantId, builderId));

    // 프로그램 데이터 추출 및 application 정보 추가
    const programs = data.map((row) => {
      const { sponsor, network, token, applicationCount, ...program } = row;
      const application = applicationMap.get(program.id);

      return {
        ...(program as ProgramV2),
        applicationCount: Number(applicationCount) || 0,
        myApplication: application || undefined,
      };
    });

    // 지원한 순서대로 정렬 (applicationProgramIds 순서 유지)
    const sortedPrograms = applicationProgramIds
      .map(({ programId }) => programs.find((p) => p.id === programId))
      .filter((p): p is NonNullable<typeof p> => p !== undefined);

    return {
      data: sortedPrograms,
      count: totalCount.count,
    };
  }

  async getInProgress(query?: { page?: number; limit?: number } | null): Promise<{
    data: (ProgramV2 & { applicationCount: number })[];
    count: number;
    totalPages: number;
    currentPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  }> {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 10;
    const offset = (page - 1) * limit;

    // Only show programs that are open (in progress)
    const whereCondition = eq(programsV2Table.status, 'open');

    const data = await this.db
      .select({
        ...getTableColumns(programsV2Table),
        sponsor: getTableColumns(usersV2Table),
        network: getTableColumns(networksTable),
        token: getTableColumns(tokensTable),
        applicationCount: count(applicationsV2Table.id).as('application_count'),
      })
      .from(programsV2Table)
      // @ts-expect-error - Drizzle type compatibility issue with leftJoin
      .leftJoin(usersV2Table, eq(programsV2Table.sponsorId, usersV2Table.id))
      // @ts-expect-error - Drizzle type compatibility issue with leftJoin
      .leftJoin(networksTable, eq(programsV2Table.networkId, networksTable.id))
      // @ts-expect-error - Drizzle type compatibility issue with leftJoin
      .leftJoin(tokensTable, eq(programsV2Table.token_id, tokensTable.id))
      // @ts-expect-error - Drizzle type compatibility issue with leftJoin
      .leftJoin(applicationsV2Table, eq(programsV2Table.id, applicationsV2Table.programId))
      .where(whereCondition)
      .groupBy(programsV2Table.id, usersV2Table.id, networksTable.id, tokensTable.id)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(programsV2Table.createdAt));

    const [totalCount] = await this.db
      .select({ count: count() })
      .from(programsV2Table)
      .where(whereCondition);

    const totalPages = Math.ceil(totalCount.count / limit);

    // Extract program data (joined data is not needed in return type)
    const programs = data.map((row) => {
      const { sponsor, network, token, applicationCount, ...program } = row;
      return {
        ...(program as ProgramV2),
        applicationCount: Number(applicationCount) || 0,
      };
    });

    return {
      data: programs,
      count: totalCount.count,
      totalPages,
      currentPage: page,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }
}
