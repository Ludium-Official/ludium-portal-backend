import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

const registerCommonRoutes = (server: FastifyInstance) => {
  server.register((instance, _opts, next) => {
    instance.get('/health', (_: FastifyRequest, reply: FastifyReply) => {
      return reply.code(200).send({ ok: true });
    });

    next();
  });
};

export default registerCommonRoutes;
