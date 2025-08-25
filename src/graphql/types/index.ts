import { writeFileSync } from 'node:fs';
import builder from '@/graphql/builder';
import { lexicographicSortSchema, printSchema } from 'graphql';

import './common';
import './users';
import './programs';
import './shared-refs';
import './applications';
import './investment-terms';
import './investments';
import './milestones';
import './milestone-payouts';
import './auth';
import './links';
import './posts';
import './comments';
import './notifications';
import './carousel';

export const schema = builder.toSchema();
const schemaAsString = printSchema(lexicographicSortSchema(schema));
writeFileSync('./src/graphql/schema.graphql', schemaAsString);
