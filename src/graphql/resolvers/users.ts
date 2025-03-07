import { usersTable } from '@/db/schemas/users';
import type { Args, Context, Root } from '@/types';

export async function getUsersResolver(_root: Root, _args: Args, ctx: Context) {
  return ctx.db.select().from(usersTable);
}

export async function createUserResolver(
  _root: Root,
  args: { email: string; password: string },
  ctx: Context,
) {
  const [user] = await ctx.db.insert(usersTable).values({ email: args.email }).returning();

  return user;
}
