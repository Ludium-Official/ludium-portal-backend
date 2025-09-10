import {
  type ApplicationStatusEnum,
  type ApplicationUpdate,
  type Milestone,
  applicationsTable,
  applicationsToLinksTable,
  investmentTermsTable,
  investmentsTable,
  linksTable,
  milestonesTable,
  milestonesToLinksTable,
  programUserRolesTable,
  programsTable,
  userTierAssignmentsTable,
  usersTable,
} from '@/db/schemas';
import type { CreateApplicationInput, UpdateApplicationInput } from '@/graphql/types/applications';
import type { PaginationInput } from '@/graphql/types/common';
import type { Args, Context, Root } from '@/types';
import {
  calculateMilestoneAmount,
  canApplyToProgram,
  checkAndUpdateProgramStatus,
  filterEmptyValues,
  isInSameScope,
  requireUser,
  validAndNotEmptyArray,
  validateMilestonePercentages,
} from '@/utils';
import { canSubmitApplication } from '@/utils/program-status';
import BigNumber from 'bignumber.js';
import { and, asc, count, desc, eq, inArray, sql } from 'drizzle-orm';
import { getValidatorsByProgramIdResolver } from './users';

export async function getApplicationsResolver(
  _root: Root,
  args: { pagination?: typeof PaginationInput.$inferInput | null },
  ctx: Context,
) {
  const limit = args.pagination?.limit || 10;
  const offset = args.pagination?.offset || 0;
  const sort = args.pagination?.sort || 'desc';
  const filter = args.pagination?.filter || [];

  const filterPromises = filter.map(async (f) => {
    switch (f.field) {
      case 'programId':
        return f.value ? eq(applicationsTable.programId, f.value) : undefined;
      case 'applicantId':
        return f.value ? eq(applicationsTable.applicantId, f.value) : undefined;
      case 'supporterId': {
        if (!f.value) return undefined;
        // Get application IDs that have investments from this supporter
        const applicationIds = await ctx.db
          .select({ applicationId: investmentsTable.applicationId })
          .from(investmentsTable)
          .where(eq(investmentsTable.userId, f.value))
          .then((results) => results.map((r) => r.applicationId));

        if (applicationIds.length === 0) {
          // If no applications have investments from this supporter, return a condition that matches nothing
          return eq(applicationsTable.id, 'no-match');
        }

        return inArray(applicationsTable.id, applicationIds);
      }
      case 'status':
        // Only status uses multi-values
        if (f.values && f.values.length > 0) {
          return inArray(applicationsTable.status, f.values as ApplicationStatusEnum[]);
        }
        return undefined;
      case 'programType': {
        if (!f.value) return undefined;
        // Get programs of the specified type first
        const programs = await ctx.db
          .select({ id: programsTable.id })
          .from(programsTable)
          .where(eq(programsTable.type, f.value as 'regular' | 'funding'));

        if (programs.length === 0) {
          // If no programs of this type exist, return a condition that matches nothing
          return eq(applicationsTable.programId, 'no-match');
        }

        return inArray(
          applicationsTable.programId,
          programs.map((p) => p.id),
        );
      }
      default:
        return undefined;
    }
  });

  const filterConditions = (await Promise.all(filterPromises)).filter(Boolean);

  const data = await ctx.db
    .select()
    .from(applicationsTable)
    .limit(limit)
    .offset(offset)
    .orderBy(sort === 'asc' ? asc(applicationsTable.createdAt) : desc(applicationsTable.createdAt))
    .where(and(...filterConditions));

  const [totalCount] = await ctx.db
    .select({ count: count() })
    .from(applicationsTable)
    .where(and(...filterConditions));

  if (!validAndNotEmptyArray(data)) {
    return {
      data: [],
      count: 0,
    };
  }

  return {
    data,
    count: totalCount.count,
  };
}

