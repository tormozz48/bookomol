import { StackContext, Api, Bucket, Table, Queue, Function } from "sst/constructs";
import {
  bucketNames,
  functionNames,
  queueEnvironmentNames,
  queueNames,
  tableNames,
} from "../src/constants";

export function BookomolStack({ stack }: StackContext) {
  // DynamoDB Tables
  const booksTable = new Table(stack, tableNames.books, {
    fields: {
      bookId: "string",
      userId: "string",
    },
    primaryIndex: { partitionKey: "bookId" },
    globalIndexes: {
      userIndex: { partitionKey: "userId" },
    },
  });

  const sessionsTable = new Table(stack, tableNames.sessions, {
    fields: {
      sessionId: "string",
      userId: "string",
    },
    primaryIndex: { partitionKey: "sessionId" },
    timeToLiveAttribute: "expiresAt",
  });

  // S3 Bucket for PDF storage
  const pdfBucket = new Bucket(stack, bucketNames.pdfs, {
    cors: [
      {
        maxAge: "1 day",
        allowedOrigins: ["*"],
        allowedHeaders: ["*"],
        allowedMethods: ["GET", "PUT", "POST", "DELETE"],
      },
    ],
  });

  // SQS Queues
  const processingQueue = new Queue(stack, queueNames.processing, {
    consumer: {
      function: {
        functionName: functionNames.queueProcessor,
        handler: "src/functions/queue-processor.handler",
        timeout: "15 minutes",
        memorySize: 3008,
        environment: {
          GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
        },
      },
    },
  });

  const progressQueue = new Queue(stack, queueNames.progress, {
    consumer: {
      function: {
        functionName: functionNames.progressHandler,
        handler: "src/functions/progress-handler.handler",
        timeout: "1 minute",
        environment: {
          TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || "",
        },
      },
    },
  });

  // Lambda function for PDF processing trigger
  const pdfProcessor = new Function(stack, functionNames.pdfProcessor, {
    functionName: functionNames.pdfProcessor,
    handler: "src/functions/pdf-processor.handler",
    timeout: "15 minutes",
    memorySize: 3008,
    environment: {
      [queueEnvironmentNames.processing]: processingQueue.queueUrl,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
    },
  });

  // S3 bucket notifications
  pdfBucket.addNotifications(stack, {
    processPdf: {
      function: pdfProcessor,
      events: ["object_created"],
      filters: [{ prefix: "original/" }],
    },
  });

  // API Gateway for Telegram Webhook
  const api = new Api(stack, "TelegramApi", {
    routes: {
      "POST /webhook": {
        function: {
          functionName: functionNames.botHandler,
          handler: "src/functions/bot-handler.handler",
          timeout: "30 seconds",
          environment: {
            TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || "",
            [queueEnvironmentNames.processing]: processingQueue.queueUrl,
            [queueEnvironmentNames.progress]: progressQueue.queueUrl,
          },
        },
      },
    },
  });

  // Grant permissions
  api.attachPermissions([booksTable, sessionsTable, pdfBucket, processingQueue, progressQueue]);
  pdfProcessor.attachPermissions([booksTable, pdfBucket, processingQueue]);
  processingQueue.attachPermissions([booksTable, pdfBucket, progressQueue]);
  progressQueue.attachPermissions([booksTable]);

  // Output important values
  stack.addOutputs({
    WebhookUrl: api.url + "/webhook",
    BooksTableName: booksTable.tableName,
    SessionsTableName: sessionsTable.tableName,
    PdfBucketName: pdfBucket.bucketName,
    ProcessingQueueUrl: processingQueue.queueUrl,
    ProgressQueueUrl: progressQueue.queueUrl,
  });
}
