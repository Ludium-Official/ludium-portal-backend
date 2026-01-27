import { type Contracts, contractsTable } from '@/db/schemas/v2/contracts';
import type { CreateContractV2Input, UpdateContractV2Input } from '@/graphql/v2/inputs/contracts';
import type { Context } from '@/types';
import { count, desc, eq } from 'drizzle-orm';

export class ContractV2Service {
  constructor(
    private db: Context['db'],
    private server: Context['server'],
  ) {}

  async getMany(pagination?: { limit?: number; offset?: number }): Promise<{
    data: Contracts[];
    count: number;
  }> {
    const limit = pagination?.limit || 10;
    const offset = pagination?.offset || 0;
    const data = await this.db
      .select()
      .from(contractsTable)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(contractsTable.id));
    const [totalCount] = await this.db.select({ count: count() }).from(contractsTable);
    return { data, count: totalCount.count };
  }

  async getById(id: string): Promise<Contracts> {
    const [row] = await this.db
      .select()
      .from(contractsTable)
      .where(eq(contractsTable.id, Number.parseInt(id, 10)));
    if (!row) throw new Error('Contract not found');
    return row;
  }

  async getByProgramId(
    programId: string,
    pagination?: { limit?: number; offset?: number },
  ): Promise<{ data: Contracts[]; count: number }> {
    const limit = pagination?.limit || 10;
    const offset = pagination?.offset || 0;
    const data = await this.db
      .select()
      .from(contractsTable)
      .where(eq(contractsTable.programId, programId))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(contractsTable.id));
    const [totalCount] = await this.db
      .select({ count: count() })
      .from(contractsTable)
      .where(eq(contractsTable.programId, programId));
    return { data, count: totalCount.count };
  }

  async getByApplicantId(
    applicantId: number,
    pagination?: { limit?: number; offset?: number },
  ): Promise<{ data: Contracts[]; count: number }> {
    const limit = pagination?.limit || 10;
    const offset = pagination?.offset || 0;
    const data = await this.db
      .select()
      .from(contractsTable)
      .where(eq(contractsTable.applicantId, applicantId))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(contractsTable.id));
    const [totalCount] = await this.db
      .select({ count: count() })
      .from(contractsTable)
      .where(eq(contractsTable.applicantId, applicantId));
    return { data, count: totalCount.count };
  }

  async getBySponsorId(
    sponsorId: number,
    pagination?: { limit?: number; offset?: number },
  ): Promise<{ data: Contracts[]; count: number }> {
    const limit = pagination?.limit || 10;
    const offset = pagination?.offset || 0;
    const data = await this.db
      .select()
      .from(contractsTable)
      .where(eq(contractsTable.sponsorId, sponsorId))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(contractsTable.id));
    const [totalCount] = await this.db
      .select({ count: count() })
      .from(contractsTable)
      .where(eq(contractsTable.sponsorId, sponsorId));
    return { data, count: totalCount.count };
  }

  async getByApplicationId(
    applicationId: number,
    pagination?: { limit?: number; offset?: number },
  ): Promise<{ data: Contracts[]; count: number }> {
    const limit = pagination?.limit || 10;
    const offset = pagination?.offset || 0;
    const data = await this.db
      .select()
      .from(contractsTable)
      .where(eq(contractsTable.applicationId, applicationId))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(contractsTable.id));
    const [totalCount] = await this.db
      .select({ count: count() })
      .from(contractsTable)
      .where(eq(contractsTable.applicationId, applicationId));
    return { data, count: totalCount.count };
  }

  async create(input: typeof CreateContractV2Input.$inferInput): Promise<Contracts> {
    const createData = {
      programId: input.programId,
      applicationId: input.applicationId,
      sponsorId: input.sponsorId,
      applicantId: input.applicantId,
      smartContractId: input.smartContractId,
      ...(input.onchainContractId !== null && input.onchainContractId !== undefined
        ? { onchainContractId: input.onchainContractId }
        : {}),
      ...(input.contract_snapshot_cotents !== null && input.contract_snapshot_cotents !== undefined
        ? { contract_snapshot_cotents: input.contract_snapshot_cotents }
        : {}),
      ...(input.contract_snapshot_hash !== null && input.contract_snapshot_hash !== undefined
        ? { contract_snapshot_hash: input.contract_snapshot_hash }
        : {}),
      ...(input.builder_signature !== null && input.builder_signature !== undefined
        ? { builder_signature: input.builder_signature }
        : {}),
    };
    const [row] = await this.db.insert(contractsTable).values(createData).returning();

    await this.notify({
      recipientId: row.applicantId,
      contractId: row.id,
      programId: row.programId,
      action: 'created',
      title: 'New Contract Received',
      content: 'A sponsor has sent you a contract to sign.',
    });

    return row;
  }

  async update(id: string, input: typeof UpdateContractV2Input.$inferInput): Promise<Contracts> {
    const existingContract = await this.getById(id);

    const updateData: Partial<{
      onchainContractId: number;
      contract_snapshot_cotents: unknown;
      contract_snapshot_hash: string;
      builder_signature: string;
    }> = {};

    let builderSigned = false;

    if (input.onchainContractId !== null && input.onchainContractId !== undefined) {
      updateData.onchainContractId = input.onchainContractId;
    }
    if (input.contract_snapshot_cotents !== null && input.contract_snapshot_cotents !== undefined) {
      updateData.contract_snapshot_cotents = input.contract_snapshot_cotents;
    }
    if (input.contract_snapshot_hash !== null && input.contract_snapshot_hash !== undefined) {
      updateData.contract_snapshot_hash = input.contract_snapshot_hash;
    }
    if (input.builder_signature !== null && input.builder_signature !== undefined) {
      updateData.builder_signature = input.builder_signature;
      if (!existingContract.builder_signature) {
        builderSigned = true;
      }
    }
    const [row] = await this.db
      .update(contractsTable)
      .set(updateData)
      .where(eq(contractsTable.id, Number.parseInt(id, 10)))
      .returning();
    if (!row) throw new Error('Contract not found');

    // notify
    if (builderSigned) {
      await this.notify({
        recipientId: row.sponsorId,
        contractId: row.id,
        programId: row.programId,
        action: 'completed',
        title: 'Contract Signed by Builder',
        content: 'The builder has signed the contract.',
      });
    }

    return row;
  }

  async delete(id: string): Promise<Contracts> {
    const [row] = await this.db
      .delete(contractsTable)
      .where(eq(contractsTable.id, Number.parseInt(id, 10)))
      .returning();
    if (!row) throw new Error('Contract not found');
    return row;
  }

  // helper
  private async notify(params: {
    recipientId: number;
    contractId: number;
    programId: string;
    action: 'created' | 'completed';
    title: string;
    content: string;
  }) {
    await this.server.pubsub.publish('notificationsV2', this.db, {
      type: 'contract' as const,
      action: params.action,
      recipientId: params.recipientId,
      entityId: String(params.contractId),
      title: params.title,
      content: params.content,
      metadata: { programId: params.programId },
    });
    await this.server.pubsub.publish('notificationsV2Count');
  }
}
