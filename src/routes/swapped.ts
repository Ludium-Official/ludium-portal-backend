import { createHmac } from 'node:crypto';
import { userOrderMap } from '@/states/swappedState';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

const registerSwappedRoutes = (server: FastifyInstance) => {
  server.register((instance, _opts, next) => {
    instance.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
      try {
        (req as FastifyRequest & { rawBody: string }).rawBody = body as string;
        const json = JSON.parse(body as string);
        done(null, json);
      } catch (err) {
        done(err as Error, undefined);
      }
    });

    instance.post('/swapped/webhook', async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as { userId?: string };
      const userId = query.userId;

      const signature = request.headers.signature as string;
      const secretKey = server.config.SWAPPED_SECRET_KEY;

      if (!secretKey) {
        console.error('❌ SWAPPED_SECRET_KEY not configured');
        return reply.code(500).send({ error: 'Server configuration error' });
      }

      if (signature) {
        try {
          const rawBody =
            (request as FastifyRequest & { rawBody?: string }).rawBody ||
            JSON.stringify(request.body);

          const expectedSignature = createHmac('sha256', secretKey)
            .update(rawBody)
            .digest('base64');

          if (signature === expectedSignature) {
            const webhookData = request.body as {
              order_id?: string;
              status?: string;
              amount?: string;
              currency_code?: string;
              [key: string]: unknown;
            };

            // userId로 order_id 매핑
            if (userId && webhookData.order_id) {
              userOrderMap.set(userId, webhookData.order_id);
            }
          } else {
            console.error('❌ Invalid Swapped webhook signature');
            console.error(`Expected: ${expectedSignature}`);
            console.error(`Received: ${signature}`);
            return reply.code(401).send({ error: 'Invalid signature' });
          }
        } catch (error) {
          console.error('❌ Swapped signature verification error:', error);
          return reply.code(400).send({ error: 'Signature verification failed' });
        }
      } else {
        console.warn('⚠️ No signature provided in Swapped webhook');
      }

      return reply.code(200).send({ status: 'success' });
    });

    next();
  });
};

export default registerSwappedRoutes;