export async function getApplicationResolver(_root: Root, args: { id: string }, ctx: Context) {
  const [application] = await ctx.db
    .select()
    .from(applicationsTable)
    .where(eq(applicationsTable.id, args.id));

  if (!application) {
    throw new Error('Application not found');
  }

  // Get the program to check its visibility
  const [program] = await ctx.db
    .select({
      visibility: programsTable.visibility,
      creatorId: programsTable.creatorId,
    })
    .from(programsTable)
    .where(eq(programsTable.id, application.programId));

  if (!program) {
    throw new Error('Program not found');
  }

  // Check if user can access this application based on program visibility
  // Public and restricted: Anyone can view applications
  // Private: Only program participants can view applications
  if (program.visibility === 'private') {
    const user = ctx.server.auth.getUser(ctx.request);

    // Allow access if:
    // 1. User is the applicant
    // 2. User is the program creator
    // 3. User has a role in the program (validator, builder)
    if (user) {
      if (application.applicantId === user.id || program.creatorId === user.id) {
        return application;
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

      if (userRole.length > 0) {
        return application;
      }
    }

    throw new Error('You do not have access to this application');
  }

  return application;
}

export async function getApplicationsByProgramIdResolver(
  _root: Root,
  args: { programId: string },
  ctx: Context,
) {
  // First check if the user can access this program
  const [program] = await ctx.db
    .select({
      visibility: programsTable.visibility,
      creatorId: programsTable.creatorId,
    })
    .from(programsTable)
    .where(eq(programsTable.id, args.programId));

  if (!program) {
    throw new Error('Program not found');
  }

  // For private programs, check if user has access
  if (program.visibility === 'private') {
    const user = ctx.server.auth.getUser(ctx.request);

    if (!user) {
      throw new Error('Authentication required to view applications for private programs');
    }

    // Check if user is the creator or has a role in the program
    if (program.creatorId !== user.id) {
      const userRole = await ctx.db
        .select()
        .from(programUserRolesTable)
        .where(
          and(
            eq(programUserRolesTable.programId, args.programId),
            eq(programUserRolesTable.userId, user.id),
          ),
        );

      if (userRole.length === 0) {
        throw new Error('You do not have access to view applications for this private program');
      }
    }
  }

  return ctx.db
    .select()
    .from(applicationsTable)
    .where(eq(applicationsTable.programId, args.programId));
}

export function createApplicationResolver(
  _root: Root,
  args: { input: typeof CreateApplicationInput.$inferInput },
  ctx: Context,
) {
  const user = requireUser(ctx);
  const milestones: Milestone[] = [];

  return ctx.db.transaction(async (t) => {
    const [program] = await t
      .select({
        creatorId: programsTable.creatorId,
        id: programsTable.id,
        price: programsTable.price,
        visibility: programsTable.visibility,
        type: programsTable.type,
        applicationStartDate: programsTable.applicationStartDate,
        applicationEndDate: programsTable.applicationEndDate,
        maxFundingAmount: programsTable.maxFundingAmount,
        currency: programsTable.currency,
      })
      .from(programsTable)
      .where(eq(programsTable.id, args.input.programId));

    if (!program) {
      throw new Error('Program not found');
    }

    // For funding programs, validate application period and milestone deadlines
    if (program.type === 'funding') {
      const fullProgram = await t
        .select()
        .from(programsTable)
        .where(eq(programsTable.id, args.input.programId))
        .then((rows) => rows[0]);

      if (!canSubmitApplication(fullProgram)) {
        const now = new Date();
        if (program.applicationStartDate && now < program.applicationStartDate) {
          throw new Error('Application period has not started yet');
        }
        if (program.applicationEndDate && now > program.applicationEndDate) {
          throw new Error('Application period has ended');
        }
        throw new Error('Applications are not currently being accepted');
      }

      // Validate milestone deadlines are after funding end date
      if (fullProgram.fundingEndDate && args.input.milestones && args.input.milestones.length > 0) {
        const fundingEndDate = new Date(fullProgram.fundingEndDate);
        const invalidMilestones = args.input.milestones.filter((milestone) => {
          if (!milestone.deadline) return false;
          const milestoneDeadline = new Date(milestone.deadline);
          return milestoneDeadline <= fundingEndDate;
        });

        if (invalidMilestones.length > 0) {
          const milestoneNames = invalidMilestones.map((m) => m.title || 'Untitled').join(', ');
          throw new Error(
            `Milestone deadlines must be after the funding period ends (${fundingEndDate.toISOString().split('T')[0]}). ` +
              `The following milestones have invalid deadlines: ${milestoneNames}`,
          );
        }
      }

      // Validate funding target against program's max funding per project
      if (program.maxFundingAmount && args.input.fundingTarget) {
        const maxFunding = Number.parseFloat(program.maxFundingAmount);
        const requestedFunding = Number.parseFloat(args.input.fundingTarget);

        // Handle both ETH format (e.g., "1.5") and Wei format
        const isLikelyEthFormat = requestedFunding < 1000000 && requestedFunding > 0;
        const maxFundingNormalized =
          isLikelyEthFormat && maxFunding > 1e15
            ? maxFunding / 1e18 // Convert Wei to ETH for comparison
            : maxFunding;

        if (requestedFunding > maxFundingNormalized) {
          throw new Error(
            `Funding target (${requestedFunding} ${program.currency || 'tokens'}) exceeds maximum funding per project (${maxFundingNormalized} ${program.currency || 'tokens'})`,
          );
        }
      }
    }

    if (program.creatorId === user.id) {
      throw new Error('You are already a sponsor of this program');
    }

    const validators = await getValidatorsByProgramIdResolver(
      {},
      { programId: args.input.programId },
      ctx,
    );
    const validatorIds = validators.map((v) => v.id);
    if (validatorIds.includes(user.id)) {
      throw new Error('You are already a validator of this program');
    }

    // Check if user can apply to this program based on visibility rules
    const applicationAccess = await canApplyToProgram(args.input.programId, user.id, t);
    if (!applicationAccess.canApply) {
      throw new Error(applicationAccess.reason || 'You cannot apply to this program');
    }

    const insertData = {
      programId: args.input.programId,
      name: args.input.name,
      content: args.input.content || '',
      summary: args.input.summary,
      price: args.input.price,
      metadata: args.input.metadata,
      applicantId: user.id,
      status: args.input.status,
      fundingTarget: args.input.fundingTarget,
      walletAddress: args.input.walletAddress,
    };

    const [application] = await t.insert(applicationsTable).values(insertData).returning();

    if (args.input.links) {
      // insert links to links table and map to program
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

      await t.insert(applicationsToLinksTable).values(
        newLinks.map((link) => ({
          applicationId: application.id,
          linkId: link.id,
        })),
      );
    }

    // Handle investment terms if provided
    if (args.input.investmentTerms && args.input.investmentTerms.length > 0) {
      for (const term of args.input.investmentTerms) {
        await t.insert(investmentTermsTable).values({
          applicationId: application.id,
          title: term.title,
          description: term.description,
          price: term.price,
          purchaseLimit: term.purchaseLimit,
        });
      }
    }

    // Only process milestones if they are provided
    if (args.input.milestones && args.input.milestones.length > 0) {
      let sortOrder = 0;
      for (const milestone of args.input.milestones) {
        // Skip milestones with incomplete required data
        if (
          !milestone.title ||
          !milestone.percentage ||
          !milestone.deadline ||
          !milestone.currency
        ) {
          continue;
        }

        const { links, title, percentage, deadline, currency, description, summary } = milestone;

        // Calculate the actual price amount from percentage
        const calculatedAmount = calculateMilestoneAmount(percentage, application.price);

        const [newMilestone] = await t
          .insert(milestonesTable)
          .values({
            title,
            description: description || null,
            summary: summary || null,
            percentage,
            currency,
            price: calculatedAmount,
            sortOrder,
            applicationId: application.id,
            deadline: deadline,
          })
          .returning();
        // handle links
        if (links) {
          const filteredLinks = links.filter((link) => link.url);
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
              milestoneId: newMilestone.id,
              linkId: link.id,
            })),
          );
        }
        milestones.push(newMilestone);
        sortOrder++;
      }

      // Validate milestone percentages sum to 100% after collecting valid milestones
      if (
        milestones.length > 0 &&
        !validateMilestonePercentages(milestones as Array<{ percentage: string }>)
      ) {
        throw new Error(
          'Milestone payout percentages must add up to exactly 100%. Please adjust the percentages.',
        );
      }
    }

    // Only require milestones for non-draft applications
    if (!validAndNotEmptyArray(milestones)) {
      throw new Error('At least one milestone is required for submitted applications.');
    }

    const applications = await t
      .select({ price: applicationsTable.price })
      .from(applicationsTable)
      .where(
        and(
          eq(applicationsTable.programId, args.input.programId),
          inArray(applicationsTable.status, ['accepted', 'completed', 'submitted']),
        ),
      );

    // Only validate budget for non-draft applications with milestones
    if (milestones.length > 0) {
      const milestonesTotalPrice = milestones.reduce((acc, m) => {
        return acc.plus(new BigNumber(m.price));
      }, new BigNumber(0));

      const applicationsTotalPrice = applications.reduce((acc, a) => {
        return acc.plus(new BigNumber(a.price));
      }, new BigNumber(0));

      if (applicationsTotalPrice.plus(milestonesTotalPrice).gt(new BigNumber(program.price))) {
        throw new Error(
          `The total price of all applications (${applicationsTotalPrice.plus(milestonesTotalPrice).toFixed()}) exceeds the program budget (${program.price}). Please reduce the application price.`,
        );
      }
    }

    // Only notify validators for non-draft applications
    if (validatorIds.length > 0) {
      for (const validatorId of validatorIds) {
        await ctx.server.pubsub.publish('notifications', t, {
          type: 'application',
          action: 'created',
          recipientId: validatorId,
          entityId: application.id,
        });
      }
      await ctx.server.pubsub.publish('notificationsCount');
    }

    // Check if program budget is fully allocated after creating an accepted application
    if (application.status === 'accepted') {
      await checkAndUpdateProgramStatus(application.programId, t);
    }

    return application;
  });
}

