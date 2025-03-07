import { envSchema } from '@/config/common';
import envPlugin from '@fastify/env';
import type { FastifyInstance } from 'fastify';

const load = (server: FastifyInstance) => {
  const isLocal = process.env.NODE_ENV === 'local';
  return server
    .register(envPlugin, {
      schema: envSchema,
      dotenv: isLocal,
      data: isLocal ? process.env : JSON.parse(process.env.SECRETS ?? '{}'),
    })
    .ready((err) => {
      if (err) server.log.error(err);
      server.log.info('Environment variables loaded');
    });
};

export default load;
