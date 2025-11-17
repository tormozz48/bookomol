import { SQSHandler } from "aws-lambda";
import { ProgressMessage } from "../types";
import { logger, createLogger } from "../lib/logger";

export const handler: SQSHandler = async (event) => {
  // Get environment variables
  const { TELEGRAM_BOT_TOKEN } = process.env;

  if (!TELEGRAM_BOT_TOKEN) {
    logger.error("Missing TELEGRAM_BOT_TOKEN environment variable");
    throw new Error("Server configuration error");
  }

  // Process each SQS record
  for (const record of event.Records) {
    try {
      const message: ProgressMessage = JSON.parse(record.body);
      const { bookId, chatId, messageId, progress, status, currentStep } = message;
      
      const progressLogger = createLogger({ bookId, chatId, messageId });
      progressLogger.info("Processing progress update", { progress, status });

      // Format the progress message
      let messageText: string;
      let replyMarkup: any = undefined;

      if (status === "completed") {
        messageText = currentStep; // Should contain the completion message with download link
        
        // Add download button if available
        const book = await getBookDetails(bookId);
        if (book?.downloadUrl) {
          replyMarkup = {
            inline_keyboard: [
              [
                { text: "📥 Download Condensed Book", url: book.downloadUrl }
              ],
              [
                { text: "📖 Process Another Book", callback_data: "process_another" }
              ]
            ]
          };
        }
      } else if (status === "failed") {
        messageText = currentStep; // Should contain the error message
        replyMarkup = {
          inline_keyboard: [
            [
              { text: "🔄 Try Again", callback_data: "try_again" },
              { text: "📞 Contact Support", url: "https://t.me/bookomol_support" }
            ]
          ]
        };
      } else {
        // Regular progress update
        const progressBar = createProgressBar(progress);
        messageText = `${currentStep}\n\n${progressBar} ${progress}%`;
        
        // Add cancel option for in-progress updates
        if (progress > 0 && progress < 100) {
          replyMarkup = {
            inline_keyboard: [
              [
                { text: "❌ Cancel Processing", callback_data: "cancel_processing" }
              ]
            ]
          };
        }
      }

      // Send update to Telegram
      await updateTelegramMessage(
        TELEGRAM_BOT_TOKEN,
        chatId,
        parseInt(messageId),
        messageText,
        replyMarkup
      );

      progressLogger.info("Progress update sent successfully");
    } catch (error: any) {
      logger.error("Failed to process progress message", {
        error: error.message,
        messageBody: record.body
      });
      
      // Don't re-throw - we don't want progress updates to retry indefinitely
    }
  }
};

async function updateTelegramMessage(
  token: string,
  chatId: string,
  messageId: number,
  text: string,
  replyMarkup?: any
): Promise<void> {
  try {
    const url = `https://api.telegram.org/bot${token}/editMessageText`;
    const payload: any = {
      chat_id: chatId,
      message_id: messageId,
      text: text,
      parse_mode: "Markdown",
    };

    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Telegram API error: ${response.status} ${errorData}`);
    }

    logger.debug("Telegram message updated", { chatId, messageId });
  } catch (error: any) {
    logger.error("Failed to update Telegram message", {
      chatId,
      messageId,
      error: error.message
    });
    throw error;
  }
}

function createProgressBar(progress: number): string {
  const totalBars = 20;
  const filledBars = Math.round((progress / 100) * totalBars);
  const emptyBars = totalBars - filledBars;
  
  return "█".repeat(filledBars) + "░".repeat(emptyBars);
}

async function getBookDetails(bookId: string): Promise<{ downloadUrl?: string } | null> {
  // This is a simplified version - in practice, you'd query DynamoDB
  // For now, we'll return null and let the service layer handle download URLs
  return null;
}