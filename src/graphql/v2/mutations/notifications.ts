import builder from '@/graphql/builder';
import {
  createChatNotificationV2Resolver,
  deleteNotificationV2Resolver,
  markAllNotificationsAsReadV2Resolver,
  markNotificationAsReadV2Resolver,
} from '../resolvers/notifications';

builder.mutationFields((t) => ({
  createChatNotificationV2: t.field({
    type: 'Boolean',
    authScopes: { userV2: true },
    args: {
      recipientId: t.arg.int({ required: true }),
      entityId: t.arg.string({ required: true }),
      metadata: t.arg({
        type: 'JSON',
        required: false,
      }),
    },
    resolve: createChatNotificationV2Resolver,
  }),
  markNotificationAsReadV2: t.boolean({
    authScopes: { userV2: true },
    args: {
      notificationId: t.arg.id({ required: true }),
    },
    resolve: markNotificationAsReadV2Resolver,
  }),
  markAllNotificationsAsReadV2: t.boolean({
    authScopes: { userV2: true },
    resolve: markAllNotificationsAsReadV2Resolver,
  }),
  deleteNotificationV2: t.boolean({
    authScopes: { userV2: true },
    args: {
      notificationId: t.arg.id({ required: true }),
    },
    resolve: deleteNotificationV2Resolver,
  }),
}));
