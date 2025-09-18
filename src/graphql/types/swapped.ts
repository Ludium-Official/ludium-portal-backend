import builder from '@/graphql/builder';
import { generateSwappedUrlResolver, getSwappedStatusResolver } from '@/graphql/resolvers/swapped';

interface SwappedUrlResponse {
  signedUrl: string;
  originalUrl: string;
  signature: string;
}

interface SwappedStatusResponse {
  status: string;
  message: string;
  orderId: string | null;
  data: unknown;
}

const SwappedUrlResponseType = builder.objectRef<SwappedUrlResponse>('SwappedUrlResponse');

const SwappedStatusResponseType = builder.objectRef<SwappedStatusResponse>('SwappedStatusResponse');

SwappedUrlResponseType.implement({
  fields: (t) => ({
    signedUrl: t.exposeString('signedUrl'),
    originalUrl: t.exposeString('originalUrl'),
    signature: t.exposeString('signature'),
  }),
});

SwappedStatusResponseType.implement({
  fields: (t) => ({
    status: t.exposeString('status'),
    message: t.exposeString('message'),
    orderId: t.string({
      nullable: true,
      resolve: (parent) => parent.orderId,
    }),
    data: t.field({
      type: 'JSON',
      nullable: true,
      resolve: (parent) => parent.data,
    }),
  }),
});

builder.mutationFields((t) => ({
  generateSwappedUrl: t.field({
    type: SwappedUrlResponseType,
    args: {
      currencyCode: t.arg.string({ required: true }),
      walletAddress: t.arg.string({ required: true }),
      amount: t.arg.string({ required: true }),
      userId: t.arg.string({ required: true }),
    },
    resolve: generateSwappedUrlResolver,
  }),
}));

builder.queryFields((t) => ({
  getSwappedStatus: t.field({
    type: SwappedStatusResponseType,
    args: {
      userId: t.arg.string({ required: true }),
    },
    resolve: getSwappedStatusResolver,
  }),
}));
