import {
  type NotificationInsert,
  type NotificationV2Insert,
  notificationsTable,
  notificationsV2Table,
} from '@/db/schemas';
import type { Context, DB } from '@/types';
import type { FastifyError, FastifyInstance, FastifyPluginOptions } from 'fastify';
import fp from 'fastify-plugin';
import { PubSub } from 'graphql-subscriptions';

export class PubSubWrapper {
  private pubsub: PubSub;
  constructor(private _: FastifyInstance) {
    this.pubsub = new PubSub();
  }

  asyncIterableIterator(name: string) {
    return this.pubsub.asyncIterableIterator(name);
  }

  // V1 notifications
  async publish(triggerName: string, db?: DB, data?: NotificationInsert): Promise<void>;
  // V2 notifications
  async publish(triggerName: string, db?: DB, data?: NotificationV2Insert): Promise<void>;
  // Implementation
  async publish(triggerName: string, db?: DB, data?: NotificationInsert | NotificationV2Insert) {
    if (data && db) {
      // V2 notifications (check for notificationsV2 trigger)
      if (triggerName.includes('V2') || triggerName.includes('v2')) {
        await db.insert(notificationsV2Table).values(data as NotificationV2Insert);
      } else {
        // V1 notifications
        await db.insert(notificationsTable).values(data as NotificationInsert);
      }
    }
    return this.pubsub.publish(triggerName, data ?? {});
  }

  async subscribe<T>(ctx: Context, prefix: string) {
    const user = ctx.server.auth.getUser(ctx.request);
    console.log(`SUBSCRIBED: ${prefix}_${user?.id}`);
    return this.pubsub.asyncIterableIterator<T>(`${prefix}_${user?.id}`);
  }
}

const pubsubPlugin = (
  server: FastifyInstance,
  _: FastifyPluginOptions,
  done: (error?: FastifyError) => void,
): void => {
  const pubsubWrapper = new PubSubWrapper(server);
  server.decorate('pubsub', pubsubWrapper);

  done();
};

export default fp(pubsubPlugin);
