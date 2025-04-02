import type { Writable } from 'node:stream';
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import type { PostgresJsDatabase, PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js';

export interface EnvConfig {
  NODE_ENV: 'development' | 'production' | 'local';
  PORT: number;
  JWT_SECRET: string;
  DATABASE_URL: string;
  STORAGE_BUCKET: string;
  EDUCHAIN_RPC_URL: string;
  EDUCHAIN_CHAIN_ID: string;
  EDUCHAIN_PRIVATE_KEY: string;
  EDUCHAIN_CONTRACT_ADDRESS: string;
  EDUCHAIN_VALIDATOR_ADDRESS: string;
  EDUCHAIN_BUILDER_ADDRESS: string;
  EDUCHAIN_BUILDER_PRIVATE_KEY: string;
}

export type Root = NonNullable<unknown>;

export type Args = NonNullable<unknown>;

export interface UploadFile {
  filename: string;
  mimetype: string;
  createReadStream: () => Writable;
}

export type DB =
  | PostgresJsDatabase<Record<string, never>>
  | PgTransaction<
      PostgresJsQueryResultHKT,
      Record<string, never>,
      ExtractTablesWithRelations<Record<string, never>>
    >;
