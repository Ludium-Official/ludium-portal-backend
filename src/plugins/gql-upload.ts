import stream from 'node:stream';
import util from 'node:util';
import type { FastifyPluginCallback } from 'fastify';
import fp from 'fastify-plugin';
import { type UploadOptions, processRequest } from 'graphql-upload-minimal';

const finishedStream = util.promisify(stream.finished);

const graphqlUpload: FastifyPluginCallback<UploadOptions> = (fastify, options, done) => {
  fastify.addContentTypeParser('multipart/form-data', (req, _payload, done) => {
    req.mercuriusUploadMultipart = true;
    done(null);
  });

  fastify.addHook('preValidation', async (request, reply) => {
    if (!request.mercuriusUploadMultipart) {
      return;
    }

    request.body = await processRequest(request.raw, reply.raw, options);
  });

  fastify.addHook('onSend', async (request) => {
    if (!request.mercuriusUploadMultipart) {
      return;
    }

    await finishedStream(request.raw);
  });

  done();
};

export const mercuriusUpload = fp(graphqlUpload, {
  fastify: '>= 5.x',
  name: 'mercurius-upload',
});

export default mercuriusUpload;
