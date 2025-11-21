import { APIGatewayProxyHandler } from "aws-lambda";
import { createTelegramBot } from "../lib/telegram/bot";
import { SessionService } from "../lib/services/session.service";
import { BookService } from "../lib/services/book.service";
import { logger } from "../lib/logger";

export const handler: APIGatewayProxyHandler = async event => {
  try {
    // Get environment variables
    const {
      TELEGRAM_BOT_TOKEN,
      BOOKS_TABLE,
      SESSIONS_TABLE,
      PDF_BUCKET,
      PROCESSING_QUEUE,
      PROGRESS_QUEUE,
      GEMINI_API_KEY,
    } = process.env;

    if (
      !TELEGRAM_BOT_TOKEN ||
      !BOOKS_TABLE ||
      !SESSIONS_TABLE ||
      !PDF_BUCKET ||
      !PROCESSING_QUEUE ||
      !PROGRESS_QUEUE ||
      !GEMINI_API_KEY
    ) {
      logger.error("Missing required environment variables");
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Server configuration error" }),
      };
    }

    // Parse the webhook update
    const update = JSON.parse(event.body || "{}");

    // Create services
    const sessionService = new SessionService(BOOKS_TABLE, SESSIONS_TABLE);
    const bookService = new BookService(
      BOOKS_TABLE,
      SESSIONS_TABLE,
      PDF_BUCKET,
      PROCESSING_QUEUE,
      PROGRESS_QUEUE,
      GEMINI_API_KEY
    );

    // Create and configure bot
    const bot = createTelegramBot(TELEGRAM_BOT_TOKEN, sessionService, bookService);

    // Process the update
    await bot.handleUpdate(update);

    logger.info("Bot update processed successfully", {
      updateId: update.update_id,
      type: Object.keys(update).filter(key => key !== "update_id")[0],
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true }),
    };
  } catch (error: any) {
    logger.error("Bot handler error", { error: error.message, stack: error.stack });

    return {
      statusCode: 200, // Return 200 to prevent Telegram from retrying
      body: JSON.stringify({ ok: false }),
    };
  }
};
