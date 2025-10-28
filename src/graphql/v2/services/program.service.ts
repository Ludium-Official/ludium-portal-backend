import { type ProgramV2, programsV2Table } from '@/db/schemas';
import type { CreateProgramV2Input, UpdateProgramV2Input } from '@/graphql/v2/inputs/programs';
import type { Context } from '@/types';
import { count, desc, eq } from 'drizzle-orm';

export class ProgramV2Service {
  constructor(private db: Context['db']) {}

  async getMany(pagination?: {
    limit?: number;
    offset?: number;
  }): Promise<{ data: ProgramV2[]; count: number }> {
    const limit = pagination?.limit || 10;
    const offset = pagination?.offset || 0;

    const data = await this.db
      .select()
      .from(programsV2Table)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(programsV2Table.createdAt));

    const [totalCount] = await this.db.select({ count: count() }).from(programsV2Table);

    return {
      data,
      count: totalCount.count,
    };
  }

  async getById(id: string): Promise<ProgramV2> {
    const [program] = await this.db
      .select()
      .from(programsV2Table)
      .where(eq(programsV2Table.id, Number.parseInt(id, 10)));

    if (!program) {
      throw new Error('Program not found');
    }

    return program;
  }

  async create(input: typeof CreateProgramV2Input.$inferInput): Promise<ProgramV2> {
    const values = {
      ...input,
      deadline: new Date(input.deadline),
      creatorId: Number.parseInt(input.creatorId, 10),
    };
    const [newProgram] = await this.db.insert(programsV2Table).values(values).returning();
    return newProgram;
  }

  async update(id: string, input: typeof UpdateProgramV2Input.$inferInput): Promise<ProgramV2> {
    const values: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      if (key === 'deadline' && value) {
        values[key] = new Date(value as string);
      } else if (value !== null) {
        values[key] = value;
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
}
