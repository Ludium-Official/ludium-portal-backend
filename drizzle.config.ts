import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';
import { expand } from 'dotenv-expand';

expand(config());

export default defineConfig({
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  schema: './src/db/schemas/*',
  out: './src/db/migrations',
  verbose: true,
  strict: true,
});
