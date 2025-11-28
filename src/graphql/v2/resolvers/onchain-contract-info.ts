import type { PaginationInput } from '@/graphql/types/common';
import type {
  CreateOnchainContractInfoV2Input,
  UpdateOnchainContractInfoV2Input,
} from '@/graphql/v2/inputs/onchain-contract-info';
import { OnchainContractInfoV2Service } from '@/graphql/v2/services/onchain-contract-info.service';
import type { Context, Root } from '@/types';

export async function getOnchainContractInfosV2Resolver(
  _root: Root,
  args: { pagination?: typeof PaginationInput.$inferInput | null },
  ctx: Context,
) {
  try {
    const service = new OnchainContractInfoV2Service(ctx.db);
    const pagination = args.pagination
      ? { limit: args.pagination.limit ?? undefined, offset: args.pagination.offset ?? undefined }
      : undefined;
    return await service.getMany(pagination);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.server.log.error({
      msg: 'Database operation failed',
      error: message,
      operation: 'getOnchainContractInfosV2',
    });
    throw new Error('Failed to fetch onchain contract infos');
  }
}

export async function getOnchainContractInfoV2Resolver(
  _root: Root,
  args: { id: string },
  ctx: Context,
) {
  try {
    const service = new OnchainContractInfoV2Service(ctx.db);
    return await service.getById(args.id);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.server.log.error({
      msg: 'Database operation failed',
      error: message,
      operation: 'getOnchainContractInfoV2',
    });
    throw new Error('Failed to fetch onchain contract info');
  }
}

export async function getOnchainContractInfosByProgramV2Resolver(
  _root: Root,
  args: { programId: number; pagination?: typeof PaginationInput.$inferInput | null },
  ctx: Context,
) {
  try {
    const service = new OnchainContractInfoV2Service(ctx.db);
    const pagination = args.pagination
      ? { limit: args.pagination.limit ?? undefined, offset: args.pagination.offset ?? undefined }
      : undefined;
    return await service.getByProgramId(args.programId, pagination);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.server.log.error({
      msg: 'Database operation failed',
      error: message,
      operation: 'getOnchainContractInfosByProgramV2',
    });
    throw new Error('Failed to fetch onchain contract infos by program');
  }
}

export async function getOnchainContractInfosByApplicantV2Resolver(
  _root: Root,
  args: { applicantId: number; pagination?: typeof PaginationInput.$inferInput | null },
  ctx: Context,
) {
  try {
    const service = new OnchainContractInfoV2Service(ctx.db);
    const pagination = args.pagination
      ? { limit: args.pagination.limit ?? undefined, offset: args.pagination.offset ?? undefined }
      : undefined;
    return await service.getByApplicantId(args.applicantId, pagination);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.server.log.error({
      msg: 'Database operation failed',
      error: message,
      operation: 'getOnchainContractInfosByApplicantV2',
    });
    throw new Error('Failed to fetch onchain contract infos by applicant');
  }
}

export async function createOnchainContractInfoV2Resolver(
  _root: Root,
  args: { input: typeof CreateOnchainContractInfoV2Input.$inferInput },
  ctx: Context,
) {
  if (!ctx.userV2) throw new Error('User not authenticated');
  try {
    const service = new OnchainContractInfoV2Service(ctx.db);
    return await service.create(args.input);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.server.log.error({
      msg: 'Database operation failed',
      error: message,
      operation: 'createOnchainContractInfoV2',
    });
    throw new Error('Failed to create onchain contract info');
  }
}

export async function updateOnchainContractInfoV2Resolver(
  _root: Root,
  args: { id: string; input: typeof UpdateOnchainContractInfoV2Input.$inferInput },
  ctx: Context,
) {
  if (!ctx.userV2) throw new Error('User not authenticated');
  try {
    const service = new OnchainContractInfoV2Service(ctx.db);
    return await service.update(args.id, args.input);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.server.log.error({
      msg: 'Database operation failed',
      error: message,
      operation: 'updateOnchainContractInfoV2',
    });
    throw new Error('Failed to update onchain contract info');
  }
}

export async function deleteOnchainContractInfoV2Resolver(
  _root: Root,
  args: { id: string },
  ctx: Context,
) {
  if (!ctx.userV2) throw new Error('User not authenticated');
  try {
    const service = new OnchainContractInfoV2Service(ctx.db);
    return await service.delete(args.id);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.server.log.error({
      msg: 'Database operation failed',
      error: message,
      operation: 'deleteOnchainContractInfoV2',
    });
    throw new Error('Failed to delete onchain contract info');
  }
}
