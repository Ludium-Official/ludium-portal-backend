import type { PaginationInput } from "@/graphql/types/common";
import type {
  CreateProgramV2Input,
  CreateProgramWithOnchainV2Input,
  UpdateProgramV2Input,
} from "@/graphql/v2/inputs/programs";
import type { Context, Root } from "@/types";
import { ProgramV2Service } from "../services";
import { OnchainProgramInfoV2Service } from "../services/onchain-program-info.service";

export async function getProgramsV2Resolver(
  _root: Root,
  args: { pagination?: typeof PaginationInput.$inferInput | null },
  ctx: Context
) {
  const programService = new ProgramV2Service(ctx.db);
  return programService.getMany({
    limit: args.pagination?.limit ?? undefined,
    offset: args.pagination?.offset ?? undefined,
  });
}

export async function getProgramV2Resolver(
  _root: Root,
  args: { id: string },
  ctx: Context
) {
  const programService = new ProgramV2Service(ctx.db);
  return programService.getById(args.id);
}

export async function createProgramV2Resolver(
  _root: Root,
  args: { input: typeof CreateProgramV2Input.$inferInput },
  ctx: Context
) {
  if (!ctx.userV2) {
    throw new Error("User not authenticated");
  }
  const programService = new ProgramV2Service(ctx.db);
  return programService.create(args.input, ctx.userV2.id);
}

export async function updateProgramV2Resolver(
  _root: Root,
  args: { id: string; input: typeof UpdateProgramV2Input.$inferInput },
  ctx: Context
) {
  const numericId = Number.parseInt(args.id, 10);
  if (Number.isNaN(numericId)) {
    throw new Error("Invalid program ID");
  }

  const programService = new ProgramV2Service(ctx.db);
  return programService.update(args.id, args.input);
}

export async function deleteProgramV2Resolver(
  _root: Root,
  args: { id: string },
  ctx: Context
) {
  const numericId = Number.parseInt(args.id, 10);
  if (Number.isNaN(numericId)) {
    throw new Error("Invalid program ID");
  }

  const programService = new ProgramV2Service(ctx.db);
  await programService.delete(args.id);
  return args.id;
}

export async function getProgramsBysponsorIdV2Resolver(
  _root: Root,
  args: {
    sponsorId: string;
    pagination?: typeof PaginationInput.$inferInput | null;
  },
  ctx: Context
) {
  const programService = new ProgramV2Service(ctx.db);
  const numericsponsorId = Number.parseInt(args.sponsorId, 10);
  if (Number.isNaN(numericsponsorId)) {
    throw new Error("Invalid creator ID");
  }
  return programService.getBySponsorId(numericsponsorId, {
    limit: args.pagination?.limit ?? undefined,
    offset: args.pagination?.offset ?? undefined,
  });
}

export async function getProgramsByBuilderV2Resolver(
  _root: Root,
  args: {
    builderId: string;
    pagination?: typeof PaginationInput.$inferInput | null;
  },
  ctx: Context
) {
  const programService = new ProgramV2Service(ctx.db);
  const numericBuilderId = Number.parseInt(args.builderId, 10);
  if (Number.isNaN(numericBuilderId)) {
    throw new Error("Invalid builder ID");
  }
  return programService.getByBuilderId(numericBuilderId, {
    limit: args.pagination?.limit ?? undefined,
    offset: args.pagination?.offset ?? undefined,
  });
}

export async function createProgramWithOnchainV2Resolver(
  _root: Root,
  args: {
    input: typeof CreateProgramWithOnchainV2Input.$inferInput;
  },
  ctx: Context
) {
  if (!ctx.userV2) {
    throw new Error("User not authenticated");
  }

  const userId = ctx.userV2.id;
  return ctx.db.transaction(async (t) => {
    // Create program
    const createdProgram = await new ProgramV2Service(t).create(
      args.input.program,
      userId
    );

    // Create onchain program info using program's networkId
    const onchain = await new OnchainProgramInfoV2Service(t).create({
      programId: createdProgram.id,
      networkId: createdProgram.networkId,
      smartContractId: args.input.onchain.smartContractId,
      onchainProgramId: args.input.onchain.onchainProgramId,
      tx: args.input.onchain.tx,
      status: args.input.onchain.status ?? undefined,
    });

    return { program: createdProgram, onchain };
  });
}
