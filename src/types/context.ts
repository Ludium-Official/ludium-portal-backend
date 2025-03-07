import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export interface Context {
  db: PostgresJsDatabase;
  server: FastifyInstance;
  request: FastifyRequest;
  reply: FastifyReply;
}
