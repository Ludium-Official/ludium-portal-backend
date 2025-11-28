import {
  type OnchainContractInfo,
  onchainContractInfoTable,
} from '@/db/schemas/v2/onchain-contract-info';
import type {
  CreateOnchainContractInfoV2Input,
  UpdateOnchainContractInfoV2Input,
} from '@/graphql/v2/inputs/onchain-contract-info';
import type { Context } from '@/types';
import { count, desc, eq } from 'drizzle-orm';

export class OnchainContractInfoV2Service {
  constructor(private db: Context['db']) {}

  async getMany(pagination?: { limit?: number; offset?: number }): Promise<{
    data: OnchainContractInfo[];
    count: number;
  }> {
    const limit = pagination?.limit || 10;
    const offset = pagination?.offset || 0;
    const data = await this.db
      .select()
      .from(onchainContractInfoTable)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(onchainContractInfoTable.id));
    const [totalCount] = await this.db.select({ count: count() }).from(onchainContractInfoTable);
    return { data, count: totalCount.count };
  }

  async getById(id: string): Promise<OnchainContractInfo> {
    const [row] = await this.db
      .select()
      .from(onchainContractInfoTable)
      .where(eq(onchainContractInfoTable.id, Number.parseInt(id, 10)));
    if (!row) throw new Error('Onchain contract info not found');
    return row;
  }

  async getByProgramId(
    programId: number,
    pagination?: { limit?: number; offset?: number },
  ): Promise<{ data: OnchainContractInfo[]; count: number }> {
    const limit = pagination?.limit || 10;
    const offset = pagination?.offset || 0;
    const data = await this.db
      .select()
      .from(onchainContractInfoTable)
      .where(eq(onchainContractInfoTable.programId, programId))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(onchainContractInfoTable.id));
    const [totalCount] = await this.db
      .select({ count: count() })
      .from(onchainContractInfoTable)
      .where(eq(onchainContractInfoTable.programId, programId));
    return { data, count: totalCount.count };
  }

  async getByApplicantId(
    applicantId: number,
    pagination?: { limit?: number; offset?: number },
  ): Promise<{ data: OnchainContractInfo[]; count: number }> {
    const limit = pagination?.limit || 10;
    const offset = pagination?.offset || 0;
    const data = await this.db
      .select()
      .from(onchainContractInfoTable)
      .where(eq(onchainContractInfoTable.applicantId, applicantId))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(onchainContractInfoTable.id));
    const [totalCount] = await this.db
      .select({ count: count() })
      .from(onchainContractInfoTable)
      .where(eq(onchainContractInfoTable.applicantId, applicantId));
    return { data, count: totalCount.count };
  }

  async create(
    input: typeof CreateOnchainContractInfoV2Input.$inferInput,
  ): Promise<OnchainContractInfo> {
    const createData = {
      programId: input.programId,
      sponsorId: input.sponsorId,
      applicantId: input.applicantId,
      smartContractId: input.smartContractId,
      onchainContractId: input.onchainContractId,
      tx: input.tx,
      ...(input.status !== null && input.status !== undefined ? { status: input.status } : {}),
    };
    const [row] = await this.db.insert(onchainContractInfoTable).values(createData).returning();
    return row;
  }

  async update(
    id: string,
    input: typeof UpdateOnchainContractInfoV2Input.$inferInput,
  ): Promise<OnchainContractInfo> {
    const updateData: Partial<{
      status: 'completed' | 'active' | 'cancelled' | 'updated' | 'paused';
      tx: string;
    }> = {};
    if (input.status !== null && input.status !== undefined) {
      updateData.status = input.status;
    }
    if (input.tx !== null && input.tx !== undefined) {
      updateData.tx = input.tx;
    }
    const [row] = await this.db
      .update(onchainContractInfoTable)
      .set(updateData)
      .where(eq(onchainContractInfoTable.id, Number.parseInt(id, 10)))
      .returning();
    if (!row) throw new Error('Onchain contract info not found');
    return row;
  }

  async delete(id: string): Promise<OnchainContractInfo> {
    const [row] = await this.db
      .delete(onchainContractInfoTable)
      .where(eq(onchainContractInfoTable.id, Number.parseInt(id, 10)))
      .returning();
    if (!row) throw new Error('Onchain contract info not found');
    return row;
  }
}
