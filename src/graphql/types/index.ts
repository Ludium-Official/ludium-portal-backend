// import { writeFileSync } from 'node:fs';
import builder from '@/graphql/builder';

import './common';
import './users';
import './programs';
import './shared-refs';
import './applications';
import './investment-terms';
import './investments';
import './milestones';
import './milestone-payouts';
import './fee-claims';
import './auth'; // ✅ V1 login mutation을 위해 활성화
import './links';
import './posts'; // ✅ V1 post mutations 활성화
import './comments'; // ✅ posts와 관련된 comments
import './notifications';
import './carousel';
import './swapped';

import '../v2';

export const schema = builder.toSchema();
// const schemaAsString = printSchema(lexicographicSortSchema(schema));
// writeFileSync('./src/graphql/schema.graphql', schemaAsString);
