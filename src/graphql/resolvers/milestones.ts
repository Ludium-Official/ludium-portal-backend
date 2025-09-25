import {
  type MilestoneUpdate,
  applicationsTable,
  filesTable,
  linksTable,
  milestonesTable,
  milestonesToLinksTable,
  programUserRolesTable,
  programsTable,
  usersTable,
} from '@/db/schemas';
import type { PaginationInput } from '@/graphql/types/common';
import type {
  CheckMilestoneInput,
  SubmitMilestoneInput,
  UpdateMilestoneInput,
} from '@/graphql/types/milestones';
import type { Context, Root } from '@/types';
import {
  calculateMilestoneAmount,
  checkAndUpdateProgramStatus,
  filterEmptyValues,
  getMilestoneNotificationMetadata,
  isInSameScope,
  requireUser,
  validAndNotEmptyArray,
  validateMilestonePercentages,
} from '@/utils';
import BigNumber from 'bignumber.js';
import { and, asc, count, eq, lt } from 'drizzle-orm';
import { getValidatorsByProgramIdResolver } from './users';

export async function getMilestoneResolver(_root: Root, args: { id: string }, ctx: Context) {
  const [milestone] = await ctx.db
    .select()
    .from(milestonesTable)
    .where(eq(milestonesTable.id, args.id));

  if (!milestone) {
    throw new Error('Milestone not found');
  }

  // Get the application and program to check visibility
  const [application] = await ctx.db
    .select({ programId: applicationsTable.programId, applicantId: applicationsTable.applicantId })
    .from(applicationsTable)
    .where(eq(applicationsTable.id, milestone.applicationId));

  if (!application) {
    throw new Error('Application not found');
  }

  const [program] = await ctx.db
    .select({ visibility: programsTable.visibility, creatorId: programsTable.creatorId })
    .from(programsTable)
    .where(eq(programsTable.id, application.programId));

  if (!program) {
    throw new Error('Program not found');
  }

  // Check access for private programs
  if (program.visibility === 'private') {
    const user = requireUser(ctx);

    // Check if user is admin first (admins can access everything)
    if (user.role === 'admin' || user.role === 'superadmin') {
      return milestone;
    }

    // Allow access if user is the applicant or program creator
    if (application.applicantId === user.id || program.creatorId === user.id) {
      return milestone;
    }

    // Check if user has any role in the program
    const userRole = await ctx.db
      .select()
      .from(programUserRolesTable)
      .where(
        and(
          eq(programUserRolesTable.programId, application.programId),
          eq(programUserRolesTable.userId, user.id),
        ),
      );

    if (userRole.length === 0) {
      throw new Error('You do not have access to this milestone');
    }
  }

  return milestone;
}

export async function getMilestonesResolver(
  _root: Root,
  args: { applicationId: string; pagination?: typeof PaginationInput.$inferInput | null },
  ctx: Context,
) {
  // First check if user has access to this application's milestones
  const [application] = await ctx.db
    .select({ programId: applicationsTable.programId, applicantId: applicationsTable.applicantId })
    .from(applicationsTable)
    .where(eq(applicationsTable.id, args.applicationId));

  if (!application) {
    throw new Error('Application not found');
  }

  const [program] = await ctx.db
    .select({ visibility: programsTable.visibility, creatorId: programsTable.creatorId })
    .from(programsTable)
    .where(eq(programsTable.id, application.programId));

  if (!program) {
    throw new Error('Program not found');
  }

  // Check access for private programs
  if (program.visibility === 'private') {
    const user = requireUser(ctx);

    // Check if user is admin first (admins can access everything)
    if (user.role === 'admin' || user.role === 'superadmin') {
      // Admin can access all milestones, continue
    } else {
      // Allow access if user is the applicant or program creator
      if (application.applicantId !== user.id && program.creatorId !== user.id) {
        // Check if user has any role in the program
        const userRole = await ctx.db
          .select()
          .from(programUserRolesTable)
          .where(
            and(
              eq(programUserRolesTable.programId, application.programId),
              eq(programUserRolesTable.userId, user.id),
            ),
          );

        if (userRole.length === 0) {
          throw new Error('You do not have access to view milestones for this application');
        }
      }
    }
  }

  const limit = args.pagination?.limit || 10;
  const offset = args.pagination?.offset || 0;

  const data = await ctx.db
    .select()
    .from(milestonesTable)
    .where(eq(milestonesTable.applicationId, args.applicationId))
    .limit(limit)
    .offset(offset);

  const totalCount = await ctx.db
    .select({ count: count() })
    .from(milestonesTable)
    .where(eq(milestonesTable.applicationId, args.applicationId));

  if (!validAndNotEmptyArray(data) || !validAndNotEmptyArray(totalCount)) {
    throw new Error('No milestones found');
  }

  return {
    data,
    count: totalCount[0].count,
  };
}

