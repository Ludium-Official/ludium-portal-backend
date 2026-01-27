import type { Context, Root } from '@/types';
import { requireUserV2 } from '@/utils';
import type { GetNotificationsV2Input } from '../inputs/notifications';
import { NotificationV2Service } from '../services/notification.service';

export async function getNotificationsV2Resolver(
  _root: Root,
  args: { input?: typeof GetNotificationsV2Input.$inferInput | null },
  ctx: Context,
) {
  const user = requireUserV2(ctx);
  const service = new NotificationV2Service(ctx.db);

  const input = args.input ?? {};
  const limit = input.limit ?? 10;
  const offset = input.offset ?? 0;
  const unreadOnly = input.unreadOnly ?? false;

  return await service.getNotifications({
    userId: user.id,
    limit,
    offset,
    unreadOnly,
  });
}

export async function getUnreadCountV2Resolver(_root: Root, _args: unknown, ctx: Context) {
  const user = requireUserV2(ctx);
  const service = new NotificationV2Service(ctx.db);

  return await service.getUnreadCount(user.id);
}

export async function createChatNotificationV2Resolver(
  _root: Root,
  args: {
    recipientId: number;
    entityId: string;
    metadata?: JSON | null;
  },
  ctx: Context,
) {
  await ctx.server.pubsub.publish('notificationsV2', ctx.db, {
    type: 'system',
    action: 'created',
    recipientId: args.recipientId,
    entityId: args.entityId,
    title: 'Sponsor Opened Chat',
    content: 'The sponsor has opened the chat room.',
    metadata: args.metadata ?? {},
  });
  await ctx.server.pubsub.publish('notificationsV2Count');

  return true;
}

export async function markNotificationAsReadV2Resolver(
  _root: Root,
  args: { notificationId: string },
  ctx: Context,
) {
  const user = requireUserV2(ctx);
  const service = new NotificationV2Service(ctx.db);

  const success = await service.markAsRead(args.notificationId, user.id);

  if (success) {
    // Trigger subscription updates
    await ctx.server.pubsub.publish('notificationsV2');
    await ctx.server.pubsub.publish('notificationsV2Count');
  }

  return success;
}

export async function markAllNotificationsAsReadV2Resolver(
  _root: Root,
  _args: unknown,
  ctx: Context,
) {
  const user = requireUserV2(ctx);
  const service = new NotificationV2Service(ctx.db);

  const success = await service.markAllAsRead(user.id);

  if (success) {
    // Trigger subscription updates
    await ctx.server.pubsub.publish('notificationsV2');
    await ctx.server.pubsub.publish('notificationsV2Count');
  }

  return success;
}

export async function deleteNotificationV2Resolver(
  _root: Root,
  args: { notificationId: string },
  ctx: Context,
) {
  const user = requireUserV2(ctx);
  const service = new NotificationV2Service(ctx.db);

  const success = await service.delete(args.notificationId, user.id);

  if (success) {
    // Trigger subscription updates
    await ctx.server.pubsub.publish('notificationsV2');
    await ctx.server.pubsub.publish('notificationsV2Count');
  }

  return success;
}
