import { notificationsTable } from '@/db/schemas';
import type { DecodedToken } from '@/plugins/auth';
import type { Args, Context, Root } from '@/types';
import { and, count, desc, eq, isNull } from 'drizzle-orm';

export async function getNotificationsResolver(_root: Root, _args: Args, ctx: Context) {
  const decoded = await ctx.request.jwtVerify<DecodedToken>();
  const user = await ctx.server.auth.getUserForSubscription(decoded);
  if (!user) {
    throw new Error('User not found');
  }

  return ctx.db
    .select()
    .from(notificationsTable)
    .where(and(eq(notificationsTable.recipientId, user.id), isNull(notificationsTable.readAt)))
    .orderBy(desc(notificationsTable.createdAt));
}

export async function getNotificationsCountResolver(_root: Root, _args: Args, ctx: Context) {
  const decoded = await ctx.request.jwtVerify<DecodedToken>();
  const user = await ctx.server.auth.getUserForSubscription(decoded);
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

  await ctx.db
    .update(notificationsTable)
    .set({ readAt: new Date() })
    .where(eq(notificationsTable.id, args.id))
    .returning();

  await ctx.server.pubsub.publish('notifications');
  await ctx.server.pubsub.publish('notificationsCount');

  return true;
}

export async function markAllNotificationsAsReadResolver(_root: Root, _args: Args, ctx: Context) {
  const user = ctx.server.auth.getUser(ctx.request);
  if (!user) {
    throw new Error('User not found');
  }

  await ctx.db
    .update(notificationsTable)
    .set({ readAt: new Date() })
    .where(and(eq(notificationsTable.recipientId, user.id), isNull(notificationsTable.readAt)));

  await ctx.server.pubsub.publish('notifications');
  await ctx.server.pubsub.publish('notificationsCount');

  return true;
}
