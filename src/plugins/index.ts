import { schema as graphqlSchema } from '@/graphql/types';
import argon2Plugin from '@/plugins/argon2';
import authPlugin from '@/plugins/auth';
import dbPlugin from '@/plugins/db';
import educhainPlugin from '@/plugins/educhain';
import fileManagerPlugin from '@/plugins/file-manager';
import mercuriusUpload from '@/plugins/gql-upload';
import corsPlugin from '@fastify/cors';
import jwtPlugin from '@fastify/jwt';
import type { FastifyInstance } from 'fastify';
import mercurius from 'mercurius';

const registerPlugins = (server: FastifyInstance) => {
  server
    .register(jwtPlugin, {
      secret: server.config.JWT_SECRET,
    })
    .ready((err) => {
      if (err) server.log.error(err);
      server.log.info('JWT plugin is ready');
    });

  void server.register(dbPlugin).ready((err) => {
    if (err) server.log.error(err);
    server.log.info('DB plugin is ready');
  });

  void server.register(corsPlugin, {
    origin: '*',
  });

  void server.register(mercuriusUpload);

  void server.register(fileManagerPlugin);

  void server
    .register(mercurius, {
      schema: graphqlSchema,
      context: (request, reply) => {
        return {
          request,
          reply,
          server,
          db: server.db,
          user: request.user,
        };
      },
      graphiql: false,
      subscription: {
        context: (_, request) => {
          return {
            request,
            server,
            db: server.db,
          };
        },
      },
      // TODO: Uncomment when we have a production environment
      // queryDepth: 5,
      // ...(server.config.NODE_ENV !== 'local' && {
      //   additionalRouteOptions: {
      //     onRequest: authMiddleware,
      //   },
      // }),
      // validationRules:
      //   server.config.NODE_ENV === 'local' ? undefined : [NoSchemaIntrospectionCustomRule],
    })
    .ready((err) => {
      if (err) server.log.error(err);
      server.log.info('GraphQL plugin is ready');
    });

  void server.register(authPlugin).ready((err) => {
    if (err) server.log.error(err);
    server.log.info('Auth plugin is ready');
  });

  void server.register(argon2Plugin).ready((err) => {
    if (err) server.log.error(err);
    server.log.info('Password plugin is ready');
  });

  void server.register(educhainPlugin).ready((err) => {
    if (err) server.log.error(err);
    server.log.info('Education plugin is ready');
  });
};

export default registerPlugins;
