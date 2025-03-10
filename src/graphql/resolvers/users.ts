import { rolesTable, usersTable } from '@/db/schemas/users';
import type { UserInput, UserUpdateInput } from '@/graphql/types/users';
import type { Args, Context, Root } from '@/types';
import { eq } from 'drizzle-orm';

export async function getUsersResolver(_root: Root, _args: Args, ctx: Context) {
  return ctx.db.select().from(usersTable);
}

export async function getUserResolver(_root: Root, args: { id: string }, ctx: Context) {
  const [user] = await ctx.db.select().from(usersTable).where(eq(usersTable.id, args.id));

  return user;
}

export async function getRolesResolver(_root: Root, _args: Args, ctx: Context) {
  return ctx.db.select().from(rolesTable);
}

export async function createUserResolver(
  _root: Root,
  args: { input: typeof UserInput.$inferInput },
  ctx: Context,
) {
  const { links, ...userData } = args.input;

  const [user] = await ctx.db
    .insert(usersTable)
    .values({
      ...userData,
      links: links
        ? links.map((link) => ({
            url: link.url || '',
            title: link.title || '',
          }))
        : undefined,
    })
    .returning();

  return user;
}

export async function updateUserResolver(
  _root: Root,
  args: { input: typeof UserUpdateInput.$inferInput },
  ctx: Context,
) {
  const { links, ...userData } = args.input;
  const [user] = await ctx.db
    .update(usersTable)
    .set({
      firstName: userData.firstName,
      lastName: userData.lastName,
      organizationName: userData.organizationName,
      image: userData.image,
      about: userData.about,
      links: links as { url: string; title: string }[],
    })
    .where(eq(usersTable.id, args.input.id))
    .returning();

  return user;
}

export async function deleteUserResolver(_root: Root, args: { id: string }, ctx: Context) {
  const [user] = await ctx.db.delete(usersTable).where(eq(usersTable.id, args.id)).returning();

  return user;
}
