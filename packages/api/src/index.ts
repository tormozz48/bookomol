import Fastify from 'fastify';
import { PrismaClient } from '@prisma/client';

const server = Fastify({
  logger: true,
});

const prisma = new PrismaClient();

// Health check endpoint
server.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Root endpoint
server.get('/', async (request, reply) => {
  return { message: 'Bookomol API Server', version: '1.0.0' };
});

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3010', 10);
    await server.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 API Server running on http://localhost:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  await server.close();
});

start();
