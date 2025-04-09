export const envSchema = {
  type: 'object',
  required: ['NODE_ENV', 'PORT', 'JWT_SECRET', 'DATABASE_URL'],
  properties: {
    NODE_ENV: { type: 'string' },
    PORT: {
      type: 'string',
      default: 4000,
    },
    JWT_SECRET: { type: 'string' },
    DATABASE_URL: { type: 'string' },
    STORAGE_BUCKET: { type: 'string' },
    EDUCHAIN_RPC_URL: { type: 'string' },
    EDUCHAIN_CHAIN_ID: { type: 'string' },
    EDUCHAIN_PRIVATE_KEY: { type: 'string' },
    EDUCHAIN_CONTRACT_ADDRESS: { type: 'string' },
    EDUCHAIN_VALIDATOR_ADDRESS: { type: 'string' },
    EDUCHAIN_BUILDER_ADDRESS: { type: 'string' },
    EDUCHAIN_BUILDER_PRIVATE_KEY: { type: 'string' },
  },
};
