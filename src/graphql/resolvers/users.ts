import {
  linksTable,
  rolesTable,
  usersTable,
  usersToLinksTable,
  usersToRolesTable,
} from '@/db/schemas';
import type { UserInput, UserUpdateInput } from '@/graphql/types/users';
import type { Args, Context, Root } from '@/types';
import { eq, inArray } from 'drizzle-orm';

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

export async function getUsersByRoleResolver(_root: Root, args: { role: string }, ctx: Context) {
  const [role] = await ctx.db.select().from(rolesTable).where(eq(rolesTable.name, args.role));

  if (!role) return [];

  const userRoles = await ctx.db
    .select({ userId: usersToRolesTable.userId })
    .from(usersToRolesTable)
    .where(eq(usersToRolesTable.roleId, role.id));

  if (!userRoles.length) return [];

  return ctx.db
    .select()
    .from(usersTable)
    .where(
      inArray(
        usersTable.id,
        userRoles.map((ur) => ur.userId),
      ),
    );
}

export async function createUserResolver(
  _root: Root,
  args: { input: typeof UserInput.$inferInput },
  ctx: Context,
) {
  const { links, ...userData } = args.input;

  return ctx.db.transaction(async (t) => {
    const [user] = await t
      .insert(usersTable)
      .values({
        ...userData,
      })
      .returning();

    if (links) {
      // insert links to links table and map to user
      const filteredLinks = links.filter((link) => link.url);
      const newLinks = await t
        .insert(linksTable)
        .values(
          filteredLinks.map((link) => ({
            url: link.url as string,
            title: link.title as string,
          })),
        )
        .returning();

      await t.insert(usersToLinksTable).values(
        newLinks.map((link) => ({
          userId: user.id,
          linkId: link.id,
        })),
      );
    }

    return user;
  });
}

export async function updateUserResolver(
  _root: Root,
  args: { input: typeof UserUpdateInput.$inferInput },
  ctx: Context,
) {
  const { links, ...userData } = args.input;

  return ctx.db.transaction(async (t) => {
    const [user] = await t
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

    if (links) {
      // delete existing links
      await t.delete(usersToLinksTable).where(eq(usersToLinksTable.userId, user.id));

      // insert links to links table and map to user
      const filteredLinks = links.filter((link) => link.url);
      const newLinks = await t
        .insert(linksTable)
        .values(
          filteredLinks.map((link) => ({
            url: link.url as string,
            title: link.title as string,
          })),
        )
        .returning();

      await t.insert(usersToLinksTable).values(
        newLinks.map((link) => ({
          userId: user.id,
          linkId: link.id,
        })),
      );
    }

    return user;
  });
}

export async function deleteUserResolver(_root: Root, args: { id: string }, ctx: Context) {
  return ctx.db.transaction(async (t) => {
    await t.delete(usersToLinksTable).where(eq(usersToLinksTable.userId, args.id));
    await t.delete(usersToRolesTable).where(eq(usersToRolesTable.userId, args.id));
    const [user] = await t.delete(usersTable).where(eq(usersTable.id, args.id)).returning();
    return user;
  });
}

export async function getProfileResolver(_root: Root, _args: Args, ctx: Context) {
  const user = ctx.server.auth.getUser(ctx.request);
  if (!user) {
    throw new Error('User not found');
  }
  return user;
}

export async function updateProfileResolver(
  _root: Root,
  args: { input: typeof UserUpdateInput.$inferInput },
  ctx: Context,
) {
  const loggedinUser = ctx.server.auth.getUser(ctx.request);
  if (!loggedinUser) {
    throw new Error('User not found');
  }

  const { links, ...userData } = args.input;

  return ctx.db.transaction(async (t) => {
    const [user] = await t
      .update(usersTable)
      .set({
        firstName: userData.firstName,
        lastName: userData.lastName,
        organizationName: userData.organizationName,
        image: userData.image,
        about: userData.about,
        links: links as { url: string; title: string }[],
      })
      .where(eq(usersTable.id, loggedinUser.id))
      .returning();

    if (links) {
      // delete existing links
      await t.delete(usersToLinksTable).where(eq(usersToLinksTable.userId, loggedinUser.id));

      // insert links to links table and map to user
      const filteredLinks = links.filter((link) => link.url);
      const newLinks = await t
        .insert(linksTable)
        .values(
          filteredLinks.map((link) => ({
            url: link.url as string,
            title: link.title as string,
          })),
        )
        .returning();

      await t.insert(usersToLinksTable).values(
        newLinks.map((link) => ({
          userId: loggedinUser.id,
          linkId: link.id,
        })),
      );
    }

    return user;
  });
}