export async function getMilestonesByApplicationIdResolver(
  _root: Root,
  args: { applicationId: string },
  ctx: Context,
) {
  // First check if user has access to this application's milestones
  const [application] = await ctx.db
    .select({ programId: applicationsTable.programId, applicantId: applicationsTable.applicantId })
    .from(applicationsTable)
    .where(eq(applicationsTable.id, args.applicationId));

  if (!application) {
    throw new Error('Application not found');
  }

  const [program] = await ctx.db
    .select({ visibility: programsTable.visibility, creatorId: programsTable.creatorId })
    .from(programsTable)
    .where(eq(programsTable.id, application.programId));

  if (!program) {
    throw new Error('Program not found');
  }

  // Check access for private programs
  if (program.visibility === 'private') {
    const user = requireUser(ctx);

    // Check if user is admin first (admins can access everything)
    if (user.role === 'admin' || user.role === 'superadmin') {
      // Admin can access all milestones, continue
    } else {
      // Allow access if user is the applicant or program creator
      if (application.applicantId !== user.id && program.creatorId !== user.id) {
        // Check if user has any role in the program
        const userRole = await ctx.db
          .select()
          .from(programUserRolesTable)
          .where(
            and(
              eq(programUserRolesTable.programId, application.programId),
              eq(programUserRolesTable.userId, user.id),
            ),
          );

        if (userRole.length === 0) {
          throw new Error('You do not have access to view milestones for this application');
        }
      }
    }
  }

  return ctx.db
    .select()
    .from(milestonesTable)
    .where(eq(milestonesTable.applicationId, args.applicationId))
    .orderBy(asc(milestonesTable.sortOrder));
}

