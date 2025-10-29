import { type SmartContract, smartContractsTable } from '@/db/schemas/v2/smart-contracts';
import type {
  CreateSmartContractV2Input,
  UpdateSmartContractV2Input,
} from '@/graphql/v2/inputs/smart-contracts';
import type { Context } from '@/types';
import { count, desc, eq } from 'drizzle-orm';

export class SmartContractsV2Service {
  constructor(private db: Context['db']) {}

  async getMany(
    pagination?: { limit?: number; offset?: number },
    chainInfoId?: number,
  ): Promise<{ data: SmartContract[]; count: number }> {
    const { limit = 10, offset = 0 } = pagination ?? {};
    const where = chainInfoId ? eq(smartContractsTable.chainInfoId, chainInfoId) : undefined;
    const data = await this.db
      .select()
      .from(smartContractsTable)
      .where(where)
      .orderBy(desc(smartContractsTable.id))
      .limit(limit)
      .offset(offset);
    const [total] = await this.db.select({ count: count() }).from(smartContractsTable).where(where);
    return { data, count: total.count };
  }

  async getById(id: string): Promise<SmartContract> {
    const [row] = await this.db
      .select()
      .from(smartContractsTable)
      .where(eq(smartContractsTable.id, Number.parseInt(id, 10)));
    if (!row) throw new Error('Smart contract not found');
    return row;
  }

  async create(input: typeof CreateSmartContractV2Input.$inferInput): Promise<SmartContract> {
    const [row] = await this.db.insert(smartContractsTable).values(input).returning();
    return row;
  }

  async update(
    id: string,
    input: typeof UpdateSmartContractV2Input.$inferInput,
  ): Promise<SmartContract> {
    const updateData: Partial<{
      name: string;
      address: string;
    }> = {};
    if (input.name !== null && input.name !== undefined) {
      updateData.name = input.name;
    }
    if (input.address !== null && input.address !== undefined) {
      updateData.address = input.address;
    }
    const [row] = await this.db
      .update(smartContractsTable)
      .set(updateData)
      .where(eq(smartContractsTable.id, Number.parseInt(id, 10)))
      .returning();
    if (!row) throw new Error('Smart contract not found');
    return row;
  }

  async delete(id: string): Promise<SmartContract> {
    const [row] = await this.db
      .delete(smartContractsTable)
      .where(eq(smartContractsTable.id, Number.parseInt(id, 10)))
      .returning();
    if (!row) throw new Error('Smart contract not found');
    return row;
  }
}
