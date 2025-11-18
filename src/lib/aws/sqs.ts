import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { MessageAction, ProcessingMessage, ProgressMessage } from "../../types";
import { logger } from "../logger";

const client = new SQSClient({});

export class SQSService {
  constructor(
    private processingQueueUrl: string,
    private progressQueueUrl: string
  ) {}

  public async queueBookProcessing(bookId: string, userId: string): Promise<void> {
    await this.sendProcessingMessage<MessageAction.processBook>({
      bookId,
      userId,
      action: MessageAction.processBook,
      data: {},
    });
  }

  public async queueChapterCondensing(
    bookId: string,
    userId: string,
    chapterId: string
  ): Promise<void> {
    await this.sendProcessingMessage<MessageAction.condenseChapter>({
      bookId,
      userId,
      action: MessageAction.condenseChapter,
      data: { chapterId },
    });
  }

  public async queueChaptersCombining(bookId: string, userId: string): Promise<void> {
    await this.sendProcessingMessage<MessageAction.combineChapters>({
      bookId,
      userId,
      action: MessageAction.combineChapters,
      data: {},
    });
  }

  public async sendProgressMessage(message: ProgressMessage): Promise<void> {
    await this.sendMessage(this.progressQueueUrl, message, ["bookId", "chatId", "progress"]);
  }

  private async sendProcessingMessage<T extends MessageAction>(
    message: ProcessingMessage<T>
  ): Promise<void> {
    await this.sendMessage(this.processingQueueUrl, message, ["bookId", "action"]);
  }

  private async sendMessage<T, K extends keyof T>(
    queueUrl: string,
    message: T,
    attributes?: K[]
  ): Promise<void> {
    try {
      await client.send(
        new SendMessageCommand({
          QueueUrl: queueUrl,
          MessageBody: JSON.stringify(message),
          MessageAttributes: attributes
            ? attributes.reduce(
                (acc, key) => {
                  acc[key] = {
                    DataType: "String",
                    StringValue: `${message[key]}`,
                  };
                  return acc;
                },
                {} as Record<K, { DataType: string; StringValue: string }>
              )
            : undefined,
        })
      );
      logger.info("Message sent", { queueUrl, message });
    } catch (error) {
      logger.error("Failed to send message", { message, error });
      throw error;
    }
  }
}
