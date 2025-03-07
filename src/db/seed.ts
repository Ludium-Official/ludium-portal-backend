import buildServer from '@/config/server';
import { users } from './data/users';
import { usersTable } from './schemas/users';

async function seed() {
  try {
    const server = await buildServer();

    await server.db.insert(usersTable).values(users).onConflictDoNothing();
  } catch (error) {
    console.log(error);
  }
}

seed()
  .then(() => process.exit(0))
  .catch((error) => console.log(error));
