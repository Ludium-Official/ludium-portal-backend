import type { FastifyInstance } from 'fastify';

const registerCommonRoutes = (server: FastifyInstance) => {
  server.register((instance, _opts, next) => {
    instance.get('/health', (_, reply) => {
      return reply.code(200).send({ ok: true });
    });

    next();
  });
};

export default registerCommonRoutes;
