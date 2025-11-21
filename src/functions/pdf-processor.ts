import { S3Handler } from "aws-lambda";
import { BookService } from "../lib/services/book.service";
import { logger, createLogger } from "../lib/logger";

export const handler: S3Handler = async event => {
  try {
    // Get environment variables
    const {
      BOOKS_TABLE,
      SESSIONS_TABLE,
      PDF_BUCKET,
      PROCESSING_QUEUE,
      PROGRESS_QUEUE,
      GEMINI_API_KEY,
    } = process.env;

    if (
      !BOOKS_TABLE ||
      !SESSIONS_TABLE ||
      !PDF_BUCKET ||
      !PROCESSING_QUEUE ||
      !PROGRESS_QUEUE ||
      !GEMINI_API_KEY
    ) {
      logger.error("Missing required environment variables");
      return;
    }

    // Create book service
    const bookService = new BookService(
      BOOKS_TABLE,
      SESSIONS_TABLE,
      PDF_BUCKET,
      PROCESSING_QUEUE,
      PROGRESS_QUEUE,
      GEMINI_API_KEY
    );

    // Process each S3 record
    for (const record of event.Records) {
      if (record.eventName?.startsWith("ObjectCreated")) {
        const s3Key = record.s3.object.key;

        // Extract book ID from S3 key (assumes format: original/{bookId}.pdf)
        const bookIdMatch = s3Key.match(/original\/(.+)\.pdf$/);
        if (!bookIdMatch) {
          logger.warn("Unable to extract book ID from S3 key", { s3Key });
          continue;
        }

        const bookId = bookIdMatch[1];
        const processLogger = createLogger({ bookId, s3Key });

        try {
          processLogger.info("Processing PDF upload from S3");

          // Start processing the chapters
          await bookService.processChapters(bookId);

          processLogger.info("PDF processing initiated successfully");
        } catch (error: any) {
          processLogger.error("Failed to process PDF from S3", { error: error.message });

          // Mark book as failed
          await bookService.markFailed(bookId, `S3 processing failed: ${error.message}`);
        }
      }
    }
  } catch (error: any) {
    logger.error("PDF processor handler error", { error: error.message, stack: error.stack });
    throw error; // Let Lambda retry
  }
};
