import { SQSHandler } from "aws-lambda";
import { BookService } from "../lib/services/book.service";
import { ProcessingMessage } from "../types";
import { logger, createLogger } from "../lib/logger";

export const handler: SQSHandler = async event => {
  // Get environment variables
  const { PROCESSING_QUEUE, PROGRESS_QUEUE, GEMINI_API_KEY } = process.env;

  if (!PROCESSING_QUEUE || !PROGRESS_QUEUE || !GEMINI_API_KEY) {
    logger.error("Missing required environment variables");
    throw new Error("Server configuration error");
  }

  // Create book service
  const bookService = new BookService(PROCESSING_QUEUE, PROGRESS_QUEUE, GEMINI_API_KEY);

  // Process each SQS record
  for (const record of event.Records) {
    try {
      const message: ProcessingMessage = JSON.parse(record.body);
      const { bookId, action, data } = message;

      const processLogger = createLogger({ bookId, action });
      processLogger.info("Processing queue message");

      switch (action) {
        case "process_book":
          await bookService.processChapters(bookId);
          break;

        case "condense_chapter":
          const { chapterId } = data;
          if (!chapterId) {
            throw new Error("Chapter ID required for condense_chapter action");
          }
          await bookService.condenseChapter(bookId, chapterId);
          break;

        case "combine_chapters":
          await bookService.combineCondensedChapters(bookId);
          break;

        default:
          processLogger.warn("Unknown action in processing message", { action });
      }

      processLogger.info("Queue message processed successfully");
    } catch (error: any) {
      const bookId = JSON.parse(record.body)?.bookId || "unknown";
      const processLogger = createLogger({ bookId });

      processLogger.error("Failed to process queue message", {
        error: error.message,
        messageBody: record.body,
      });

      // Mark book as failed if it's a critical error
      try {
        await bookService.markFailed(bookId, `Processing failed: ${error.message}`);
      } catch (markFailedError: any) {
        processLogger.error("Failed to mark book as failed", {
          error: markFailedError.message,
        });
      }

      // Re-throw error to put message in DLQ
      throw error;
    }
  }
};
