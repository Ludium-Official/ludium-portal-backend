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

  // First, check if user exists by email OR wallet address
  const [foundUser] = await ctx.db
    .select()
    .from(usersTable)
    .where(or(eq(usersTable.email, email ?? ''), eq(usersTable.walletAddress, walletAddress)));

  let user: User | null = null;

  if (!foundUser) {
    // New user - create account
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
    // Check for conflicts
    if (email && foundUser.email && foundUser.email !== email) {
      throw new Error('This wallet is already associated with a different email address');
    }

    if (walletAddress && foundUser.walletAddress && foundUser.walletAddress !== walletAddress) {
      throw new Error(
        'This email is already associated with a different wallet address. Please log in with your original authentication method.',
      );
    }

    // Only update empty fields to link accounts
    const updateData: Partial<typeof usersTable.$inferInsert> = {};

    // Only set email if user doesn't have one yet (linking wallet to email)
    if (!foundUser.email && email) {
      updateData.email = email;
    }

    // Only set wallet if user doesn't have one yet (linking email to wallet)
    if (!foundUser.walletAddress && walletAddress) {
      updateData.walletAddress = walletAddress;
    }

    // Always update loginType to track last login method
    updateData.loginType = loginType;

    // Only update if there are changes
    if (Object.keys(updateData).length > 0) {
      const [updatedUser] = await ctx.db
        .update(usersTable)
        .set(updateData)
        .where(eq(usersTable.id, foundUser.id))
        .returning();

      user = updatedUser;
    } else {
      user = foundUser;
    }
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
