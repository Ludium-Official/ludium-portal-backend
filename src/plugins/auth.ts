import { type User, usersTable } from '@/db/schemas/users';
import type { Context } from '@/types';
import { eq } from 'drizzle-orm';
import type { FastifyError, FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

export interface RequestAuth {
  identity?: { id?: number };
  user?: User | null;
}

interface DecodedToken {
  payload: {
    id: number;
  };
  iat: number;
}

export class AuthHandler {
  constructor(private _: FastifyInstance) {}

  isUser(request: FastifyRequest) {
    if (!request.auth?.user) {
      return false;
    }
    return true;
  }

  isAdmin(request: FastifyRequest) {
    return this.isUser(request) && request.auth?.user?.role === 'admin';
  }

  getUser(request: FastifyRequest) {
    if (!request.auth?.user) {
      return null;
    }
    return request.auth.user;
  }
}

async function requestHandler(decodedToken: DecodedToken, db: Context['db']) {
  if (!decodedToken.payload.id) {
    return null;
  }
  const [user] = await db
    .selectDistinct()
    .from(usersTable)
    .where(eq(usersTable.id, decodedToken.payload.id));

  const auth: RequestAuth = {
    identity: {
      id: decodedToken.payload.id,
    },
    user: user,
  };

  return auth;
}

const authPlugin = (
  server: FastifyInstance,
  _: FastifyPluginOptions,
  done: (error?: FastifyError) => void,
): void => {
  const authHandler = new AuthHandler(server);
  server.decorate('auth', authHandler);

  server.addHook('onRequest', async (request) => {
    try {
      const decodedToken = await request.jwtVerify<DecodedToken>();

      const auth = await requestHandler(decodedToken, server.db);
      request.auth = auth;
    } catch (error) {
      server.log.error('No token provided', error);
    }
  });

  done();
};

export default fp(authPlugin);
