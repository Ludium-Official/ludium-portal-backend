import {
  type Notification as DBNotiication,
  notificationActions,
  notificationTypes,
} from '@/db/schemas';
import builder from '@/graphql/builder';
import {
  getNotificationsCountResolver,
  getNotificationsResolver,
  markNotificationAsReadResolver,
} from '@/graphql/resolvers/notifications';

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */
export const NotificationTypeEnum = builder.enumType('NotificationType', {
  values: notificationTypes,
});

export const NotificationActionEnum = builder.enumType('NotificationAction', {
  values: notificationActions,
});

export const NotificationType = builder.objectRef<DBNotiication>('Notification').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    title: t.exposeString('title'),
    content: t.exposeString('content'),
    type: t.field({
      type: NotificationTypeEnum,
      resolve: (notification) => notification.type,
    }),
    action: t.field({
      type: NotificationActionEnum,
      resolve: (notification) => notification.action,
    }),
    entityId: t.exposeID('entityId'),
    metadata: t.field({
      type: 'JSON',
      resolve: (notification) => notification.metadata as JSON,
    }),
    readAt: t.field({
      type: 'Date',
      resolve: (notification) => (notification.readAt ? new Date(notification.readAt) : null),
    }),
  }),
});

/* -------------------------------------------------------------------------- */
/*                            Queries and mutations                           */
/* -------------------------------------------------------------------------- */
builder.queryFields((t) => ({
  notifications: t.field({
    type: [NotificationType],
    authScopes: { user: true },
    smartSubscription: true,
    subscribe: (subscriptions) => subscriptions.register('notifications'),
    resolve: getNotificationsResolver,
  }),
  countNotifications: t.field({
    type: 'Int',
    authScopes: { user: true },
    smartSubscription: true,
    subscribe: (subscriptions) => subscriptions.register('notificationsCount'),
    resolve: getNotificationsCountResolver,
  }),
}));

builder.mutationFields((t) => ({
  markNotificationAsRead: t.field({
    type: NotificationType,
    authScopes: { user: true },
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: markNotificationAsReadResolver,
  }),
}));
