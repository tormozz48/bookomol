import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { ProcessingMessage, ProgressMessage } from "../../types";
import { logger } from "../logger";

const client = new SQSClient({});

export class SQSService {
  constructor(
    private processingQueueUrl: string,
    private progressQueueUrl: string
  ) {}

  async sendProcessingMessage(message: ProcessingMessage): Promise<void> {
    try {
      const command = new SendMessageCommand({
        QueueUrl: this.processingQueueUrl,
        MessageBody: JSON.stringify(message),
        MessageAttributes: {
          bookId: {
            DataType: "String",
            StringValue: message.bookId,
          },
          action: {
            DataType: "String",
            StringValue: message.action,
          },
        },
      });

      await client.send(command);
      logger.info("Processing message sent", { 
        bookId: message.bookId, 
        action: message.action 
      });
    } catch (error) {
      logger.error("Failed to send processing message", { message, error });
      throw error;
    }
  }

  async sendProgressMessage(message: ProgressMessage): Promise<void> {
    try {
      const command = new SendMessageCommand({
        QueueUrl: this.progressQueueUrl,
        MessageBody: JSON.stringify(message),
        MessageAttributes: {
          bookId: {
            DataType: "String",
            StringValue: message.bookId,
          },
          chatId: {
            DataType: "String",
            StringValue: message.chatId,
          },
        },
      });

      await client.send(command);
      logger.info("Progress message sent", { 
        bookId: message.bookId, 
        progress: message.progress 
      });
    } catch (error) {
      logger.error("Failed to send progress message", { message, error });
      throw error;
    }
  }

  async queueBookProcessing(bookId: string, userId: string): Promise<void> {
    await this.sendProcessingMessage({
      bookId,
      userId,
      action: "process_book",
      data: {},
    });
  }

  async queueChapterCondensing(
    bookId: string, 
    userId: string, 
    chapterId: string
  ): Promise<void> {
    await this.sendProcessingMessage({
      bookId,
      userId,
      action: "condense_chapter",
      data: { chapterId },
    });
  }

  async queueChaptersCombining(bookId: string, userId: string): Promise<void> {
    await this.sendProcessingMessage({
      bookId,
      userId,
      action: "combine_chapters",
      data: {},
    });
  }
}