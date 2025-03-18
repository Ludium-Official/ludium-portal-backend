import type { EnvConfig } from '@/types';
import type { FastifyReply, FastifyRequest } from 'fastify';

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const env = request.getEnvs() as EnvConfig;

  if (env.NODE_ENV !== 'production') {
    return;
  }

  const urls = new Set(['http://localhost:5173', 'http://localhost:3000']);

  if (request.headers.origin && urls.has(request.headers.origin)) {
    return;
  }

  return reply.code(403).send();
}
