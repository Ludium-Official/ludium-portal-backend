import {
  portfoliosV2Table,
  type NewPortfolioV2,
  type PortfolioV2,
} from '@/db/schemas/v2/portfolios';
import type { CreatePortfolioV2Input, UpdatePortfolioV2Input } from '../inputs/portfolios';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { FastifyInstance } from 'fastify';
import { and, eq } from 'drizzle-orm';
import { filesTable } from '@/db/schemas';

export class PortfolioV2Service {
  constructor(
    private db: NodePgDatabase,
    private server: FastifyInstance,
  ) {}

  private async uploadImages(
    images: Promise<import('@/types').UploadFile>[] | null | undefined,
    userId: number,
  ): Promise<string[] | null> {
    if (!images || images.length === 0) {
      return null;
    }

    const uploadPromises = images.map((imagePromise) =>
      this.server.fileManager.uploadFile({
        file: imagePromise,
        userId: String(userId),
        directory: 'portfolios',
      }),
    );

    const imageUrls = await Promise.all(uploadPromises);
    return imageUrls;
  }

  private async deleteExistingImages(imageUrls: string[] | null): Promise<void> {
    if (!imageUrls || imageUrls.length === 0) {
      return;
    }

    const urlPattern = /https:\/\/storage\.googleapis\.com\/[^/]+\/(.+)/;

    for (const imageUrl of imageUrls) {
      const match = imageUrl.match(urlPattern);
      if (match) {
        const filePath = match[1];
        const [existingFile] = await this.db
          .select()
          .from(filesTable)
          .where(eq(filesTable.path, filePath))
          .limit(1);

        if (existingFile) {
          try {
            await this.server.fileManager.deleteFile(existingFile.id);
          } catch (error) {
            // Log error but don't fail the operation
            this.server.log.warn({
              msg: 'Failed to delete existing portfolio image',
              fileId: existingFile.id,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      }
    }
  }

  async create(
    input: typeof CreatePortfolioV2Input.$inferInput,
    userId: number,
  ): Promise<PortfolioV2> {
    const startTime = Date.now();
    try {
      // Validate description length
      if (input.description && input.description.length > 1000) {
        throw new Error('Description must be 1000 characters or less');
      }

      // Upload images if provided
      const imageUrls = await this.uploadImages(input.images, userId);

      const portfolioData: NewPortfolioV2 = {
        userId,
        title: input.title,
        isLudiumProject: input.isLudiumProject ?? false,
        role: input.role ?? null,
        description: input.description ?? null,
        images: imageUrls,
      };

      const [portfolio] = await this.db.insert(portfoliosV2Table).values(portfolioData).returning();

      if (!portfolio) {
        throw new Error('Failed to create portfolio');
      }

      const duration = Date.now() - startTime;
      this.server.log.info({
        msg: '✅ PortfolioV2Service.create completed',
        duration: `${duration}ms`,
        portfolioId: portfolio.id,
      });

      return portfolio;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.server.log.error({
        msg: '❌ PortfolioV2Service.create failed',
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async update(
    input: typeof UpdatePortfolioV2Input.$inferInput,
    userId: number,
  ): Promise<PortfolioV2> {
    const startTime = Date.now();
    try {
      const portfolioId = Number.parseInt(input.id as string);

      // Validate description length
      if (input.description && input.description.length > 1000) {
        throw new Error('Description must be 1000 characters or less');
      }

      // Check if portfolio exists and belongs to user
      const [existing] = await this.db
        .select()
        .from(portfoliosV2Table)
        .where(and(eq(portfoliosV2Table.id, portfolioId), eq(portfoliosV2Table.userId, userId)))
        .limit(1);

      if (!existing) {
        throw new Error('Portfolio not found or access denied');
      }

      const updateData: Partial<Omit<NewPortfolioV2, 'id' | 'userId'>> = {};
      if (input.title !== undefined) updateData.title = input.title;
      if (input.isLudiumProject !== undefined)
        updateData.isLudiumProject = input.isLudiumProject ?? false;
      if (input.role !== undefined) updateData.role = input.role ?? null;
      if (input.description !== undefined) updateData.description = input.description ?? null;

      if (input.images !== undefined) {
        // Delete existing images if any
        if (existing.images && existing.images.length > 0) {
          await this.deleteExistingImages(existing.images);
        }
        // Upload new images
        const imageUrls = await this.uploadImages(input.images, userId);
        updateData.images = imageUrls;
      }

      const [updated] = await this.db
        .update(portfoliosV2Table)
        .set(updateData)
        .where(and(eq(portfoliosV2Table.id, portfolioId), eq(portfoliosV2Table.userId, userId)))
        .returning();

      if (!updated) {
        throw new Error('Failed to update portfolio');
      }

      const duration = Date.now() - startTime;
      this.server.log.info({
        msg: '✅ PortfolioV2Service.update completed',
        duration: `${duration}ms`,
        portfolioId: updated.id,
      });

      return updated;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.server.log.error({
        msg: '❌ PortfolioV2Service.update failed',
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async delete(id: string, userId: number): Promise<boolean> {
    const startTime = Date.now();
    try {
      const portfolioId = Number.parseInt(id);

      // Check if portfolio exists and belongs to user
      const [existing] = await this.db
        .select()
        .from(portfoliosV2Table)
        .where(and(eq(portfoliosV2Table.id, portfolioId), eq(portfoliosV2Table.userId, userId)))
        .limit(1);

      if (!existing) {
        return false;
      }

      if (existing.images && existing.images.length > 0) {
        await this.deleteExistingImages(existing.images);
      }

      await this.db
        .delete(portfoliosV2Table)
        .where(and(eq(portfoliosV2Table.id, portfolioId), eq(portfoliosV2Table.userId, userId)));

      const duration = Date.now() - startTime;
      this.server.log.info({
        msg: '✅ PortfolioV2Service.delete completed',
        duration: `${duration}ms`,
        portfolioId,
      });

      return true;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.server.log.error({
        msg: '❌ PortfolioV2Service.delete failed',
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
