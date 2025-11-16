import type { FastifyRequest } from 'fastify';

export interface UserPayload {
  userId: string;
  email: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: UserPayload;
  }
}