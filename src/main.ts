import buildServer from '@/config/server';
import { SERVER_HOST } from '@/constants';

async function main() {
  try {
    const server = await buildServer();
    await server.listen({ port: server.config.PORT, host: SERVER_HOST });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

void main();
