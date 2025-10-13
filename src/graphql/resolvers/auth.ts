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
  try {
    const { email, walletAddress, loginType } = args;

    ctx.server.log.info({
      msg: 'Starting login process',
      email,
      walletAddress,
      loginType,
    });

    // First, check if user exists by email OR wallet address
    ctx.server.log.info({ msg: 'Querying database for existing user' });
    const queryStartTime = Date.now();

    const [foundUser] = await ctx.db
      .select()
      .from(usersTable)
      .where(or(eq(usersTable.email, email ?? ''), eq(usersTable.walletAddress, walletAddress)));

    const queryDuration = Date.now() - queryStartTime;
    ctx.server.log.info({
      msg: 'Database query completed',
      duration: `${queryDuration}ms`,
      foundUser: !!foundUser,
    });

    let user: User | null = null;

    if (!foundUser) {
      // New user - create account
      ctx.server.log.info({ msg: 'Creating new user' });
      const insertStartTime = Date.now();

      const [newUser] = await ctx.db
        .insert(usersTable)
        .values({
          email,
          walletAddress,
          loginType,
        })
        .returning();

      const insertDuration = Date.now() - insertStartTime;
      ctx.server.log.info({
        msg: 'New user created',
        duration: `${insertDuration}ms`,
        userId: newUser.id,
      });

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
        ctx.server.log.info({
          msg: 'Updating existing user',
          updateData,
        });
        const updateStartTime = Date.now();

        const [updatedUser] = await ctx.db
          .update(usersTable)
          .set(updateData)
          .where(eq(usersTable.id, foundUser.id))
          .returning();

        const updateDuration = Date.now() - updateStartTime;
        ctx.server.log.info({
          msg: 'User updated successfully',
          duration: `${updateDuration}ms`,
        });

        user = updatedUser;
      } else {
        ctx.server.log.info({ msg: 'No updates needed for existing user' });
        user = foundUser;
      }
    }

    if (!user) {
      throw new Error('User creation/update failed - no user object available');
    }

    ctx.server.log.info({
      msg: 'Generating JWT token',
      userId: user.id,
    });
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
    ctx.server.log.info({ msg: 'JWT token generated successfully' });

    return token;
  } catch (error) {
    ctx.server.log.error({
      msg: 'Error during login process',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}
