import { type User, usersTable } from '@/db/schemas';
import type { Context, Root } from '@/types';
import { eq } from 'drizzle-orm';

export async function loginResolver(
  _root: Root,
  args: {
    email: string;
    userId: string;
  },
  ctx: Context,
) {
  const { email, userId } = args;
  const [foundUser] = await ctx.db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email));

  let user: User | null = null;

  if (!foundUser) {
    const [newUser] = await ctx.db
      .insert(usersTable)
      .values({
        email,
        externalId: userId,
      })
      .returning();

    user = newUser;
  } else {
    const [updatedUser] = await ctx.db
      .update(usersTable)
      .set({
        externalId: userId,
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
