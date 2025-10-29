import { type TokenType, tokensTable } from '@/db/schemas/v2/tokens';
import type { CreateTokenV2Input, UpdateTokenV2Input } from '@/graphql/v2/inputs/tokens';
import type { Context } from '@/types';
import { count, desc, eq } from 'drizzle-orm';

export class TokenV2Service {
  constructor(private db: Context['db']) {}

  async getMany(pagination?: { limit?: number; offset?: number }): Promise<{
    data: TokenType[];
    count: number;
  }> {
    const limit = pagination?.limit || 10;
    const offset = pagination?.offset || 0;

    const data = await this.db
      .select()
      .from(tokensTable)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(tokensTable.id));

    const [totalCount] = await this.db.select({ count: count() }).from(tokensTable);
    return { data, count: totalCount.count };
  }

  async getById(id: string): Promise<TokenType> {
    const [row] = await this.db
      .select()
      .from(tokensTable)
      .where(eq(tokensTable.id, Number.parseInt(id, 10)));
    if (!row) throw new Error('Token not found');
    return row;
  }

  async getByNetworkId(
    networkId: number,
    pagination?: { limit?: number; offset?: number },
  ): Promise<{ data: TokenType[]; count: number }> {
    const limit = pagination?.limit || 10;
    const offset = pagination?.offset || 0;
    const data = await this.db
      .select()
      .from(tokensTable)
      .where(eq(tokensTable.chainInfoId, networkId))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(tokensTable.id));
    const [totalCount] = await this.db
      .select({ count: count() })
      .from(tokensTable)
      .where(eq(tokensTable.chainInfoId, networkId));
    return { data, count: totalCount.count };
  }

  async create(input: typeof CreateTokenV2Input.$inferInput): Promise<TokenType> {
    const [row] = await this.db.insert(tokensTable).values(input).returning();
    return row;
  }

  async update(id: string, input: typeof UpdateTokenV2Input.$inferInput): Promise<TokenType> {
    const updateData: Partial<{
      chainInfoId: number;
      tokenName: string;
      tokenAddress: string;
    }> = {};
    if (input.chainInfoId !== null && input.chainInfoId !== undefined) {
      updateData.chainInfoId = input.chainInfoId;
    }
    if (input.tokenName !== null && input.tokenName !== undefined) {
      updateData.tokenName = input.tokenName;
    }
    if (input.tokenAddress !== null && input.tokenAddress !== undefined) {
      updateData.tokenAddress = input.tokenAddress;
    }
    const [row] = await this.db
      .update(tokensTable)
      .set(updateData)
      .where(eq(tokensTable.id, Number.parseInt(id, 10)))
      .returning();
    if (!row) throw new Error('Token not found');
    return row;
  }

  async delete(id: string): Promise<TokenType> {
    const [row] = await this.db
      .delete(tokensTable)
      .where(eq(tokensTable.id, Number.parseInt(id, 10)))
      .returning();
    if (!row) throw new Error('Token not found');
    return row;
  }
}
