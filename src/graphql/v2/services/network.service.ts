import { type NetworkType, networksTable } from '@/db/schemas/v2/networks';
import type { CreateNetworkV2Input, UpdateNetworkV2Input } from '@/graphql/v2/inputs/networks';
import type { Context } from '@/types';
import { count, desc, eq } from 'drizzle-orm';

export class NetworkV2Service {
  constructor(private db: Context['db']) {}

  async getMany(pagination?: { limit?: number; offset?: number }): Promise<{
    data: NetworkType[];
    count: number;
  }> {
    const limit = pagination?.limit || 10;
    const offset = pagination?.offset || 0;

    const data = await this.db
      .select()
      .from(networksTable)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(networksTable.id));

    const [totalCount] = await this.db.select({ count: count() }).from(networksTable);

    return { data, count: totalCount.count };
  }

  async getById(id: string): Promise<NetworkType> {
    const [row] = await this.db
      .select()
      .from(networksTable)
      .where(eq(networksTable.id, Number.parseInt(id, 10)));
    if (!row) throw new Error('Network not found');
    return row;
  }

  async create(input: typeof CreateNetworkV2Input.$inferInput): Promise<NetworkType> {
    const [row] = await this.db.insert(networksTable).values(input).returning();
    return row;
  }

  async update(id: string, input: typeof UpdateNetworkV2Input.$inferInput): Promise<NetworkType> {
    const [row] = await this.db
      .update(networksTable)
      .set(input)
      .where(eq(networksTable.id, Number.parseInt(id, 10)))
      .returning();
    if (!row) throw new Error('Network not found');
    return row;
  }

  async delete(id: string): Promise<NetworkType> {
    const [row] = await this.db
      .delete(networksTable)
      .where(eq(networksTable.id, Number.parseInt(id, 10)))
      .returning();
    if (!row) throw new Error('Network not found');
    return row;
  }
}
