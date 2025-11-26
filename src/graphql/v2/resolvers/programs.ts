import { onchainProgramInfoTable } from '@/db/schemas/v2/onchain-program-info';
import { programsV2Table } from '@/db/schemas/v2/programs';
import type { PaginationInput } from '@/graphql/types/common';
import type {
  CreateProgramV2Input,
  CreateProgramWithOnchainV2Input,
  ProgramsV2QueryInput,
  UpdateProgramByRelayerV2Input,
  UpdateProgramV2Input,
} from '@/graphql/v2/inputs/programs';
import type { Context, Root } from '@/types';
import { eq } from 'drizzle-orm';
import { ApplicationV2Service, ProgramV2Service } from '../services';
import { OnchainProgramInfoV2Service } from '../services/onchain-program-info.service';

export async function getProgramsV2Resolver(
  _root: Root,
  args: { pagination?: typeof PaginationInput.$inferInput | null },
  ctx: Context,
) {
  const programService = new ProgramV2Service(ctx.db);
  return programService.getMany({
    limit: args.pagination?.limit ?? undefined,
    offset: args.pagination?.offset ?? undefined,
    status: 'open', // Default to open for backward compatibility
  });
}

export async function getProgramsWithFilterV2Resolver(
  _root: Root,
  args: { query?: typeof ProgramsV2QueryInput.$inferInput | null },
  ctx: Context,
) {
  const programService = new ProgramV2Service(ctx.db);
  return programService.getMany({
    limit: args.query?.limit ?? undefined,
    page: args.query?.page ?? undefined,
    status: args.query?.status ?? undefined,
  });
}

export async function getProgramV2Resolver(_root: Root, args: { id: string }, ctx: Context) {
  const programService = new ProgramV2Service(ctx.db);
  return programService.getById(args.id);
}

export async function createProgramV2Resolver(
  _root: Root,
  args: { input: typeof CreateProgramV2Input.$inferInput },
  ctx: Context,
) {
  if (!ctx.userV2) {
    throw new Error('User not authenticated');
  }

  // Validate that only 'draft', 'open', or 'under_review' statuses are allowed for creation
  const allowedStatuses: readonly string[] = ['draft', 'open', 'under_review'];
  if (args.input.status && !allowedStatuses.includes(args.input.status)) {
    throw new Error(
      `Invalid status for program creation: '${args.input.status}'. Only 'draft', 'open', or 'under_review' are allowed.`,
    );
  }

  const programService = new ProgramV2Service(ctx.db);
  return programService.create(args.input, ctx.userV2.id);
}

export async function updateProgramV2Resolver(
  _root: Root,
  args: { id: string; input: typeof UpdateProgramV2Input.$inferInput },
  ctx: Context,
) {
  if (!ctx.userV2) {
    throw new Error('User not authenticated');
  }

  const numericId = Number.parseInt(args.id, 10);
  if (Number.isNaN(numericId)) {
    throw new Error('Invalid program ID');
  }

  const programService = new ProgramV2Service(ctx.db);

  // Get current program to check status and sponsor
  const [currentProgram] = await ctx.db
    .select()
    .from(programsV2Table)
    .where(eq(programsV2Table.id, numericId));

  if (!currentProgram) {
    throw new Error('Program not found');
  }

  const isCreator = currentProgram.sponsorId === ctx.userV2.id;
  const isAdmin = ctx.userV2.role === 'admin';

  // Only creator or admin can update programs (unless it's a status change to open/declined which requires admin)
  // For general field updates, only creator can update
  if (!args.input.status || args.input.status === currentProgram.status) {
    // Not a status change - only creator can update
    if (!isCreator) {
      throw new Error('Only the program creator can update this program');
    }
  }

  // If status is being changed, validate state transitions
  if (args.input.status && args.input.status !== currentProgram.status) {
    const newStatus = args.input.status;
    const currentStatus = currentProgram.status;

    // State transition: draft → under_review
    if (currentStatus === 'draft' && newStatus === 'under_review') {
      // Only creator can submit for review
      if (!isCreator) {
        throw new Error('Only the program creator can submit for review');
      }

      // Verify that onchain program info exists
      const [onchainInfo] = await ctx.db
        .select()
        .from(onchainProgramInfoTable)
        .where(eq(onchainProgramInfoTable.programId, numericId))
        .limit(1);

      if (!onchainInfo) {
        throw new Error(
          'Cannot submit program for review: onchain_program_id is required. Please create onchain program info first.',
        );
      }

      // TODO: Add backend onchain validation logic here
      // This should verify that the onchain_program_id is valid and matches expected format
      // Example validation:
      // - Verify onchain_program_id is a positive integer
      // - Verify the onchain contract exists and is active
      // - Verify the program matches the onchain program metadata
      // if (!isValidOnchainProgramId(onchainInfo.onchainProgramId)) {
      //   throw new Error('Invalid onchain_program_id');
      // }
    }
    // State transition: draft -> open (for demo) // TODO: should delete later
    else if (currentStatus === 'draft' && newStatus === 'open') {
      if (!isCreator) {
        throw new Error('Only the program creator can open this program');
      }
    }
    // State transition: under_review → open/declined
    else if (
      currentStatus === 'under_review' &&
      (newStatus === 'open' || newStatus === 'declined')
    ) {
      // Only admin can approve or reject programs
      if (!isAdmin) {
        throw new Error('Only admin can approve or reject programs under review');
      }
    }
    // Other state transitions (validate they are allowed)
    else if (
      !(
        // Allow staying in the same status (no-op)
        (
          newStatus === currentStatus ||
          // Allow draft -> open (for demo) // TODO: should delete later
          (currentStatus === 'draft' && newStatus === 'open') ||
          // Allow draft → under_review (already handled above)
          (currentStatus === 'draft' && newStatus === 'under_review') ||
          // Allow under_review → open/declined (already handled above)
          (currentStatus === 'under_review' &&
            (newStatus === 'open' || newStatus === 'declined')) ||
          // Allow open → closed (by creator or admin, no special restriction for now)
          (currentStatus === 'open' && newStatus === 'closed')
        )
      )
    ) {
      throw new Error(
        `Invalid state transition: cannot change from '${currentStatus}' to '${newStatus}'`,
      );
    }
  }

  return programService.update(args.id, args.input);
}

