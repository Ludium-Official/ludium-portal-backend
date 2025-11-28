import registerPlugins from '@/plugins';
import type { Argon2 } from '@/plugins/argon2';
import type { AuthHandler, RequestAuth } from '@/plugins/auth';
import loadEnv from '@/plugins/env';
import type { FileManager } from '@/plugins/file-manager';
import type { PubSubWrapper } from '@/plugins/pubsub';
import registerRoutes from '@/routes';
import type { EnvConfig } from '@/types';
import type { JWT } from '@fastify/jwt';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import Fastify, { type preHandlerHookHandler } from 'fastify';
import 'dotenv/config';

declare module 'fastify' {
  interface FastifyInstance {
    config: EnvConfig;
    authenticate: preHandlerHookHandler;
    db: PostgresJsDatabase;
    fileManager: FileManager;
    auth: AuthHandler;
    argon2: Argon2;
    pubsub: PubSubWrapper;
  }
  interface FastifyRequest {
    jwt: JWT;
    auth: RequestAuth | null;
    mercuriusUploadMultipart?: true;
  }
}

async function buildServer() {
  // 서버 생성 시 로거 레벨 설정 (이 시점에는 process.env를 직접 사용)
  const logLevel = process.env.LOG_LEVEL || 'info';

  const server = Fastify({
    logger: {
      level: logLevel,
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
