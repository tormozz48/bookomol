import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from './auth';
import { Storage } from '@google-cloud/storage';
import { PubSub } from '@google-cloud/pubsub';

interface UserPayload {
  userId: string;
  email: string;
}

// Initialize Google Cloud clients (will be configured with environment variables)
const storage = new Storage();
const pubsub = new PubSub();
const bucketName = process.env.GCS_BUCKET_NAME || 'bookomol-storage';

// Utility function to increment daily usage
const incrementDailyUsage = async (fastify: FastifyInstance, userId: string) => {
  await fastify.prisma.user.update({
    where: { id: userId },
    data: {
      dailyUsageCount: {
        increment: 1
      }
    }
  });
};

// Utility function to check if user owns book
const checkBookOwnership = async (fastify: FastifyInstance, bookId: string, userId: string) => {
  const book = await fastify.prisma.book.findFirst({
    where: {
      id: bookId,
      userId: userId
    }
  });
  return book;
};

export async function bookRoutes(fastify: FastifyInstance) {
  // Get list of user's books
  fastify.get('/', { preHandler: authenticate }, async (request, reply) => {
    const { userId } = (request as FastifyRequest & { user: UserPayload }).user;

    try {
      const books = await fastify.prisma.book.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          originalFilename: true,
          originalPages: true,
          condensedPages: true,
          condensingLevel: true,
          compressionRatio: true,
          status: true,
          processingProgress: true,
          errorMessage: true,
          apiCost: true,
          createdAt: true,
          updatedAt: true
        }
      });

      return { books };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch books'
      });
    }
  });

  // Get presigned URL for uploading a book
  fastify.post('/upload/url', { preHandler: authenticate }, async (request, reply) => {
    const { userId } = (request as FastifyRequest & { user: UserPayload }).user;
    const { filename, contentType } = request.body as { filename: string; contentType: string };

    try {
      // Check daily quota
      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
        select: { dailyUsageCount: true }
      });

      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      if (user.dailyUsageCount >= 3) {
        return reply.status(429).send({
          error: 'Quota Exceeded',
          message: 'Daily book upload limit reached (3 books per day)'
        });
      }

      // Validate file type
      if (contentType !== 'application/pdf') {
        return reply.status(400).send({
          error: 'Invalid File Type',
          message: 'Only PDF files are allowed'
        });
      }

      // Generate unique filename
      const bookId = crypto.randomUUID();
      const objectName = `books/${userId}/${bookId}/original.pdf`;

      // Generate presigned URL
      const bucket = storage.bucket(bucketName);
      const file = bucket.file(objectName);
      
      const [uploadUrl] = await file.getSignedUrl({
        version: 'v4',
        action: 'write',
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
        contentType: contentType,
      });

      return {
        uploadUrl,
        bookId,
        objectName,
        expiresIn: 15 * 60 // 15 minutes in seconds
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to generate upload URL'
      });
    }
  });

  // Create book record after successful upload
  fastify.post('/', { preHandler: authenticate }, async (request, reply) => {
    const { userId } = (request as FastifyRequest & { user: UserPayload }).user;
    const { 
      bookId, 
      originalFilename, 
      condensingLevel = 'medium', 
      title 
    } = request.body as {
      bookId: string;
      originalFilename: string;
      condensingLevel?: 'light' | 'medium' | 'heavy';
      title?: string;
    };

    try {
      // Check daily quota again
      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
        select: { dailyUsageCount: true }
      });

      if (!user || user.dailyUsageCount >= 3) {
        return reply.status(429).send({
          error: 'Quota Exceeded',
          message: 'Daily book upload limit reached'
        });
      }

      // Calculate compression ratio based on level
      const compressionRatios = {
        light: 0.70, // 30% reduction
        medium: 0.50, // 50% reduction
        heavy: 0.30  // 70% reduction
      };

      const originalUrl = `gs://${bucketName}/books/${userId}/${bookId}/original.pdf`;

      // Create book record
      const book = await fastify.prisma.book.create({
        data: {
          id: bookId,
          userId,
          title: title || originalFilename.replace('.pdf', ''),
          originalFilename,
          originalUrl,
          condensingLevel,
          compressionRatio: compressionRatios[condensingLevel],
          status: 'uploaded'
        }
      });

      // Increment daily usage
      await incrementDailyUsage(fastify, userId);

      // Publish message to start processing
      const topic = pubsub.topic('book-uploaded');
      await topic.publishMessage({
        data: Buffer.from(JSON.stringify({
          bookId: book.id,
          userId: book.userId,
          condensingLevel: book.condensingLevel,
          originalUrl: book.originalUrl
        }))
      });

      fastify.log.info(`Book upload initiated for user ${userId}, book ${bookId}`);

      return book;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to create book record'
      });
    }
  });

  // Get specific book details
  fastify.get('/:id', { preHandler: authenticate }, async (request, reply) => {
    const { userId } = (request as FastifyRequest & { user: UserPayload }).user;
    const { id } = request.params as { id: string };

    try {
      const book = await checkBookOwnership(fastify, id, userId);
      
      if (!book) {
        return reply.status(404).send({
          error: 'Book not found',
          message: 'Book not found or access denied'
        });
      }

      // Include chapters information
      const chapters = await fastify.prisma.chapter.findMany({
        where: { bookId: id },
        orderBy: { chapterNumber: 'asc' }
      });

      return {
        ...book,
        chapters
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch book details'
      });
    }
  });

  // Get book processing status
  fastify.get('/:id/status', { preHandler: authenticate }, async (request, reply) => {
    const { userId } = (request as FastifyRequest & { user: UserPayload }).user;
    const { id } = request.params as { id: string };

    try {
      const book = await checkBookOwnership(fastify, id, userId);
      
      if (!book) {
        return reply.status(404).send({
          error: 'Book not found',
          message: 'Book not found or access denied'
        });
      }

      // Get processing jobs
      const jobs = await fastify.prisma.processingJob.findMany({
        where: { bookId: id },
        orderBy: { createdAt: 'desc' }
      });

      return {
        bookId: book.id,
        status: book.status,
        progress: book.processingProgress,
        errorMessage: book.errorMessage,
        jobs
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch book status'
      });
    }
  });

  // Manually trigger book processing (for retry)
  fastify.post('/:id/process', { preHandler: authenticate }, async (request, reply) => {
    const { userId } = (request as FastifyRequest & { user: UserPayload }).user;
    const { id } = request.params as { id: string };

    try {
      const book = await checkBookOwnership(fastify, id, userId);
      
      if (!book) {
        return reply.status(404).send({
          error: 'Book not found',
          message: 'Book not found or access denied'
        });
      }

      if (book.status === 'processing') {
        return reply.status(400).send({
          error: 'Already Processing',
          message: 'Book is already being processed'
        });
      }

      if (book.status === 'completed') {
        return reply.status(400).send({
          error: 'Already Completed',
          message: 'Book has already been processed'
        });
      }

      // Reset book status and trigger processing
      await fastify.prisma.book.update({
        where: { id },
        data: {
          status: 'uploaded',
          processingProgress: 0,
          errorMessage: null
        }
      });

      // Publish message to restart processing
      const topic = pubsub.topic('book-uploaded');
      await topic.publishMessage({
        data: Buffer.from(JSON.stringify({
          bookId: book.id,
          userId: book.userId,
          condensingLevel: book.condensingLevel,
          originalUrl: book.originalUrl
        }))
      });

      return { 
        message: 'Processing restarted',
        bookId: book.id,
        status: 'uploaded'
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to restart processing'
      });
    }
  });

  // Download original PDF
  fastify.get('/:id/download/original', { preHandler: authenticate }, async (request, reply) => {
    const { userId } = (request as FastifyRequest & { user: UserPayload }).user;
    const { id } = request.params as { id: string };

    try {
      const book = await checkBookOwnership(fastify, id, userId);
      
      if (!book || !book.originalUrl) {
        return reply.status(404).send({
          error: 'Book not found',
          message: 'Book or original file not found'
        });
      }

      // Generate signed download URL
      const bucket = storage.bucket(bucketName);
      const fileName = book.originalUrl.replace(`gs://${bucketName}/`, '');
      const file = bucket.file(fileName);

      const [downloadUrl] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + 60 * 60 * 1000, // 1 hour
      });

      return reply.redirect(downloadUrl);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to generate download URL'
      });
    }
  });

  // Download condensed PDF
  fastify.get('/:id/download/condensed', { preHandler: authenticate }, async (request, reply) => {
    const { userId } = (request as FastifyRequest & { user: UserPayload }).user;
    const { id } = request.params as { id: string };

    try {
      const book = await checkBookOwnership(fastify, id, userId);
      
      if (!book || !book.condensedUrl || book.status !== 'completed') {
        return reply.status(404).send({
          error: 'Book not found',
          message: 'Condensed book not available or processing not completed'
        });
      }

      // Generate signed download URL
      const bucket = storage.bucket(bucketName);
      const fileName = book.condensedUrl.replace(`gs://${bucketName}/`, '');
      const file = bucket.file(fileName);

      const [downloadUrl] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + 60 * 60 * 1000, // 1 hour
      });

      return reply.redirect(downloadUrl);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to generate download URL'
      });
    }
  });

  // Delete book
  fastify.delete('/:id', { preHandler: authenticate }, async (request, reply) => {
    const { userId } = (request as FastifyRequest & { user: UserPayload }).user;
    const { id } = request.params as { id: string };

    try {
      const book = await checkBookOwnership(fastify, id, userId);
      
      if (!book) {
        return reply.status(404).send({
          error: 'Book not found',
          message: 'Book not found or access denied'
        });
      }

      // Delete from database (cascade will handle chapters and processing jobs)
      await fastify.prisma.book.delete({
        where: { id }
      });

      // TODO: Delete files from Google Cloud Storage
      // This should be handled by a cleanup worker for better performance

      return { 
        message: 'Book deleted successfully',
        bookId: id
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to delete book'
      });
    }
  });
}