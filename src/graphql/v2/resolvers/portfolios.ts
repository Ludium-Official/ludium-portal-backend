import type { Args, Context, Root } from '@/types';
import type { CreatePortfolioV2Input, UpdatePortfolioV2Input } from '../inputs/portfolios';
import { PortfolioV2Service } from '../services/portfolio.service';

export async function getPortfolioV2Resolver(_root: Root, args: { id: string }, ctx: Context) {
  const portfolioService = new PortfolioV2Service(ctx.db, ctx.server);
  const portfolio = await portfolioService.getById(args.id);
  if (!portfolio) {
    throw new Error('Portfolio not found');
  }
  return portfolio;
}

export async function getPortfoliosByUserIdV2Resolver(
  _root: Root,
  args: { userId: string },
  ctx: Context,
) {
  if (!ctx.userV2) {
    throw new Error('Unauthorized');
  }
  const userId = Number.parseInt(args.userId);
  const portfolioService = new PortfolioV2Service(ctx.db, ctx.server);
  return portfolioService.getByUserId(userId);
}

export async function getMyPortfoliosV2Resolver(_root: Root, _args: Args, ctx: Context) {
  if (!ctx.userV2) {
    throw new Error('Unauthorized');
  }
  const portfolioService = new PortfolioV2Service(ctx.db, ctx.server);
  return portfolioService.getByUserId(ctx.userV2.id);
}

export async function createPortfolioV2Resolver(
  _root: Root,
  args: { input: typeof CreatePortfolioV2Input.$inferInput },
  ctx: Context,
) {
  if (!ctx.userV2) {
    throw new Error('Unauthorized');
  }
  const portfolioService = new PortfolioV2Service(ctx.db, ctx.server);
  return portfolioService.create(args.input, ctx.userV2.id);
}

export async function updatePortfolioV2Resolver(
  _root: Root,
  args: { input: typeof UpdatePortfolioV2Input.$inferInput },
  ctx: Context,
) {
  if (!ctx.userV2) {
    throw new Error('Unauthorized');
  }
  const portfolioService = new PortfolioV2Service(ctx.db, ctx.server);
  return portfolioService.update(args.input, ctx.userV2.id);
}

export async function deletePortfolioV2Resolver(_root: Root, args: { id: string }, ctx: Context) {
  if (!ctx.userV2) {
    throw new Error('Unauthorized');
  }
  const portfolioService = new PortfolioV2Service(ctx.db, ctx.server);
  return portfolioService.delete(args.id, ctx.userV2.id);
}
