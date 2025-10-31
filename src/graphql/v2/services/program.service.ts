import { type ProgramV2, programsV2Table } from '@/db/schemas';
import { applicationsV2Table } from '@/db/schemas/v2/applications';
import { networksTable } from '@/db/schemas/v2/networks';
import { tokensTable } from '@/db/schemas/v2/tokens';
import { usersV2Table } from '@/db/schemas/v2/users';
import type { CreateProgramV2Input, UpdateProgramV2Input } from '@/graphql/v2/inputs/programs';
import type { Context } from '@/types';
import { count, desc, eq, getTableColumns, sql } from 'drizzle-orm';

export class ProgramV2Service {
  constructor(private db: Context['db']) {}

  async getMany(pagination?: {
    limit?: number;
    offset?: number;
  }): Promise<{ data: (ProgramV2 & { applicationCount: number })[]; count: number }> {
    const limit = pagination?.limit || 10;
    const offset = pagination?.offset || 0;

    const data = await this.db
      .select({
        ...getTableColumns(programsV2Table),
        sponsor: getTableColumns(usersV2Table),
        network: getTableColumns(networksTable),
        token: getTableColumns(tokensTable),
        applicationCount: sql<number>`
          (SELECT COUNT(*)::int 
           FROM ${applicationsV2Table} 
           WHERE ${applicationsV2Table.programId} = ${programsV2Table.id})
        `.as('application_count'),
      })
      .from(programsV2Table)
      // @ts-expect-error - Drizzle type compatibility issue with leftJoin
      .leftJoin(usersV2Table, eq(programsV2Table.sponsorId, usersV2Table.id))
      // @ts-expect-error - Drizzle type compatibility issue with leftJoin
      .leftJoin(networksTable, eq(programsV2Table.networkId, networksTable.id))
      // @ts-expect-error - Drizzle type compatibility issue with leftJoin
      .leftJoin(tokensTable, eq(programsV2Table.token_id, tokensTable.id))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(programsV2Table.createdAt));

    const [totalCount] = await this.db.select({ count: count() }).from(programsV2Table);

    // Extract program data (joined data is not needed in return type)
    const programs = data.map((row) => {
      const { sponsor, network, token, applicationCount, ...program } = row;
      return {
        ...(program as ProgramV2),
        applicationCount: applicationCount ?? 0,
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
        applicationCount: sql<number>`
          (SELECT COUNT(*)::int 
           FROM ${applicationsV2Table} 
           WHERE ${applicationsV2Table.programId} = ${programsV2Table.id})
        `.as('application_count'),
      })
      .from(programsV2Table)
      // @ts-expect-error - Drizzle type compatibility issue with leftJoin
      .leftJoin(usersV2Table, eq(programsV2Table.sponsorId, usersV2Table.id))
      // @ts-expect-error - Drizzle type compatibility issue with leftJoin
      .leftJoin(networksTable, eq(programsV2Table.networkId, networksTable.id))
      // @ts-expect-error - Drizzle type compatibility issue with leftJoin
      .leftJoin(tokensTable, eq(programsV2Table.token_id, tokensTable.id))
      .where(eq(programsV2Table.id, Number.parseInt(id, 10)));

    if (!result) {
      throw new Error('Program not found');
    }

    // Extract program data (joined data is not needed in return type)
    const { sponsor, network, token, applicationCount, ...program } = result;
    return {
      ...(program as ProgramV2),
      applicationCount: applicationCount ?? 0,
    };
  }

  async create(
    input: typeof CreateProgramV2Input.$inferInput,
    sponsorId: number,
  ): Promise<ProgramV2> {
    const values = {
      ...input,
      deadline: new Date(input.deadline),
      invitedMembers: input.invitedMembers ?? [],
      sponsorId,
    };
    const [newProgram] = await this.db.insert(programsV2Table).values(values).returning();
    return newProgram;
  }

  async update(id: string, input: typeof UpdateProgramV2Input.$inferInput): Promise<ProgramV2> {
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
      .where(eq(programsV2Table.id, Number.parseInt(id, 10)))
      .returning();

    if (!updatedProgram) {
      throw new Error('Program not found');
    }
    return updatedProgram;
  }

  async delete(id: string): Promise<ProgramV2> {
    const [deletedProgram] = await this.db
      .delete(programsV2Table)
      .where(eq(programsV2Table.id, Number.parseInt(id, 10)))
      .returning();

    if (!deletedProgram) {
      throw new Error('Program not found');
    }
    return deletedProgram;
  }

  async getBySponsorId(
    sponsorId: number,
    pagination?: { limit?: number; offset?: number },
  ): Promise<{ data: (ProgramV2 & { applicationCount: number })[]; count: number }> {
    const limit = pagination?.limit || 10;
    const offset = pagination?.offset || 0;

    const data = await this.db
      .select({
        ...getTableColumns(programsV2Table),
        sponsor: getTableColumns(usersV2Table),
        network: getTableColumns(networksTable),
        token: getTableColumns(tokensTable),
        applicationCount: sql<number>`
          (SELECT COUNT(*)::int 
           FROM ${applicationsV2Table} 
           WHERE ${applicationsV2Table.programId} = ${programsV2Table.id})
        `.as('application_count'),
      })
      .from(programsV2Table)
      // @ts-expect-error - Drizzle type compatibility issue with leftJoin
      .leftJoin(usersV2Table, eq(programsV2Table.sponsorId, usersV2Table.id))
      // @ts-expect-error - Drizzle type compatibility issue with leftJoin
      .leftJoin(networksTable, eq(programsV2Table.networkId, networksTable.id))
      // @ts-expect-error - Drizzle type compatibility issue with leftJoin
      .leftJoin(tokensTable, eq(programsV2Table.token_id, tokensTable.id))
      .where(eq(programsV2Table.sponsorId, sponsorId))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(programsV2Table.createdAt));

    const [totalCount] = await this.db
      .select({ count: count() })
      .from(programsV2Table)
      .where(eq(programsV2Table.sponsorId, sponsorId));

    // Extract program data (joined data is not needed in return type)
    const programs = data.map((row) => {
      const { sponsor, network, token, applicationCount, ...program } = row;
      return {
        ...(program as ProgramV2),
        applicationCount: applicationCount ?? 0,
      };
    });

    return {
      data: programs,
      count: totalCount.count,
    };
  }
}
