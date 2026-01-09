import { schema } from '@/graphql/types';
import {
  createEducationsLoader,
  createLanguagesLoader,
  createWorkExperiencesLoader,
} from '@/graphql/v2/loaders/user-relations.loader';
import argon2Plugin from '@/plugins/argon2';
import authPlugin from '@/plugins/auth';
import dbPlugin from '@/plugins/db';
import loadEnv from '@/plugins/env';
import jwtPlugin from '@fastify/jwt';
import Fastify, { type FastifyInstance } from 'fastify';
import mercurius from 'mercurius';
import 'dotenv/config';

export async function createTestServer(): Promise<FastifyInstance> {
  const server = Fastify({
    logger: {
      level: 'debug',
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    },
  });

  // Manually load env and set up config for the test server
  loadEnv(server);
  await server.after();

  // Override with test DB URL
  const { DB_HOST, DB_PORT, DB_NAME, DB_USERNAME, DB_PASSWORD, JWT_SECRET } = process.env;
  if (!DB_HOST || !DB_PORT || !DB_NAME || !DB_USERNAME || !DB_PASSWORD) {
    throw new Error('Test database environment variables are not set!');
  }
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not set!');
  }
  server.config.DATABASE_URL = `postgresql://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;

  // 1. JWT 플러그인 등록 (가장 먼저)
  // `jwtPlugin` 자체는 request.jwtVerify() 메서드를 제공할 뿐, 자동으로 토큰을 파싱하지 않습니다.
  await server.register(jwtPlugin, { secret: JWT_SECRET });

  // 2. 인증 플러그인 등록 (JWT 플러그인 후, mercurius 전)
  // `authPlugin` 내부에 Fastify `onRequest` 훅이 포함되어 JWT 토큰을 파싱하고
  // `request.user` 또는 `request.auth`에 사용자 정보를 주입해야 합니다.
  await server.register(authPlugin); // authPlugin이 토큰 파싱 로직을 담당해야 함

  // 3. DB, Argon2 등 다른 플러그인 등록
  await server.register(dbPlugin);
  await server.register(argon2Plugin);
  // Now register mercurius
  await server.register(mercurius, {
    schema,
    context: async (request, reply) => {
      const baseContext = {
        request,
        reply,
        server,
        db: server.db,
        user: request.auth?.user,
        userV2: request.auth?.userV2,
      };

      // DataLoader 인스턴스 생성 (요청마다 새로 생성)
      return {
        ...baseContext,
        loaders: {
          languages: createLanguagesLoader(baseContext),
          workExperiences: createWorkExperiencesLoader(baseContext),
          educations: createEducationsLoader(baseContext),
        },
      };
    },
  });

  await server.ready();
  return server;
}
