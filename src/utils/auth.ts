import type { User } from '@/db/schemas';
import type { DecodedToken } from '@/plugins/auth';
import type { Context, EnvConfig } from '@/types';
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

export function requireUser(ctx: Context): User {
  const user = ctx.server.auth.getUser(ctx.request);
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

export async function requireUserForSubscription(ctx: Context) {
  const decoded = await ctx.request.jwtVerify<DecodedToken>();
  const user = await ctx.server.auth.getUserForSubscription(decoded);
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}
