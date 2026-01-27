import { randomUUID } from 'node:crypto';
import type { ApplicationV2, NewApplicationV2 } from '@/db/schemas/v2/applications';
import { applicationsV2Table } from '@/db/schemas/v2/applications';
import { programsV2Table } from '@/db/schemas/v2/programs';
import type {
  ApplicationsByProgramV2QueryInput,
  ApplicationsV2QueryInput,
  CreateApplicationV2Input,
  MyApplicationsV2QueryInput,
  ReviewApplicationV2Input,
  UpdateApplicationV2Input,
} from '@/graphql/v2/inputs/applications';
import type { Context } from '@/types';
import { and, count, desc, eq } from 'drizzle-orm';

interface PaginatedApplicationsV2Result {
  data: ApplicationV2[];
  count: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export class ApplicationV2Service {
  constructor(
    private db: Context['db'],
    private server: Context['server'],
  ) {}

  async getById(id: string): Promise<ApplicationV2> {
    const startTime = Date.now();
    this.server.log.info(`🚀 Starting ApplicationV2Service.getById for id: ${id}`);

    try {
      const [application] = await this.db
        .select()
        .from(applicationsV2Table)
        .where(eq(applicationsV2Table.id, Number.parseInt(id, 10)));

      const duration = Date.now() - startTime;

      if (!application) {
        this.server.log.warn(`❌ Application not found with id: ${id}`);
        throw new Error('Application not found');
      }

      this.server.log.info(`✅ ApplicationV2Service.getById completed in ${duration}ms`);
      return application;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.server.log.error(
        `❌ ApplicationV2Service.getById failed after ${duration}ms: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }

  async getMany(
    query?: typeof ApplicationsV2QueryInput.$inferInput | null,
  ): Promise<PaginatedApplicationsV2Result> {
    const startTime = Date.now();
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 10;

    this.server.log.info(
      `🚀 Starting ApplicationV2Service.getMany with params: ${JSON.stringify(query)}`,
    );

    try {
      const whereConditions = [];

      if (query?.programId) {
        whereConditions.push(eq(applicationsV2Table.programId, query.programId));
      }
      if (query?.applicantId) {
        whereConditions.push(
          eq(applicationsV2Table.applicantId, Number.parseInt(query.applicantId, 10)),
        );
      }
      if (query?.status) {
        whereConditions.push(eq(applicationsV2Table.status, query.status));
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      const [totalResult] = await this.db
        .select({ count: count() })
        .from(applicationsV2Table)
        .where(whereClause);
      const totalCount = totalResult.count;
      const totalPages = Math.ceil(totalCount / limit);
      const offset = (page - 1) * limit;

      const data = await this.db
        .select()
        .from(applicationsV2Table)
        .where(whereClause)
        .orderBy(desc(applicationsV2Table.createdAt))
        .limit(limit)
        .offset(offset);

      const duration = Date.now() - startTime;
      this.server.log.info(
        `✅ ApplicationV2Service.getMany completed in ${duration}ms - found ${data.length} applications`,
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
        `❌ ApplicationV2Service.getMany failed after ${duration}ms: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }

  async getByProgram(
    query: typeof ApplicationsByProgramV2QueryInput.$inferInput,
    userId: number,
  ): Promise<PaginatedApplicationsV2Result> {
    const startTime = Date.now();
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 10;
    const programId = query.programId;

    this.server.log.info(
      `🚀 Starting ApplicationV2Service.getByProgram for programId: ${programId}, userId: ${userId}`,
    );

    try {
      // Get program to check if user is sponsor
      const [program] = await this.db
        .select()
        .from(programsV2Table)
        .where(eq(programsV2Table.id, programId));

      if (!program) {
        throw new Error('Program not found');
      }

      // Check if user is sponsor of this program
      const isSponsor = program.sponsorId === userId;

      // Build where clause based on user role
      const whereClause = isSponsor
        ? // Sponsor: can see all applications for this program
          eq(applicationsV2Table.programId, programId)
        : // Builder: can only see their own applications for this program
          and(
            eq(applicationsV2Table.programId, programId),
            eq(applicationsV2Table.applicantId, userId),
          );

      if (isSponsor) {
        this.server.log.info(`User ${userId} is sponsor of program ${programId}`);
      } else {
        this.server.log.info(`User ${userId} is builder, showing only their applications`);
      }

      const [totalResult] = await this.db
        .select({ count: count() })
        .from(applicationsV2Table)
        .where(whereClause);
      const totalCount = totalResult.count;
      const totalPages = Math.ceil(totalCount / limit);
      const offset = (page - 1) * limit;

      const data = await this.db
        .select()
        .from(applicationsV2Table)
        .where(whereClause)
        .orderBy(desc(applicationsV2Table.createdAt))
        .limit(limit)
        .offset(offset);

      const duration = Date.now() - startTime;
      this.server.log.info(
        `✅ ApplicationV2Service.getByProgram completed in ${duration}ms - found ${data.length} applications`,
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
        `❌ ApplicationV2Service.getByProgram failed after ${duration}ms: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }

  async getMyApplications(
    query: typeof MyApplicationsV2QueryInput.$inferInput,
    userId: number,
  ): Promise<PaginatedApplicationsV2Result> {
    const startTime = Date.now();
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 10;

    this.server.log.info(
      `🚀 Starting ApplicationV2Service.getMyApplications for userId: ${userId}`,
    );

    try {
      // Get all applications by this user (applicant)
      const whereClause = eq(applicationsV2Table.applicantId, userId);

      const [totalResult] = await this.db
        .select({ count: count() })
        .from(applicationsV2Table)
        .where(whereClause);
      const totalCount = totalResult.count;
      const totalPages = Math.ceil(totalCount / limit);
      const offset = (page - 1) * limit;

      const data = await this.db
        .select()
        .from(applicationsV2Table)
        .where(whereClause)
        .orderBy(desc(applicationsV2Table.createdAt))
        .limit(limit)
        .offset(offset);

      const duration = Date.now() - startTime;
      this.server.log.info(
        `✅ ApplicationV2Service.getMyApplications completed in ${duration}ms - found ${data.length} applications`,
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
        `❌ ApplicationV2Service.getMyApplications failed after ${duration}ms: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }

  async create(
    input: typeof CreateApplicationV2Input.$inferInput,
    applicantId: number,
  ): Promise<ApplicationV2> {
    const startTime = Date.now();
    this.server.log.info('🚀 Starting ApplicationV2Service.create');

    try {
      const applicationData: NewApplicationV2 = {
        programId: input.programId,
        applicantId,
        status: input.status ?? 'submitted',
        content: input.content ?? '',
      };

      const [newApplication] = await this.db
        .insert(applicationsV2Table)
        .values(applicationData)
        .returning();

      // notify
      const [program] = await this.db
        .select()
        .from(programsV2Table)
        .where(eq(programsV2Table.id, input.programId));

      if (program) {
        await this.notify({
          recipientId: program.sponsorId,
          applicationId: newApplication.id,
          programId: program.id,
          action: 'submitted',
          title: 'New Application Received',
          content: `New Application for ${program.title}`,
        });
      }

      const duration = Date.now() - startTime;
      this.server.log.info(`✅ ApplicationV2Service.create completed in ${duration}ms`);

      return newApplication;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.server.log.error(
        `❌ ApplicationV2Service.create failed after ${duration}ms: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }

  async update(
    id: string,
    input: typeof UpdateApplicationV2Input.$inferInput,
  ): Promise<ApplicationV2> {
    const startTime = Date.now();
    this.server.log.info(`🚀 Starting ApplicationV2Service.update for id: ${id}`);

    try {
      const [existingApplication] = await this.db
        .select()
        .from(applicationsV2Table)
        .where(eq(applicationsV2Table.id, Number.parseInt(id, 10)));

      if (!existingApplication) {
        throw new Error('Application not found');
      }

      // TODO: Add some logic to allow users to update the application
      // if (existingApplication.applicantId !== userId) {
      //   throw new Error('Unauthorized to update this application');
      // }

      type UpdateApplicationV2InputType = typeof UpdateApplicationV2Input.$inferInput;

      const typedInput: UpdateApplicationV2InputType = input;
      const updateData: Partial<Pick<ApplicationV2, 'content' | 'status'>> = {};

      if (typedInput.content !== undefined) {
        updateData.content = typedInput.content ?? '';
      }
      if (typedInput.status !== undefined) {
        updateData.status = typedInput.status as ApplicationV2['status'];
      }

      const [updatedApplication] = await this.db
        .update(applicationsV2Table)
        .set(updateData)
        .where(eq(applicationsV2Table.id, Number.parseInt(id, 10)))
        .returning();

      const duration = Date.now() - startTime;
      this.server.log.info(`✅ ApplicationV2Service.update completed in ${duration}ms`);

      return updatedApplication;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.server.log.error(
        `❌ ApplicationV2Service.update failed after ${duration}ms: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }

  async review(
    id: string,
    input: typeof ReviewApplicationV2Input.$inferInput,
  ): Promise<ApplicationV2> {
    const startTime = Date.now();
    this.server.log.info(`🚀 Starting ApplicationV2Service.review for id: ${id}`);

    try {
      // Get the application to check if it exists
      // Note: Authorization is handled by auth scope (isApplicationProgramCreatorV2)
      const [application] = await this.db
        .select()
        .from(applicationsV2Table)
        .where(eq(applicationsV2Table.id, Number.parseInt(id, 10)));

      if (!application) {
        throw new Error('Application not found');
      }

      type ReviewApplicationV2InputType = typeof ReviewApplicationV2Input.$inferInput;
      const typedInput: ReviewApplicationV2InputType = input;
      const updateData: Partial<Pick<ApplicationV2, 'status' | 'rejectedReason'>> = {};

      if (typedInput.status !== undefined) {
        updateData.status = typedInput.status as ApplicationV2['status'];
      }
      if (typedInput.rejectedReason !== undefined) {
        updateData.rejectedReason = typedInput.rejectedReason ?? null;
      }

      const [reviewedApplication] = await this.db
        .update(applicationsV2Table)
        .set(updateData)
        .where(eq(applicationsV2Table.id, Number.parseInt(id, 10)))
        .returning();

      const duration = Date.now() - startTime;
      this.server.log.info(`✅ ApplicationV2Service.review completed in ${duration}ms`);

      return reviewedApplication;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.server.log.error(
        `❌ ApplicationV2Service.review failed after ${duration}ms: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }

  async pick(id: string, input: { picked: boolean }): Promise<ApplicationV2> {
    const startTime = Date.now();
    this.server.log.info(`🚀 Starting ApplicationV2Service.pick for id: ${id}`);

    try {
      // Get the application to check if it exists
      // Note: Authorization is handled by auth scope (isApplicationProgramCreatorV2)
      const [application] = await this.db
        .select()
        .from(applicationsV2Table)
        .where(eq(applicationsV2Table.id, Number.parseInt(id, 10)));

      if (!application) {
        throw new Error('Application not found');
      }

      const updateData = { picked: input.picked };

      const [pickedApplication] = await this.db
        .update(applicationsV2Table)
        .set(updateData)
        .where(eq(applicationsV2Table.id, Number.parseInt(id, 10)))
        .returning();

      const duration = Date.now() - startTime;
      this.server.log.info(`✅ ApplicationV2Service.pick completed in ${duration}ms`);

      return pickedApplication;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.server.log.error(
        `❌ ApplicationV2Service.pick failed after ${duration}ms: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }

  async delete(id: string, userId: number): Promise<ApplicationV2> {
    const startTime = Date.now();
    this.server.log.info(`🚀 Starting ApplicationV2Service.delete for id: ${id}`);

    try {
      // First check if the application exists and belongs to the user
      const [existingApplication] = await this.db
        .select()
        .from(applicationsV2Table)
        .where(eq(applicationsV2Table.id, Number.parseInt(id, 10)));

      if (!existingApplication) {
        throw new Error('Application not found');
      }

      if (existingApplication.applicantId !== userId) {
        throw new Error('Unauthorized to delete this application');
      }

      const [deletedApplication] = await this.db
        .delete(applicationsV2Table)
        .where(eq(applicationsV2Table.id, Number.parseInt(id, 10)))
        .returning();

      const duration = Date.now() - startTime;
      this.server.log.info(`✅ ApplicationV2Service.delete completed in ${duration}ms`);

      return deletedApplication;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.server.log.error(
        `❌ ApplicationV2Service.delete failed after ${duration}ms: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }

  async updateChatroomMessageId(id: string): Promise<ApplicationV2> {
    const startTime = Date.now();
    this.server.log.info(`🚀 Starting ApplicationV2Service.updateChatroomMessageId for id: ${id}`);

    try {
      // Get the application to check if it exists
      // Note: Authorization is handled by auth scope (isApplicationProgramCreatorV2)
      const [application] = await this.db
        .select()
        .from(applicationsV2Table)
        .where(eq(applicationsV2Table.id, Number.parseInt(id, 10)));

      if (!application) {
        throw new Error('Application not found');
      }

      // Generate a random UUID for the chatroom message ID
      const chatroomMessageId = randomUUID();

      const [updatedApplication] = await this.db
        .update(applicationsV2Table)
        .set({
          chatroomMessageId,
          updatedAt: new Date(),
        })
        .where(eq(applicationsV2Table.id, Number.parseInt(id, 10)))
        .returning();

      const duration = Date.now() - startTime;
      this.server.log.info(
        `✅ ApplicationV2Service.updateChatroomMessageId completed in ${duration}ms with chatroomMessageId: ${chatroomMessageId}`,
      );

      return updatedApplication;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.server.log.error(
        `❌ ApplicationV2Service.updateChatroomMessageId failed after ${duration}ms: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }

  async complete(id: string): Promise<ApplicationV2> {
    const startTime = Date.now();
    this.server.log.info(`🚀 Starting ApplicationV2Service.complete for id: ${id}`);

    try {
      // Get the application to check if it exists and verify authorization
      const [application] = await this.db
        .select()
        .from(applicationsV2Table)
        .where(eq(applicationsV2Table.id, Number.parseInt(id, 10)));

      if (!application) {
        throw new Error('Application not found');
      }

      // Update status to completed
      const [completedApplication] = await this.db
        .update(applicationsV2Table)
        .set({
          status: 'completed',
          updatedAt: new Date(),
        })
        .where(eq(applicationsV2Table.id, Number.parseInt(id, 10)))
        .returning();

      const duration = Date.now() - startTime;
      this.server.log.info(`✅ ApplicationV2Service.complete completed in ${duration}ms`);

      return completedApplication;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.server.log.error(
        `❌ ApplicationV2Service.complete failed after ${duration}ms: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }

  async checkAllCompletedByProgram(programId: string): Promise<{
    allCompleted: boolean;
    completedCount: number;
    totalCount: number;
  }> {
    const startTime = Date.now();
    this.server.log.info(
      `🚀 Starting ApplicationV2Service.checkAllCompletedByProgram for programId: ${programId}`,
    );

    // Get all applications for this program
    const applications = await this.db
      .select()
      .from(applicationsV2Table)
      .where(eq(applicationsV2Table.programId, programId));

    const totalCount = applications.length;
    const completedCount = applications.filter((app) => app.status === 'completed').length;
    const allCompleted = totalCount > 0 && completedCount === totalCount;

    const duration = Date.now() - startTime;
    this.server.log.info(
      `✅ ApplicationV2Service.checkAllCompletedByProgram completed in ${duration}ms - ${completedCount}/${totalCount} completed`,
    );

    return {
      allCompleted,
      completedCount,
      totalCount,
    };
  }

  // helper
  private async notify(params: {
    recipientId: number;
    applicationId: number;
    programId: string;
    action: 'submitted' | 'accepted' | 'rejected';
    title: string;
    content: string;
  }) {
    await this.server.pubsub.publish('notificationsV2', this.db, {
      type: 'application' as const,
      action: params.action,
      recipientId: params.recipientId,
      entityId: String(params.applicationId),
      title: params.title,
      content: params.content,
      metadata: { programId: params.programId },
    });
    await this.server.pubsub.publish('notificationsV2Count');
  }
}
