import { schema as graphqlSchema } from '@/graphql/types';
import {
  createLanguagesLoader,
  createWorkExperiencesLoader,
  createEducationsLoader,
} from '@/graphql/v2/loaders/user-relations.loader';
import argon2Plugin from '@/plugins/argon2';
import authPlugin from '@/plugins/auth';
import dbPlugin from '@/plugins/db';
import fileManagerPlugin from '@/plugins/file-manager';
import mercuriusUploadPlugin from '@/plugins/gql-upload';
import pubsubPlugin from '@/plugins/pubsub';
import corsPlugin from '@fastify/cors';
import jwtPlugin from '@fastify/jwt';
import type { FastifyInstance } from 'fastify';
import mercurius from 'mercurius';
import emailPlugin from '@/plugins/email';

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

  void server.register(emailPlugin).ready((err) => {
    if (err) server.log.error(err);
    server.log.info('Email plugin is ready');
  });

  void server
    .register(mercurius, {
      schema: graphqlSchema,
      context: (request, reply) => {
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
      // GraphiQL은 production 환경에서 비활성화
      graphiql: server.config.NODE_ENV !== 'production',
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
};

export default registerPlugins;
