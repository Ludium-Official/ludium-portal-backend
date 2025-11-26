import type { Context, Root } from '@/types';
import type {
  ApplicationsByProgramV2QueryInput,
  ApplicationsV2QueryInput,
  CreateApplicationV2Input,
  MyApplicationsV2QueryInput,
  PickApplicationV2Input,
  ReviewApplicationV2Input,
  UpdateApplicationChatroomV2Input,
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

export async function getApplicationsByProgramV2Resolver(
  _root: Root,
  args: { query: typeof ApplicationsByProgramV2QueryInput.$inferInput },
  ctx: Context,
) {
  if (!ctx.userV2) {
    throw new Error('Unauthorized');
  }
  const applicationService = new ApplicationV2Service(ctx.db, ctx.server);
  return applicationService.getByProgram(args.query, ctx.userV2.id);
}

export async function getMyApplicationsV2Resolver(
  _root: Root,
  args: { query?: typeof MyApplicationsV2QueryInput.$inferInput | null },
  ctx: Context,
) {
  if (!ctx.userV2) {
    throw new Error('Unauthorized');
  }
  const applicationService = new ApplicationV2Service(ctx.db, ctx.server);
  return applicationService.getMyApplications(args.query ?? {}, ctx.userV2.id);
}

export async function createApplicationV2Resolver(
  _root: Root,
  args: { input: typeof CreateApplicationV2Input.$inferInput },
  ctx: Context,
) {
  if (!ctx.userV2) {
    throw new Error('Unauthorized');
  }
  const applicationService = new ApplicationV2Service(ctx.db, ctx.server);
  return applicationService.create(args.input, ctx.userV2.id);
}

export async function updateApplicationV2Resolver(
  _root: Root,
  args: { id: string; input: typeof UpdateApplicationV2Input.$inferInput },
  ctx: Context,
) {
  if (!ctx.userV2) {
    throw new Error('Unauthorized');
  }
  const applicationService = new ApplicationV2Service(ctx.db, ctx.server);
  return applicationService.update(args.id, args.input);
}

export async function reviewApplicationV2Resolver(
  _root: Root,
  args: { id: string; input: typeof ReviewApplicationV2Input.$inferInput },
  ctx: Context,
) {
  if (!ctx.userV2) {
    throw new Error('Unauthorized');
  }
  const applicationService = new ApplicationV2Service(ctx.db, ctx.server);
  // Note: Authorization is handled by auth scope (isApplicationProgramSponsor)
  return applicationService.review(args.id, args.input);
}

export async function pickApplicationV2Resolver(
  _root: Root,
  args: { id: string; input: typeof PickApplicationV2Input.$inferInput },
  ctx: Context,
) {
  if (!ctx.userV2) {
    throw new Error('Unauthorized');
  }
  const applicationService = new ApplicationV2Service(ctx.db, ctx.server);
  // Note: Authorization is handled by auth scope (isApplicationProgramSponsor)
  return applicationService.pick(args.id, args.input);
}

export async function deleteApplicationV2Resolver(_root: Root, args: { id: string }, ctx: Context) {
  if (!ctx.userV2) {
    throw new Error('Unauthorized');
  }
  const applicationService = new ApplicationV2Service(ctx.db, ctx.server);
  return applicationService.delete(args.id, ctx.userV2.id);
}

export async function updateApplicationChatroomV2Resolver(
  _root: Root,
  args: {
    id: string;
    input: typeof UpdateApplicationChatroomV2Input.$inferInput;
  },
  ctx: Context,
) {
  if (!ctx.userV2) {
    throw new Error('Unauthorized');
  }
  const applicationService = new ApplicationV2Service(ctx.db, ctx.server);
  return applicationService.updateChatroomMessageId(args.id);
}

export { completeApplicationV2Resolver } from './milestones';
