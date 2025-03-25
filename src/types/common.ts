import type { Writable } from 'node:stream';

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
