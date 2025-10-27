import { envSchema } from '@/config/common';
import envPlugin from '@fastify/env';
import type { FastifyInstance } from 'fastify';

const load = (server: FastifyInstance) => {
  const isLocal = process.env.NODE_ENV === 'local';
  return server
    .register(envPlugin, {
      schema: envSchema,
      // Load environment variables from .env file for local development
      dotenv: isLocal,
      // expandEnv: true: .env 파일 내에서 ${VAR}와 같은 문법을 사용하여 다른 환경 변수를 참조할 수 있게 해줍니다. 예를 들어, .env 파일에 다음과 같이 작성할 수 있습니다.
      //   PORT=4000
      //   BASE_URL=http://localhost:${PORT}
      // 이 경우 BASE_URL은 http://localhost:4000으로 설정됩니다.
      expandEnv: isLocal,
      // If not local, load environment variables from GCP secrets manager
      data: isLocal ? process.env : JSON.parse(process.env.SECRETS ?? '{}'),
    })
    .ready((err) => {
      if (err) server.log.error(err);
      server.log.info('Environment variables loaded');
    });
};

export default load;