export function updateMilestoneResolver(
  _root: Root,
  args: { input: typeof UpdateMilestoneInput.$inferInput },
  ctx: Context,
) {
  const user = requireUser(ctx);
  const filteredData = filterEmptyValues<MilestoneUpdate>(args.input);

  return ctx.db.transaction(async (t) => {
    // Get the milestone and application to find the program
    const [milestone] = await t
      .select()
      .from(milestonesTable)
      .where(eq(milestonesTable.id, args.input.id));

    if (!milestone) {
      throw new Error('Milestone not found');
    }

    const [application] = await t
      .select()
      .from(applicationsTable)
      .where(eq(applicationsTable.id, milestone.applicationId));

    if (!application) {
      throw new Error('Application not found');
    }

    // Check if user is the applicant, a builder in this program, or an admin
    const isAdmin = user.role?.endsWith('admin');
    const isApplicant = application.applicantId === user.id;

    const [builderRole] = await t
      .select()
      .from(programUserRolesTable)
      .where(
        and(
          eq(programUserRolesTable.programId, application.programId),
          eq(programUserRolesTable.userId, user.id),
          eq(programUserRolesTable.roleType, 'builder'),
        ),
      );

    if (!isAdmin && !builderRole && !isApplicant) {
      throw new Error(
        'You are not allowed to update this milestone. Only the applicant, builders, and admins can update milestones.',
      );
    }

    // Validate milestone deadline for funding programs
    if (args.input.deadline) {
      const [program] = await t
        .select()
        .from(programsTable)
        .where(eq(programsTable.id, application.programId));

      if (program && program.type === 'funding' && program.fundingEndDate) {
        const fundingEndDate = new Date(program.fundingEndDate);
        const milestoneDeadline = new Date(args.input.deadline);

        if (milestoneDeadline <= fundingEndDate) {
          throw new Error(
            `Milestone deadline must be after the funding period ends (${fundingEndDate.toISOString().split('T')[0]}). Please select a date after the funding end date.`,
          );
        }
      }
    }

    // handle links
    if (args.input.links) {
      const filteredLinks = args.input.links.filter((link) => link.url);
      const newLinks = await t
        .insert(linksTable)
        .values(
          filteredLinks.map((link) => ({
            url: link.url as string,
            title: link.title as string,
          })),
        )
        .returning();
      await t.insert(milestonesToLinksTable).values(
        newLinks.map((link) => ({
          milestoneId: args.input.id,
          linkId: link.id,
        })),
      );
    }

    // Validate percentage if provided
    if (args.input.percentage) {
      const percentage = new BigNumber(args.input.percentage);

      // Validate percentage is between 0 and 100
      if (percentage.isLessThan(0) || percentage.isGreaterThan(100)) {
        throw new Error(
          `Milestone percentage must be between 0 and 100. Received: ${percentage.toFixed()}%`,
        );
      }

      // Get milestone and application info
      const [milestone] = await t
        .select({ applicationId: milestonesTable.applicationId })
        .from(milestonesTable)
        .where(eq(milestonesTable.id, args.input.id));

      const [application] = await t
        .select({ programId: applicationsTable.programId, price: applicationsTable.price })
        .from(applicationsTable)
        .where(eq(applicationsTable.id, milestone.applicationId));

      // Get all milestones for this application
      const milestones = await t
        .select({ id: milestonesTable.id, percentage: milestonesTable.percentage })
        .from(milestonesTable)
        .where(eq(milestonesTable.applicationId, milestone.applicationId));

      // Calculate total percentage including the updated one
      const updatedMilestones = milestones
        .map((m) =>
          m.id === args.input.id ? { ...m, percentage: args.input.percentage || '0' } : m,
        )
        .filter((m): m is { id: string; percentage: string } => m.percentage != null);

      if (!validateMilestonePercentages(updatedMilestones)) {
        const totalPercentage = updatedMilestones.reduce((sum, m) => sum + Number(m.percentage), 0);
        throw new Error(
          `Milestone payout percentages must add up to exactly 100%. Current total: ${totalPercentage}%. Please adjust the percentages.`,
        );
      }

      // Calculate the actual price amount and update it
      const calculatedAmount = calculateMilestoneAmount(args.input.percentage, application.price);
      filteredData.price = calculatedAmount;
    }

    const [updatedMilestone] = await t
      .update(milestonesTable)
      .set(filteredData)
      .where(eq(milestonesTable.id, args.input.id))
      .returning();

    return updatedMilestone;
  });
}

