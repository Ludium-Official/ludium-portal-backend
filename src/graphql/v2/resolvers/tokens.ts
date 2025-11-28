import type { PaginationInput } from '@/graphql/types/common';
import type { CreateTokenV2Input, UpdateTokenV2Input } from '@/graphql/v2/inputs/tokens';
import { TokenV2Service } from '@/graphql/v2/services/token.service';
import type { Context, Root } from '@/types';

export async function getTokensV2Resolver(
  _root: Root,
  args: { pagination?: typeof PaginationInput.$inferInput | null },
  ctx: Context,
) {
  try {
    const service = new TokenV2Service(ctx.db);
    const pagination = args.pagination
      ? { limit: args.pagination.limit ?? undefined, offset: args.pagination.offset ?? undefined }
      : undefined;
    return await service.getMany(pagination);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.server.log.error({
      msg: 'Database operation failed',
      error: message,
      operation: 'getTokensV2',
    });
    throw new Error('Failed to fetch tokens');
  }
}

export async function getTokenV2Resolver(_root: Root, args: { id: string }, ctx: Context) {
  try {
    const service = new TokenV2Service(ctx.db);
    return await service.getById(args.id);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.server.log.error({
      msg: 'Database operation failed',
      error: message,
      operation: 'getTokenV2',
    });
    throw new Error('Failed to fetch token');
  }
}

export async function getTokensByNetworkV2Resolver(
  _root: Root,
  args: { networkId: number; pagination?: typeof PaginationInput.$inferInput | null },
  ctx: Context,
) {
  try {
    const service = new TokenV2Service(ctx.db);
    const pagination = args.pagination
      ? { limit: args.pagination.limit ?? undefined, offset: args.pagination.offset ?? undefined }
      : undefined;
    return await service.getByNetworkId(args.networkId, pagination);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.server.log.error({
      msg: 'Database operation failed',
      error: message,
      operation: 'getTokensByNetworkV2',
    });
    throw new Error('Failed to fetch tokens by network');
  }
}

export async function createTokenV2Resolver(
  _root: Root,
  args: { input: typeof CreateTokenV2Input.$inferInput },
  ctx: Context,
) {
  if (!ctx.userV2) throw new Error('User not authenticated');
  try {
    const service = new TokenV2Service(ctx.db);
    return await service.create(args.input);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.server.log.error({
      msg: 'Database operation failed',
      error: message,
      operation: 'createTokenV2',
    });
    throw new Error('Failed to create token');
  }
}

export async function updateTokenV2Resolver(
  _root: Root,
  args: { id: string; input: typeof UpdateTokenV2Input.$inferInput },
  ctx: Context,
) {
  if (!ctx.userV2) throw new Error('User not authenticated');
  try {
    const service = new TokenV2Service(ctx.db);
    return await service.update(args.id, args.input);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.server.log.error({
      msg: 'Database operation failed',
      error: message,
      operation: 'updateTokenV2',
    });
    throw new Error('Failed to update token');
  }
}

export async function deleteTokenV2Resolver(_root: Root, args: { id: string }, ctx: Context) {
  if (!ctx.userV2) throw new Error('User not authenticated');
  try {
    const service = new TokenV2Service(ctx.db);
    return await service.delete(args.id);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.server.log.error({
      msg: 'Database operation failed',
      error: message,
      operation: 'deleteTokenV2',
    });
    throw new Error('Failed to delete token');
  }
}
