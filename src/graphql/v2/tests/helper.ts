import { schema } from '@/graphql/types';
import dbPlugin from '@/plugins/db';
import loadEnv from '@/plugins/env';
import Fastify, { type FastifyInstance } from 'fastify';
import mercurius from 'mercurius';
import 'dotenv/config';

export async function createTestServer(): Promise<FastifyInstance> {
  const server = Fastify();

  // Manually load env and set up config for the test server
  loadEnv(server);
  await server.after();

  // Override with test DB URL
  const { DB_HOST, DB_PORT, DB_NAME, DB_USERNAME, DB_PASSWORD } = process.env;
  if (!DB_HOST || !DB_PORT || !DB_NAME || !DB_USERNAME || !DB_PASSWORD) {
    throw new Error('Test database environment variables are not set!');
  }
  server.config.DATABASE_URL = `postgresql://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;

  // Register the db plugin
  await server.register(dbPlugin);

  // Now register mercurius
  await server.register(mercurius, {
    schema,
    context: async (request, reply) => {
      return {
        request,
        reply,
        server,
        db: server.db,
        user: null, // Mock user if necessary for auth tests
      };
    },
  });

  await server.ready();
  return server;
}
