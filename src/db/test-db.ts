import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import 'dotenv/config';
import * as schema from './schemas';

const { DB_HOST, DB_PORT, DB_NAME, DB_USERNAME, DB_PASSWORD } = process.env;

// Append options to suppress all PostgreSQL notices
const connectionString = `postgresql://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?client_min_messages=warning`;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

export const client = postgres(connectionString);
export const db = drizzle(client, { schema });
