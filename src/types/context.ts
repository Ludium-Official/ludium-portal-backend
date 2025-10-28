import type { User } from '@/db/schemas/users';
import type { UserV2 } from '@/db/schemas/v2/users';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
export interface Context {
  db: PostgresJsDatabase;
  server: FastifyInstance;
  request: FastifyRequest;
  reply: FastifyReply;
  user?: User;
  userV2?: UserV2;
}
