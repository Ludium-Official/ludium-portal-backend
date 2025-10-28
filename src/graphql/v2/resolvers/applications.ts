import type { Context, Root } from '@/types';
import type {
  ApplicationsV2QueryInput,
  CreateApplicationV2Input,
  UpdateApplicationV2Input,
} from '../inputs/applications';
import { ApplicationV2Service } from '../services';

export async function getApplicationV2Resolver(_root: Root, args: { id: string }, ctx: Context) {
  const applicationService = new ApplicationV2Service(ctx.db, ctx.server);
  return applicationService.getById(args.id);
}

export async function getApplicationsV2Resolver(
  _root: Root,
  args: { query?: typeof ApplicationsV2QueryInput.$inferInput | null },
  ctx: Context,
) {
  const applicationService = new ApplicationV2Service(ctx.db, ctx.server);
  return applicationService.getMany(args.query);
}

export async function createApplicationV2Resolver(
  _root: Root,
  args: { input: typeof CreateApplicationV2Input.$inferInput },
  ctx: Context,
) {
  const applicationService = new ApplicationV2Service(ctx.db, ctx.server);
  return applicationService.create(args.input);
}

export async function updateApplicationV2Resolver(
  _root: Root,
  args: { id: string; input: typeof UpdateApplicationV2Input.$inferInput },
  ctx: Context,
) {
  const applicationService = new ApplicationV2Service(ctx.db, ctx.server);
  return applicationService.update(args.id, args.input);
}

export async function deleteApplicationV2Resolver(_root: Root, args: { id: string }, ctx: Context) {
  const applicationService = new ApplicationV2Service(ctx.db, ctx.server);
  return applicationService.delete(args.id);
}
