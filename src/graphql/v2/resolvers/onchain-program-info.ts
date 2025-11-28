import type { PaginationInput } from '@/graphql/types/common';
import type {
  CreateOnchainProgramInfoV2Input,
  UpdateOnchainProgramInfoV2Input,
} from '@/graphql/v2/inputs/onchain-program-info';
import { OnchainProgramInfoV2Service } from '@/graphql/v2/services/onchain-program-info.service';
import type { Context, Root } from '@/types';

export async function getOnchainProgramInfosV2Resolver(
  _root: Root,
  args: { pagination?: typeof PaginationInput.$inferInput | null },
  ctx: Context,
) {
  try {
    const service = new OnchainProgramInfoV2Service(ctx.db);
    const pagination = args.pagination
      ? { limit: args.pagination.limit ?? undefined, offset: args.pagination.offset ?? undefined }
      : undefined;
    return service.getMany(pagination);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.server.log.error({
      msg: 'Database operation failed',
      error: message,
      operation: 'getOnchainProgramInfosV2',
    });
    throw new Error('Failed to fetch onchain program infos');
  }
}

export async function getOnchainProgramInfoV2Resolver(
  _root: Root,
  args: { id: string },
  ctx: Context,
) {
  try {
    const service = new OnchainProgramInfoV2Service(ctx.db);
    return service.getById(args.id);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.server.log.error({
      msg: 'Database operation failed',
      error: message,
      operation: 'getOnchainProgramInfoV2',
    });
    throw new Error('Failed to fetch onchain program info');
  }
}

export async function getOnchainProgramInfosByProgramV2Resolver(
  _root: Root,
  args: { programId: number; pagination?: typeof PaginationInput.$inferInput | null },
  ctx: Context,
) {
  try {
    const service = new OnchainProgramInfoV2Service(ctx.db);
    const pagination = args.pagination
      ? { limit: args.pagination.limit ?? undefined, offset: args.pagination.offset ?? undefined }
      : undefined;
    return service.getByProgramId(args.programId, pagination);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.server.log.error({
      msg: 'Database operation failed',
      error: message,
      operation: 'getOnchainProgramInfosByProgramV2',
    });
    throw new Error('Failed to fetch onchain program infos by program');
  }
}

export async function getOnchainProgramInfosBySmartContractV2Resolver(
  _root: Root,
  args: { smartContractId: number; pagination?: typeof PaginationInput.$inferInput | null },
  ctx: Context,
) {
  try {
    const service = new OnchainProgramInfoV2Service(ctx.db);
    const pagination = args.pagination
      ? { limit: args.pagination.limit ?? undefined, offset: args.pagination.offset ?? undefined }
      : undefined;
    return service.getBySmartContractId(args.smartContractId, pagination);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.server.log.error({
      msg: 'Database operation failed',
      error: message,
      operation: 'getOnchainProgramInfosBySmartContractV2',
    });
    throw new Error('Failed to fetch onchain program infos by smart contract');
  }
}

export async function createOnchainProgramInfoV2Resolver(
  _root: Root,
  args: { input: typeof CreateOnchainProgramInfoV2Input.$inferInput },
  ctx: Context,
) {
  if (!ctx.userV2) throw new Error('User not authenticated');
  try {
    const service = new OnchainProgramInfoV2Service(ctx.db);
    return service.create(args.input);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.server.log.error({
      msg: 'Database operation failed',
      error: message,
      operation: 'createOnchainProgramInfoV2',
    });
    throw new Error('Failed to create onchain program info');
  }
}

export async function updateOnchainProgramInfoV2Resolver(
  _root: Root,
  args: { id: string; input: typeof UpdateOnchainProgramInfoV2Input.$inferInput },
  ctx: Context,
) {
  if (!ctx.userV2) throw new Error('User not authenticated');
  try {
    const service = new OnchainProgramInfoV2Service(ctx.db);
    return service.update(args.id, args.input);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.server.log.error({
      msg: 'Database operation failed',
      error: message,
      operation: 'updateOnchainProgramInfoV2',
    });
    throw new Error('Failed to update onchain program info');
  }
}

export async function deleteOnchainProgramInfoV2Resolver(
  _root: Root,
  args: { id: string },
  ctx: Context,
) {
  if (!ctx.userV2) throw new Error('User not authenticated');
  try {
    const service = new OnchainProgramInfoV2Service(ctx.db);
    return service.delete(args.id);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.server.log.error({
      msg: 'Database operation failed',
      error: message,
      operation: 'deleteOnchainProgramInfoV2',
    });
    throw new Error('Failed to delete onchain program info');
  }
}
