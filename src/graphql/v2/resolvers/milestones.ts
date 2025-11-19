import type { Context, Root } from "@/types";
import type {
  CreateMilestoneV2Input,
  MilestonesV2QueryInput,
  UpdateMilestoneByRelayerV2Input,
  UpdateMilestoneV2Input,
} from "../inputs/milestones";
import { MilestoneV2Service } from "../services";

export async function getMilestoneV2Resolver(
  _root: Root,
  args: { id: string },
  ctx: Context
) {
  const milestoneService = new MilestoneV2Service(ctx.db, ctx.server);
  return milestoneService.getById(args.id);
}

export async function getMilestonesV2Resolver(
  _root: Root,
  args: { query?: typeof MilestonesV2QueryInput.$inferInput | null },
  ctx: Context
) {
  const milestoneService = new MilestoneV2Service(ctx.db, ctx.server);
  return milestoneService.getMany(args.query);
}

export async function getMilestonesInProgressV2Resolver(
  _root: Root,
  args: { query?: typeof MilestonesV2QueryInput.$inferInput | null },
  ctx: Context
) {
  const milestoneService = new MilestoneV2Service(ctx.db, ctx.server);
  return milestoneService.getInProgress(args.query);
}

export async function createMilestoneV2Resolver(
  _root: Root,
  args: { input: typeof CreateMilestoneV2Input.$inferInput },
  ctx: Context
) {
  // Validate that only 'draft' or 'under_review' statuses are allowed for creation
  // Milestones should start as 'draft' (initial state) or 'under_review' (if published immediately)
  const allowedStatuses: readonly string[] = ["draft", "under_review"];
  if (args.input.status && !allowedStatuses.includes(args.input.status)) {
    throw new Error(
      `Invalid status for milestone creation: '${args.input.status}'. Only 'draft' or 'under_review' are allowed.`
    );
  }

  const milestoneService = new MilestoneV2Service(ctx.db, ctx.server);
  return milestoneService.create(args.input);
}

export async function updateMilestoneV2Resolver(
  _root: Root,
  args: { id: string; input: typeof UpdateMilestoneV2Input.$inferInput },
  ctx: Context
) {
  const milestoneService = new MilestoneV2Service(ctx.db, ctx.server);
  return milestoneService.update(args.id, args.input);
}

export async function deleteMilestoneV2Resolver(
  _root: Root,
  args: { id: string },
  ctx: Context
) {
  const milestoneService = new MilestoneV2Service(ctx.db, ctx.server);
  return milestoneService.delete(args.id);
}

export async function updateMilestoneByRelayerV2Resolver(
  _root: Root,
  args: {
    id: string;
    input: typeof UpdateMilestoneByRelayerV2Input.$inferInput;
  },
  ctx: Context
) {
  if (!ctx.userV2) {
    throw new Error("User not authenticated");
  }

  // Relayer scope is already checked by authScopes, but we can add additional validation here if needed
  const milestoneService = new MilestoneV2Service(ctx.db, ctx.server);

  // Prepare update data - relayer can only update payout_tx and status
  const updateData: typeof UpdateMilestoneV2Input.$inferInput = {
    payout_tx: args.input.payout_tx,
  };

  // If status is provided, include it in the update
  if (args.input.status) {
    updateData.status = args.input.status;
  }

  return milestoneService.update(args.id, updateData);
}
