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
    BASE_URL: { type: 'string' },
    SWAPPED_STYLE_KEY: { type: 'string' },
    SWAPPED_PUBLIC_KEY: { type: 'string' },
    SWAPPED_SECRET_KEY: { type: 'string' },
    EMAIL_HOST: { type: 'string' },
    EMAIL_PORT: { type: 'string' },
    EMAIL_SECURE: { type: 'string' },
    EMAIL_USER: { type: 'string' },
    EMAIL_PASS: { type: 'string' },
    EMAIL_FROM: { type: 'string' },
  },
};
