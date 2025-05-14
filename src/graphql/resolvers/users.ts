import { filesTable, linksTable, usersTable, usersToLinksTable, walletTable } from '@/db/schemas';
import type { PaginationInput } from '@/graphql/types/common';
import type { UserInput, UserUpdateInput } from '@/graphql/types/users';
import type { Args, Context, Root, UploadFile } from '@/types';
import { and, asc, desc, eq, ilike } from 'drizzle-orm';

export async function getUsersResolver(
  _root: Root,
  args: { pagination?: typeof PaginationInput.$inferInput | null },
  ctx: Context,
) {
  const limit = args.pagination?.limit || 10;
  const offset = args.pagination?.offset || 0;
  const sort = args.pagination?.sort || 'desc';
  const filter = args.pagination?.filter || [];

  const filterPromises = filter.map(async (f) => {
    switch (f.field) {
      case 'firstName':
        return ilike(usersTable.firstName, `%${f.value}%`);
      case 'lastName':
        return ilike(usersTable.lastName, `%${f.value}%`);
      case 'organizationName':
        return ilike(usersTable.organizationName, `%${f.value}%`);
      case 'email':
        return ilike(usersTable.email, `%${f.value}%`);
    }
  });

  const conditions = await Promise.all(filterPromises);
  const where = and(...conditions);
  const orderBy = sort === 'asc' ? asc(usersTable.createdAt) : desc(usersTable.createdAt);
  const users = await ctx.db
    .select()
    .from(usersTable)
    .where(where)
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);

  return users;
}

export async function getUserByIdResolver(_root: Root, args: { id: string }, ctx: Context) {
  const [user] = await ctx.db.select().from(usersTable).where(eq(usersTable.id, args.id));
  return user;
}

export async function getUserResolver(_root: Root, args: { id: string }, ctx: Context) {
  if (!args.id) {
    return null;
  }

  const [user] = await ctx.db.select().from(usersTable).where(eq(usersTable.id, args.id));

  return { ...user, wallet: await getUserWalletResolver({}, { userId: user.id }, ctx) };
}

export async function getUserWalletResolver(_root: Root, args: { userId: string }, ctx: Context) {
  const [wallet] = await ctx.db
    .select()
    .from(walletTable)
    .where(eq(walletTable.userId, args.userId));
  return wallet;
}

export function createUserResolver(
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
        image: null,
      })
      .returning();

    if (userData.image) {
      const fileUrl = await ctx.server.fileManager.uploadFile({
        file: userData.image,
        userId: user.id,
        type: 'user',
      });
      await t.update(usersTable).set({ image: fileUrl }).where(eq(usersTable.id, user.id));
    }

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

export function updateUserResolver(
  _root: Root,
  args: { input: typeof UserUpdateInput.$inferInput },
  ctx: Context,
) {
  const { links, ...userData } = args.input;

  return ctx.db.transaction(async (t) => {
    if (userData.image) {
      const [avatar] = await t
        .select()
        .from(filesTable)
        .where(eq(filesTable.uploadedById, userData.id));
      if (avatar) {
        await ctx.server.fileManager.deleteFile(avatar.id);
      }
      const fileUrl = await ctx.server.fileManager.uploadFile({
        file: userData.image,
        userId: userData.id,
        type: 'user',
      });
      await t.update(usersTable).set({ image: fileUrl }).where(eq(usersTable.id, userData.id));
    }

    const [user] = await t
      .update(usersTable)
      .set({
        firstName: userData.firstName,
        lastName: userData.lastName,
        organizationName: userData.organizationName,
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

export function deleteUserResolver(_root: Root, args: { id: string }, ctx: Context) {
  return ctx.db.transaction(async (t) => {
    await t.delete(usersToLinksTable).where(eq(usersToLinksTable.userId, args.id));
    const [user] = await t.delete(usersTable).where(eq(usersTable.id, args.id)).returning();
    return user;
  });
}

export async function getProfileResolver(_root: Root, _args: Args, ctx: Context) {
  const user = ctx.server.auth.getUser(ctx.request);
  if (!user) {
    throw new Error('User not found');
  }
  const wallet = await getUserWalletResolver({}, { userId: user.id }, ctx);
  return { ...user, wallet };
}

export function updateProfileResolver(
  _root: Root,
  args: { input: typeof UserUpdateInput.$inferInput },
  ctx: Context,
) {
  const loggedinUser = ctx.server.auth.getUser(ctx.request);
  if (!loggedinUser) {
    throw new Error('User not found');
  }

  if (loggedinUser.id !== args.input.id && !loggedinUser.isAdmin) {
    throw new Error('Unauthorized');
  }

  const { links, ...userData } = args.input;

  return ctx.db.transaction(async (t) => {
    if (userData.image) {
      const [avatar] = await t
        .select()
        .from(filesTable)
        .where(eq(filesTable.uploadedById, loggedinUser.id));
      if (avatar) {
        await ctx.server.fileManager.deleteFile(avatar.id);
      }
      const fileUrl = await ctx.server.fileManager.uploadFile({
        file: userData.image,
        userId: loggedinUser.id,
        type: 'user',
      });
      await t.update(usersTable).set({ image: fileUrl }).where(eq(usersTable.id, loggedinUser.id));
    }

    const [user] = await t
      .update(usersTable)
      .set({
        firstName: userData.firstName,
        lastName: userData.lastName,
        organizationName: userData.organizationName,
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

export async function getUserAvatarResolver(_root: Root, args: { userId: string }, ctx: Context) {
  const [file] = await ctx.db
    .select()
    .from(filesTable)
    .where(eq(filesTable.uploadedById, args.userId))
    .orderBy(desc(filesTable.createdAt))
    .limit(1);

  if (!file) {
    return null;
  }

  return {
    filename: file.originalName,
    mimetype: file.mimeType,
    createReadStream: () => {
      const bucketFile = ctx.server.fileManager.bucket.file(file.path);
      return bucketFile.createReadStream();
    },
  } as unknown as UploadFile;
}
