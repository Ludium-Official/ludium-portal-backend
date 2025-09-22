import type { Readable } from 'node:stream';
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import type { PostgresJsDatabase, PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js';

export interface EnvConfig {
  NODE_ENV: 'development' | 'production' | 'local';
  PORT: number;
  JWT_SECRET: string;
  DATABASE_URL: string;
  STORAGE_BUCKET: string;
  BASE_URL: string;
  SWAPPED_STYLE_KEY: string;
  SWAPPED_PUBLIC_KEY: string;
  SWAPPED_SECRET_KEY: string;
}

export type Root = NonNullable<unknown>;

export type Args = NonNullable<unknown>;

export interface UploadFile {
  filename: string;
  mimetype: string;
  createReadStream: () => Readable;
}

export type DB =
  | PostgresJsDatabase<Record<string, never>>
  | PgTransaction<
      PostgresJsQueryResultHKT,
      Record<string, never>,
      ExtractTablesWithRelations<Record<string, never>>
    >;
