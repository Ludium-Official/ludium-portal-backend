import registerPlugins from '@/plugins';
import type { Argon2 } from '@/plugins/argon2';
import type { AuthHandler, RequestAuth } from '@/plugins/auth';
import type { Educhain } from '@/plugins/educhain';
import loadEnv from '@/plugins/env';
import type { FileManager } from '@/plugins/file-manager';
import registerRoutes from '@/routes';
import type { EnvConfig } from '@/types';
import type { JWT } from '@fastify/jwt';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import Fastify, { type preHandlerHookHandler } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    config: EnvConfig;
    authenticate: preHandlerHookHandler;
    db: PostgresJsDatabase;
    fileManager: FileManager;
    auth: AuthHandler;
    argon2: Argon2;
    educhain: Educhain;
  }
  interface FastifyRequest {
    jwt: JWT;
    auth: RequestAuth | null;
    mercuriusUploadMultipart?: true;
  }
}

async function buildServer() {
  const server = Fastify({
    logger: {
      redact: ['req.headers.authorization'],
      serializers: {
        req(req) {
          return {
            method: req.method,
            url: req.url,
            headers: req.headers,
            hostname: req.hostname,
            remoteAddress: req.ip,
            remotePort: req.socket.remotePort,
          };
        },
      },
    },
  });

  loadEnv(server);
  await server.after();

  server.addHook('preHandler', (request, _reply, next) => {
    request.jwt = server.jwt;
    next();
  });

  registerPlugins(server);
  registerRoutes(server);

  server.log.info(`Server is running in ${server.config.NODE_ENV.toUpperCase()} mode`);

  return server;
}

export default buildServer;
