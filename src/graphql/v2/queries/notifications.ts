import builder from '@/graphql/builder';
import { GetNotificationsV2Input } from '../inputs/notifications';
import { getNotificationsV2Resolver, getUnreadCountV2Resolver } from '../resolvers/notifications';
import { NotificationV2ResultRef } from '../types/notifications';

builder.queryFields((t) => ({
  notificationsV2: t.field({
    type: NotificationV2ResultRef,
    authScopes: { userV2: true },
    smartSubscription: true,
    subscribe: (subscriptions) => subscriptions.register('notificationsV2'),
    args: {
      input: t.arg({ type: GetNotificationsV2Input, required: false }),
    },
    resolve: getNotificationsV2Resolver,
  }),
  unreadNotificationsCountV2: t.int({
    authScopes: { userV2: true },
    smartSubscription: true,
    subscribe: (subscriptions) => subscriptions.register('notificationsV2Count'),
    resolve: getUnreadCountV2Resolver,
  }),
}));