export function updateApplicationResolver(
  _root: Root,
  args: { input: typeof UpdateApplicationInput.$inferInput },
  ctx: Context,
) {
  const user = requireUser(ctx);

  const filteredData = filterEmptyValues<ApplicationUpdate>(args.input);

  return ctx.db.transaction(async (t) => {
    // Get the application to find the program
    const [application] = await t
      .select()
      .from(applicationsTable)
      .where(eq(applicationsTable.id, args.input.id));

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
        'You are not allowed to update this application. Only the applicant, builders, and admins can update applications.',
      );
    }

    const [updatedApplication] = await t
      .update(applicationsTable)
      .set(filteredData)
      .where(eq(applicationsTable.id, args.input.id))
      .returning();

    if (args.input.links) {
      // delete existing links
      await t
        .delete(applicationsToLinksTable)
        .where(eq(applicationsToLinksTable.applicationId, args.input.id));

      // insert new links
      const newLinks = await t
        .insert(linksTable)
        .values(
          args.input.links.map((link) => ({
            url: link.url as string,
            title: link.title as string,
          })),
        )
        .returning();

      await t.insert(applicationsToLinksTable).values(
        newLinks.map((link) => ({
          applicationId: updatedApplication.id,
          linkId: link.id,
        })),
      );
    }

    // Check if program budget is fully allocated after updating an application
    if (
      updatedApplication.status === 'accepted' ||
      updatedApplication.status === 'completed' ||
      updatedApplication.status === 'submitted'
    ) {
      await checkAndUpdateProgramStatus(updatedApplication.programId, t);
    }

    return updatedApplication;
  });
}

