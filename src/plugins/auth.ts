import {
  type User as DbUser,
  type UserV2 as DbUserV2,
  applicationsTable,
  applicationsV2Table,
  milestonesTable,
  programUserRolesTable,
  programsV2Table,
  usersTable,
  usersV2Table,
} from '@/db/schemas';
import type { Context } from '@/types';
import { and, eq } from 'drizzle-orm';
import type { FastifyError, FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

export interface RequestAuth {
  identity?: { id?: string };
  user?: DbUser | null;
  userV2?: DbUserV2 | null;
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
    if (!request.auth?.user && !request.auth?.userV2) {
      return false;
    }
    return true;
  }

  isAdmin(request: FastifyRequest) {
    return Boolean(request.auth?.user?.role?.endsWith('admin'));
  }

  isSuperAdmin(request: FastifyRequest) {
    return Boolean(request.auth?.user?.role === 'superadmin');
  }

  isRelayer(request: FastifyRequest) {
    // Check if userV2 exists and has role 'relayer'
    // Note: role enum may need to be extended to include 'relayer'
    return Boolean(request.auth?.userV2?.role === 'relayer');
  }

  getUser(request: FastifyRequest) {
    if (!request.auth?.user) {
      return null;
    }
    return request.auth.user;
  }

  getUserV2(request: FastifyRequest) {
    if (!request.auth?.userV2) {
      return null;
    }
    return request.auth.userV2;
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

  async isProgramBuilder(request: FastifyRequest, applicationId: string): Promise<boolean> {
    const [application] = await this.server.db
      .select()
      .from(applicationsTable)
      .where(eq(applicationsTable.id, applicationId));
    if (!application) return false;
    return this.isUserInProgramRole(request, application.programId, 'builder');
  }

  async isMilestoneBuilder(request: FastifyRequest, milestoneId: string): Promise<boolean> {
    const [milestone] = await this.server.db
      .select()
      .from(milestonesTable)
      .where(eq(milestonesTable.id, milestoneId));
    if (!milestone) return false;
    return this.isProgramBuilder(request, milestone.applicationId);
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

  async isProgramCreatorV2(request: FastifyRequest, programId: string): Promise<boolean> {
    const user = this.getUserV2(request);
    if (!user) return false;

    const numericProgramId = Number.parseInt(programId, 10);
    if (Number.isNaN(numericProgramId)) {
      return false;
    }

    const [program] = await this.server.db
      .select()
      .from(programsV2Table)
      .where(eq(programsV2Table.id, numericProgramId));

    if (!program) {
      return false;
    }

    return program.sponsorId === user.id;
  }

  async isApplicationProgramSponsor(
    request: FastifyRequest,
    applicationId: string,
  ): Promise<boolean> {
    const user = this.getUserV2(request);
    if (!user) return false;

    const numericApplicationId = Number.parseInt(applicationId, 10);
    if (Number.isNaN(numericApplicationId)) {
      return false;
    }

    const [application] = await this.server.db
      .select()
      .from(applicationsV2Table)
      .where(eq(applicationsV2Table.id, numericApplicationId));

    if (!application) {
      return false;
    }

    const [program] = await this.server.db
      .select()
      .from(programsV2Table)
      .where(eq(programsV2Table.id, application.programId));

    if (!program) {
      return false;
    }

    return program.sponsorId === user.id;
  }

  async getUserForSubscription(decodedToken: DecodedToken) {
    const userId = decodedToken.payload.id;
    const [user] = await this.server.db
      .selectDistinct()
      .from(usersTable)
      .where(eq(usersTable.id, userId));
    if (!user) {
      throw new Error('Websocket User not found');
    }
    return user;
  }
}

async function requestHandler(decodedToken: DecodedToken, db: Context['db']) {
  const userId = String(decodedToken.payload.id);
  const numericId = Number(userId);

  const auth: RequestAuth = {
    identity: {
      id: userId,
    },
    user: null, // 기본값 초기화
    userV2: null, // 기본값 초기화
  };

  // 숫자 ID인지 먼저 체크 (V2 User)
  if (Number.isInteger(numericId) && numericId > 0) {
    const [userV2] = await db
      .selectDistinct()
      .from(usersV2Table)
      .where(eq(usersV2Table.id, numericId));
    if (userV2) {
      auth.userV2 = userV2;
    }
  } else {
    // 숫자가 아니면 UUID로 간주 (V1 User)
    const uuidRegex =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (uuidRegex.test(userId)) {
      const [user] = await db.selectDistinct().from(usersTable).where(eq(usersTable.id, userId));
      if (user) {
        auth.user = user;
        console.log('👉 auth (v1 user found)', auth);
      }
    }
  }

  if (!auth.user && !auth.userV2) {
    console.log('👉 auth (user not found in v1 or v2)');
  }

  return auth;
}

const requestDevHandler = (): RequestAuth => {
  return {
    userV2: {
      id: 999,
      skills: null,
      role: 'user',
      loginType: 'wallet',
      email: 'developer@ludium.com',
      walletAddress: '0xdev0000000000000000000000000000000000000',
      firstName: 'Developer',
      lastName: 'User',
      organizationName: 'Ludium',
      bio: 'I am a developer user',
      links: ['https://github.com/developer', 'https://twitter.com/developer'],
      createdAt: new Date(),
      updatedAt: new Date(),
      profileImage: '',
    },
  };
};

const authPlugin = (
  server: FastifyInstance,
  _: FastifyPluginOptions,
  done: (error?: FastifyError) => void,
): void => {
  const authHandler = new AuthHandler(server);
  server.decorate('auth', authHandler);
  server.addHook('onRequest', async (request) => {
    // Skip auth for GraphiQL GET requests (UI page) - only in non-production
    if (
      request.method === 'GET' &&
      request.url === '/graphiql' &&
      process.env.NODE_ENV !== 'production'
    ) {
      return;
    }

    // Block GraphiQL access in production
    if (
      request.method === 'GET' &&
      request.url === '/graphiql' &&
      process.env.NODE_ENV === 'production'
    ) {
      request.log.warn('[AuthPlugin] GraphiQL access blocked in production');
      // Let the request continue - Mercurius will handle 404 since graphiql is disabled
      return;
    }

    if (process.env.NODE_ENV === 'local') {
      try {
        const decodedToken = await request.jwtVerify<DecodedToken>();
        server.log.info(`[AuthPlugin] Decoded token: ${JSON.stringify(decodedToken)}`);
        const auth = await requestHandler(decodedToken, server.db);
        server.log.info(`[AuthPlugin] auth: ${JSON.stringify(auth)}`);
        if (auth?.userV2) {
          request.auth = auth;
          server.log.info('[AuthPlugin] userV2 found, setting request.auth');
          return;
        }
      } catch {
        // JWT token not provided or invalid - use dev handler
        server.log.debug('[AuthPlugin] No valid token, using dev handler');
      }
      request.auth = requestDevHandler();
      server.log.info('[AuthPlugin] get local auth for development');
      return;
    }

    try {
      const decodedToken = await request.jwtVerify<DecodedToken>();
      server.log.debug(`[AuthPlugin] Decoded token: ${JSON.stringify(decodedToken)}`);
      const auth = await requestHandler(decodedToken, server.db);
      server.log.debug(`[AuthPlugin] auth: ${JSON.stringify(auth)}`);
      request.auth = auth;
    } catch {
      // JWT token not provided or invalid - continue without auth
      server.log.debug('[AuthPlugin] No token provided, continuing without auth');
    }
  });
  done();
};

export default fp(authPlugin);
