import argon2 from '@node-rs/argon2';
import type { FastifyError, FastifyInstance, FastifyPluginOptions } from 'fastify';
import fp from 'fastify-plugin';

export class Argon2 {
  constructor(private _: FastifyInstance) {}

  hash(password: string) {
    return argon2.hash(password);
  }

  verify(hash: string, password: string) {
    return argon2.verify(hash, password);
  }
}

const argon2Plugin = (
  server: FastifyInstance,
  _: FastifyPluginOptions,
  done: (error?: FastifyError) => void,
): void => {
  const argon = new Argon2(server);
  server.decorate('argon2', argon);

  done();
};

export default fp(argon2Plugin);
