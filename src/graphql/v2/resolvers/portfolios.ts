import type { Context, Root } from '@/types';
import type { CreatePortfolioV2Input, UpdatePortfolioV2Input } from '../inputs/portfolios';
import { PortfolioV2Service } from '../services/portfolio.service';

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
