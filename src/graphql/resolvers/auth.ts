import { usersTable } from '@/db/schemas';
import type { Context, Root } from '@/types';
import { eq } from 'drizzle-orm';

export async function loginResolver(
  _root: Root,
  args: { email: string; userId: string },
  ctx: Context,
) {
  const { email, userId } = args;
  let [user] = await ctx.db.select().from(usersTable).where(eq(usersTable.email, email));

  if (!user) {
    const [newUser] = await ctx.db
      .insert(usersTable)
      .values({
        externalId: userId,
        email,
      })
      .returning();

    user = newUser;
  }

  const token = ctx.server.jwt.sign(
    {
      id: user.id,
      email: user.email,
    },
    {
      expiresIn: '7d', // TODO: Change to 1h when we have a production environment
    },
  );

  return { token };
}