export function submitMilestoneResolver(
  _root: Root,
  args: { input: typeof SubmitMilestoneInput.$inferInput },
  ctx: Context,
) {
  const user = requireUser(ctx);

  return ctx.db.transaction(async (t) => {
    const hasAccess = await isInSameScope({
      scope: 'milestone_builder',
      userId: user.id,
      entityId: args.input.id,
      db: t,
    });
    if (!hasAccess) {
      throw new Error('You are not allowed to submit this milestone');
    }

    if (args.input.file) {
      const [avatar] = await t
        .select()
        .from(filesTable)
        .where(eq(filesTable.uploadedById, user.id));
      if (avatar) {
        await ctx.server.fileManager.deleteFile(avatar.id);
      }
      const fileUrl = await ctx.server.fileManager.uploadFile({
        file: args.input.file,
        userId: user.id,
      });
      await t
        .update(milestonesTable)
        .set({ file: fileUrl })
        .where(eq(milestonesTable.id, args.input.id));
    }

    // handle links
    await t
      .delete(milestonesToLinksTable)
      .where(eq(milestonesToLinksTable.milestoneId, args.input.id));
    if (args.input.links) {
      const filteredLinks = args.input.links.filter((link) => link.url);
      const newLinks = await t
        .insert(linksTable)
        .values(
          filteredLinks.map((link) => ({ url: link.url as string, title: link.title as string })),
        )
        .returning();
      await t
        .insert(milestonesToLinksTable)
        .values(newLinks.map((link) => ({ milestoneId: args.input.id, linkId: link.id })));
    }

    const [milestone] = await t
      .update(milestonesTable)
      .set({
        status: args.input.status,
        description: args.input.description,
        rejectionReason: null,
      })
      .where(eq(milestonesTable.id, args.input.id))
      .returning();

    // Get all application milestones and check if they are all completed
    const applicationMilestones = await t
      .select({ status: milestonesTable.status })
      .from(milestonesTable)
      .where(eq(milestonesTable.applicationId, milestone.applicationId));

    let applicationCompleted = false;
    if (applicationMilestones.every((m) => m.status === 'completed')) {
      await t
        .update(applicationsTable)
        .set({
          status: 'completed',
        })
        .where(eq(applicationsTable.id, milestone.applicationId));
      applicationCompleted = true;
    }

    const [application] = await t
      .select({ programId: applicationsTable.programId })
      .from(applicationsTable)
      .where(eq(applicationsTable.id, milestone.applicationId));

    const validators = await getValidatorsByProgramIdResolver(
      {},
      { programId: application.programId },
      ctx,
    );

    if (validators.length > 0) {
      const milestoneMetadata = await getMilestoneNotificationMetadata(milestone.id, t);

      for (const validator of validators) {
        await ctx.server.pubsub.publish('notifications', t, {
          type: 'milestone',
          action: 'submitted',
          recipientId: validator.id,
          entityId: milestone.id,
          metadata: {
            ...milestoneMetadata,
            action: 'milestone_submitted',
            category: 'progress',
          },
        });
      }
      await ctx.server.pubsub.publish('notificationsCount');
    }

    // Check if program budget is fully allocated after application completion
    if (applicationCompleted) {
      await checkAndUpdateProgramStatus(application.programId, t);
    }

    return milestone;
  });
}

export function checkMilestoneResolver(
  _root: Root,
  args: { input: typeof CheckMilestoneInput.$inferInput },
  ctx: Context,
) {
  const user = requireUser(ctx);

  return ctx.db.transaction(async (t) => {
    const hasAccess = await isInSameScope({
      scope: 'milestone_validator',
      userId: user.id,
      entityId: args.input.id,
      db: t,
    });
    if (!hasAccess) {
      throw new Error('You are not allowed to check this milestone');
    }

    const [milestone] = await t
      .update(milestonesTable)
      .set({
        status: args.input.status,
        ...(args.input.rejectionReason && { rejectionReason: args.input.rejectionReason }),
      })
      .where(eq(milestonesTable.id, args.input.id))
      .returning();

    const [application] = await t
      .select({ applicantId: applicationsTable.applicantId })
      .from(applicationsTable)
      .where(eq(applicationsTable.id, milestone.applicationId));

    const applicationMilestones = await t
      .select({ status: milestonesTable.status })
      .from(milestonesTable)
      .where(eq(milestonesTable.applicationId, milestone.applicationId));

    let applicationCompleted = false;
    if (applicationMilestones.every((m) => m.status === 'completed')) {
      await t
        .update(applicationsTable)
        .set({ status: 'completed' })
        .where(eq(applicationsTable.id, milestone.applicationId));
      applicationCompleted = true;
    }

    const previousMilestones = await t
      .select({ status: milestonesTable.status })
      .from(milestonesTable)
      .where(
        and(
          eq(milestonesTable.applicationId, milestone.applicationId),
          lt(milestonesTable.sortOrder, milestone.sortOrder),
        ),
      );

    if (!previousMilestones.every((m) => m.status === 'completed')) {
      throw new Error('Previous milestones must be accepted');
    }

    const milestoneMetadata = await getMilestoneNotificationMetadata(milestone.id, t);

    await ctx.server.pubsub.publish('notifications', t, {
      type: 'milestone',
      action: args.input.status === 'rejected' ? 'rejected' : 'accepted',
      recipientId: application.applicantId,
      entityId: milestone.id,
      metadata: {
        ...milestoneMetadata,
        action: args.input.status === 'rejected' ? 'milestone_rejected' : 'milestone_accepted',
        rejectionReason: args.input.status === 'rejected' ? args.input.rejectionReason : undefined,
        category: 'progress',
      },
    });
    await ctx.server.pubsub.publish('notificationsCount');

    // Check if program budget is fully allocated after application completion
    if (applicationCompleted && args.input.status === 'completed') {
      const [fullApplication] = await t
        .select({ programId: applicationsTable.programId })
        .from(applicationsTable)
        .where(eq(applicationsTable.id, milestone.applicationId));

      await checkAndUpdateProgramStatus(fullApplication.programId, t);
    }

    return milestone;
  });
}