export function acceptApplicationResolver(
  _root: Root,
  args: {
    id: string;
    onChainProjectId?: number | null;
    tierSyncInfo?: {
      programOwnerAddress: string;
      contractAddress: string;
    } | null;
  },
  ctx: Context,
) {
  return ctx.db.transaction(async (t) => {
    const updateData: Partial<ApplicationUpdate> = { status: 'accepted' };

    // If onChainProjectId is provided, store it
    if (args.onChainProjectId !== undefined && args.onChainProjectId !== null) {
      updateData.onChainProjectId = args.onChainProjectId;
    }

    const [application] = await t
      .update(applicationsTable)
      .set(updateData)
      .where(eq(applicationsTable.id, args.id))
      .returning();

    if (!application) {
      throw new Error('Application not found');
    }

    // Check if builder role already exists
    const existingRole = await t
      .select()
      .from(programUserRolesTable)
      .where(
        and(
          eq(programUserRolesTable.programId, application.programId),
          eq(programUserRolesTable.userId, application.applicantId),
          eq(programUserRolesTable.roleType, 'builder'),
        ),
      );

    if (existingRole.length === 0) {
      // Add applicant as program builder (auto-confirmed)
      await t.insert(programUserRolesTable).values({
        programId: application.programId,
        userId: application.applicantId,
        roleType: 'builder',
      });
    }

    // NOTE: Tier sync is now handled at the program level when hosts invite supporters
    // We no longer sync tiers when approving applications since tiers are assigned
    // to the program, not to individual projects
    // The new contract architecture supports program-level tier assignments

    // Check if program budget is fully allocated and update status if needed
    await checkAndUpdateProgramStatus(application.programId, t);

    await ctx.server.pubsub.publish('notifications', t, {
      type: 'application',
      action: 'accepted',
      recipientId: application.applicantId,
      entityId: application.id,
      metadata: { programId: application.programId },
    });
    await ctx.server.pubsub.publish('notificationsCount');

    return application;
  });
}

