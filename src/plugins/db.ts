import { drizzle } from 'drizzle-orm/postgres-js';
import type { FastifyError, FastifyInstance, FastifyPluginOptions } from 'fastify';
import fp from 'fastify-plugin';
import postgres from 'postgres';

const dbPlugin = (
  server: FastifyInstance,
  _: FastifyPluginOptions,
  done: (error?: FastifyError) => void,
): void => {
  const client = postgres(server.config.DATABASE_URL, {
    // Connection timeout: 10 seconds
    connect_timeout: 10,
    // Idle timeout: 10 minutes
    idle_timeout: 600,
    // Max connections in pool
    max: 20,
    // Connection retry settings
    max_lifetime: 60 * 30, // 30 minutes
    // Enable connection logging for debugging
    debug: process.env.NODE_ENV === 'development',
  });
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
