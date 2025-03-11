import { writeFileSync } from 'node:fs';
import builder from '@/graphql/builder';
import { lexicographicSortSchema, printSchema } from 'graphql';

import './users';
import './programs';
import './applications';

export const schema = builder.toSchema();
const schemaAsString = printSchema(lexicographicSortSchema(schema));
writeFileSync('./src/graphql/schema.graphql', schemaAsString);
