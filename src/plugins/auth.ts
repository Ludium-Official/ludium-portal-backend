import { type User as DbUser, programUserRolesTable, usersTable } from '@/db/schemas';
import type { Context } from '@/types';
import { and, eq } from 'drizzle-orm';
import type { FastifyError, FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

export interface RequestAuth {
  identity?: { id?: string };
  user?: DbUser | null;
}

export interface DecodedToken {
  payload: {
    id: string;
  };
  iat: number;
}

type RoleType = 'sponsor' | 'validator' | 'builder';

export class AuthHandler {
  constructor(private server: FastifyInstance) {}

  isUser(request: FastifyRequest) {
    if (!request.auth?.user) {
      return false;
    }
    return true;
  }

  isAdmin(request: FastifyRequest) {
    return Boolean(request.auth?.user?.isAdmin);
  }

  getUser(request: FastifyRequest) {
    if (!request.auth?.user) {
      return null;
    }
    return request.auth.user;
  }

  async isUserInProgramRole(
    request: FastifyRequest,
    programId: string,
    roleType: RoleType,
  ): Promise<boolean> {
    const user = this.getUser(request);
    if (!user) return false;

    const [programRole] = await this.server.db
      .select()
      .from(programUserRolesTable)
      .where(
        and(
          eq(programUserRolesTable.programId, programId),
          eq(programUserRolesTable.userId, user.id),
          eq(programUserRolesTable.roleType, roleType),
        ),
      );

    return Boolean(programRole);
  }

  async isProgramSponsor(request: FastifyRequest, programId: string): Promise<boolean> {
    return this.isUserInProgramRole(request, programId, 'sponsor');
  }

  async isProgramValidator(request: FastifyRequest, programId: string): Promise<boolean> {
    return this.isUserInProgramRole(request, programId, 'validator');
  }

  async isProgramBuilder(request: FastifyRequest, programId: string): Promise<boolean> {
    return this.isUserInProgramRole(request, programId, 'builder');
  }

  async getProgramRoles(request: FastifyRequest, programId: string): Promise<string[]> {
    const user = this.getUser(request);
    if (!user) return [];

    const programRoles = await this.server.db
      .select()
      .from(programUserRolesTable)
      .where(
        and(
          eq(programUserRolesTable.programId, programId),
          eq(programUserRolesTable.userId, user.id),
        ),
      );

    return programRoles.map((role) => role.roleType);
  }

  async getUserForSubscription(decodedToken: DecodedToken) {
    const userId = decodedToken.payload.id;
    const [user] = await this.server.db
      .selectDistinct()
      .from(usersTable)
      .where(eq(usersTable.id, userId));
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }
}

async function requestHandler(decodedToken: DecodedToken, db: Context['db']) {
  if (!decodedToken.payload.id) {
    return null;
  }

  // Convert number ID to string if needed
  const userId = String(decodedToken.payload.id);

  const [user] = await db.selectDistinct().from(usersTable).where(eq(usersTable.id, userId));

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