export async function deleteProgramV2Resolver(_root: Root, args: { id: string }, ctx: Context) {
  const numericId = Number.parseInt(args.id, 10);
  if (Number.isNaN(numericId)) {
    throw new Error('Invalid program ID');
  }

  const programService = new ProgramV2Service(ctx.db);
  await programService.delete(args.id);
  return args.id;
}

export async function getProgramsBysponsorIdV2Resolver(
  _root: Root,
  args: {
    sponsorId: string;
    pagination?: typeof PaginationInput.$inferInput | null;
  },
  ctx: Context,
) {
  const programService = new ProgramV2Service(ctx.db);
  const numericsponsorId = Number.parseInt(args.sponsorId, 10);
  if (Number.isNaN(numericsponsorId)) {
    throw new Error('Invalid creator ID');
  }
  return programService.getBySponsorId(numericsponsorId, {
    limit: args.pagination?.limit ?? undefined,
    offset: args.pagination?.offset ?? undefined,
  });
}

export async function getProgramsByBuilderV2Resolver(
  _root: Root,
  args: {
    builderId: string;
    pagination?: typeof PaginationInput.$inferInput | null;
  },
  ctx: Context,
) {
  const programService = new ProgramV2Service(ctx.db);
  const numericBuilderId = Number.parseInt(args.builderId, 10);
  if (Number.isNaN(numericBuilderId)) {
    throw new Error('Invalid builder ID');
  }
  return programService.getByBuilderId(numericBuilderId, {
    limit: args.pagination?.limit ?? undefined,
    offset: args.pagination?.offset ?? undefined,
  });
}

export async function createProgramWithOnchainV2Resolver(
  _root: Root,
  args: {
    input: typeof CreateProgramWithOnchainV2Input.$inferInput;
  },
  ctx: Context,
) {
  if (!ctx.userV2) {
    throw new Error('User not authenticated');
  }

  const userId = ctx.userV2.id;
  return ctx.db.transaction(async (t) => {
    // Create program
    const createdProgram = await new ProgramV2Service(t).create(args.input.program, userId);

    // Create onchain program info using program's networkId
    const onchain = await new OnchainProgramInfoV2Service(t).create({
      programId: createdProgram.id,
      networkId: createdProgram.networkId,
      smartContractId: args.input.onchain.smartContractId,
      onchainProgramId: args.input.onchain.onchainProgramId,
      tx: args.input.onchain.tx,
      status: args.input.onchain.status ?? undefined,
    });

    return { program: createdProgram, onchain };
  });
}

export async function updateProgramByRelayerV2Resolver(
  _root: Root,
  args: {
    id: string;
    input: typeof UpdateProgramByRelayerV2Input.$inferInput;
  },
  ctx: Context,
) {
  // Relayer scope is already checked by authScopes
  const numericId = Number.parseInt(args.id, 10);
  if (Number.isNaN(numericId)) {
    throw new Error('Invalid program ID');
  }

  const programService = new ProgramV2Service(ctx.db);

  // Get current program to check status
  const [currentProgram] = await ctx.db
    .select()
    .from(programsV2Table)
    .where(eq(programsV2Table.id, numericId));

  if (!currentProgram) {
    throw new Error('Program not found');
  }

  // Relayer can only change status from 'open' to 'closed'
  if (currentProgram.status !== 'open') {
    throw new Error(
      `Relayer can only close programs with status 'open'. Current status: '${currentProgram.status}'`,
    );
  }

  if (args.input.status !== 'closed') {
    throw new Error("Relayer can only change program status to 'closed'");
  }

  return programService.update(args.id, { status: 'closed' });
}

export async function getInProgressProgramsV2Resolver(
  _root: Root,
  args: { query?: typeof ProgramsV2QueryInput.$inferInput | null },
  ctx: Context,
) {
  const programService = new ProgramV2Service(ctx.db);
  return programService.getInProgress(
    args.query
      ? {
          page: args.query.page ?? undefined,
          limit: args.query.limit ?? undefined,
        }
      : undefined,
  );
}
export async function completeProgramV2Resolver(_root: Root, args: { id: string }, ctx: Context) {
  const programService = new ProgramV2Service(ctx.db);
  const applicationService = new ApplicationV2Service(ctx.db, ctx.server);

  // Check if all applications are completed
  const programId = Number.parseInt(args.id, 10);
  const appStatus = await applicationService.checkAllCompletedByProgram(programId);

  if (!appStatus.allCompleted) {
    throw new Error(
      `Cannot complete program: ${appStatus.completedCount} out of ${appStatus.totalCount} applications are completed`,
    );
  }

  // All applications are completed, update program status
  return programService.complete(args.id);
}
