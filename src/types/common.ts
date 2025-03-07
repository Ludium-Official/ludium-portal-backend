export interface EnvConfig {
  NODE_ENV: 'development' | 'production' | 'local';
  PORT: number;
  JWT_SECRET: string;
  DATABASE_URL: string;
}

export type Root = NonNullable<unknown>;

export type Args = NonNullable<unknown>;
