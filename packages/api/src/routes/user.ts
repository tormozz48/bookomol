import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from './auth';

interface UserPayload {
  userId: string;
  email: string;
}

// Daily quota reset utility
const resetDailyQuotaIfNeeded = async (fastify: FastifyInstance, userId: string) => {
  const user = await fastify.prisma.user.findUnique({
    where: { id: userId },
    select: { dailyUsageCount: true, dailyUsageResetAt: true }
  });

  if (!user) return;

  const now = new Date();
  const resetTime = user.dailyUsageResetAt;

  // Reset if it's a new day or first usage
  if (!resetTime || now.getDate() !== resetTime.getDate() || 
      now.getMonth() !== resetTime.getMonth() || 
      now.getFullYear() !== resetTime.getFullYear()) {
    
    await fastify.prisma.user.update({
      where: { id: userId },
      data: {
        dailyUsageCount: 0,
        dailyUsageResetAt: now
      }
    });
  }
};

export async function userRoutes(fastify: FastifyInstance) {
  // Get user profile
  fastify.get('/profile', { preHandler: authenticate }, async (request, reply) => {
    const { userId } = (request as FastifyRequest & { user: UserPayload }).user;

    try {
      // Reset daily quota if needed
      await resetDailyQuotaIfNeeded(fastify, userId);

      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          dailyUsageCount: true,
          dailyUsageResetAt: true,
          totalApiCost: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!user) {
        return reply.status(404).send({ 
          error: 'User not found', 
          message: 'User profile not found' 
        });
      }

      return {
        ...user,
        dailyQuotaLimit: 3, // As per requirements
        dailyQuotaRemaining: Math.max(0, 3 - user.dailyUsageCount)
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch user profile'
      });
    }
  });

  // Get user usage statistics
  fastify.get('/usage', { preHandler: authenticate }, async (request, reply) => {
    const { userId } = (request as FastifyRequest & { user: UserPayload }).user;

    try {
      // Reset daily quota if needed
      await resetDailyQuotaIfNeeded(fastify, userId);

      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
        select: {
          dailyUsageCount: true,
          dailyUsageResetAt: true,
          totalApiCost: true
        }
      });

      if (!user) {
        return reply.status(404).send({ 
          error: 'User not found', 
          message: 'User not found' 
        });
      }

      // Get book statistics
      const bookStats = await fastify.prisma.book.groupBy({
        by: ['status'],
        where: { userId },
        _count: true
      });

      const stats = {
        uploaded: 0,
        processing: 0,
        completed: 0,
        failed: 0
      };

      bookStats.forEach((stat: any) => {
        if (stat.status in stats) {
          (stats as any)[stat.status] = stat._count;
        }
      });

      // Get total books processed
      const totalBooks = await fastify.prisma.book.count({
        where: { userId }
      });

      return {
        dailyQuota: {
          limit: 3,
          used: user.dailyUsageCount,
          remaining: Math.max(0, 3 - user.dailyUsageCount),
          resetAt: user.dailyUsageResetAt
        },
        books: {
          total: totalBooks,
          ...stats
        },
        costs: {
          totalApiCost: user.totalApiCost
        }
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch usage statistics'
      });
    }
  });

  // Update user profile
  fastify.patch('/profile', { preHandler: authenticate }, async (request, reply) => {
    const { userId } = (request as FastifyRequest & { user: UserPayload }).user;
    const { name } = request.body as { name?: string };

    try {
      const updatedUser = await fastify.prisma.user.update({
        where: { id: userId },
        data: {
          ...(name && { name })
        },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          dailyUsageCount: true,
          dailyUsageResetAt: true,
          totalApiCost: true,
          createdAt: true,
          updatedAt: true
        }
      });

      return {
        ...updatedUser,
        dailyQuotaLimit: 3,
        dailyQuotaRemaining: Math.max(0, 3 - updatedUser.dailyUsageCount)
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to update user profile'
      });
    }
  });

  // Check if user can upload (daily quota)
  fastify.get('/can-upload', { preHandler: authenticate }, async (request, reply) => {
    const { userId } = (request as FastifyRequest & { user: UserPayload }).user;

    try {
      // Reset daily quota if needed
      await resetDailyQuotaIfNeeded(fastify, userId);

      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
        select: { dailyUsageCount: true }
      });

      if (!user) {
        return reply.status(404).send({ 
          error: 'User not found', 
          message: 'User not found' 
        });
      }

      const canUpload = user.dailyUsageCount < 3;
      const remaining = Math.max(0, 3 - user.dailyUsageCount);

      return {
        canUpload,
        quotaUsed: user.dailyUsageCount,
        quotaLimit: 3,
        quotaRemaining: remaining
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to check upload quota'
      });
    }
  });
}