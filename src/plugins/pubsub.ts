import { type NotificationInsert, notificationsTable } from '@/db/schemas';
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

  async publish(triggerName: string, db?: DB, data?: NotificationInsert) {
    if (data && db) {
      await db.insert(notificationsTable).values(data);
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
