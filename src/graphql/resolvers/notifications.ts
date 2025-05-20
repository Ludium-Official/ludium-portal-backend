import { notificationsTable } from '@/db/schemas';
import type { Args, Context, Root } from '@/types';
import { and, count, eq, isNull } from 'drizzle-orm';

export async function getNotificationsResolver(_root: Root, _args: Args, ctx: Context) {
  const user = ctx.server.auth.getUser(ctx.request);
  if (!user) {
    throw new Error('User not found');
  }

  return ctx.db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.recipientId, user.id));
}

export async function getNotificationsCountResolver(_root: Root, _args: Args, ctx: Context) {
  const user = ctx.server.auth.getUser(ctx.request);
  if (!user) {
    throw new Error('User not found');
  }

  const [result] = await ctx.db
    .select({ count: count() })
    .from(notificationsTable)
    .where(and(eq(notificationsTable.recipientId, user.id), isNull(notificationsTable.readAt)));
  return result?.count ?? 0;
}

export async function markNotificationAsReadResolver(
  _root: Root,
  args: { id: string },
  ctx: Context,
) {
  const user = ctx.server.auth.getUser(ctx.request);
  if (!user) {
    throw new Error('User not found');
  }

  const [notification] = await ctx.db
    .update(notificationsTable)
    .set({ readAt: new Date() })
    .where(eq(notificationsTable.id, args.id))
    .returning();
  return notification;
}
