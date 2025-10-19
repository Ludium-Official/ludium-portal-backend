import { afterAll } from 'vitest';
import { client } from './src/db/test-db';

// This will run after all tests
afterAll(async () => {
  // You can add any cleanup logic here, like closing the database connection
  await client.end();
});
