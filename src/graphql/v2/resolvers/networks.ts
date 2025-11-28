import type { PaginationInput } from '@/graphql/types/common';
import type { CreateNetworkV2Input, UpdateNetworkV2Input } from '@/graphql/v2/inputs/networks';
import { NetworkV2Service } from '@/graphql/v2/services/network.service';
import type { Context, Root } from '@/types';

export async function getNetworksV2Resolver(
  _root: Root,
  args: { pagination?: typeof PaginationInput.$inferInput | null },
  ctx: Context,
) {
  try {
    const service = new NetworkV2Service(ctx.db);
    const pagination = args.pagination
      ? { limit: args.pagination.limit ?? undefined, offset: args.pagination.offset ?? undefined }
      : undefined;
    return await service.getMany(pagination);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.server.log.error({
      msg: 'Database operation failed',
      error: message,
      operation: 'getNetworksV2',
    });
    throw new Error('Failed to fetch networks');
  }
}

export async function getNetworkV2Resolver(_root: Root, args: { id: string }, ctx: Context) {
  try {
    const service = new NetworkV2Service(ctx.db);
    return await service.getById(args.id);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.server.log.error({
      msg: 'Database operation failed',
      error: message,
      operation: 'getNetworkV2',
    });
    throw new Error('Failed to fetch network');
  }
}

export async function createNetworkV2Resolver(
  _root: Root,
  args: { input: typeof CreateNetworkV2Input.$inferInput },
  ctx: Context,
) {
  if (!ctx.userV2) throw new Error('User not authenticated');
  try {
    const service = new NetworkV2Service(ctx.db);
    return await service.create(args.input);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.server.log.error({
      msg: 'Database operation failed',
      error: message,
      operation: 'createNetworkV2',
    });
    throw new Error('Failed to create network');
  }
}

export async function updateNetworkV2Resolver(
  _root: Root,
  args: { id: string; input: typeof UpdateNetworkV2Input.$inferInput },
  ctx: Context,
) {
  if (!ctx.userV2) throw new Error('User not authenticated');
  try {
    const service = new NetworkV2Service(ctx.db);
    return await service.update(args.id, args.input);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.server.log.error({
      msg: 'Database operation failed',
      error: message,
      operation: 'updateNetworkV2',
    });
    throw new Error('Failed to update network');
  }
}

export async function deleteNetworkV2Resolver(_root: Root, args: { id: string }, ctx: Context) {
  if (!ctx.userV2) throw new Error('User not authenticated');
  try {
    const service = new NetworkV2Service(ctx.db);
    return await service.delete(args.id);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.server.log.error({
      msg: 'Database operation failed',
      error: message,
      operation: 'deleteNetworkV2',
    });
    throw new Error('Failed to delete network');
  }
}
