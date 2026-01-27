import {
  type NotificationV2,
  notificationV2Actions,
  notificationV2Types,
} from '@/db/schemas/v2/notifications';
import builder from '@/graphql/builder';

export const NotificationV2TypeEnum = builder.enumType('NotificationV2Type', {
  values: notificationV2Types,
});

export const NotificationV2ActionEnum = builder.enumType('NotificationV2Action', {
  values: notificationV2Actions,
});

export const NotificationV2Ref = builder.objectRef<NotificationV2>('NotificationV2').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    type: t.field({
      type: NotificationV2TypeEnum,
      resolve: (notification) => notification.type,
    }),
    action: t.field({
      type: NotificationV2ActionEnum,
      resolve: (notification) => notification.action,
    }),
    recipientId: t.exposeInt('recipientId'),
    entityId: t.exposeString('entityId'),
    title: t.exposeString('title', { nullable: true }),
    content: t.exposeString('content', { nullable: true }),
    metadata: t.field({
      type: 'JSON',
      nullable: true,
      resolve: (notification) => notification.metadata as JSON,
    }),
    readAt: t.field({
      type: 'Date',
      nullable: true,
      resolve: (notification) => notification.readAt,
    }),
    createdAt: t.field({
      type: 'Date',
      resolve: (notification) => notification.createdAt,
    }),
  }),
});

export const NotificationV2ResultRef = builder
  .objectRef<{
    data: NotificationV2[];
    total: number;
  }>('NotificationV2Result')
  .implement({
    fields: (t) => ({
      data: t.field({
        type: [NotificationV2Ref],
        resolve: (result) => result.data,
      }),
      total: t.exposeInt('total'),
    }),
  });
