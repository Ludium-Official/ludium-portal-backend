import { drizzle } from 'drizzle-orm/postgres-js';
import type { FastifyError, FastifyInstance, FastifyPluginOptions } from 'fastify';
import fp from 'fastify-plugin';
import postgres from 'postgres';

const dbPlugin = (
  server: FastifyInstance,
  _: FastifyPluginOptions,
  done: (error?: FastifyError) => void,
): void => {
  const client = postgres(server.config.DATABASE_URL);
  const db = drizzle(client);
  server.decorate('db', db);

  server.addHook('onClose', async () => {
    try {
      await client.end();
    } catch (error) {
      server.log.error(error);
    }
  });

  done();
};

export default fp(dbPlugin);