export async function syncApplicationTiersResolver(
  _root: Root,
  args: { applicationId: string },
  ctx: Context,
): Promise<{
  success: boolean;
  message: string;
  projectId: number | null;
  contractAddress: string | null;
  tierAssignments: Array<{
    userId: string;
    walletAddress: string;
    tier: string;
    maxInvestmentAmount: string;
  }>;
}> {
  const user = requireUser(ctx);

  return ctx.db.transaction(async (t) => {
    // Get the application
    const [application] = await t
      .select()
      .from(applicationsTable)
      .where(eq(applicationsTable.id, args.applicationId));

    if (!application) {
      throw new Error('Application not found');
    }

    // Get the program
    const [program] = await t
      .select()
      .from(programsTable)
      .where(eq(programsTable.id, application.programId));

    if (!program) {
      throw new Error('Program not found');
    }

    // Check if user is the program creator
    const hasAccess = await isInSameScope({
      scope: 'program_creator',
      userId: user.id,
      entityId: program.id,
      db: t,
    });

    if (!hasAccess) {
      throw new Error('Only the program owner can sync tiers');
    }

    // Check if this is a tier-based funding program with an onchain project ID
    if (program.type !== 'funding' || program.fundingCondition !== 'tier') {
      throw new Error('This is not a tier-based funding program');
    }

    if (!application.onChainProjectId) {
      throw new Error('Application has not been accepted on-chain yet');
    }

    // Get all tier assignments for this program
    const tierAssignments = await t
      .select({
        userId: userTierAssignmentsTable.userId,
        tier: userTierAssignmentsTable.tier,
        maxInvestmentAmount: userTierAssignmentsTable.maxInvestmentAmount,
      })
      .from(userTierAssignmentsTable)
      .where(eq(userTierAssignmentsTable.programId, application.programId));

    if (tierAssignments.length === 0) {
      return {
        success: false,
        message: 'No tier assignments found for this program',
        projectId: null,
        contractAddress: null,
        tierAssignments: [],
      };
    }

    // Get wallet addresses for all users with tier assignments
    const userIds = tierAssignments.map((ta) => ta.userId);
    const users = await t
      .select({
        id: usersTable.id,
        walletAddress: usersTable.walletAddress,
      })
      .from(usersTable)
      .where(inArray(usersTable.id, userIds));

    const userWalletMap = new Map(users.map((u) => [u.id, u.walletAddress]));

    // Prepare tier data for blockchain sync
    const tiersToSync = tierAssignments
      .map((ta) => ({
        userId: ta.userId,
        walletAddress: userWalletMap.get(ta.userId) || '',
        tier: ta.tier,
        maxInvestmentAmount: ta.maxInvestmentAmount,
      }))
      .filter((t) => t.walletAddress); // Only include users with wallet addresses

    return {
      success: true,
      message: `Ready to sync ${tiersToSync.length} tier assignments`,
      projectId: application.onChainProjectId || null,
      contractAddress: program.contractAddress || null,
      tierAssignments: tiersToSync,
    };
  });
}

