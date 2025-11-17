import { StackContext, Api, Bucket, Table, Queue, Function } from "sst/constructs";

export function BookomolStack({ stack }: StackContext) {
  // DynamoDB Tables
  const booksTable = new Table(stack, "Books", {
    fields: {
      bookId: "string",
      userId: "string",
    },
    primaryIndex: { partitionKey: "bookId" },
    globalIndexes: {
      userIndex: { partitionKey: "userId" },
    },
  });

  const sessionsTable = new Table(stack, "Sessions", {
    fields: {
      sessionId: "string",
      userId: "string",
    },
    primaryIndex: { partitionKey: "sessionId" },
    timeToLiveAttribute: "expiresAt",
  });

  // S3 Bucket for PDF storage
  const pdfBucket = new Bucket(stack, "PdfStorage", {
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
  const processingQueue = new Queue(stack, "ProcessingQueue", {
    consumer: {
      function: {
        handler: "src/functions/queue-processor.handler",
        timeout: "15 minutes",
        memorySize: 3008,
        environment: {
          BOOKS_TABLE: booksTable.tableName,
          PDF_BUCKET: pdfBucket.bucketName,
          GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
        },
      },
    },
  });

  const progressQueue = new Queue(stack, "ProgressQueue", {
    consumer: {
      function: {
        handler: "src/functions/progress-handler.handler",
        timeout: "1 minute",
        environment: {
          TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || "",
          BOOKS_TABLE: booksTable.tableName,
        },
      },
    },
  });

  // Lambda function for PDF processing trigger
  const pdfProcessor = new Function(stack, "PdfProcessor", {
    handler: "src/functions/pdf-processor.handler",
    timeout: "15 minutes",
    memorySize: 3008,
    environment: {
      BOOKS_TABLE: booksTable.tableName,
      PDF_BUCKET: pdfBucket.bucketName,
      PROCESSING_QUEUE: processingQueue.queueUrl,
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
          handler: "src/functions/bot-handler.handler",
          timeout: "30 seconds",
          environment: {
            TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || "",
            BOOKS_TABLE: booksTable.tableName,
            SESSIONS_TABLE: sessionsTable.tableName,
            PDF_BUCKET: pdfBucket.bucketName,
            PROCESSING_QUEUE: processingQueue.queueUrl,
            PROGRESS_QUEUE: progressQueue.queueUrl,
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
  });
}