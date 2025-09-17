import type { FastifyInstance } from 'fastify';
import registerCommonRoutes from './common';
import registerSwappedRoutes from './swapped';

const registerRoutes = (server: FastifyInstance) => {
  registerCommonRoutes(server);
  registerSwappedRoutes(server);
};

export default registerRoutes;
