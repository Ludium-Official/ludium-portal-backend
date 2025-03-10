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
  },
};
