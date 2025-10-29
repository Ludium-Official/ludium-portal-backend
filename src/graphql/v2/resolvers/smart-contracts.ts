import type { PaginationInput } from '@/graphql/types/common';
import type {
  CreateSmartContractV2Input,
  UpdateSmartContractV2Input,
} from '@/graphql/v2/inputs/smart-contracts';
import { SmartContractsV2Service } from '@/graphql/v2/services/smart-contracts.service';
import type { Context, Root } from '@/types';

export async function getSmartContractsV2Resolver(
  _root: Root,
  args: { pagination?: typeof PaginationInput.$inferInput | null; chainInfoId?: number | null },
  ctx: Context,
) {
  try {
    const service = new SmartContractsV2Service(ctx.db);
    const pagination = args.pagination
      ? { limit: args.pagination.limit ?? undefined, offset: args.pagination.offset ?? undefined }
      : undefined;
    const chainInfoId = args.chainInfoId ?? undefined;
    return service.getMany(pagination, chainInfoId);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.server.log.error({
      msg: 'Database operation failed',
      error: message,
      operation: 'getSmartContractsV2',
    });
    throw new Error('Failed to fetch smart contracts');
  }
}

export async function getSmartContractV2Resolver(_root: Root, args: { id: string }, ctx: Context) {
  try {
    const service = new SmartContractsV2Service(ctx.db);
    return service.getById(args.id);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.server.log.error({
      msg: 'Database operation failed',
      error: message,
      operation: 'getSmartContractV2',
    });
    throw new Error('Failed to fetch smart contract');
  }
}

export async function createSmartContractV2Resolver(
  _root: Root,
  args: { input: typeof CreateSmartContractV2Input.$inferInput },
  ctx: Context,
) {
  if (!ctx.userV2) throw new Error('User not authenticated');
  try {
    const service = new SmartContractsV2Service(ctx.db);
    return service.create(args.input);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.server.log.error({
      msg: 'Database operation failed',
      error: message,
      operation: 'createSmartContractV2',
    });
    throw new Error('Failed to create smart contract');
  }
}

export async function updateSmartContractV2Resolver(
  _root: Root,
  args: { id: string; input: typeof UpdateSmartContractV2Input.$inferInput },
  ctx: Context,
) {
  if (!ctx.userV2) throw new Error('User not authenticated');
  try {
    const service = new SmartContractsV2Service(ctx.db);
    return service.update(args.id, args.input);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.server.log.error({
      msg: 'Database operation failed',
      error: message,
      operation: 'updateSmartContractV2',
    });
    throw new Error('Failed to update smart contract');
  }
}

export async function deleteSmartContractV2Resolver(
  _root: Root,
  args: { id: string },
  ctx: Context,
) {
  if (!ctx.userV2) throw new Error('User not authenticated');
  try {
    const service = new SmartContractsV2Service(ctx.db);
    return service.delete(args.id);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.server.log.error({
      msg: 'Database operation failed',
      error: message,
      operation: 'deleteSmartContractV2',
    });
    throw new Error('Failed to delete smart contract');
  }
}
