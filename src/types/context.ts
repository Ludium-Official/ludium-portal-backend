import type { User } from '@/db/schemas/users';
import type { UserV2 } from '@/db/schemas/v2/users';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type DataLoader from 'dataloader';
import type { LanguageV2 } from '@/db/schemas/v2/user-language';
import type { WorkExperienceV2 } from '@/db/schemas/v2/user-work-experiences';
import type { EducationV2 } from '@/db/schemas/v2/user-educations';

export interface Context {
  db: PostgresJsDatabase;
  server: FastifyInstance;
  request: FastifyRequest;
  reply: FastifyReply;
  user?: User;
  userV2?: UserV2;
  loaders: {
    languages: DataLoader<number, LanguageV2[]>;
    workExperiences: DataLoader<number, WorkExperienceV2[]>;
    educations: DataLoader<number, EducationV2[]>;
  };
}