export function rejectApplicationResolver(
  _root: Root,
  args: { id: string; rejectionReason?: string | null },
  ctx: Context,
) {
  const user = requireUser(ctx);

  return ctx.db.transaction(async (t) => {
    const hasAccess = await isInSameScope({
      scope: 'application_validator',
      userId: user.id,
      entityId: args.id,
      db: t,
    });
    if (!hasAccess) {
      throw new Error('You are not allowed to deny this application');
    }

    const [application] = await t
      .update(applicationsTable)
      .set({
        status: 'rejected',
        ...(args.rejectionReason && { rejectionReason: args.rejectionReason }),
      })
      .where(eq(applicationsTable.id, args.id))
      .returning();

    await ctx.server.pubsub.publish('notifications', t, {
      type: 'application',
      action: 'rejected',
      recipientId: application.applicantId,
      entityId: application.id,
      metadata: { programId: application.programId },
    });
    await ctx.server.pubsub.publish('notificationsCount');

    return application;
  });
}

export async function getCurrentFundingAmountResolver(
  _root: Root,
  args: { id: string },
  ctx: Context,
) {
  // First check if this is a funding program
  const [application] = await ctx.db
    .select({
      programId: applicationsTable.programId,
    })
    .from(applicationsTable)
    .where(eq(applicationsTable.id, args.id));

  if (!application) {
    return null;
  }

  const [program] = await ctx.db
    .select({
      type: programsTable.type,
    })
    .from(programsTable)
    .where(eq(programsTable.id, application.programId));

  // Only return funding amount for funding programs
  if (program?.type !== 'funding') {
    return null;
  }

  const [result] = await ctx.db
    .select({
      total: sql<string>`COALESCE(SUM(CAST(amount AS NUMERIC)), 0)::text`,
    })
    .from(investmentsTable)
    .where(
      and(eq(investmentsTable.applicationId, args.id), eq(investmentsTable.status, 'confirmed')),
    );

  return result?.total || '0';
}

