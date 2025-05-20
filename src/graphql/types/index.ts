import { writeFileSync } from 'node:fs';
import builder from '@/graphql/builder';
import { lexicographicSortSchema, printSchema } from 'graphql';

import './common';
import './users';
import './programs';
import './applications';
import './milestones';
import './auth';
import './links';
import './posts';
import './comments';
import './notifications';

export const schema = builder.toSchema();
const schemaAsString = printSchema(lexicographicSortSchema(schema));
writeFileSync('./src/graphql/schema.graphql', schemaAsString);
