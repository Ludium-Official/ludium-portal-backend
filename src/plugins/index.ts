import { schema as graphqlSchema } from '@/graphql/types';
import argon2Plugin from '@/plugins/argon2';
import authPlugin, { type DecodedToken } from '@/plugins/auth';
import dbPlugin from '@/plugins/db';
import fileManagerPlugin from '@/plugins/file-manager';
import mercuriusUploadPlugin from '@/plugins/gql-upload';
import pubsubPlugin from '@/plugins/pubsub';
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

  void server.register(mercuriusUploadPlugin);

  void server.register(fileManagerPlugin);

  void server.register(pubsubPlugin);

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
        verifyClient: async (info, next) => {
          if (info.req.headers.authorization) {
            const token = info.req.headers.authorization.split(' ')[1];
            const decoded = server.jwt.verify<DecodedToken>(token);
            if (decoded.payload.id) {
              const user = await server.auth.getUserForSubscription(decoded, server.db);
              if (user) {
                return next(true);
              }
            }
          }
          return next(false);
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
};

export default registerPlugins;