// Reclaim an unpaid milestone past its deadline
export async function reclaimMilestoneResolver(
  _root: Root,
  args: { milestoneId: string; txHash?: string | null },
  ctx: Context,
) {
  const user = requireUser(ctx);

  return ctx.db.transaction(async (t) => {
    // Get the milestone with its application
    const [milestone] = await t
      .select()
      .from(milestonesTable)
      .where(eq(milestonesTable.id, args.milestoneId));

    if (!milestone) {
      throw new Error('Milestone not found');
    }

    // Get the application to check builder
    const [application] = await t
      .select()
      .from(applicationsTable)
      .where(eq(applicationsTable.id, milestone.applicationId));

    if (!application) {
      throw new Error('Associated application not found');
    }

    // Check if user is the builder (applicant)
    if (application.applicantId !== user.id) {
      throw new Error('Only the milestone builder can reclaim funds');
    }

    // Check if milestone is eligible for reclaim
    if (milestone.reclaimed) {
      throw new Error('Milestone has already been reclaimed');
    }

    if (milestone.status === 'completed' || milestone.status === 'rejected') {
      throw new Error('Cannot reclaim completed or rejected milestones');
    }

    const now = new Date();
    const deadline = milestone.deadline ? new Date(milestone.deadline) : null;
    if (!deadline || deadline > now) {
      throw new Error('Milestone deadline has not passed yet');
    }

    // Update milestone as reclaimed
    const updateData: {
      reclaimed: boolean;
      reclaimedAt: Date;
      reclaimTxHash?: string;
    } = {
      reclaimed: true,
      reclaimedAt: new Date(),
    };

    // Only set txHash if provided
    if (args.txHash) {
      updateData.reclaimTxHash = args.txHash;
    }

    const [updatedMilestone] = await t
      .update(milestonesTable)
      .set(updateData)
      .where(eq(milestonesTable.id, args.milestoneId))
      .returning();

    const milestoneMetadata = await getMilestoneNotificationMetadata(milestone.id, t);

    const [applicant] = await t
      .select({
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        email: usersTable.email,
      })
      .from(usersTable)
      .where(eq(usersTable.id, application.applicantId));

    await ctx.server.pubsub.publish('notifications', t, {
      type: 'milestone',
      action: 'completed',
      recipientId: application.applicantId,
      entityId: milestone.id,
      metadata: {
        ...milestoneMetadata,
        reason: 'deadline_passed',
        category: 'reclaim',
        applicantName:
          `${applicant.firstName ?? ''} ${applicant.lastName ?? ''}`.trim() ?? applicant.email,
      },
    });
    await ctx.server.pubsub.publish('notificationsCount');

    return updatedMilestone;
  });
}
