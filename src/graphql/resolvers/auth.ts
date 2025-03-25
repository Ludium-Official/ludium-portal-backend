import { rolesTable, usersTable, usersToRolesTable, walletTable } from '@/db/schemas';
import type { Context, Root } from '@/types';
import { eq, inArray } from 'drizzle-orm';

export async function loginResolver(
  _root: Root,
  args: {
    email: string;
    userId: string;
    walletId?: string | null;
    network?: string | null;
    symbol?: string | null;
    address?: string | null;
  },
  ctx: Context,
) {
  const { email, userId } = args;
  const [user] = await ctx.db.select().from(usersTable).where(eq(usersTable.email, email));

  if (!user) {
    throw new Error('User not found');
  }

  await ctx.db
    .update(usersTable)
    .set({
      externalId: userId,
    })
    .where(eq(usersTable.id, user.id));

  if (args.walletId) {
    const [wallet] = await ctx.db
      .select()
      .from(walletTable)
      .where(eq(walletTable.walletId, args.walletId));

    if (!wallet) {
      await ctx.db.insert(walletTable).values({
        userId: user.id,
        walletId: args.walletId,
        network: args.network,
        address: args.address,
      });
    }
  }

  const userToRoles = await ctx.db
    .select()
    .from(usersToRolesTable)
    .where(eq(usersToRolesTable.userId, user.id));

  const userRoles = await ctx.db
    .select()
    .from(rolesTable)
    .where(
      inArray(
        rolesTable.id,
        userToRoles.map((role) => role.roleId),
      ),
    );

  const userRoleNames = userRoles.map((role) => role.name);

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

  return {
    token,
    userRoles: userRoleNames,
  };
}
