import type { MilestoneV2, NewMilestoneV2 } from '@/db/schemas/v2/milestones';
import { milestonesV2Table } from '@/db/schemas/v2/milestones';
import type {
  CreateMilestoneV2Input,
  MilestonesV2QueryInput,
  UpdateMilestoneV2Input,
} from '@/graphql/v2/inputs/milestones';
import type { Context } from '@/types';
import { and, count, desc, eq } from 'drizzle-orm';

interface PaginatedMilestonesV2Result {
  data: MilestoneV2[];
  count: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export class MilestoneV2Service {
  constructor(
    private db: Context['db'],
    private server: Context['server'],
  ) {}

  async getById(id: string): Promise<MilestoneV2> {
    const startTime = Date.now();
    this.server.log.info(`🚀 Starting MilestoneV2Service.getById for id: ${id}`);

    try {
      const [milestone] = await this.db
        .select()
        .from(milestonesV2Table)
        .where(eq(milestonesV2Table.id, Number.parseInt(id, 10)));

      const duration = Date.now() - startTime;

      if (!milestone) {
        this.server.log.warn(`❌ Milestone not found with id: ${id}`);
        throw new Error('Milestone not found');
      }

      this.server.log.info(`✅ MilestoneV2Service.getById completed in ${duration}ms`);
      return milestone;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.server.log.error(
        `❌ MilestoneV2Service.getById failed after ${duration}ms: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }

  async getMany(
    query?: typeof MilestonesV2QueryInput.$inferInput | null,
  ): Promise<PaginatedMilestonesV2Result> {
    const startTime = Date.now();
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 10;

    this.server.log.info(
      `🚀 Starting MilestoneV2Service.getMany with params: ${JSON.stringify(query)}`,
    );

    try {
      const whereConditions = [];

      if (query?.programId) {
        whereConditions.push(eq(milestonesV2Table.programId, query.programId));
      }
      if (query?.applicationId) {
        whereConditions.push(
          eq(milestonesV2Table.applicationId, Number.parseInt(query.applicationId, 10)),
        );
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      const [totalResult] = await this.db
        .select({ count: count() })
        .from(milestonesV2Table)
        .where(whereClause);
      const totalCount = totalResult.count;
      const totalPages = Math.ceil(totalCount / limit);
      const offset = (page - 1) * limit;

      const data = await this.db
        .select()
        .from(milestonesV2Table)
        .where(whereClause)
        .orderBy(desc(milestonesV2Table.createdAt))
        .limit(limit)
        .offset(offset);

      const duration = Date.now() - startTime;
      this.server.log.info(
        `✅ MilestoneV2Service.getMany completed in ${duration}ms - found ${data.length} milestones`,
      );

      return {
        data,
        count: totalCount,
        totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.server.log.error(
        `❌ MilestoneV2Service.getMany failed after ${duration}ms: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }

  async getInProgress(
    query?: typeof MilestonesV2QueryInput.$inferInput | null,
  ): Promise<PaginatedMilestonesV2Result> {
    const startTime = Date.now();
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 10;

    this.server.log.info(
      `🚀 Starting MilestoneV2Service.getInProgress with params: ${JSON.stringify(query)}`,
    );

    try {
      const whereConditions = [eq(milestonesV2Table.status, 'in_progress')];

      if (query?.programId) {
        whereConditions.push(eq(milestonesV2Table.programId, query.programId));
      }
      if (query?.applicationId) {
        whereConditions.push(
          eq(milestonesV2Table.applicationId, Number.parseInt(query.applicationId, 10)),
        );
      }

      const whereClause = and(...whereConditions);

      const [totalResult] = await this.db
        .select({ count: count() })
        .from(milestonesV2Table)
        .where(whereClause);
      const totalCount = totalResult.count;
      const totalPages = Math.ceil(totalCount / limit);
      const offset = (page - 1) * limit;

      const data = await this.db
        .select()
        .from(milestonesV2Table)
        .where(whereClause)
        .orderBy(desc(milestonesV2Table.createdAt))
        .limit(limit)
        .offset(offset);

      const duration = Date.now() - startTime;
      this.server.log.info(
        `✅ MilestoneV2Service.getInProgress completed in ${duration}ms - found ${data.length} milestones`,
      );

      return {
        data,
        count: totalCount,
        totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.server.log.error(
        `❌ MilestoneV2Service.getInProgress failed after ${duration}ms: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }

  async create(input: typeof CreateMilestoneV2Input.$inferInput): Promise<MilestoneV2> {
    const startTime = Date.now();
    this.server.log.info('🚀 Starting MilestoneV2Service.create');

    try {
      const milestoneData: NewMilestoneV2 = {
        programId: input.programId,
        applicationId: Number.parseInt(input.applicationId, 10),
        sponsorId: Number.parseInt(input.sponsorId, 10),
        ...(input.title !== null && input.title !== undefined && { title: input.title }),
        ...(input.description !== null &&
          input.description !== undefined && { description: input.description }),
        ...(input.payout !== null && input.payout !== undefined && { payout: input.payout }),
        ...(input.deadline !== null &&
          input.deadline !== undefined && { deadline: new Date(input.deadline) }),
        status: input.status ?? 'draft', // Default to 'draft' if not provided
      };

      // Add files if provided
      if (input.files && input.files.length > 0) {
        milestoneData.files = input.files;
      }

      const [newMilestone] = await this.db
        .insert(milestonesV2Table)
        .values(milestoneData)
        .returning();

      const duration = Date.now() - startTime;
      this.server.log.info(`✅ MilestoneV2Service.create completed in ${duration}ms`);

      return newMilestone;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.server.log.error(
        `❌ MilestoneV2Service.create failed after ${duration}ms: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }

  async update(id: string, input: typeof UpdateMilestoneV2Input.$inferInput): Promise<MilestoneV2> {
    const startTime = Date.now();
    this.server.log.info(`🚀 Starting MilestoneV2Service.update for id: ${id}`);

    try {
      const [existingMilestone] = await this.db
        .select()
        .from(milestonesV2Table)
        .where(eq(milestonesV2Table.id, Number.parseInt(id, 10)));

      if (!existingMilestone) {
        throw new Error('Milestone not found');
      }

      const updateData: Record<string, unknown> = {};
      if (input.title !== undefined) updateData.title = input.title;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.payout !== undefined) updateData.payout = input.payout;
      if (input.deadline !== undefined && input.deadline !== null) {
        updateData.deadline = new Date(input.deadline);
      }
      if (input.files !== undefined) updateData.files = input.files;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.payout_tx !== undefined) updateData.payout_tx = input.payout_tx;

      // Always update updatedAt timestamp
      updateData.updatedAt = new Date();

      const [updatedMilestone] = await this.db
        .update(milestonesV2Table)
        .set(updateData)
        .where(eq(milestonesV2Table.id, Number.parseInt(id, 10)))
        .returning();

      const duration = Date.now() - startTime;
      this.server.log.info(`✅ MilestoneV2Service.update completed in ${duration}ms`);

      return updatedMilestone;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.server.log.error(
        `❌ MilestoneV2Service.update failed after ${duration}ms: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }

  async delete(id: string): Promise<MilestoneV2> {
    const startTime = Date.now();
    this.server.log.info(`🚀 Starting MilestoneV2Service.delete for id: ${id}`);

    try {
      const [deletedMilestone] = await this.db
        .delete(milestonesV2Table)
        .where(eq(milestonesV2Table.id, Number.parseInt(id, 10)))
        .returning();

      if (!deletedMilestone) {
        throw new Error('Milestone not found');
      }

      const duration = Date.now() - startTime;
      this.server.log.info(`✅ MilestoneV2Service.delete completed in ${duration}ms`);

      return deletedMilestone;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.server.log.error(
        `❌ MilestoneV2Service.delete failed after ${duration}ms: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }

  async checkAllCompletedByApplication(applicationId: number): Promise<{
    allCompleted: boolean;
    completedCount: number;
    totalCount: number;
  }> {
    const startTime = Date.now();
    this.server.log.info(
      `🚀 Starting MilestoneV2Service.checkAllCompletedByApplication for applicationId: ${applicationId}`,
    );

    try {
      // Get all milestones for this application
      const milestones = await this.db
        .select()
        .from(milestonesV2Table)
        .where(eq(milestonesV2Table.applicationId, applicationId));

      const totalCount = milestones.length;
      const completedCount = milestones.filter((m) => m.status === 'completed').length;
      const allCompleted = totalCount > 0 && completedCount === totalCount;

      const duration = Date.now() - startTime;
      this.server.log.info(
        `✅ MilestoneV2Service.checkAllCompletedByApplication completed in ${duration}ms - ${completedCount}/${totalCount} completed`,
      );

      return {
        allCompleted,
        completedCount,
        totalCount,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.server.log.error(
        `❌ MilestoneV2Service.checkAllCompletedByApplication failed after ${duration}ms: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }
}