export async function getFundingProgressResolver(_root: Root, args: { id: string }, ctx: Context) {
  const [application] = await ctx.db
    .select({
      fundingTarget: applicationsTable.fundingTarget,
      price: applicationsTable.price,
      programId: applicationsTable.programId,
    })
    .from(applicationsTable)
    .where(eq(applicationsTable.id, args.id));

  if (!application) {
    return null;
  }

  // Check if this is a funding program and get currency
  const [program] = await ctx.db
    .select({
      type: programsTable.type,
      currency: programsTable.currency,
    })
    .from(programsTable)
    .where(eq(programsTable.id, application.programId));

  // Only calculate progress for funding programs
  if (program?.type !== 'funding') {
    return null;
  }

  // Use fundingTarget if set, otherwise use application price
  const targetAmount = application.fundingTarget || application.price;
  if (!targetAmount) {
    return null;
  }

  const [result] = await ctx.db
    .select({
      total: sql<string>`COALESCE(SUM(CAST(amount AS NUMERIC)), 0)`,
    })
    .from(investmentsTable)
    .where(
      and(eq(investmentsTable.applicationId, args.id), eq(investmentsTable.status, 'confirmed')),
    );

  // For USDT/USDC and other tokens, amounts are stored in display format (e.g., 0.1 for 0.1 USDT)
  // For ETH/EDU, amounts might be in Wei or display format
  const currentAmountStr = result?.total || '0';
  const currentAmount = Number.parseFloat(currentAmountStr);
  const target = Number.parseFloat(targetAmount);

  // Both values are now in the same format (display format)
  // So we can directly calculate the percentage
  const percentage = target > 0 ? (currentAmount / target) * 100 : 0;

  if (target === 0 || Number.isNaN(target)) {
    return 0;
  }

  // Round to 2 decimal places to avoid scientific notation
  const roundedPercentage = Math.round(percentage * 100) / 100;

  return Math.min(roundedPercentage, 100);
}

export async function getInvestmentCountResolver(_root: Root, args: { id: string }, ctx: Context) {
  const [result] = await ctx.db
    .select({
      count: sql<number>`COUNT(*)::int`,
    })
    .from(investmentsTable)
    .where(
      and(eq(investmentsTable.applicationId, args.id), eq(investmentsTable.status, 'confirmed')),
    );
  return result?.count || 0;
}

// Get investors with their tiers for this application
export async function getInvestorsWithTiersResolver(
  _root: Root,
  args: { id: string },
  ctx: Context,
) {
  const [application] = await ctx.db
    .select({
      id: applicationsTable.id,
      programId: applicationsTable.programId,
    })
    .from(applicationsTable)
    .where(eq(applicationsTable.id, args.id));

  // Get the program to check if it's tier-based
  const [program] = await ctx.db
    .select()
    .from(programsTable)
    .where(eq(programsTable.id, application.programId));

  if (!program || program.fundingCondition !== 'tier') {
    return null;
  }

  // Get all investments for this application
  const investments = await ctx.db
    .select()
    .from(investmentsTable)
    .where(eq(investmentsTable.applicationId, application.id));

  // Get user details for all investors
  const userIds = [...new Set(investments.map((i) => i.userId))];
  const users =
    userIds.length > 0
      ? await ctx.db.select().from(usersTable).where(inArray(usersTable.id, userIds))
      : [];

  // Create user lookup map
  const userMap = new Map(users.map((u) => [u.id, u]));

  // Get tier assignments for all investors
  const tierAssignments =
    userIds.length > 0
      ? await ctx.db
          .select()
          .from(userTierAssignmentsTable)
          .where(
            and(
              eq(userTierAssignmentsTable.programId, program.id),
              inArray(userTierAssignmentsTable.userId, userIds),
            ),
          )
      : [];

  // Map tier assignments by userId for quick lookup
  const tierMap = new Map(tierAssignments.map((t) => [t.userId, t]));

  // Combine investment data with user and tier information
  return investments.map((investment) => {
    const user = userMap.get(investment.userId);
    return {
      userId: investment.userId,
      email: user?.email,
      firstName: user?.firstName,
      lastName: user?.lastName,
      amount: investment.amount,
      tier: tierMap.get(investment.userId)?.tier || investment.tier,
      maxInvestmentAmount: tierMap.get(investment.userId)?.maxInvestmentAmount,
      investmentStatus: investment.status,
      createdAt: investment.createdAt,
    };
  });
}

// Get application's program (for Application type)
export async function getApplicationProgramResolver(
  root: { programId: string },
  _args: Args,
  ctx: Context,
) {
  const [program] = await ctx.db
    .select()
    .from(programsTable)
    .where(eq(programsTable.id, root.programId));

  return program;
}
