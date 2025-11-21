import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { MessageAction, ProcessingMessage, ProgressMessage } from "../../types";
import { logger } from "../logger";
import { getRequiredEnv } from "../config";
import { queueEnvironmentNames } from "../../constants";

const client = new SQSClient({});

export async function queueBookProcessing(bookId: string, userId: string): Promise<void> {
  await sendProcessingMessage({
    action: MessageAction.processBook,
    bookId,
    userId,
    data: {},
  });
}

export async function queueChapterCondensing(
  bookId: string,
  userId: string,
  chapterId: string
): Promise<void> {
  await sendProcessingMessage({
    action: MessageAction.condenseChapter,
    bookId,
    userId,
    data: { chapterId },
  });
}

export async function queueChaptersCombining(bookId: string, userId: string): Promise<void> {
  await sendProcessingMessage({
    action: MessageAction.combineChapters,
    bookId,
    userId,
    data: {},
  });
}

export async function sendProgressMessage(message: ProgressMessage): Promise<void> {
  await sendMessage(getRequiredEnv(queueEnvironmentNames.progress), message, [
    "bookId",
    "chatId",
    "progress",
  ]);
}

async function sendProcessingMessage(message: ProcessingMessage): Promise<void> {
  await sendMessage(getRequiredEnv(queueEnvironmentNames.processing), message, [
    "bookId",
    "action",
  ]);
}

async function sendMessage<T, K extends keyof T>(
  queueUrl: string,
  message: T,
  attributes?: K[]
): Promise<void> {
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
}
