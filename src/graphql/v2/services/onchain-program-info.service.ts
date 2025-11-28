import {
  type OnchainProgramInfo,
  onchainProgramInfoTable,
} from '@/db/schemas/v2/onchain-program-info';
import type {
  CreateOnchainProgramInfoV2Input,
  UpdateOnchainProgramInfoV2Input,
} from '@/graphql/v2/inputs/onchain-program-info';
import type { Context } from '@/types';
import { count, desc, eq } from 'drizzle-orm';

export class OnchainProgramInfoV2Service {
  constructor(private db: Context['db']) {}

  async getMany(pagination?: { limit?: number; offset?: number }): Promise<{
    data: OnchainProgramInfo[];
    count: number;
  }> {
    const { limit = 10, offset = 0 } = pagination ?? {};
    const data = await this.db
      .select()
      .from(onchainProgramInfoTable)
      .orderBy(desc(onchainProgramInfoTable.id))
      .limit(limit)
      .offset(offset);
    const [total] = await this.db.select({ count: count() }).from(onchainProgramInfoTable);
    return { data, count: total.count };
  }

  async getById(id: string): Promise<OnchainProgramInfo> {
    const [row] = await this.db
      .select()
      .from(onchainProgramInfoTable)
      .where(eq(onchainProgramInfoTable.id, Number.parseInt(id, 10)));
    if (!row) throw new Error('Onchain program info not found');
    return row;
  }

  async getByProgramId(
    programId: number,
    pagination?: { limit?: number; offset?: number },
  ): Promise<{ data: OnchainProgramInfo[]; count: number }> {
    const { limit = 10, offset = 0 } = pagination ?? {};
    const data = await this.db
      .select()
      .from(onchainProgramInfoTable)
      .where(eq(onchainProgramInfoTable.programId, programId))
      .orderBy(desc(onchainProgramInfoTable.id))
      .limit(limit)
      .offset(offset);
    const [total] = await this.db
      .select({ count: count() })
      .from(onchainProgramInfoTable)
      .where(eq(onchainProgramInfoTable.programId, programId));
    return { data, count: total.count };
  }

  async getBySmartContractId(
    smartContractId: number,
    pagination?: { limit?: number; offset?: number },
  ): Promise<{ data: OnchainProgramInfo[]; count: number }> {
    const { limit = 10, offset = 0 } = pagination ?? {};
    const data = await this.db
      .select()
      .from(onchainProgramInfoTable)
      .where(eq(onchainProgramInfoTable.smartContractId, smartContractId))
      .orderBy(desc(onchainProgramInfoTable.id))
      .limit(limit)
      .offset(offset);
    const [total] = await this.db
      .select({ count: count() })
      .from(onchainProgramInfoTable)
      .where(eq(onchainProgramInfoTable.smartContractId, smartContractId));
    return { data, count: total.count };
  }

  async create(
    input: typeof CreateOnchainProgramInfoV2Input.$inferInput,
  ): Promise<OnchainProgramInfo> {
    const createData = {
      programId: input.programId,
      networkId: input.networkId,
      smartContractId: input.smartContractId,
      onchainProgramId: input.onchainProgramId,
      tx: input.tx,
      ...(input.status !== null && input.status !== undefined ? { status: input.status } : {}),
    };
    const [row] = await this.db.insert(onchainProgramInfoTable).values(createData).returning();
    return row;
  }

  async update(
    id: string,
    input: typeof UpdateOnchainProgramInfoV2Input.$inferInput,
  ): Promise<OnchainProgramInfo> {
    const updateData: Partial<{
      status: 'active' | 'paused' | 'completed' | 'cancelled';
      tx: string;
    }> = {};
    if (input.status !== null && input.status !== undefined) {
      updateData.status = input.status;
    }
    if (input.tx !== null && input.tx !== undefined) {
      updateData.tx = input.tx;
    }
    const [row] = await this.db
      .update(onchainProgramInfoTable)
      .set(updateData)
      .where(eq(onchainProgramInfoTable.id, Number.parseInt(id, 10)))
      .returning();
    if (!row) throw new Error('Onchain program info not found');
    return row;
  }

  async delete(id: string): Promise<OnchainProgramInfo> {
    const [row] = await this.db
      .delete(onchainProgramInfoTable)
      .where(eq(onchainProgramInfoTable.id, Number.parseInt(id, 10)))
      .returning();
    if (!row) throw new Error('Onchain program info not found');
    return row;
  }
}
