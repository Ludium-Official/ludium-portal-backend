import type { Context, Root } from '@/types';
import type {
  CreateMilestoneV2Input,
  MilestonesV2QueryInput,
  UpdateMilestoneV2Input,
} from '../inputs/milestones';
import { MilestoneV2Service } from '../services';

export async function getMilestoneV2Resolver(_root: Root, args: { id: string }, ctx: Context) {
  const milestoneService = new MilestoneV2Service(ctx.db, ctx.server);
  return milestoneService.getById(args.id);
}

export async function getMilestonesV2Resolver(
  _root: Root,
  args: { query?: typeof MilestonesV2QueryInput.$inferInput | null },
  ctx: Context,
) {
  const milestoneService = new MilestoneV2Service(ctx.db, ctx.server);
  return milestoneService.getMany(args.query);
}

export async function createMilestoneV2Resolver(
  _root: Root,
  args: { input: typeof CreateMilestoneV2Input.$inferInput },
  ctx: Context,
) {
  const milestoneService = new MilestoneV2Service(ctx.db, ctx.server);
  return milestoneService.create(args.input);
}

export async function updateMilestoneV2Resolver(
  _root: Root,
  args: { id: string; input: typeof UpdateMilestoneV2Input.$inferInput },
  ctx: Context,
) {
  const milestoneService = new MilestoneV2Service(ctx.db, ctx.server);
  return milestoneService.update(args.id, args.input);
}

export async function deleteMilestoneV2Resolver(_root: Root, args: { id: string }, ctx: Context) {
  const milestoneService = new MilestoneV2Service(ctx.db, ctx.server);
  return milestoneService.delete(args.id);
}
