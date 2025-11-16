import Fastify from 'fastify';
import { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

// Import plugins
import fastifyCors from '@fastify/cors';
import fastifySession from '@fastify/session';
import fastifyPassport from '@fastify/passport';
import fastifyCookie from '@fastify/cookie';
import fastifyMultipart from '@fastify/multipart';
import { Server } from 'socket.io';

// Import routes
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/user';
import { bookRoutes } from './routes/books';

// Initialize Prisma
const prisma = new PrismaClient();

// Create Fastify instance
const server: FastifyInstance = Fastify({
  logger: process.env.NODE_ENV === 'development'
    ? {
        level: 'info',
        transport: {
          target: 'pino/file',
          options: {
            destination: 1, // stdout
          },
        },
      }
    : { level: 'info' },
});

// Global error handler
server.setErrorHandler(async (error, request, reply) => {
  server.log.error(error);
  
  if (error.validation) {
    return reply.status(400).send({
      error: 'Validation Error',
      message: error.message,
      details: error.validation,
    });
  }

  if (error.statusCode && error.statusCode < 500) {
    return reply.status(error.statusCode).send({
      error: error.name || 'Client Error',
      message: error.message,
    });
  }

  return reply.status(500).send({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
  });
});

// Register plugins
const registerPlugins = async () => {
  // CORS
  await server.register(fastifyCors, {
    origin: process.env.NODE_ENV === 'development' 
      ? ['http://localhost:5173', 'http://localhost:3000']
      : [process.env.FRONTEND_URL || 'https://bookomol.app'],
    credentials: true,
  });

  // Session and cookies
  await server.register(fastifyCookie);
  
  await server.register(fastifySession, {
    secret: process.env.SESSION_SECRET || 'bookomol-session-secret-change-in-production',
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  });

  // Authentication
  await server.register(fastifyPassport.initialize());
  await server.register(fastifyPassport.secureSession());

  // File uploads
  await server.register(fastifyMultipart);

  // Add Prisma to request context
  server.decorate('prisma', prisma);
};

// Register routes
const registerRoutes = async () => {
  // Health check
  server.get('/health', async (request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        database: 'connected'
      };
    } catch (error) {
      return reply.status(503).send({
        status: 'error',
        timestamp: new Date().toISOString(), 
        database: 'disconnected'
      });
    }
  });

  // Root endpoint
  server.get('/', async (request, reply) => {
    return { 
      message: 'Bookomol API Server', 
      version: '1.0.0',
      timestamp: new Date().toISOString()
    };
  });

  // Register route modules
  await server.register(authRoutes, { prefix: '/auth' });
  await server.register(userRoutes, { prefix: '/api/user' });
  await server.register(bookRoutes, { prefix: '/api/books' });
};

// Setup Socket.IO for real-time updates
const setupSocketIO = () => {
  const io = new Server(server.server, {
    cors: {
      origin: process.env.NODE_ENV === 'development' 
        ? ['http://localhost:5173', 'http://localhost:3000']
        : [process.env.FRONTEND_URL || 'https://bookomol.app'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    server.log.info(`Client connected: ${socket.id}`);

    socket.on('join-user', (userId: string) => {
      socket.join(`user:${userId}`);
      server.log.info(`User ${userId} joined their room`);
    });

    socket.on('disconnect', () => {
      server.log.info(`Client disconnected: ${socket.id}`);
    });
  });

  // Add Socket.IO to request context
  server.decorate('io', io);
};

// Start server
const start = async () => {
  try {
    await registerPlugins();
    await registerRoutes();
    setupSocketIO();
    
    const port = parseInt(process.env.PORT || '3010', 10);
    await server.listen({ port, host: '0.0.0.0' });
    
    server.log.info(`🚀 API Server running on http://localhost:${port}`);
    server.log.info(`📡 WebSocket server ready for real-time updates`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async () => {
  server.log.info('Shutting down server...');
  await prisma.$disconnect();
  await server.close();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Declare module augmentation for Fastify
declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    io: Server;
  }
}

start();
