import type { Writable } from 'node:stream';

export interface EnvConfig {
  NODE_ENV: 'development' | 'production' | 'local';
  PORT: number;
  JWT_SECRET: string;
  DATABASE_URL: string;
  STORAGE_BUCKET: string;
}

export type Root = NonNullable<unknown>;

export type Args = NonNullable<unknown>;

export interface UploadFile {
  filename: string;
  mimetype: string;
  createReadStream: () => Writable;
}
