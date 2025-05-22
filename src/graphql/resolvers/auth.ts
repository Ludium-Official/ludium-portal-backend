import { type User, usersTable } from '@/db/schemas';
import type { Context, Root } from '@/types';
import { eq, or } from 'drizzle-orm';

export async function loginResolver(
  _root: Root,
  args: {
    walletAddress: string;
    loginType: string;
    email?: string | null;
  },
  ctx: Context,
) {
  const { email, walletAddress, loginType } = args;
  const [foundUser] = await ctx.db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(or(eq(usersTable.email, email ?? ''), eq(usersTable.walletAddress, walletAddress)));

  let user: User | null = null;

  if (!foundUser) {
    const [newUser] = await ctx.db
      .insert(usersTable)
      .values({
        email,
        walletAddress,
        loginType,
      })
      .returning();

    user = newUser;
  } else {
    const [updatedUser] = await ctx.db
      .update(usersTable)
      .set({
        walletAddress,
        loginType,
      })
      .where(eq(usersTable.id, foundUser.id))
      .returning();

    user = updatedUser;
  }

  const token = ctx.server.jwt.sign(
    {
      payload: {
        id: user.id,
        email: user.email,
      },
    },
    {
      expiresIn: '7d', // TODO: Change to 1h when we have a production environment
    },
  );

  return token;
}
