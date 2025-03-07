import type { FastifyInstance } from 'fastify';
import registerCommonRoutes from './common';

const registerRoutes = (server: FastifyInstance) => {
  registerCommonRoutes(server);
};

export default registerRoutes;
