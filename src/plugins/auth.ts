import { type User as DbUser, rolesTable, usersTable, usersToRolesTable } from '@/db/schemas/users';
import type { Context } from '@/types';
import { eq } from 'drizzle-orm';
import type { FastifyError, FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

// Extended User type with roles
interface User extends DbUser {
  roles?: string[];
}

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
    return Boolean(this.isUser(request) && request.auth?.user?.roles?.includes('admin'));
  }

  isSponsor(request: FastifyRequest) {
    return Boolean(this.isUser(request) && request.auth?.user?.roles?.includes('sponsor'));
  }

  isValidator(request: FastifyRequest) {
    return Boolean(this.isUser(request) && request.auth?.user?.roles?.includes('validator'));
  }

  isBuilder(request: FastifyRequest) {
    return Boolean(this.isUser(request) && request.auth?.user?.roles?.includes('builder'));
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

  // Convert number ID to string if needed
  const userId = String(decodedToken.payload.id);

  const [user] = await db.selectDistinct().from(usersTable).where(eq(usersTable.id, userId));

  if (user) {
    // Fetch user roles
    const userRoles = await db
      .select({
        name: rolesTable.name,
      })
      .from(usersToRolesTable)
      .innerJoin(rolesTable, eq(usersToRolesTable.roleId, rolesTable.id))
      .where(eq(usersToRolesTable.userId, user.id));

    // Add roles array to user object
    (user as User).roles = userRoles.map((r) => r.name);
  }

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
