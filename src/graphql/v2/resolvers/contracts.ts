import type { PaginationInput } from '@/graphql/types/common';
import type { CreateContractV2Input, UpdateContractV2Input } from '@/graphql/v2/inputs/contracts';
import { ContractV2Service } from '@/graphql/v2/services/contract.service';
import type { Context, Root } from '@/types';

export async function getContractsV2Resolver(
  _root: Root,
  args: { pagination?: typeof PaginationInput.$inferInput | null },
  ctx: Context,
) {
  try {
    const service = new ContractV2Service(ctx.db, ctx.server);
    const pagination = args.pagination
      ? { limit: args.pagination.limit ?? undefined, offset: args.pagination.offset ?? undefined }
      : undefined;
    return await service.getMany(pagination);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.server.log.error({
      msg: 'Database operation failed',
      error: message,
      operation: 'getContractsV2',
    });
    throw new Error('Failed to fetch contracts');
  }
}

export async function getContractV2Resolver(_root: Root, args: { id: string }, ctx: Context) {
  try {
    const service = new ContractV2Service(ctx.db, ctx.server);
    return await service.getById(args.id);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.server.log.error({
      msg: 'Database operation failed',
      error: message,
      operation: 'getContractV2',
    });
    throw new Error('Failed to fetch contract');
  }
}

export async function getContractsByProgramV2Resolver(
  _root: Root,
  args: { programId: string; pagination?: typeof PaginationInput.$inferInput | null },
  ctx: Context,
) {
  try {
    const service = new ContractV2Service(ctx.db, ctx.server);
    const pagination = args.pagination
      ? { limit: args.pagination.limit ?? undefined, offset: args.pagination.offset ?? undefined }
      : undefined;
    return await service.getByProgramId(args.programId, pagination);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.server.log.error({
      msg: 'Database operation failed',
      error: message,
      operation: 'getContractsByProgramV2',
    });
    throw new Error('Failed to fetch contracts by program');
  }
}

export async function getContractsByApplicantV2Resolver(
  _root: Root,
  args: { applicantId: number; pagination?: typeof PaginationInput.$inferInput | null },
  ctx: Context,
) {
  try {
    const service = new ContractV2Service(ctx.db, ctx.server);
    const pagination = args.pagination
      ? { limit: args.pagination.limit ?? undefined, offset: args.pagination.offset ?? undefined }
      : undefined;
    return await service.getByApplicantId(args.applicantId, pagination);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.server.log.error({
      msg: 'Database operation failed',
      error: message,
      operation: 'getContractsByApplicantV2',
    });
    throw new Error('Failed to fetch contracts by applicant');
  }
}

export async function getContractsBySponsorV2Resolver(
  _root: Root,
  args: { sponsorId: number; pagination?: typeof PaginationInput.$inferInput | null },
  ctx: Context,
) {
  try {
    const service = new ContractV2Service(ctx.db, ctx.server);
    const pagination = args.pagination
      ? { limit: args.pagination.limit ?? undefined, offset: args.pagination.offset ?? undefined }
      : undefined;
    return await service.getBySponsorId(args.sponsorId, pagination);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.server.log.error({
      msg: 'Database operation failed',
      error: message,
      operation: 'getContractsBySponsorV2',
    });
    throw new Error('Failed to fetch contracts by sponsor');
  }
}

export async function getContractsByApplicationV2Resolver(
  _root: Root,
  args: { applicationId: number; pagination?: typeof PaginationInput.$inferInput | null },
  ctx: Context,
) {
  try {
    const service = new ContractV2Service(ctx.db, ctx.server);
    const pagination = args.pagination
      ? { limit: args.pagination.limit ?? undefined, offset: args.pagination.offset ?? undefined }
      : undefined;
    return await service.getByApplicationId(args.applicationId, pagination);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.server.log.error({
      msg: 'Database operation failed',
      error: message,
      operation: 'getContractsByApplicationV2',
    });
    throw new Error('Failed to fetch contracts by application');
  }
}

export async function createContractV2Resolver(
  _root: Root,
  args: { input: typeof CreateContractV2Input.$inferInput },
  ctx: Context,
) {
  if (!ctx.userV2) throw new Error('User not authenticated');
  try {
    const service = new ContractV2Service(ctx.db, ctx.server);
    return await service.create(args.input);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.server.log.error({
      msg: 'Database operation failed',
      error: message,
      operation: 'createContractV2',
    });
    throw new Error('Failed to create contract');
  }
}

export async function updateContractV2Resolver(
  _root: Root,
  args: { id: string; input: typeof UpdateContractV2Input.$inferInput },
  ctx: Context,
) {
  if (!ctx.userV2) throw new Error('User not authenticated');
  try {
    const service = new ContractV2Service(ctx.db, ctx.server);
    return await service.update(args.id, args.input);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.server.log.error({
      msg: 'Database operation failed',
      error: message,
      operation: 'updateContractV2',
    });
    throw new Error('Failed to update contract');
  }
}

export async function deleteContractV2Resolver(_root: Root, args: { id: string }, ctx: Context) {
  if (!ctx.userV2) throw new Error('User not authenticated');
  try {
    const service = new ContractV2Service(ctx.db, ctx.server);
    return await service.delete(args.id);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.server.log.error({
      msg: 'Database operation failed',
      error: message,
      operation: 'deleteContractV2',
    });
    throw new Error('Failed to delete contract');
  }
}
